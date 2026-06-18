import { createHash, randomBytes } from "node:crypto";

import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import { auditActions } from "../audit/auditActions.js";
import { recordAuditEvent } from "./audit.service.js";
import type { AuthenticatedActor } from "../types/express.js";
import type { CreateApiKeyBody } from "../validators/apiKeys.schemas.js";

const KEY_PREFIX_LITERAL = "cr_live_";
const KEY_BYTES = 32;

function generateRawKey(): string {
  return KEY_PREFIX_LITERAL + randomBytes(KEY_BYTES).toString("hex");
}

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function derivePrefix(raw: string): string {
  // Store the first 16 chars after the literal prefix as the displayable prefix
  return raw.slice(0, KEY_PREFIX_LITERAL.length + 8);
}

function mapApiKey(key: {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  userId: string;
  createdByUserId: string | null;
  user: { id: string; name: string; email: string };
  createdBy: { id: string; name: string; email: string } | null;
}) {
  const status = key.revokedAt
    ? "revoked"
    : key.expiresAt && key.expiresAt < new Date()
      ? "expired"
      : "active";

  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    status,
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt,
    expiresAt: key.expiresAt,
    revokedAt: key.revokedAt,
    user: { id: key.user.id, name: key.user.name, email: key.user.email },
    createdBy: key.createdBy
      ? { id: key.createdBy.id, name: key.createdBy.name, email: key.createdBy.email }
      : null
  };
}

// Safe projection for user-facing list — omits user/createdBy relations, never exposes hash
function mapApiKeyForUser(key: {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
}) {
  const status = key.revokedAt
    ? "revoked"
    : key.expiresAt && key.expiresAt < new Date()
      ? "expired"
      : "active";

  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    status,
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt,
    expiresAt: key.expiresAt
  };
}

// ---------------------------------------------------------------------------
// Admin operations (System Admin only)
// ---------------------------------------------------------------------------

export async function listApiKeys(actor: AuthenticatedActor) {
  if (!actor.isSystemAdmin) {
    throw new ApiError(403, "FORBIDDEN", "System Admin permission is required");
  }

  const keys = await prisma.apiKey.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return keys.map(mapApiKey);
}

export async function adminRevokeApiKey(actor: AuthenticatedActor, id: string) {
  if (!actor.isSystemAdmin) {
    throw new ApiError(403, "FORBIDDEN", "System Admin permission is required");
  }

  const existing = await prisma.apiKey.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } }
    }
  });

  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "API key not found");
  }

  if (existing.revokedAt) {
    throw new ApiError(409, "CONFLICT", "API key is already revoked");
  }

  const revoked = await prisma.$transaction(async (tx) => {
    const updated = await tx.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
      include: {
        user: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });

    await recordAuditEvent(
      {
        action: auditActions.apiKeyRevoked,
        objectType: "API_KEY",
        objectId: id,
        objectDisplayName: `${existing.name} (${existing.keyPrefix})`,
        scopeType: "SYSTEM",
        actor: { id: actor.id, name: actor.name, email: actor.email },
        summary: `API key '${existing.name}' revoked by admin (prefix: ${existing.keyPrefix})`,
        metadataJson: { keyPrefix: existing.keyPrefix, targetUserId: existing.userId, targetUserEmail: existing.user.email }
      },
      tx
    );

    return updated;
  });

  return mapApiKey(revoked);
}

// ---------------------------------------------------------------------------
// User self-service operations (any authenticated user, scoped to their own keys)
//
// is_active enforcement: the `authenticate` middleware rejects any request
// whose owning user has isActive = false before this service layer is reached.
// That covers the offboarding case for v1.9.0. Automated enforcement that
// deactivating a user also immediately invalidates all of their API keys
// (i.e. key-based requests, not just session-based ones) is deferred to
// PM13-03 — API hardening. For now, admin revoke via DELETE /admin/api-keys/:id
// is the supported offboarding action.
// ---------------------------------------------------------------------------

export async function listMyApiKeys(actor: AuthenticatedActor) {
  const keys = await prisma.apiKey.findMany({
    where: { userId: actor.id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true
    },
    orderBy: { createdAt: "desc" }
  });

  return keys.map(mapApiKeyForUser);
}

export async function createApiKey(actor: AuthenticatedActor, body: CreateApiKeyBody) {
  const rawKey = generateRawKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = derivePrefix(rawKey);

  const apiKey = await prisma.$transaction(async (tx) => {
    const created = await tx.apiKey.create({
      data: {
        name: body.name,
        userId: actor.id,
        keyPrefix,
        keyHash,
        expiresAt: body.expiresAt ?? null,
        createdByUserId: actor.id
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true
      }
    });

    await recordAuditEvent(
      {
        action: auditActions.apiKeyCreated,
        objectType: "API_KEY",
        objectId: created.id,
        objectDisplayName: `${body.name} (${keyPrefix})`,
        scopeType: "SYSTEM",
        actor: { id: actor.id, name: actor.name, email: actor.email },
        summary: `API key '${body.name}' created by ${actor.email} (prefix: ${keyPrefix})`,
        metadataJson: { keyPrefix }
      },
      tx
    );

    return created;
  });

  return {
    ...mapApiKeyForUser(apiKey),
    // Raw key returned exactly once — never stored, never retrievable again
    rawKey
  };
}

export async function revokeMyApiKey(actor: AuthenticatedActor, id: string) {
  const existing = await prisma.apiKey.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      userId: true
    }
  });

  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "API key not found");
  }

  // Users may only revoke their own keys
  if (existing.userId !== actor.id) {
    throw new ApiError(403, "FORBIDDEN", "You do not have permission to revoke this API key");
  }

  if (existing.revokedAt) {
    throw new ApiError(409, "CONFLICT", "API key is already revoked");
  }

  const revoked = await prisma.$transaction(async (tx) => {
    const updated = await tx.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true
      }
    });

    await recordAuditEvent(
      {
        action: auditActions.apiKeyRevoked,
        objectType: "API_KEY",
        objectId: id,
        objectDisplayName: `${existing.name} (${existing.keyPrefix})`,
        scopeType: "SYSTEM",
        actor: { id: actor.id, name: actor.name, email: actor.email },
        summary: `API key '${existing.name}' revoked by owner ${actor.email} (prefix: ${existing.keyPrefix})`,
        metadataJson: { keyPrefix: existing.keyPrefix }
      },
      tx
    );

    return updated;
  });

  return mapApiKeyForUser(revoked);
}

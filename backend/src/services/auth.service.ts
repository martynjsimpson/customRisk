import crypto from "node:crypto";

import type { Prisma, User } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { generateRefreshToken, hashRefreshToken } from "../auth/refreshTokens.js";
import { signAccessToken } from "../auth/tokens.js";
import { verifyPassword } from "../auth/password.js";
import { getJwtRefreshExpiryDays, getNodeEnv } from "../config/env.js";
import { featureFlags } from "../config/featureFlags.js";
import { logger } from "../config/logger.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import { recordAuditEvent } from "./audit.service.js";
import { linkPersonReferenceToUser } from "./personReference.service.js";
import { revokeRefreshToken } from "./sessionTokens.service.js";

const FAILED_LOGIN_LIMIT = 5;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const userSelect = {
  id: true,
  name: true,
  email: true,
  isSystemAdmin: true,
  isActive: true
} satisfies Prisma.UserSelect;

type PublicUser = Pick<User, "id" | "name" | "email" | "isSystemAdmin" | "isActive">;

export interface SessionResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: PublicUser;
}

function toPublicUser(user: PublicUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isSystemAdmin: user.isSystemAdmin,
    isActive: user.isActive
  };
}

function refreshExpiryDate(now = new Date()) {
  return new Date(now.getTime() + getJwtRefreshExpiryDays() * 24 * 60 * 60 * 1000);
}

function genericAuthError() {
  return new ApiError(401, "UNAUTHENTICATED", "Invalid email or password");
}

async function safeRecordAuthAudit(input: {
  action: string;
  actorUser?: PublicUser | null;
  objectId: string;
  summary: string;
  metadataJson?: Prisma.InputJsonValue;
}) {
  try {
    await recordAuditEvent({
      action: input.action,
      actor: input.actorUser
        ? { id: input.actorUser.id, name: input.actorUser.name, email: input.actorUser.email }
        : null,
      objectType: "AUTH",
      objectId: input.objectId,
      objectDisplayName: input.actorUser?.email,
      scopeType: "SYSTEM",
      summary: input.summary,
      metadataJson: input.metadataJson
    });
  } catch (error) {
    logger.error({ error, action: input.action }, "Failed to write auth audit event");
  }
}

async function registerFailedLogin(user: (PublicUser & {
  failedLoginAttempts: number;
  lastFailedLoginAt: Date | null;
}) | null, email: string) {
  if (!user) {
    await safeRecordAuthAudit({
      action: auditActions.loginFailed,
      objectId: "auth",
      summary: "Login failed",
      metadataJson: { email }
    });
    return;
  }

  const now = new Date();
  const previousAttemptIsRecent =
    user.lastFailedLoginAt !== null &&
    now.getTime() - user.lastFailedLoginAt.getTime() <= FAILED_LOGIN_WINDOW_MS;
  const failedLoginAttempts = previousAttemptIsRecent ? user.failedLoginAttempts + 1 : 1;
  const lockedUntil =
    failedLoginAttempts >= FAILED_LOGIN_LIMIT
      ? new Date(now.getTime() + LOCKOUT_DURATION_MS)
      : null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts,
      lastFailedLoginAt: now,
      lockedUntil
    }
  });

  await safeRecordAuthAudit({
    action: lockedUntil ? auditActions.accountLocked : auditActions.loginFailed,
    actorUser: user,
    objectId: user.id,
    summary: lockedUntil ? "Account locked after failed login attempts" : "Login failed"
  });
}

async function issueSession(user: PublicUser, tokenFamilyId = crypto.randomUUID()): Promise<SessionResult> {
  const refresh = generateRefreshToken();
  const refreshTokenExpiresAt = refreshExpiryDate();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refresh.hash,
      tokenFamilyId,
      expiresAt: refreshTokenExpiresAt
    }
  });

  return {
    accessToken: signAccessToken({ sub: user.id }),
    refreshToken: refresh.token,
    refreshTokenExpiresAt,
    user: toPublicUser(user)
  };
}

export async function login(email: string, password: string): Promise<SessionResult> {
  const normalisedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalisedEmail },
    select: {
      ...userSelect,
      passwordHash: true,
      failedLoginAttempts: true,
      lastFailedLoginAt: true,
      lockedUntil: true
    }
  });

  const now = new Date();

  if (!user || !user.isActive) {
    await registerFailedLogin(user, normalisedEmail);
    throw genericAuthError();
  }

  if (user.lockedUntil && user.lockedUntil > now) {
    await safeRecordAuthAudit({
      action: auditActions.loginFailed,
      actorUser: user,
      objectId: user.id,
      summary: "Login failed"
    });
    throw genericAuthError();
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    await registerFailedLogin(user, normalisedEmail);
    throw genericAuthError();
  }

  const session = await issueSession(user);

  logger.info({ userId: user.id, email: user.email }, "User login succeeded");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
      lockedUntil: null
    }
  });

  // Ensure any unresolved PersonReference for this email is linked to the user
  await linkPersonReferenceToUser(user.id, normalisedEmail);

  await safeRecordAuthAudit({
    action: auditActions.loginSucceeded,
    actorUser: user,
    objectId: user.id,
    summary: "Login succeeded"
  });

  return session;
}

export async function refreshSession(refreshToken: string): Promise<SessionResult> {
  const tokenHash = hashRefreshToken(refreshToken);
  const existingToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: userSelect
      }
    }
  });

  if (!existingToken) {
    throw new ApiError(401, "UNAUTHENTICATED", "Refresh token is invalid");
  }

  if (existingToken.revokedAt || existingToken.replacedByTokenId) {
    await prisma.refreshToken.updateMany({
      where: {
        userId: existingToken.userId,
        tokenFamilyId: existingToken.tokenFamilyId,
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });
    await safeRecordAuthAudit({
      action: auditActions.refreshTokenReuseDetected,
      actorUser: existingToken.user,
      objectId: existingToken.userId,
      summary: "Refresh token reuse detected"
    });
    throw new ApiError(401, "UNAUTHENTICATED", "Refresh token is invalid");
  }

  if (existingToken.expiresAt <= new Date() || !existingToken.user.isActive) {
    throw new ApiError(401, "UNAUTHENTICATED", "Refresh token is invalid");
  }

  const refresh = generateRefreshToken();
  const refreshTokenExpiresAt = refreshExpiryDate();

  const result = await prisma.$transaction(async (tx) => {
    const replacement = await tx.refreshToken.create({
      data: {
        userId: existingToken.userId,
        tokenHash: refresh.hash,
        tokenFamilyId: existingToken.tokenFamilyId,
        expiresAt: refreshTokenExpiresAt
      }
    });

    await tx.refreshToken.update({
      where: { id: existingToken.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: replacement.id
      }
    });

    return replacement;
  });

  return {
    accessToken: signAccessToken({ sub: existingToken.userId }),
    refreshToken: refresh.token,
    refreshTokenExpiresAt: result.expiresAt,
    user: toPublicUser(existingToken.user)
  };
}

export async function logout(userId: string, refreshToken?: string) {
  if (refreshToken) {
    await revokeRefreshToken(userId, refreshToken);
  }

  logger.info({ userId }, "User session revoked");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect
  });

  await safeRecordAuthAudit({
    action: auditActions.logout,
    actorUser: user,
    objectId: userId,
    summary: "Logout"
  });
}

export async function getCurrentSession(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...userSelect,
      registerPermissions: {
        select: {
          registerId: true,
          role: true
        }
      }
    }
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  return {
    user: toPublicUser(user),
    permissions: {
      isSystemAdmin: user.isSystemAdmin,
      registerRoles: user.registerPermissions
    },
    enabledFeatures: { ...featureFlags },
    appEnvironment: getNodeEnv()
  };
}

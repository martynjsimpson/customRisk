import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import { getEffectiveRegisterRole } from "../permissions/registerAccess.js";
import { canDeleteAction } from "../permissions/actionAccess.js";
import { recordAuditEvent } from "./audit.service.js";
import {
  resolvePersonInput,
  personReferenceSelect,
  formatPersonDisplay
} from "./personReference.service.js";
import type { Prisma } from "@prisma/client";
import type { AuthenticatedActor } from "../types/express.js";

// ---------------------------------------------------------------------------
// Migration helpers (exported for use by configVersion.service.ts)
// ---------------------------------------------------------------------------

export async function migrateSimpleResponseActionsToChildRecords(
  registerId: string,
  actorId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  const risks = await tx.risk.findMany({
    where: {
      registerId,
      responseAction: { not: null }
    },
    select: { id: true, responseAction: true }
  });

  for (const risk of risks) {
    const trimmed = risk.responseAction?.trim();
    if (!trimmed) continue;

    const action = await tx.responseAction.create({
      data: {
        response: trimmed,
        status: "PLANNED",
        createdByUserId: actorId,
        updatedByUserId: actorId
      },
      select: { id: true }
    });

    await tx.riskResponseAction.create({
      data: {
        riskId: risk.id,
        registerId,
        responseActionId: action.id,
        displayOrder: 0,
        createdByUserId: actorId
      }
    });

    await recordAuditEvent(
      {
        action: auditActions.responseActionMigrated,
        actor: { id: actorId },
        objectType: "RESPONSE_ACTION",
        objectId: action.id,
        objectDisplayName: action.id,
        scopeType: "RISK",
        registerId,
        riskId: risk.id,
        summary: "Response action migrated from simple field during mode switch"
      },
      tx
    );
  }
}

export async function migrateChildRecordsToSimple(
  registerId: string,
  actorId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  // 1. Re-verify feasibility inside the transaction (defence in depth)
  const blockers = await tx.$queryRaw<{ risk_id: string }[]>`
    SELECT rra.risk_id
    FROM risk_response_action rra
    JOIN response_action ra ON ra.id = rra.response_action_id
    JOIN risk r ON r.id = rra.risk_id
    WHERE rra.register_id = ${registerId}
      AND ra.is_deleted   = false
      AND r.state        <> 'CLOSED'
    GROUP BY rra.risk_id
    HAVING COUNT(ra.id) >= 2
  `;

  if (blockers.length > 0) {
    throw new ApiError(
      409,
      "REVERT_MODE_BLOCKED_MULTIPLE_ACTIONS",
      "One or more risks have multiple active action records; revert aborted."
    );
  }

  // 2. Fetch risks with exactly 1 non-deleted action and their action's response text
  const singles = await tx.$queryRaw<{ risk_id: string; response: string; action_id: string }[]>`
    SELECT rra.risk_id, ra.response, ra.id AS action_id
    FROM risk_response_action rra
    JOIN response_action ra ON ra.id = rra.response_action_id
    JOIN risk r ON r.id = rra.risk_id
    WHERE rra.register_id = ${registerId}
      AND ra.is_deleted   = false
      AND r.state        <> 'CLOSED'
  `;

  // 3. Write ResponseAction.response back into Risk.responseAction for each single-action risk
  for (const row of singles) {
    await tx.risk.update({
      where: { id: row.risk_id },
      data: {
        responseAction: row.response,
        systemUpdatedAt: new Date(),
        systemUpdatedByUserId: actorId
      }
    });

    // Emit riskUpdated audit event per risk whose responseAction was written
    await recordAuditEvent(
      {
        action: auditActions.riskUpdated,
        actor: { id: actorId },
        objectType: "RISK",
        objectId: row.risk_id,
        objectDisplayName: row.risk_id,
        scopeType: "RISK",
        registerId,
        riskId: row.risk_id,
        summary: "Response action text written back to simple field during revert to Simple mode",
        metadataJson: { fields: ["responseAction"], reason: "mode_revert_to_simple" }
      },
      tx
    );
  }

  // 4. Soft-delete all ResponseAction records for this register
  const actionLinks = await tx.riskResponseAction.findMany({
    where: { registerId },
    select: { responseActionId: true }
  });
  const ids = [...new Set(actionLinks.map((r) => r.responseActionId))];

  if (ids.length > 0) {
    // Fetch link-to-risk mapping for audit events
    const linkRows = await tx.riskResponseAction.findMany({
      where: { registerId, responseActionId: { in: ids } },
      select: { responseActionId: true, riskId: true }
    });
    const actionToRisk = new Map(linkRows.map((lr) => [lr.responseActionId, lr.riskId]));

    await tx.responseAction.updateMany({
      where: { id: { in: ids }, isDeleted: false },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedByUserId: actorId
      }
    });

    // 5. Emit audit events for each soft-deleted action
    for (const actionId of ids) {
      const riskId = actionToRisk.get(actionId);
      await recordAuditEvent(
        {
          action: auditActions.responseActionDeleted,
          actor: { id: actorId },
          objectType: "RESPONSE_ACTION",
          objectId: actionId,
          objectDisplayName: actionId,
          scopeType: "RISK",
          registerId,
          riskId,
          summary: "Response action soft-deleted during revert to Simple mode",
          metadataJson: { reason: "mode_revert_to_simple" }
        },
        tx
      );
    }
  }
}

type ActionClient = typeof prisma | Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const actionInclude = {
  ownerPerson: { select: personReferenceSelect },
  ownerUser: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } }
};

type ActionRow = {
  id: string;
  response: string;
  status: string;
  ownerPersonId: string | null;
  ownerUserId: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  ownerPerson: { id: string; email: string; displayName: string | null; userId: string | null; user: { id: string; name: string; email: string; isActive: boolean } | null } | null;
  ownerUser: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string; email: string };
  updatedBy: { id: string; name: string; email: string };
};

function mapAction(row: ActionRow) {
  return {
    id: row.id,
    response: row.response,
    status: row.status,
    owner: {
      personId: row.ownerPersonId,
      userId: row.ownerUserId,
      email: row.ownerPerson?.email ?? row.ownerUser?.email ?? null,
      displayName: row.ownerPerson
        ? formatPersonDisplay(row.ownerPerson).displayName
        : (row.ownerUser?.name ?? null)
    },
    isDeleted: row.isDeleted,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy
  };
}

async function assertRegisterChildRecordsMode(
  registerId: string,
  client: ActionClient = prisma
) {
  const register = await (client as typeof prisma).register.findUnique({
    where: { id: registerId },
    select: { responseActionMode: true }
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  if (register.responseActionMode !== "CHILD_RECORDS") {
    throw new ApiError(
      409,
      "INVALID_MODE",
      "This register is not in Child Records mode for response actions"
    );
  }
}

async function assertRiskBelongsToRegister(
  riskId: string,
  registerId: string,
  client: ActionClient = prisma
) {
  const risk = await (client as typeof prisma).risk.findFirst({
    where: { id: riskId, registerId },
    select: { id: true }
  });
  if (!risk) {
    throw new ApiError(404, "NOT_FOUND", "Risk not found");
  }
}

async function resolveOwnerInputs(
  input: { ownerPersonId?: string | null; ownerEmail?: string | null },
  client: ActionClient = prisma
): Promise<{ ownerPersonId: string | null; ownerUserId: string | null }> {
  if (input.ownerPersonId) {
    // Look up the PersonReference to get ownerUserId if linked
    const ref = await (client as typeof prisma).personReference.findUnique({
      where: { id: input.ownerPersonId },
      select: { id: true, userId: true }
    });
    if (!ref) {
      throw new ApiError(400, "VALIDATION_ERROR", "Owner person reference not found", {
        ownerPersonId: "Owner person reference not found"
      });
    }
    return { ownerPersonId: ref.id, ownerUserId: ref.userId ?? null };
  }

  if (input.ownerEmail) {
    const personId = await resolvePersonInput({ type: "email", email: input.ownerEmail }, client);
    const ref = await (client as typeof prisma).personReference.findUnique({
      where: { id: personId },
      select: { id: true, userId: true }
    });
    return { ownerPersonId: personId, ownerUserId: ref?.userId ?? null };
  }

  return { ownerPersonId: null, ownerUserId: null };
}

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

export async function listActions(
  _actor: AuthenticatedActor,
  registerId: string,
  riskId: string
) {
  await assertRegisterChildRecordsMode(registerId);
  await assertRiskBelongsToRegister(riskId, registerId);

  const links = await prisma.riskResponseAction.findMany({
    where: {
      riskId,
      registerId,
      responseAction: { isDeleted: false }
    },
    orderBy: { displayOrder: "asc" },
    include: {
      responseAction: { include: actionInclude }
    }
  });

  return links.map((link) => mapAction(link.responseAction));
}

export async function getAction(
  _actor: AuthenticatedActor,
  registerId: string,
  riskId: string,
  actionId: string
) {
  await assertRegisterChildRecordsMode(registerId);

  const link = await prisma.riskResponseAction.findFirst({
    where: {
      responseActionId: actionId,
      riskId,
      registerId,
      responseAction: { isDeleted: false }
    },
    include: {
      responseAction: { include: actionInclude }
    }
  });

  if (!link) {
    throw new ApiError(404, "NOT_FOUND", "Response action not found");
  }

  return mapAction(link.responseAction);
}

export async function createAction(
  actor: AuthenticatedActor,
  registerId: string,
  riskId: string,
  input: {
    response: string;
    status?: "PLANNED" | "IN_PROGRESS" | "IMPLEMENTED" | "DEFERRED" | "CANCELLED";
    ownerPersonId?: string | null;
    ownerEmail?: string | null;
  }
) {
  return prisma.$transaction(async (tx) => {
    await assertRegisterChildRecordsMode(registerId, tx);
    await assertRiskBelongsToRegister(riskId, registerId, tx);

    const { ownerPersonId, ownerUserId } = await resolveOwnerInputs(input, tx);

    // Find next displayOrder for this risk
    const maxOrderRow = await tx.riskResponseAction.aggregate({
      where: { riskId, registerId },
      _max: { displayOrder: true }
    });
    const displayOrder = (maxOrderRow._max.displayOrder ?? -1) + 1;

    const action = await tx.responseAction.create({
      data: {
        response: input.response,
        status: input.status ?? "PLANNED",
        ownerPersonId: ownerPersonId ?? undefined,
        ownerUserId: ownerUserId ?? undefined,
        createdByUserId: actor.id,
        updatedByUserId: actor.id
      },
      include: actionInclude
    });

    await tx.riskResponseAction.create({
      data: {
        riskId,
        registerId,
        responseActionId: action.id,
        displayOrder,
        createdByUserId: actor.id
      }
    });

    await recordAuditEvent(
      {
        action: auditActions.responseActionCreated,
        actor,
        objectType: "RESPONSE_ACTION",
        objectId: action.id,
        objectDisplayName: action.id,
        scopeType: "RISK",
        registerId,
        riskId,
        summary: "Response action created"
      },
      tx
    );

    return mapAction(action);
  });
}

export async function updateAction(
  actor: AuthenticatedActor,
  registerId: string,
  riskId: string,
  actionId: string,
  input: {
    response?: string;
    status?: "PLANNED" | "IN_PROGRESS" | "IMPLEMENTED" | "DEFERRED" | "CANCELLED";
    ownerPersonId?: string | null;
    ownerEmail?: string | null;
  }
) {
  return prisma.$transaction(async (tx) => {
    await assertRegisterChildRecordsMode(registerId, tx);

    const link = await tx.riskResponseAction.findFirst({
      where: { responseActionId: actionId, riskId, registerId },
      select: { id: true }
    });
    if (!link) {
      throw new ApiError(404, "NOT_FOUND", "Response action not found");
    }

    const role = await getEffectiveRegisterRole(actor, registerId, tx);

    // Response Action Owners may only update response and status — strip owner fields
    const isResponseActionOwnerOnly =
      role === "RESPONSE_ACTION_OWNER" ||
      (role !== "SYSTEM_ADMIN" && role !== "REGISTER_ADMIN" && role !== "RISK_OWNER");

    if (isResponseActionOwnerOnly && (input.ownerPersonId !== undefined || input.ownerEmail !== undefined)) {
      throw new ApiError(403, "FORBIDDEN", "Response Action Owners may not change the owner field");
    }

    let ownerPersonId: string | null | undefined;
    let ownerUserId: string | null | undefined;

    if (!isResponseActionOwnerOnly && (input.ownerPersonId !== undefined || input.ownerEmail !== undefined)) {
      const resolved = await resolveOwnerInputs(input, tx);
      ownerPersonId = resolved.ownerPersonId;
      ownerUserId = resolved.ownerUserId;
    }

    const updated = await tx.responseAction.update({
      where: { id: actionId },
      data: {
        response: input.response,
        status: input.status,
        ownerPersonId,
        ownerUserId,
        updatedByUserId: actor.id
      },
      include: actionInclude
    });

    await recordAuditEvent(
      {
        action: auditActions.responseActionUpdated,
        actor,
        objectType: "RESPONSE_ACTION",
        objectId: actionId,
        objectDisplayName: actionId,
        scopeType: "RISK",
        registerId,
        riskId,
        summary: "Response action updated"
      },
      tx
    );

    return mapAction(updated);
  });
}

export async function deleteAction(
  actor: AuthenticatedActor,
  registerId: string,
  riskId: string,
  actionId: string
) {
  const canDelete = await canDeleteAction(actor, registerId);
  if (!canDelete) {
    throw new ApiError(403, "FORBIDDEN", "Only System Admins and Register Admins can delete response actions");
  }

  return prisma.$transaction(async (tx) => {
    await assertRegisterChildRecordsMode(registerId, tx);

    const link = await tx.riskResponseAction.findFirst({
      where: { responseActionId: actionId, riskId, registerId },
      select: { id: true }
    });
    if (!link) {
      throw new ApiError(404, "NOT_FOUND", "Response action not found");
    }

    await tx.responseAction.update({
      where: { id: actionId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedByUserId: actor.id,
        updatedByUserId: actor.id
      }
    });

    await recordAuditEvent(
      {
        action: auditActions.responseActionDeleted,
        actor,
        objectType: "RESPONSE_ACTION",
        objectId: actionId,
        objectDisplayName: actionId,
        scopeType: "RISK",
        registerId,
        riskId,
        summary: "Response action deleted"
      },
      tx
    );

    return { id: actionId, deleted: true };
  });
}

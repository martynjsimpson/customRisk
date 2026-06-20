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

import type { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import type { AuthenticatedActor } from "../types/express.js";
import { getEffectiveRegisterRole } from "./registerAccess.js";

type PermissionClient = typeof prisma | Prisma.TransactionClient;

export async function canViewRisk(
  actor: AuthenticatedActor,
  registerId: string,
  riskId: string,
  client: PermissionClient = prisma
) {
  if (actor.isSystemAdmin) {
    return true;
  }

  const role = await getEffectiveRegisterRole(actor, registerId, client);
  if (role === "REGISTER_ADMIN" || role === "REGISTER_VIEWER") {
    return true;
  }

  const risk = await client.risk.findFirst({
    where: {
      id: riskId,
      registerId,
      OR: [
        { ownerUserId: actor.id },
        { ownerPerson: { userId: actor.id } }
      ]
    },
    select: { id: true }
  });

  return risk !== null;
}

export async function canEditRisk(
  actor: AuthenticatedActor,
  registerId: string,
  riskId: string,
  client: PermissionClient = prisma
) {
  if (actor.isSystemAdmin) {
    return true;
  }

  const role = await getEffectiveRegisterRole(actor, registerId, client);
  if (role === "REGISTER_ADMIN") {
    return true;
  }

  const risk = await client.risk.findFirst({
    where: {
      id: riskId,
      registerId,
      OR: [
        { ownerUserId: actor.id },
        { ownerPerson: { userId: actor.id } }
      ]
    },
    select: { id: true }
  });

  return risk !== null;
}

export async function canDeleteRisk(actor: AuthenticatedActor) {
  return actor.isSystemAdmin;
}

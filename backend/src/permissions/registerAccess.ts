import type { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import type { AuthenticatedActor } from "../types/express.js";
import { highestRole, type EffectiveRegisterRole } from "./effectiveRole.js";

type PermissionClient = typeof prisma | Prisma.TransactionClient;

export async function getEffectiveRegisterRole(
  actor: AuthenticatedActor,
  registerId: string,
  client: PermissionClient = prisma
): Promise<EffectiveRegisterRole> {
  if (actor.isSystemAdmin) {
    return "SYSTEM_ADMIN";
  }

  const permissions = await client.registerPermission.findMany({
    where: {
      registerId,
      userId: actor.id
    },
    select: { role: true }
  });

  const ownsRisk = await client.risk.findFirst({
    where: {
      registerId,
      ownerUserId: actor.id
    },
    select: { id: true }
  });

  const ownsAction = await client.riskResponseAction.findFirst({
    where: {
      registerId,
      responseAction: {
        ownerUserId: actor.id,
        isDeleted: false
      }
    },
    select: { id: true }
  });

  return highestRole([
    ...permissions.map((permission) => permission.role),
    ownsRisk   ? "RISK_OWNER"             : "NONE",
    ownsAction ? "RESPONSE_ACTION_OWNER"  : "NONE"
  ]);
}

export async function canViewRegister(
  actor: AuthenticatedActor,
  registerId: string,
  client?: PermissionClient
) {
  return (await getEffectiveRegisterRole(actor, registerId, client)) !== "NONE";
}

export async function canManageRegister(
  actor: AuthenticatedActor,
  registerId: string,
  client?: PermissionClient
) {
  const role = await getEffectiveRegisterRole(actor, registerId, client);
  return role === "SYSTEM_ADMIN" || role === "REGISTER_ADMIN";
}

export async function canManageRegisterPermissions(
  actor: AuthenticatedActor,
  registerId: string,
  client?: PermissionClient
) {
  return canManageRegister(actor, registerId, client);
}

export async function canExportRegister(
  actor: AuthenticatedActor,
  registerId: string,
  client: PermissionClient = prisma
) {
  if (actor.isSystemAdmin) {
    return true;
  }

  const register = await client.register.findUnique({
    where: { id: registerId },
    select: { allowViewerExport: true }
  });

  if (!register) {
    return false;
  }

  const role = await getEffectiveRegisterRole(actor, registerId, client);
  return role === "REGISTER_ADMIN" || (role === "REGISTER_VIEWER" && register.allowViewerExport);
}

export async function listAccessibleRegisterIds(actor: AuthenticatedActor, client: PermissionClient = prisma) {
  if (actor.isSystemAdmin) {
    const registers = await client.register.findMany({ select: { id: true } });
    return registers.map((register) => register.id);
  }

  const [permissions, ownedRisks, ownedActionLinks] = await Promise.all([
    client.registerPermission.findMany({
      where: { userId: actor.id },
      select: { registerId: true }
    }),
    client.risk.findMany({
      where: { ownerUserId: actor.id },
      distinct: ["registerId"],
      select: { registerId: true }
    }),
    client.riskResponseAction.findMany({
      where: {
        responseAction: {
          ownerUserId: actor.id,
          isDeleted: false
        }
      },
      distinct: ["registerId"],
      select: { registerId: true }
    })
  ]);

  return [...new Set([
    ...permissions.map((p: { registerId: string }) => p.registerId),
    ...ownedRisks.map((r: { registerId: string }) => r.registerId),
    ...ownedActionLinks.map((l: { registerId: string }) => l.registerId)
  ])];
}

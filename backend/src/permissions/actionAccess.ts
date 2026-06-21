import type { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import type { AuthenticatedActor } from "../types/express.js";
import { getEffectiveRegisterRole } from "./registerAccess.js";

type PermissionClient = typeof prisma | Prisma.TransactionClient;

/**
 * Can view a specific action if the actor:
 * - Is a System Admin
 * - Is a Register Admin or Register Viewer
 * - Is a Risk Owner of a risk the action is linked to
 * - Is the Response Action Owner of that specific action
 */
export async function canViewAction(
  actor: AuthenticatedActor,
  registerId: string,
  actionId: string,
  client: PermissionClient = prisma
): Promise<boolean> {
  if (actor.isSystemAdmin) return true;

  const role = await getEffectiveRegisterRole(actor, registerId, client);
  if (role === "REGISTER_ADMIN" || role === "REGISTER_VIEWER") return true;

  // Risk Owner of any linked risk
  if (role === "RISK_OWNER") {
    const link = await client.riskResponseAction.findFirst({
      where: {
        responseActionId: actionId,
        registerId,
        risk: {
          OR: [
            { ownerUserId: actor.id },
            { ownerPerson: { userId: actor.id } }
          ]
        }
      },
      select: { id: true }
    });
    if (link !== null) return true;
  }

  // Response Action Owner — owns this specific action
  const action = await client.responseAction.findFirst({
    where: {
      id: actionId,
      ownerUserId: actor.id,
      isDeleted: false,
      riskLinks: { some: { registerId } }
    },
    select: { id: true }
  });

  return action !== null;
}

/**
 * Can edit a specific action if the actor:
 * - Is a System Admin
 * - Is a Register Admin
 * - Is a Risk Owner of a linked risk
 * - Is the Response Action Owner of that specific action
 *   (field-level restrictions enforced in the service layer)
 */
export async function canEditAction(
  actor: AuthenticatedActor,
  registerId: string,
  actionId: string,
  client: PermissionClient = prisma
): Promise<boolean> {
  if (actor.isSystemAdmin) return true;

  const role = await getEffectiveRegisterRole(actor, registerId, client);
  if (role === "REGISTER_ADMIN") return true;

  // Risk Owner of any linked risk
  if (role === "RISK_OWNER") {
    const link = await client.riskResponseAction.findFirst({
      where: {
        responseActionId: actionId,
        registerId,
        risk: {
          OR: [
            { ownerUserId: actor.id },
            { ownerPerson: { userId: actor.id } }
          ]
        }
      },
      select: { id: true }
    });
    if (link !== null) return true;
  }

  // Response Action Owner
  const action = await client.responseAction.findFirst({
    where: {
      id: actionId,
      ownerUserId: actor.id,
      isDeleted: false,
      riskLinks: { some: { registerId } }
    },
    select: { id: true }
  });

  return action !== null;
}

/**
 * Can delete a specific action if the actor:
 * - Is a System Admin
 * - Is a Register Admin
 */
export async function canDeleteAction(
  actor: AuthenticatedActor,
  registerId: string,
  client: PermissionClient = prisma
): Promise<boolean> {
  if (actor.isSystemAdmin) return true;

  const role = await getEffectiveRegisterRole(actor, registerId, client);
  return role === "REGISTER_ADMIN";
}

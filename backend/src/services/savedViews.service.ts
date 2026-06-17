import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import { auditActions } from "../audit/auditActions.js";
import { recordAuditEvent } from "./audit.service.js";
import { canViewRegister } from "../permissions/registerAccess.js";
import type { AuthenticatedActor } from "../types/express.js";
import type { CreateSavedViewBody, UpdateSavedViewBody } from "../validators/savedViews.schemas.js";

function mapSavedView(view: {
  id: string;
  userId: string;
  registerId: string | null;
  name: string;
  filterJson: Prisma.JsonValue;
  sortJson: Prisma.JsonValue;
  columnsJson: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: view.id,
    userId: view.userId,
    registerId: view.registerId,
    name: view.name,
    filters: view.filterJson ?? null,
    sort: view.sortJson ?? null,
    columns: view.columnsJson ?? null,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt
  };
}

async function assertRegisterAccess(actor: AuthenticatedActor, registerId: string) {
  if (!(await canViewRegister(actor, registerId))) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }
}

export async function listSavedViews(actor: AuthenticatedActor, registerId: string) {
  await assertRegisterAccess(actor, registerId);

  const views = await prisma.savedView.findMany({
    where: { userId: actor.id, registerId },
    orderBy: { name: "asc" }
  });

  return views.map(mapSavedView);
}

export async function createSavedView(
  actor: AuthenticatedActor,
  registerId: string,
  body: CreateSavedViewBody
) {
  await assertRegisterAccess(actor, registerId);

  // Enforce unique name per user+register (DB constraint enforces too, but give a clean error)
  const existing = await prisma.savedView.findUnique({
    where: { userId_registerId_name: { userId: actor.id, registerId, name: body.name } }
  });
  if (existing) {
    throw new ApiError(409, "CONFLICT", "A saved view with this name already exists");
  }

  const view = await prisma.$transaction(async (tx) => {
    const created = await tx.savedView.create({
      data: {
        userId: actor.id,
        registerId,
        name: body.name,
        filterJson: (body.filters as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        sortJson: (body.sort as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        columnsJson: (body.columns as Prisma.InputJsonValue) ?? Prisma.JsonNull
      }
    });

    await recordAuditEvent(
      {
        action: auditActions.savedViewCreated,
        objectType: "SAVED_VIEW",
        objectId: created.id,
        objectDisplayName: body.name,
        scopeType: "REGISTER",
        registerId,
        actor: { id: actor.id, name: actor.name, email: actor.email },
        summary: `Saved view '${body.name}' created`
      },
      tx
    );

    return created;
  });

  return mapSavedView(view);
}

export async function updateSavedView(
  actor: AuthenticatedActor,
  registerId: string,
  id: string,
  body: UpdateSavedViewBody
) {
  await assertRegisterAccess(actor, registerId);

  const existing = await prisma.savedView.findUnique({ where: { id } });
  if (!existing || existing.registerId !== registerId) {
    throw new ApiError(404, "NOT_FOUND", "Saved view not found");
  }

  if (existing.userId !== actor.id) {
    throw new ApiError(404, "NOT_FOUND", "Saved view not found");
  }

  // Check name uniqueness if name is being changed
  if (body.name && body.name !== existing.name) {
    const nameConflict = await prisma.savedView.findUnique({
      where: { userId_registerId_name: { userId: actor.id, registerId, name: body.name } }
    });
    if (nameConflict) {
      throw new ApiError(409, "CONFLICT", "A saved view with this name already exists");
    }
  }

  const data: Prisma.SavedViewUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.filters !== undefined) data.filterJson = body.filters as Prisma.InputJsonValue;
  if (body.sort !== undefined) data.sortJson = body.sort as Prisma.InputJsonValue;
  if (body.columns !== undefined) data.columnsJson = body.columns as Prisma.InputJsonValue;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.savedView.update({ where: { id }, data });

    await recordAuditEvent(
      {
        action: auditActions.savedViewUpdated,
        objectType: "SAVED_VIEW",
        objectId: id,
        objectDisplayName: result.name,
        scopeType: "REGISTER",
        registerId,
        actor: { id: actor.id, name: actor.name, email: actor.email },
        summary: `Saved view '${result.name}' updated`
      },
      tx
    );

    return result;
  });

  return mapSavedView(updated);
}

export async function deleteSavedView(
  actor: AuthenticatedActor,
  registerId: string,
  id: string
) {
  await assertRegisterAccess(actor, registerId);

  const existing = await prisma.savedView.findUnique({ where: { id } });
  if (!existing || existing.registerId !== registerId) {
    throw new ApiError(404, "NOT_FOUND", "Saved view not found");
  }

  // Only the owner can delete their own view
  if (existing.userId !== actor.id) {
    throw new ApiError(404, "NOT_FOUND", "Saved view not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.savedView.delete({ where: { id } });

    await recordAuditEvent(
      {
        action: auditActions.savedViewDeleted,
        objectType: "SAVED_VIEW",
        objectId: id,
        objectDisplayName: existing.name,
        scopeType: "REGISTER",
        registerId,
        actor: { id: actor.id, name: actor.name, email: actor.email },
        summary: `Saved view '${existing.name}' deleted`
      },
      tx
    );
  });
}

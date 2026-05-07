import { Prisma } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { hashPassword, validatePasswordPolicy, verifyPassword } from "../auth/password.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";
import { buildFieldChanges, recordAuditEvent, type AuditFieldChangeInput } from "./audit.service.js";
import { revokeOtherRefreshTokens } from "./auth.service.js";
import type {
  ChangeOwnPasswordBody,
  CreateUserBody,
  ListUsersQuery,
  UpdateOwnProfileBody,
  UpdateUserBody
} from "../validators/users.schemas.js";

const userSelect = {
  id: true,
  name: true,
  email: true,
  isSystemAdmin: true,
  isActive: true,
  failedLoginAttempts: true,
  lastFailedLoginAt: true,
  lockedUntil: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

function userResponse(user: Prisma.UserGetPayload<{ select: typeof userSelect }>) {
  return user;
}

function passwordPolicyError(password: string, email: string, name: string) {
  const errors = validatePasswordPolicy(password, email, name);
  if (errors.length === 0) {
    return null;
  }

  return new ApiError(400, "VALIDATION_ERROR", "Password does not meet policy", {
    password: errors.join("; ")
  });
}

function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ApiError(409, "CONFLICT", "A user with this email already exists");
  }

  throw error;
}

export function auditActionForUserActiveChange(isActive: boolean) {
  return isActive ? auditActions.userActivated : auditActions.userDeactivated;
}

export async function listUsers(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = {
    isActive: query.isActive,
    isSystemAdmin: query.isSystemAdmin,
    OR: query.search
      ? [
          { name: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } }
        ]
      : undefined
  };

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    }),
    prisma.user.count({ where })
  ]);

  return {
    data: data.map(userResponse),
    meta: {
      total,
      page: query.page,
      pageSize: query.pageSize
    }
  };
}

export async function getUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect
  });

  if (!user) {
    throw new ApiError(404, "NOT_FOUND", "User not found");
  }

  return userResponse(user);
}

export async function createUser(actor: AuthenticatedActor, input: CreateUserBody) {
  const policyError = passwordPolicyError(input.password, input.email, input.name);
  if (policyError) {
    throw policyError;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash: await hashPassword(input.password),
          isSystemAdmin: input.isSystemAdmin,
          isActive: input.isActive,
          createdByUserId: actor.id,
          updatedByUserId: actor.id
        },
        select: userSelect
      });

      await recordAuditEvent(
        {
          action: auditActions.userCreated,
          actor,
          objectType: "USER",
          objectId: user.id,
          objectDisplayName: user.email,
          scopeType: "SYSTEM",
          summary: "User created"
        },
        tx
      );

      if (user.isSystemAdmin) {
        await recordAuditEvent(
          {
            action: auditActions.systemAdminGranted,
            actor,
            objectType: "USER",
            objectId: user.id,
            objectDisplayName: user.email,
            scopeType: "SYSTEM",
            summary: "System Admin role granted"
          },
          tx
        );
      }

      return userResponse(user);
    });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function updateUser(actor: AuthenticatedActor, userId: string, input: UpdateUserBody) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...userSelect, passwordHash: true }
  });

  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "User not found");
  }

  const nextName = input.name ?? existing.name;
  const nextEmail = input.email ?? existing.email;
  if (input.password) {
    const policyError = passwordPolicyError(input.password, nextEmail, nextName);
    if (policyError) {
      throw policyError;
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          name: input.name,
          email: input.email,
          passwordHash: input.password ? await hashPassword(input.password) : undefined,
          isSystemAdmin: input.isSystemAdmin,
          isActive: input.isActive,
          updatedByUserId: actor.id
        },
        select: userSelect
      });

      if (existing.isActive && !updated.isActive) {
        await tx.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() }
        });
      }

      const fieldChanges: AuditFieldChangeInput[] = buildFieldChanges(existing, updated, [
        { name: "name", label: "Name", valueType: "TEXT" },
        { name: "email", label: "Email", valueType: "TEXT" },
        { name: "isSystemAdmin", label: "System Admin", valueType: "BOOLEAN" },
        { name: "isActive", label: "Active", valueType: "BOOLEAN" }
      ]);

      if (input.password) {
        fieldChanges.push({
          fieldName: "password",
          fieldLabel: "Password",
          previousValue: "[REDACTED]",
          newValue: "[REDACTED]",
          valueType: "TEXT"
        });
      }

      await recordAuditEvent(
        {
          action: auditActions.userUpdated,
          actor,
          objectType: "USER",
          objectId: updated.id,
          objectDisplayName: updated.email,
          scopeType: "SYSTEM",
          summary: "User updated",
          fieldChanges
        },
        tx
      );

      if (!existing.isSystemAdmin && updated.isSystemAdmin) {
        await recordAuditEvent(
          {
            action: auditActions.systemAdminGranted,
            actor,
            objectType: "USER",
            objectId: updated.id,
            objectDisplayName: updated.email,
            scopeType: "SYSTEM",
            summary: "System Admin role granted"
          },
          tx
        );
      }

      if (existing.isSystemAdmin && !updated.isSystemAdmin) {
        await recordAuditEvent(
          {
            action: auditActions.systemAdminRemoved,
            actor,
            objectType: "USER",
            objectId: updated.id,
            objectDisplayName: updated.email,
            scopeType: "SYSTEM",
            summary: "System Admin role removed"
          },
          tx
        );
      }

      return userResponse(updated);
    });
  } catch (error) {
    mapPrismaError(error);
  }
}

export async function updateOwnProfile(actor: AuthenticatedActor, input: UpdateOwnProfileBody) {
  const existing = await prisma.user.findUnique({
    where: { id: actor.id },
    select: userSelect
  });

  if (!existing || !existing.isActive) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  if (existing.name === input.name) {
    return userResponse(existing);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: actor.id },
      data: {
        name: input.name,
        updatedByUserId: actor.id
      },
      select: userSelect
    });

    await recordAuditEvent(
      {
        action: auditActions.userDisplayNameUpdated,
        actor: {
          ...actor,
          name: updated.name
        },
        objectType: "USER",
        objectId: updated.id,
        objectDisplayName: updated.email,
        scopeType: "SYSTEM",
        summary: "User updated own display name",
        fieldChanges: buildFieldChanges(existing, updated, [{ name: "name", label: "Name", valueType: "TEXT" }])
      },
      tx
    );

    return userResponse(updated);
  });
}

export async function changeOwnPassword(
  actor: AuthenticatedActor,
  input: ChangeOwnPasswordBody,
  currentRefreshToken?: string
) {
  const existing = await prisma.user.findUnique({
    where: { id: actor.id },
    select: {
      ...userSelect,
      passwordHash: true
    }
  });

  if (!existing || !existing.isActive) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  const passwordMatches = await verifyPassword(input.currentPassword, existing.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, "UNAUTHENTICATED", "Current password is incorrect");
  }

  const policyError = passwordPolicyError(input.newPassword, existing.email, existing.name);
  if (policyError) {
    throw policyError;
  }

  const nextHash = await hashPassword(input.newPassword);

  if (await verifyPassword(input.newPassword, existing.passwordHash)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Password does not meet policy", {
      newPassword: "New password must be different from your current password"
    });
  }

  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: actor.id },
      data: {
        passwordHash: nextHash,
        updatedByUserId: actor.id
      }
    });

    const revokedSessionCount = await revokeOtherRefreshTokens(actor.id, currentRefreshToken, tx);

    await recordAuditEvent(
      {
        action: auditActions.userPasswordChanged,
        actor,
        objectType: "USER",
        objectId: existing.id,
        objectDisplayName: existing.email,
        scopeType: "SYSTEM",
        summary: "User changed own password",
        metadataJson: {
          revokedOtherSessions: revokedSessionCount
        }
      },
      tx
    );

    return { success: true };
  });
}

export async function setUserActive(actor: AuthenticatedActor, userId: string, isActive: boolean) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect
  });

  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "User not found");
  }

  if (existing.isActive === isActive) {
    return userResponse(existing);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        isActive,
        updatedByUserId: actor.id
      },
      select: userSelect
    });

    if (!updated.isActive) {
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }

    await recordAuditEvent(
      {
        action: auditActionForUserActiveChange(isActive),
        actor,
        objectType: "USER",
        objectId: updated.id,
        objectDisplayName: updated.email,
        scopeType: "SYSTEM",
        summary: isActive ? "User activated" : "User deactivated",
        fieldChanges: buildFieldChanges(existing, updated, [
          { name: "isActive", label: "Active", valueType: "BOOLEAN" }
        ])
      },
      tx
    );

    return userResponse(updated);
  });
}

export async function unlockUser(actor: AuthenticatedActor, userId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect
  });

  if (!existing) {
    throw new ApiError(404, "NOT_FOUND", "User not found");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
        updatedByUserId: actor.id
      },
      select: userSelect
    });

    await recordAuditEvent(
      {
        action: auditActions.accountUnlocked,
        actor,
        objectType: "USER",
        objectId: updated.id,
        objectDisplayName: updated.email,
        scopeType: "SYSTEM",
        summary: "Account lockout cleared",
        fieldChanges: buildFieldChanges(existing, updated, [
          { name: "failedLoginAttempts", label: "Failed login attempts", valueType: "NUMBER" },
          { name: "lastFailedLoginAt", label: "Last failed login at", valueType: "DATE" },
          { name: "lockedUntil", label: "Locked until", valueType: "DATE" }
        ])
      },
      tx
    );

    return userResponse(updated);
  });
}

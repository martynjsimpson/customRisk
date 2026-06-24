// Internal shared module — not exported to route handlers.
// Used by configVersion.draft.service.ts and configVersion.publish.service.ts
// to avoid a circular dependency.

import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";

export async function findRegisterWithVersions(registerId: string) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: {
      id: true,
      name: true,
      currentConfigVersionId: true,
      draftConfigVersionId: true
    }
  });

  if (!register) {
    throw new ApiError(404, "NOT_FOUND", "Register not found");
  }

  return register;
}

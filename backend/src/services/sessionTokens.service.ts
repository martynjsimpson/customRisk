import type { Prisma } from "@prisma/client";

import { hashRefreshToken } from "../auth/refreshTokens.js";
import { prisma } from "../db/prisma.js";

type SessionTokenClient = typeof prisma | Prisma.TransactionClient;

export async function revokeActiveRefreshTokens(
  userId: string,
  client: SessionTokenClient = prisma,
  excludeTokenHash?: string
) {
  await client.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(excludeTokenHash ? { tokenHash: { not: excludeTokenHash } } : {})
    },
    data: { revokedAt: new Date() }
  });
}

export async function revokeRefreshToken(
  userId: string,
  refreshToken: string,
  client: SessionTokenClient = prisma
) {
  await client.refreshToken.updateMany({
    where: {
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}

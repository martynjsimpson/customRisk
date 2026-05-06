import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma.js";

export type PrismaAuditClient = typeof prisma | Prisma.TransactionClient;

const SECRET_FIELD_NAMES = new Set([
  "password",
  "passwordHash",
  "password_hash",
  "accessToken",
  "access_token",
  "token",
  "refreshToken",
  "refresh_token",
  "refreshTokenHash",
  "refresh_token_hash",
  "tokenHash",
  "token_hash",
  "jwt",
  "bearerToken",
  "bearer_token",
  "apiKey",
  "api_key",
  "apiKeyHash",
  "api_key_hash",
  "keyHash",
  "key_hash",
  "secret",
  "cookie",
  "authorization"
]);

export function isSecretField(fieldName: string) {
  return SECRET_FIELD_NAMES.has(fieldName);
}

export function safeAuditValue(fieldName: string, value: Prisma.InputJsonValue | null | undefined) {
  if (isSecretField(fieldName)) {
    return "[REDACTED]";
  }

  return value ?? Prisma.JsonNull;
}

export function getAuditClient(client?: PrismaAuditClient): PrismaAuditClient {
  return client ?? prisma;
}

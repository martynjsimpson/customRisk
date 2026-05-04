import { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma.js";

export type PrismaAuditClient = typeof prisma | Prisma.TransactionClient;

const SECRET_FIELD_NAMES = new Set([
  "password",
  "passwordHash",
  "password_hash",
  "token",
  "refreshToken",
  "refresh_token",
  "tokenHash",
  "token_hash",
  "apiKey",
  "api_key",
  "keyHash",
  "key_hash",
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

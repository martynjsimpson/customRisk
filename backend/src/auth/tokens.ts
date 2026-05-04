import crypto from "node:crypto";

import jwt from "jsonwebtoken";

import { getJwtAccessExpiry, getJwtAccessSecret } from "../config/env.js";

export interface AccessTokenPayload {
  sub: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign({ sub: payload.sub }, getJwtAccessSecret(), {
    expiresIn: getJwtAccessExpiry() as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getJwtAccessSecret());

  if (typeof decoded === "string" || typeof decoded.sub !== "string") {
    throw new Error("Invalid access token");
  }

  return { sub: decoded.sub };
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("base64url");
  const key = `cr_live_${raw}`;
  // Store the first 16 characters as a display prefix (8-char env prefix + 8 random chars)
  const prefix = key.substring(0, 16);
  return { key, prefix, hash: hashApiKey(key) };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

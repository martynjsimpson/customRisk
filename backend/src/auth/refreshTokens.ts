import crypto from "node:crypto";

const TOKEN_BYTE_LENGTH = 32;

export function generateRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(TOKEN_BYTE_LENGTH).toString("base64url");
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyRefreshTokenHash(token: string, storedHash: string): boolean {
  const expectedHash = Buffer.from(hashRefreshToken(token), "hex");
  const actualHash = Buffer.from(storedHash, "hex");
  if (expectedHash.length !== actualHash.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedHash, actualHash);
}

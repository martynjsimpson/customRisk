function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalBoolean(key: string): boolean {
  return process.env[key]?.toLowerCase() === "true";
}

export function getJwtAccessSecret(): string {
  return required("JWT_ACCESS_SECRET");
}

export function getJwtAccessExpiry(): string {
  return optional("JWT_ACCESS_EXPIRY", "60m");
}

export function getBcryptCostFactor(): number {
  return Number.parseInt(optional("BCRYPT_COST_FACTOR", "12"), 10);
}

export function getJwtRefreshExpiryDays(): number {
  return Number.parseInt(optional("JWT_REFRESH_EXPIRY_DAYS", "30"), 10);
}

export function getRateLimitWindowMs(): number {
  return Number.parseInt(optional("RATE_LIMIT_WINDOW_MS", "60000"), 10);
}

export function getRateLimitMaxLogin(): number {
  return Number.parseInt(optional("RATE_LIMIT_MAX_LOGIN", "10"), 10);
}

export function getCorsAllowedOrigins(): string[] {
  return optional("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getOptionalFeatureFlag(key: string): boolean {
  return optionalBoolean(key);
}

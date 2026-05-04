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

export function getJwtAccessSecret(): string {
  return required("JWT_ACCESS_SECRET");
}

export function getJwtAccessExpiry(): string {
  return optional("JWT_ACCESS_EXPIRY", "60m");
}

export function getBcryptCostFactor(): number {
  return Number.parseInt(optional("BCRYPT_COST_FACTOR", "12"), 10);
}

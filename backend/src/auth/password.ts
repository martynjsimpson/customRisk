import bcrypt from "bcryptjs";

import { getBcryptCostFactor } from "../config/env.js";

// Special characters required by the password policy (Security Model §4.2)
const SPECIAL_CHARS = new Set('!@#$%^&*()_+-=[]{}|;\':",.<>?');

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, getBcryptCostFactor());
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordPolicy(
  password: string,
  email: string,
  displayName: string
): string[] {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push("Password must be at least 12 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one digit");
  }

  if (![...password].some((c) => SPECIAL_CHARS.has(c))) {
    errors.push("Password must contain at least one special character");
  }

  if (password.toLowerCase() === email.toLowerCase()) {
    errors.push("Password must not match your email address");
  }

  if (password.toLowerCase() === displayName.toLowerCase()) {
    errors.push("Password must not match your display name");
  }

  return errors;
}

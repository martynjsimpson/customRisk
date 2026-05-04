import type { RegisterPermissionRole } from "@prisma/client";

export type EffectiveRegisterRole = "SYSTEM_ADMIN" | RegisterPermissionRole | "RISK_OWNER" | "NONE";

const roleRank: Record<EffectiveRegisterRole, number> = {
  NONE: 0,
  RISK_OWNER: 1,
  REGISTER_VIEWER: 2,
  REGISTER_ADMIN: 3,
  SYSTEM_ADMIN: 4
};

export function highestRole(roles: EffectiveRegisterRole[]): EffectiveRegisterRole {
  return roles.reduce<EffectiveRegisterRole>((highest, role) => {
    return roleRank[role] > roleRank[highest] ? role : highest;
  }, "NONE");
}

export function roleAtLeast(role: EffectiveRegisterRole, minimum: EffectiveRegisterRole) {
  return roleRank[role] >= roleRank[minimum];
}

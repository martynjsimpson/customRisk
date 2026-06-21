import type { RegisterPermissionRole } from "@prisma/client";

export type EffectiveRegisterRole = "SYSTEM_ADMIN" | RegisterPermissionRole | "RISK_OWNER" | "RESPONSE_ACTION_OWNER" | "NONE";

const roleRank: Record<EffectiveRegisterRole, number> = {
  NONE: 0,
  RESPONSE_ACTION_OWNER: 1,
  RISK_OWNER: 2,
  REGISTER_VIEWER: 3,
  REGISTER_ADMIN: 4,
  SYSTEM_ADMIN: 5
};

export function highestRole(roles: EffectiveRegisterRole[]): EffectiveRegisterRole {
  return roles.reduce<EffectiveRegisterRole>((highest, role) => {
    return roleRank[role] > roleRank[highest] ? role : highest;
  }, "NONE");
}

export function roleAtLeast(role: EffectiveRegisterRole, minimum: EffectiveRegisterRole) {
  return roleRank[role] >= roleRank[minimum];
}

export const auditActions = {
  loginSucceeded: "LOGIN_SUCCEEDED",
  loginFailed: "LOGIN_FAILED",
  logout: "LOGOUT",
  refreshTokenReuseDetected: "REFRESH_TOKEN_REUSE_DETECTED",
  accountLocked: "ACCOUNT_LOCKED",
  accountUnlocked: "ACCOUNT_UNLOCKED",
  userCreated: "USER_CREATED",
  userUpdated: "USER_UPDATED",
  userActivated: "USER_ACTIVATED",
  userDeactivated: "USER_DEACTIVATED",
  systemAdminGranted: "SYSTEM_ADMIN_GRANTED",
  systemAdminRemoved: "SYSTEM_ADMIN_REMOVED",
  registerCreated: "REGISTER_CREATED",
  registerSettingsUpdated: "REGISTER_SETTINGS_UPDATED",
  registerAdminAdded: "REGISTER_ADMIN_ADDED",
  registerAdminRemoved: "REGISTER_ADMIN_REMOVED",
  registerViewerAdded: "REGISTER_VIEWER_ADDED",
  registerViewerRemoved: "REGISTER_VIEWER_REMOVED"
} as const;

export type AuditAction = (typeof auditActions)[keyof typeof auditActions];

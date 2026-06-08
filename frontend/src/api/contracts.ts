export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  isSystemAdmin: boolean;
  isActive: boolean;
}

export type RegisterRole = "REGISTER_ADMIN" | "REGISTER_VIEWER";

export interface CurrentPermissions {
  isSystemAdmin: boolean;
  registerRoles: Array<{
    registerId: string;
    role: RegisterRole;
  }>;
}

export interface RiskTableColumnPreferences {
  registers?: Record<string, string[]>;
  myRisks?: string[];
}

export interface UserPreferences {
  colorScheme?: "light" | "dark" | "auto";
  riskTableColumns?: RiskTableColumnPreferences;
}

export interface EnabledFeatures {
  userPreferences: boolean;
  samlAuth: boolean;
  draftConfig: boolean;
  childActions: boolean;
  notifications: boolean;
  csvImport: boolean;
  attachments: boolean;
  apiKeys: boolean;
  webhooks: boolean;
}

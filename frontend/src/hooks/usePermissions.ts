import { useAuth } from "../auth/session";

export function usePermissions() {
  const { permissions } = useAuth();

  return {
    isSystemAdmin: permissions?.isSystemAdmin ?? false,
    registerRoles: permissions?.registerRoles ?? []
  };
}

import { useAuth } from "../auth/session";

export function useCurrentUser() {
  const { user, permissions, isBootstrapping } = useAuth();

  return {
    user,
    permissions,
    isBootstrapping
  };
}

import type { QueryClient } from "@tanstack/react-query";

export function invalidateCustomFieldConfiguration(queryClient: QueryClient, registerId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["register-config", registerId] }),
    // Use refetchType: "all" so the cache is refreshed even when the Risks panel
    // is unmounted (i.e. the user is on the Configuration tab). Without this, the
    // invalidation only marks the query stale but does not trigger a fetch, meaning
    // the panel remounts with stale reviewStatusPosition until the background
    // refetch completes — causing the risk detail modal to show the old position.
    queryClient.invalidateQueries({ queryKey: ["risk-form-config", registerId], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: ["custom-field-options", registerId] })
  ]);
}

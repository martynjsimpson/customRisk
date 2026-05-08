import type { QueryClient } from "@tanstack/react-query";

export function invalidateCustomFieldConfiguration(queryClient: QueryClient, registerId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["register-config", registerId] }),
    queryClient.invalidateQueries({ queryKey: ["risk-form-config", registerId] }),
    queryClient.invalidateQueries({ queryKey: ["custom-field-options", registerId] })
  ]);
}

import type { QueryClient } from "@tanstack/react-query";

export function invalidateScoringConfiguration(queryClient: QueryClient, registerId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["register-config", registerId] }),
    queryClient.invalidateQueries({ queryKey: ["risk-form-config", registerId] }),
    queryClient.invalidateQueries({ queryKey: ["register-matrix", registerId] })
  ]);
}

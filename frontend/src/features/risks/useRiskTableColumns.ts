import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateMyPreferences } from "../../api/preferences.api";
import { PREFERENCES_QUERY_KEY, usePreferences } from "../../hooks/usePreferences";
import {
  DEFAULT_MY_RISKS_COLUMNS,
  DEFAULT_REGISTER_TABLE_COLUMNS,
  parseCustomRegisterColumnKey,
} from "./riskTableColumns";

// Hook for register-specific risk table columns
export function useRegisterTableColumns(registerId: string) {
  const preferences = usePreferences();
  const queryClient = useQueryClient();

  const savedColumns = useMemo<string[]>(() => {
    return preferences?.riskTableColumns?.registers?.[registerId] ?? DEFAULT_REGISTER_TABLE_COLUMNS;
  }, [preferences, registerId]);

  const mutation = useMutation({
    mutationFn: (columns: string[]) => {
      const currentRiskTableColumns = preferences?.riskTableColumns ?? {};
      return updateMyPreferences({
        riskTableColumns: {
          ...currentRiskTableColumns,
          registers: {
            ...(currentRiskTableColumns.registers ?? {}),
            [registerId]: columns,
          },
        },
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(PREFERENCES_QUERY_KEY, updated);
    },
  });

  const setColumns = useCallback(
    (columns: string[]) => {
      mutation.mutate(columns);
    },
    [mutation]
  );

  return { visibleColumns: savedColumns, setColumns };
}

// Hook for My Risks cross-register table columns
export function useMyRisksTableColumns() {
  const preferences = usePreferences();
  const queryClient = useQueryClient();

  const savedColumns = useMemo<string[]>(() => {
    return preferences?.riskTableColumns?.myRisks ?? DEFAULT_MY_RISKS_COLUMNS;
  }, [preferences]);

  const mutation = useMutation({
    mutationFn: (columns: string[]) => {
      const currentRiskTableColumns = preferences?.riskTableColumns ?? {};
      return updateMyPreferences({
        riskTableColumns: {
          ...currentRiskTableColumns,
          myRisks: columns,
        },
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(PREFERENCES_QUERY_KEY, updated);
    },
  });

  const setColumns = useCallback(
    (columns: string[]) => {
      mutation.mutate(columns);
    },
    [mutation]
  );

  return { visibleColumns: savedColumns, setColumns };
}

// Filters out custom field column keys whose field no longer exists or is inactive
export function filterValidRegisterColumns(
  columns: string[],
  activeCustomFieldIds: Set<string>
): string[] {
  return columns.filter((key) => {
    const fieldId = parseCustomRegisterColumnKey(key);
    if (fieldId === null) return true; // core column, always valid
    return activeCustomFieldIds.has(fieldId);
  });
}

import { Group, Select, TextInput } from "@mantine/core";

import { type RiskListQuery, type RiskState } from "../../api/risks.api";
import type { RiskFormConfig } from "../../api/risks.api";

const REVIEW_STATUS_OPTIONS = [
  { value: "NOT_REQUIRED", label: "Not required" },
  { value: "NOT_REVIEWED", label: "Not reviewed" },
  { value: "NOT_DUE", label: "Not due" },
  { value: "DUE_SOON", label: "Due soon" },
  { value: "OVERDUE", label: "Overdue" }
] as const;

interface RiskFiltersProps {
  filters: RiskListQuery;
  formConfig: RiskFormConfig;
  ownerOptions: Array<{ value: string; label: string }>;
  onChange: (patch: Partial<RiskListQuery>) => void;
}

export function RiskFilters({ filters, formConfig, ownerOptions, onChange }: RiskFiltersProps) {
  return (
    <Group align="end">
      <TextInput
        label="Search"
        value={filters.search ?? ""}
        onChange={(event) => onChange({ search: event.currentTarget.value || undefined })}
      />
      <Select
        label="State"
        clearable
        data={formConfig.states}
        value={filters.state ?? null}
        onChange={(value) => onChange({ state: (value as RiskState | null) ?? undefined })}
      />
      <Select
        label="Risk level"
        clearable
        data={formConfig.riskLevels.map((level) => ({ value: level.id, label: level.name }))}
        value={filters.riskLevelId ?? null}
        onChange={(value) => onChange({ riskLevelId: value ?? undefined })}
      />
      <Select
        label="Owner"
        clearable
        searchable
        data={ownerOptions}
        value={filters.ownerUserId ?? null}
        onChange={(value) => onChange({ ownerUserId: value ?? undefined })}
      />
      <Select
        label="Review"
        clearable
        data={REVIEW_STATUS_OPTIONS}
        value={filters.reviewStatus ?? null}
        onChange={(value) => onChange({ reviewStatus: (value as RiskListQuery["reviewStatus"]) ?? undefined })}
      />
    </Group>
  );
}

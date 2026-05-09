import { Group, Select, TextInput } from "@mantine/core";

import type { AuditQuery } from "../../api/audit.api";
import { actionLabel } from "./auditFormatters";

function actionOption(value: string) {
  return { value, label: actionLabel(value) };
}

const ACTION_OPTIONS = [
  {
    group: "Authentication",
    items: [
      "LOGIN_SUCCEEDED",
      "LOGIN_FAILED",
      "LOGOUT",
      "REFRESH_TOKEN_REUSE_DETECTED",
      "ACCOUNT_LOCKED",
      "ACCOUNT_UNLOCKED"
    ].map(actionOption)
  },
  {
    group: "Users",
    items: [
      "USER_CREATED",
      "USER_UPDATED",
      "USER_ACTIVATED",
      "USER_DEACTIVATED",
      "SYSTEM_ADMIN_GRANTED",
      "SYSTEM_ADMIN_REMOVED",
      "PROFILE_UPDATED",
      "PASSWORD_CHANGED",
      "PREFERENCES_UPDATED",
      "PERSON_REFERENCE_CREATED",
      "PERSON_REFERENCE_LINKED"
    ].map(actionOption)
  },
  {
    group: "Registers",
    items: [
      "REGISTER_CREATED",
      "REGISTER_SETTINGS_UPDATED",
      "REGISTER_ADMIN_ADDED",
      "REGISTER_ADMIN_REMOVED",
      "REGISTER_VIEWER_ADDED",
      "REGISTER_VIEWER_REMOVED"
    ].map(actionOption)
  },
  {
    group: "Configuration",
    items: [
      "CUSTOM_FIELD_CREATED",
      "CUSTOM_FIELD_UPDATED",
      "CUSTOM_FIELD_ACTIVATED",
      "CUSTOM_FIELD_DEACTIVATED",
      "CUSTOM_FIELD_OPTION_CREATED",
      "CUSTOM_FIELD_OPTION_UPDATED",
      "CUSTOM_FIELD_OPTION_DEACTIVATED",
      "LIKELIHOOD_VALUE_CREATED",
      "LIKELIHOOD_VALUE_UPDATED",
      "LIKELIHOOD_VALUE_DEACTIVATED",
      "IMPACT_VALUE_CREATED",
      "IMPACT_VALUE_UPDATED",
      "IMPACT_VALUE_DEACTIVATED",
      "RISK_LEVEL_CREATED",
      "RISK_LEVEL_UPDATED",
      "RISK_LEVEL_DEACTIVATED",
      "RISK_MATRIX_UPDATED"
    ].map(actionOption)
  },
  {
    group: "Risks",
    items: [
      "RISK_CREATED",
      "RISK_UPDATED",
      "RISK_DELETED",
      "RISK_REVIEWED",
      "NEXT_REVIEW_DATE_UPDATED",
      "RISK_EXPORT_GENERATED"
    ].map(actionOption)
  }
];

const OBJECT_TYPE_OPTIONS = [
  { value: "AUTH", label: "Auth" },
  { value: "USER", label: "User" },
  { value: "REGISTER", label: "Register" },
  { value: "REGISTER_PERMISSION", label: "Register permission" },
  { value: "RISK", label: "Risk" },
  { value: "RISK_REVIEW", label: "Risk review" },
  { value: "CUSTOM_FIELD", label: "Custom field" },
  { value: "CUSTOM_FIELD_OPTION", label: "Custom field option" },
  { value: "LIKELIHOOD_VALUE", label: "Likelihood value" },
  { value: "IMPACT_VALUE", label: "Impact value" },
  { value: "RISK_LEVEL", label: "Risk level" },
  { value: "RISK_MATRIX", label: "Risk matrix" },
  { value: "EXPORT", label: "Export" }
];

interface AuditFiltersProps {
  filters: AuditQuery;
  onChange: (patch: Partial<AuditQuery>) => void;
}

export function AuditFilters({ filters, onChange }: AuditFiltersProps) {
  return (
    <Group align="end">
      <TextInput
        label="Search"
        placeholder="Summary, object, or risk ID"
        value={filters.search ?? ""}
        onChange={(event) => onChange({ search: event.currentTarget.value || undefined })}
      />
      <TextInput
        label="Actor"
        placeholder="Name or email"
        value={filters.actorName ?? ""}
        onChange={(event) => onChange({ actorName: event.currentTarget.value || undefined })}
      />
      <TextInput
        label="From date"
        type="date"
        value={filters.dateFrom ?? ""}
        onChange={(event) => onChange({ dateFrom: event.currentTarget.value || undefined })}
      />
      <TextInput
        label="To date"
        type="date"
        value={filters.dateTo ?? ""}
        onChange={(event) => onChange({ dateTo: event.currentTarget.value || undefined })}
      />
      <Select
        label="Action"
        clearable
        searchable
        data={ACTION_OPTIONS}
        value={filters.action ?? null}
        onChange={(value) => onChange({ action: value ?? undefined })}
      />
      <Select
        label="Object type"
        clearable
        data={OBJECT_TYPE_OPTIONS}
        value={filters.objectType ?? null}
        onChange={(value) => onChange({ objectType: value ?? undefined })}
      />
    </Group>
  );
}

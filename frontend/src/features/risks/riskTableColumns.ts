import type { RiskListCustomFieldValue } from "../../api/risks.api";
import type { CustomFieldDefinition } from "../../api/risks.api";

// Column key format:
//   Core columns:            "riskId" | "title" | "state" | "owner" | "likelihood" | "impact" | "score" | "level" | "response" | "nextReview" | "reviewStatus"
//   Custom (register table): "custom:<fieldId>"
//   Custom (My Risks table): "custom:<registerId>:<fieldId>"

export interface CoreColumnDef {
  key: string;
  label: string;
  displayOrder: number;
}

// Display orders are intentionally aligned with CORE_RISK_FIELDS so that
// custom fields (which carry their own displayOrder from register config)
// can be interleaved correctly in the rendered column sequence.
export const REGISTER_TABLE_CORE_COLUMNS: CoreColumnDef[] = [
  { key: "riskId",       label: "Risk ID",      displayOrder: 0   },
  { key: "title",        label: "Title",         displayOrder: 100 },
  { key: "state",        label: "State",         displayOrder: 300 },
  { key: "owner",        label: "Owner",         displayOrder: 500 },
  { key: "likelihood",   label: "Likelihood",    displayOrder: 600 },
  { key: "impact",       label: "Impact",        displayOrder: 700 },
  { key: "score",        label: "Score",         displayOrder: 750 },
  { key: "level",        label: "Level",         displayOrder: 760 },
  { key: "response",     label: "Response",      displayOrder: 800 },
  { key: "nextReview",   label: "Next Review",   displayOrder: 910 },
  { key: "reviewStatus", label: "Review",        displayOrder: 920 },
];

export const MY_RISKS_CORE_COLUMNS: CoreColumnDef[] = [
  { key: "riskId",       label: "Risk ID",      displayOrder: 0   },
  { key: "register",     label: "Register",      displayOrder: 50  },
  { key: "title",        label: "Title",         displayOrder: 100 },
  { key: "state",        label: "State",         displayOrder: 300 },
  { key: "owner",        label: "Owner",         displayOrder: 500 },
  { key: "score",        label: "Score",         displayOrder: 750 },
  { key: "level",        label: "Level",         displayOrder: 760 },
  { key: "nextReview",   label: "Next Review",   displayOrder: 910 },
  { key: "reviewStatus", label: "Review",        displayOrder: 920 },
];

export const DEFAULT_REGISTER_TABLE_COLUMNS: string[] = [
  "riskId", "title", "state", "owner", "likelihood", "impact", "score", "level", "response", "nextReview", "reviewStatus",
];

export const DEFAULT_MY_RISKS_COLUMNS: string[] = [
  "riskId", "register", "title", "state", "level", "nextReview", "reviewStatus",
];

export function customRegisterColumnKey(fieldId: string): string {
  return `custom:${fieldId}`;
}

export function customMyRisksColumnKey(registerId: string, fieldId: string): string {
  return `custom:${registerId}:${fieldId}`;
}

export function parseCustomRegisterColumnKey(key: string): string | null {
  if (!key.startsWith("custom:")) return null;
  const parts = key.split(":");
  // register table key: "custom:<fieldId>" — exactly 2 parts
  if (parts.length !== 2) return null;
  return parts[1] ?? null;
}

export function parseCustomMyRisksColumnKey(key: string): { registerId: string; fieldId: string } | null {
  if (!key.startsWith("custom:")) return null;
  const parts = key.split(":");
  // my-risks key: "custom:<registerId>:<fieldId>" — exactly 3 parts
  if (parts.length !== 3) return null;
  const [, registerId, fieldId] = parts;
  if (!registerId || !fieldId) return null;
  return { registerId, fieldId };
}

// Returns the display order for a column key in the register risks table.
// Custom fields carry their displayOrder from the server response.
export function getRegisterColumnDisplayOrder(
  key: string,
  coreColumns: CoreColumnDef[],
  customFields: CustomFieldDefinition[]
): number {
  const core = coreColumns.find((c) => c.key === key);
  if (core) return core.displayOrder;
  const fieldId = parseCustomRegisterColumnKey(key);
  if (fieldId) {
    const def = customFields.find((f) => f.id === fieldId);
    if (def) return def.displayOrder;
  }
  return Number.MAX_SAFE_INTEGER;
}

// Returns the display order for a column key in the My Risks table.
// Custom fields carry a display order derived from their field definition,
// offset by a large per-register multiplier so registers sort together.
export function getMyRisksColumnDisplayOrder(
  key: string,
  coreColumns: CoreColumnDef[],
  availableCustomFields: Array<{ columnKey: string; displayOrder: number; registerSortKey: string }>
): number {
  const core = coreColumns.find((c) => c.key === key);
  if (core) return core.displayOrder;
  const field = availableCustomFields.find((f) => f.columnKey === key);
  if (field) return field.displayOrder;
  return Number.MAX_SAFE_INTEGER;
}

// Sorts a list of visible column keys into canonical display order.
export function sortColumnsByDisplayOrder(
  columns: string[],
  getOrder: (key: string) => number
): string[] {
  return [...columns].sort((a, b) => getOrder(a) - getOrder(b));
}

export function renderCustomFieldValue(value: RiskListCustomFieldValue | undefined): string {
  if (!value) return "—";
  if (value.textValue !== null) return value.textValue;
  if (value.numberValue !== null) return String(value.numberValue);
  if (value.booleanValue !== null) return value.booleanValue ? "Yes" : "No";
  if (value.dateValue !== null) return value.dateValue;
  if (value.person) return value.person.displayName;
  if (value.personUser) return value.personUser.name;
  if (value.dropdownOption) return value.dropdownOption.label;
  return "—";
}

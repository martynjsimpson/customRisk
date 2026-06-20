// Canonical shape of register_config_version.snapshot_json and register_template_version.snapshot_json.
// This type must be kept in sync with the relational config tables it mirrors.
// Decimal values are serialised as strings to preserve precision across JSON round-trips.

export interface ConfigSnapshotCustomFieldOption {
  id: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ConfigSnapshotCustomField {
  id: string;
  fieldName: string;
  fieldType: string;
  helpText: string | null;
  isRequired: boolean;
  validationMode: "ALLOW" | "WARN" | "BLOCK";
  displayOrder: number;
  isActive: boolean;
  options: ConfigSnapshotCustomFieldOption[];
}

export interface ConfigSnapshotLikelihoodValue {
  id: string;
  name: string;
  numericValue: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ConfigSnapshotImpactValue {
  id: string;
  name: string;
  numericValue: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ConfigSnapshotRiskLevel {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface ConfigSnapshotMatrixCell {
  id: string;
  likelihoodValueId: string;
  impactValueId: string;
  riskLevelId: string;
}

export interface ConfigSnapshotResponseStrategy {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ConfigSnapshotRegisterSettings {
  name: string;
  description: string | null;
  riskIdPrefix: string | null;
  riskIdZeroPaddingEnabled: boolean;
  riskIdZeroPaddingWidth: number;
  defaultNewRiskState: string;
  reviewsEnabled: boolean;
  defaultReviewFrequencyMonths: number;
  reviewAttestationText: string;
  allowViewerExport: boolean;
  customFieldValidationEnabled: boolean;
  reviewStatusPosition: number | null;
  scoringFormula: string;
}

export interface RegisterConfigSnapshot {
  register: ConfigSnapshotRegisterSettings;
  customFields: ConfigSnapshotCustomField[];
  likelihoodValues: ConfigSnapshotLikelihoodValue[];
  impactValues: ConfigSnapshotImpactValue[];
  riskLevels: ConfigSnapshotRiskLevel[];
  matrixCells: ConfigSnapshotMatrixCell[];
  responseStrategies: ConfigSnapshotResponseStrategy[];
}

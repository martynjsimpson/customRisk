export interface RiskIdSettings {
  riskIdPrefix?: string | null;
  riskIdZeroPaddingEnabled: boolean;
  riskIdZeroPaddingWidth: number;
}

export function formatRiskId(sequence: number, settings: RiskIdSettings) {
  const sequencePart = settings.riskIdZeroPaddingEnabled
    ? String(sequence).padStart(settings.riskIdZeroPaddingWidth, "0")
    : String(sequence);
  const prefix = settings.riskIdPrefix?.trim();

  return prefix ? `${prefix}-${sequencePart}` : sequencePart;
}

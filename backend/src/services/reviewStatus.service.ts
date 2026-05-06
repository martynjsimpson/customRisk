export type RiskReviewStatus = "NOT_REQUIRED" | "NOT_REVIEWED" | "NOT_DUE" | "DUE_SOON" | "OVERDUE";

export const dueSoonWindowDays = 30;

export function utcDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getDueSoonLimit(today: Date = new Date()) {
  const limit = utcDateOnly(today);
  limit.setUTCDate(limit.getUTCDate() + dueSoonWindowDays);
  return limit;
}

export function getRiskReviewStatus(input: {
  reviewsEnabled: boolean;
  lastReviewedAt: Date | null;
  nextReviewDate: Date | null;
  today?: Date;
}): RiskReviewStatus {
  if (!input.reviewsEnabled) {
    return "NOT_REQUIRED";
  }

  if (!input.lastReviewedAt) {
    return "NOT_REVIEWED";
  }

  if (!input.nextReviewDate) {
    return "NOT_DUE";
  }

  const today = utcDateOnly(input.today ?? new Date());
  const nextReviewDate = utcDateOnly(input.nextReviewDate);
  const dueSoonLimit = getDueSoonLimit(today);

  if (nextReviewDate < today) {
    return "OVERDUE";
  }

  if (nextReviewDate <= dueSoonLimit) {
    return "DUE_SOON";
  }

  return "NOT_DUE";
}

export function isRiskOverdue(input: {
  reviewsEnabled: boolean;
  nextReviewDate: Date | null;
  state: string;
  today?: Date;
}) {
  if (!input.reviewsEnabled || input.state === "CLOSED" || !input.nextReviewDate) {
    return false;
  }

  return utcDateOnly(input.nextReviewDate) < utcDateOnly(input.today ?? new Date());
}

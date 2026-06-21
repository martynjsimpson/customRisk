import type { Prisma } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";
import { canEditRisk, canViewRisk } from "../permissions/riskAccess.js";
import type { AuthenticatedActor } from "../types/express.js";
import { calculateNextReviewDate } from "./scoring.service.js";
import { recordAuditEvent } from "./audit.service.js";
import type { CreateRiskReviewBody } from "../validators/risks.schemas.js";
import { toDateOnlyString } from "../utils/formatters.js";

const RISK_REVIEW_HISTORY_CAP = 100;

type ReviewClient = typeof prisma | Prisma.TransactionClient;

function hiddenNotFound() {
  return new ApiError(404, "NOT_FOUND", "Risk not found");
}

function mapRiskReview(
  review: Prisma.RiskReviewGetPayload<{
    include: { reviewedBy: { select: { id: true; name: true; email: true } } };
  }>
) {
  return {
    id: review.id,
    reviewedBy: review.reviewedBy,
    reviewedAt: review.reviewedAt,
    comment: review.comment,
    attestationText: review.attestationText,
    calculatedNextReviewDate: toDateOnlyString(review.calculatedNextReviewDate)
  };
}

async function ensureRiskViewAccess(
  actor: AuthenticatedActor,
  registerId: string,
  riskId: string,
  client: ReviewClient = prisma
) {
  if (!(await canViewRisk(actor, registerId, riskId, client))) {
    throw hiddenNotFound();
  }
}

async function ensureRiskEditAccess(
  actor: AuthenticatedActor,
  registerId: string,
  riskId: string,
  client: ReviewClient = prisma
) {
  if (!(await canEditRisk(actor, registerId, riskId, client))) {
    throw hiddenNotFound();
  }
}

export async function listRiskReviews(
  actor: AuthenticatedActor,
  registerId: string,
  riskId: string
) {
  await ensureRiskViewAccess(actor, registerId, riskId);

  const reviews = await prisma.riskReview.findMany({
    where: { registerId, riskId },
    include: { reviewedBy: { select: { id: true, name: true, email: true } } },
    orderBy: { reviewedAt: "desc" },
    take: RISK_REVIEW_HISTORY_CAP
  });

  return reviews.map(mapRiskReview);
}

export async function completeRiskReview(
  actor: AuthenticatedActor,
  registerId: string,
  riskId: string,
  input: CreateRiskReviewBody
) {
  if (!input.confirmed) {
    throw new ApiError(400, "VALIDATION_ERROR", "User must confirm the review", {
      confirmed: "User must confirm the review"
    });
  }

  return prisma.$transaction(async (tx) => {
    const risk = await tx.risk.findFirst({
      where: { id: riskId, registerId },
      include: {
        register: {
          select: {
            reviewsEnabled: true,
            defaultReviewFrequencyMonths: true,
            reviewAttestationText: true
          }
        }
      }
    });

    if (!risk) {
      throw hiddenNotFound();
    }

    await ensureRiskEditAccess(actor, registerId, riskId, tx);

    if (!risk.register.reviewsEnabled) {
      throw new ApiError(400, "VALIDATION_ERROR", "Risk reviews are disabled for this register", {
        registerId: "Risk reviews are disabled for this register"
      });
    }

    const reviewedAt = new Date();
    const calculatedNextReviewDate = calculateNextReviewDate({
      reviewsEnabled: risk.register.reviewsEnabled,
      baseDate: reviewedAt,
      defaultReviewFrequencyMonths: risk.register.defaultReviewFrequencyMonths
    });

    if (!calculatedNextReviewDate) {
      throw new ApiError(400, "VALIDATION_ERROR", "Risk reviews are disabled for this register", {
        registerId: "Risk reviews are disabled for this register"
      });
    }

    const review = await tx.riskReview.create({
      data: {
        riskId,
        registerId,
        reviewedByUserId: actor.id,
        reviewedAt,
        comment: input.comment,
        attestationText: risk.register.reviewAttestationText,
        calculatedNextReviewDate
      },
      include: { reviewedBy: { select: { id: true, name: true, email: true } } }
    });

    const updatedRisk = await tx.risk.update({
      where: { id: riskId },
      data: {
        lastReviewedAt: reviewedAt,
        lastReviewedByUserId: actor.id,
        nextReviewDate: calculatedNextReviewDate,
        systemUpdatedByUserId: actor.id
      },
      select: {
        id: true,
        displayRiskId: true,
        nextReviewDate: true
      }
    });

    await recordAuditEvent(
      {
        action: auditActions.riskReviewed,
        actor,
        objectType: "RISK_REVIEW",
        objectId: review.id,
        objectDisplayName: updatedRisk.displayRiskId,
        scopeType: "RISK",
        registerId,
        riskId,
        displayRiskId: updatedRisk.displayRiskId,
        summary: `Risk ${updatedRisk.displayRiskId} reviewed`,
        metadataJson: {
          reviewedAt: reviewedAt.toISOString(),
          commentProvided: Boolean(input.comment)
        },
        fieldChanges: [
          {
            fieldName: "nextReviewDate",
            fieldLabel: "Next Review Date",
            previousValue: toDateOnlyString(risk.nextReviewDate),
            newValue: toDateOnlyString(updatedRisk.nextReviewDate),
            valueType: "DATE"
          }
        ]
      },
      tx
    );

    return mapRiskReview(review);
  });
}

import type { Prisma } from "@prisma/client";

import type { AuthenticatedActor } from "../types/express.js";

function jsonDate(value: Date | null) {
  return value ? value.toISOString() : null;
}

function jsonDateOnly(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function buildRiskDeleteSnapshot(
  risk: Prisma.RiskGetPayload<{
    include: {
      register: { select: { id: true; name: true } };
      owner: { select: { id: true; name: true; email: true; isActive: true } };
      likelihoodValue: true;
      impactValue: true;
      riskLevel: true;
      responseStrategy: true;
      lastReviewedBy: { select: { id: true; name: true; email: true } };
      systemCreatedBy: { select: { id: true; name: true; email: true } };
      systemUpdatedBy: { select: { id: true; name: true; email: true } };
      customFieldValues: {
        include: {
          customFieldDefinition: true;
          dropdownOption: true;
          personUser: { select: { id: true; name: true; email: true; isActive: true } };
        };
      };
      reviews: {
        include: {
          reviewedBy: { select: { id: true; name: true; email: true } };
        };
      };
    };
  }>,
  actor: AuthenticatedActor,
  deletionReason?: string
): Prisma.InputJsonValue {
  return {
    risk: {
      id: risk.id,
      registerId: risk.registerId,
      displayRiskId: risk.displayRiskId,
      riskSequence: risk.riskSequence,
      title: risk.title,
      description: risk.description,
      state: risk.state,
      createdDate: jsonDateOnly(risk.createdDate)
    },
    register: risk.register,
    owner: risk.owner,
    scoring: {
      likelihood: {
        id: risk.likelihoodValue.id,
        name: risk.likelihoodValue.name,
        numericValue: risk.likelihoodValue.numericValue.toString(),
        displayOrder: risk.likelihoodValue.displayOrder
      },
      impact: {
        id: risk.impactValue.id,
        name: risk.impactValue.name,
        numericValue: risk.impactValue.numericValue.toString(),
        displayOrder: risk.impactValue.displayOrder
      },
      riskScore: risk.riskScore.toString(),
      riskLevel: {
        id: risk.riskLevel.id,
        name: risk.riskLevel.name,
        displayOrder: risk.riskLevel.displayOrder
      }
    },
    response: {
      strategy: {
        id: risk.responseStrategy.id,
        name: risk.responseStrategy.name,
        displayOrder: risk.responseStrategy.displayOrder
      },
      action: risk.responseAction
    },
    customFields: risk.customFieldValues.map((value) => ({
      id: value.id,
      definition: value.customFieldDefinition,
      textValue: value.textValue,
      numberValue: value.numberValue?.toString() ?? null,
      booleanValue: value.booleanValue,
      dateValue: jsonDateOnly(value.dateValue),
      personUser: value.personUser,
      dropdownOption: value.dropdownOption
    })),
    reviews: risk.reviews.map((review) => ({
      id: review.id,
      reviewedBy: review.reviewedBy,
      reviewedAt: jsonDate(review.reviewedAt),
      comment: review.comment,
      attestationText: review.attestationText,
      calculatedNextReviewDate: jsonDateOnly(review.calculatedNextReviewDate)
    })),
    systemMetadata: {
      lastReviewedAt: jsonDate(risk.lastReviewedAt),
      lastReviewedBy: risk.lastReviewedBy,
      nextReviewDate: jsonDateOnly(risk.nextReviewDate),
      systemCreatedAt: jsonDate(risk.systemCreatedAt),
      systemCreatedBy: risk.systemCreatedBy,
      systemUpdatedAt: jsonDate(risk.systemUpdatedAt),
      systemUpdatedBy: risk.systemUpdatedBy
    },
    deletion: {
      actor: {
        id: actor.id,
        name: actor.name,
        email: actor.email
      },
      deletedAt: new Date().toISOString(),
      reason: deletionReason ?? null
    }
  };
}

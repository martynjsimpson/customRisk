import type { Prisma } from "@prisma/client";

import { auditActions } from "../audit/auditActions.js";
import { prisma } from "../db/prisma.js";
import { rowsToCsv } from "../utils/csv.js";
import type { AuthenticatedActor } from "../types/express.js";
import type { ListRisksQuery } from "../validators/risks.schemas.js";
import { listRisks } from "./risks.service.js";
import { recordAuditEvent } from "./audit.service.js";

const riskExportHeaders = [
  "Risk ID",
  "Title",
  "State",
  "Owner",
  "Owner Email",
  "Likelihood",
  "Impact",
  "Risk Score",
  "Risk Level",
  "Next Review Date",
  "Review Status",
  "Last Updated"
];

function filenameFromRegisterName(registerName: string) {
  const slug = registerName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug || "risk-register"}-risk-register.csv`;
}

export async function exportRisksCsv(
  actor: AuthenticatedActor,
  registerId: string,
  query: ListRisksQuery
) {
  const register = await prisma.register.findUnique({
    where: { id: registerId },
    select: { id: true, name: true }
  });

  if (!register) {
    throw new Error("Register not found");
  }

  const result = await listRisks(actor, registerId, {
    ...query,
    page: 1,
    pageSize: 10000
  });
  const rows = result.data.map((risk) => ({
    "Risk ID": risk.displayRiskId,
    Title: risk.title,
    State: risk.state,
    Owner: risk.owner.name,
    "Owner Email": risk.owner.email,
    Likelihood: risk.likelihood.name,
    Impact: risk.impact.name,
    "Risk Score": risk.riskScore,
    "Risk Level": risk.riskLevel.name,
    "Next Review Date": risk.nextReviewDate,
    "Review Status": risk.reviewStatus,
    "Last Updated": risk.systemUpdatedAt.toISOString()
  }));
  const csv = rowsToCsv(riskExportHeaders, rows);

  await prisma.$transaction(async (tx) => {
    const exportJob = await tx.exportJob.create({
      data: {
        registerId,
        requestedByUserId: actor.id,
        filterJson: query as unknown as Prisma.InputJsonValue,
        includedClosedRisks: query.includeClosed,
        rowCount: rows.length,
        status: "COMPLETED",
        completedAt: new Date()
      }
    });

    await recordAuditEvent(
      {
        action: auditActions.riskExportGenerated,
        actor,
        objectType: "EXPORT",
        objectId: exportJob.id,
        objectDisplayName: register.name,
        scopeType: "REGISTER",
        registerId,
        summary: "Risk export generated",
        metadataJson: {
          rowCount: rows.length,
          includedClosedRisks: query.includeClosed,
          filters: query as unknown as Prisma.InputJsonValue
        }
      },
      tx
    );
  });

  return {
    csv,
    filename: filenameFromRegisterName(register.name),
    rowCount: rows.length
  };
}

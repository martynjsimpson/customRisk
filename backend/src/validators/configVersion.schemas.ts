import { z } from "zod";

import { customFieldTypes } from "./customFields.schemas.js";

// Re-export registerIdParamsSchema for use in this context
export { registerIdParamsSchema } from "./registers.schemas.js";

// --- Snapshot section schemas ---

const snapshotCustomFieldOptionSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean()
});

const snapshotCustomFieldSchema = z.object({
  id: z.string().uuid(),
  fieldName: z.string().trim().min(1),
  fieldType: z.enum(customFieldTypes),
  helpText: z.string().nullable().optional(),
  isRequired: z.boolean(),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean(),
  options: z.array(snapshotCustomFieldOptionSchema)
});

const snapshotLikelihoodValueSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  numericValue: z.string(),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean()
});

const snapshotImpactValueSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  numericValue: z.string(),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean()
});

const snapshotRiskLevelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean()
});

const snapshotMatrixCellSchema = z.object({
  id: z.string().uuid(),
  likelihoodValueId: z.string().uuid(),
  impactValueId: z.string().uuid(),
  riskLevelId: z.string().uuid()
});

const snapshotResponseStrategySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean()
});

const snapshotRegisterSettingsSchema = z.object({
  description: z.string().nullable().optional(),
  riskIdPrefix: z.string().nullable().optional(),
  riskIdZeroPaddingEnabled: z.boolean().optional(),
  riskIdZeroPaddingWidth: z.number().int().min(2).max(12).optional(),
  defaultNewRiskState: z.string().optional(),
  reviewsEnabled: z.boolean().optional(),
  defaultReviewFrequencyMonths: z.number().int().min(1).max(120).optional(),
  reviewAttestationText: z.string().optional(),
  allowViewerExport: z.boolean().optional()
});

// --- Update draft body schema ---

export const updateDraftBodySchema = z.object({
  register: snapshotRegisterSettingsSchema.optional(),
  customFields: z.array(snapshotCustomFieldSchema).optional(),
  likelihoodValues: z.array(snapshotLikelihoodValueSchema).optional(),
  impactValues: z.array(snapshotImpactValueSchema).optional(),
  riskLevels: z.array(snapshotRiskLevelSchema).optional(),
  matrixCells: z.array(snapshotMatrixCellSchema).optional(),
  responseStrategies: z.array(snapshotResponseStrategySchema).optional()
});

export type UpdateDraftBody = z.infer<typeof updateDraftBodySchema>;

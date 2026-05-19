import { z } from "zod";

import { customFieldTypes } from "./customFields.schemas.js";

const importCustomFieldOptionSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean()
});

const importCustomFieldSchema = z.object({
  id: z.string().uuid(),
  fieldName: z.string().trim().min(1),
  fieldType: z.enum(customFieldTypes),
  helpText: z.string().nullable().optional(),
  isRequired: z.boolean(),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean(),
  options: z.array(importCustomFieldOptionSchema)
});

const importLikelihoodValueSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  numericValue: z.string(),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean()
});

const importImpactValueSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  numericValue: z.string(),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean()
});

const importRiskLevelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean()
});

const importMatrixCellSchema = z.object({
  id: z.string().uuid(),
  likelihoodValueId: z.string().uuid(),
  impactValueId: z.string().uuid(),
  riskLevelId: z.string().uuid()
});

const importResponseStrategySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean()
});

const importRegisterSettingsSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  riskIdPrefix: z.string().nullable().optional(),
  riskIdZeroPaddingEnabled: z.boolean(),
  riskIdZeroPaddingWidth: z.number().int().min(2).max(12),
  defaultNewRiskState: z.string(),
  reviewsEnabled: z.boolean(),
  defaultReviewFrequencyMonths: z.number().int().min(1).max(120),
  reviewAttestationText: z.string(),
  allowViewerExport: z.boolean()
});

const importConfigSchema = z.object({
  register: importRegisterSettingsSchema,
  customFields: z.array(importCustomFieldSchema),
  likelihoodValues: z.array(importLikelihoodValueSchema),
  impactValues: z.array(importImpactValueSchema),
  riskLevels: z.array(importRiskLevelSchema),
  matrixCells: z.array(importMatrixCellSchema),
  responseStrategies: z.array(importResponseStrategySchema)
});

export const importBodySchema = z.object({
  config: importConfigSchema
});

export type ImportBody = z.infer<typeof importBodySchema>;

import { z } from "zod";

export const likelihoodParamsSchema = z.object({
  registerId: z.string().uuid(),
  likelihoodId: z.string().uuid()
});

export const createLikelihoodValueSchema = z.object({
  name: z.string().trim().min(1),
  numericValue: z.number().positive(),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean().default(true)
});

export const updateLikelihoodValueSchema = z.object({
  name: z.string().trim().min(1).optional(),
  numericValue: z.number().positive().optional(),
  displayOrder: z.number().int().min(1).optional(),
  isActive: z.boolean().optional()
});

export type LikelihoodParams = z.infer<typeof likelihoodParamsSchema>;
export type CreateLikelihoodValueBody = z.infer<typeof createLikelihoodValueSchema>;
export type UpdateLikelihoodValueBody = z.infer<typeof updateLikelihoodValueSchema>;

export const impactParamsSchema = z.object({
  registerId: z.string().uuid(),
  impactId: z.string().uuid()
});

export const createImpactValueSchema = z.object({
  name: z.string().trim().min(1),
  numericValue: z.number().positive(),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean().default(true)
});

export const updateImpactValueSchema = z.object({
  name: z.string().trim().min(1).optional(),
  numericValue: z.number().positive().optional(),
  displayOrder: z.number().int().min(1).optional(),
  isActive: z.boolean().optional()
});

export type ImpactParams = z.infer<typeof impactParamsSchema>;
export type CreateImpactValueBody = z.infer<typeof createImpactValueSchema>;
export type UpdateImpactValueBody = z.infer<typeof updateImpactValueSchema>;

export const riskLevelParamsSchema = z.object({
  registerId: z.string().uuid(),
  riskLevelId: z.string().uuid()
});

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid 6-digit hex color (e.g. #ff0000)")
  .nullable()
  .optional();

export const createRiskLevelSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  color: hexColorSchema,
  displayOrder: z.number().int().min(1),
  isActive: z.boolean().default(true)
});

export const updateRiskLevelSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  color: hexColorSchema,
  displayOrder: z.number().int().min(1).optional(),
  isActive: z.boolean().optional()
});

export type RiskLevelParams = z.infer<typeof riskLevelParamsSchema>;
export type CreateRiskLevelBody = z.infer<typeof createRiskLevelSchema>;
export type UpdateRiskLevelBody = z.infer<typeof updateRiskLevelSchema>;

export const matrixCellParamsSchema = z.object({
  registerId: z.string().uuid(),
  cellId: z.string().uuid()
});

const matrixCellInputSchema = z.object({
  likelihoodValueId: z.string().uuid(),
  impactValueId: z.string().uuid(),
  riskLevelId: z.string().uuid()
});

export const updateMatrixSchema = z.object({
  cells: z.array(matrixCellInputSchema).min(1),
  recalculateExistingRisks: z.boolean().default(false)
});

export const updateMatrixCellSchema = z.object({
  riskLevelId: z.string().uuid()
});

export type MatrixCellParams = z.infer<typeof matrixCellParamsSchema>;
export type UpdateMatrixBody = z.infer<typeof updateMatrixSchema>;
export type UpdateMatrixCellBody = z.infer<typeof updateMatrixCellSchema>;

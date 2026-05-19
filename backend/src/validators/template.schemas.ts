import { z } from "zod";

export const templateParamsSchema = z.object({
  templateId: z.string().uuid()
});

export const templateVersionParamsSchema = z.object({
  templateVersionId: z.string().uuid()
});

export const compareParamsSchema = z.object({
  registerId: z.string().uuid(),
  templateVersionId: z.string().uuid()
});

export const listTemplatesQuerySchema = z.object({
  includeInactive: z
    .string()
    .optional()
    .transform((v) => v === "true")
});

export const createTemplateBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional()
});

// Snapshot top-level shape validator — we trust the internal shape and validate further in service layer
const snapshotJsonSchema = z
  .object({
    register: z.record(z.unknown()),
    customFields: z.array(z.unknown()),
    likelihoodValues: z.array(z.unknown()),
    impactValues: z.array(z.unknown()),
    riskLevels: z.array(z.unknown()),
    matrixCells: z.array(z.unknown()),
    responseStrategies: z.array(z.unknown())
  })
  .passthrough();

export const createTemplateWithSnapshotBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  snapshotJson: snapshotJsonSchema
});

export const updateTemplateBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional()
});

export const createRegisterFromTemplateBodySchema = z.object({
  templateVersionId: z.string().uuid(),
  name: z.string().min(1).max(200)
});

export const publishTemplateVersionBodySchema = z.object({
  snapshotJson: snapshotJsonSchema
});

export type TemplateParams = z.infer<typeof templateParamsSchema>;
export type TemplateVersionParams = z.infer<typeof templateVersionParamsSchema>;
export type CompareParams = z.infer<typeof compareParamsSchema>;
export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;
export type CreateTemplateBody = z.infer<typeof createTemplateBodySchema>;
export type CreateTemplateWithSnapshotBody = z.infer<typeof createTemplateWithSnapshotBodySchema>;
export type UpdateTemplateBody = z.infer<typeof updateTemplateBodySchema>;
export type CreateRegisterFromTemplateBody = z.infer<typeof createRegisterFromTemplateBodySchema>;
export type PublishTemplateVersionBody = z.infer<typeof publishTemplateVersionBodySchema>;

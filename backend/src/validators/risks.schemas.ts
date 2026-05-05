import { z } from "zod";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const riskIdParamsSchema = z.object({
  registerId: z.string().uuid(),
  riskId: z.string().uuid()
});

export const riskCustomFieldValueSchema = z.object({
  customFieldDefinitionId: z.string().uuid(),
  textValue: z.string().trim().optional(),
  numberValue: z.number().finite().optional(),
  booleanValue: z.boolean().optional(),
  dateValue: dateOnlySchema.optional(),
  personUserId: z.string().uuid().optional(),
  dropdownOptionId: z.string().uuid().optional()
});

export const createRiskSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  state: z.enum(["DRAFT", "OPEN", "CLOSED"]).optional(),
  ownerUserId: z.string().uuid(),
  createdDate: dateOnlySchema.optional(),
  likelihoodValueId: z.string().uuid(),
  impactValueId: z.string().uuid(),
  responseStrategyId: z.string().uuid(),
  responseAction: z.string().trim().nullable().optional(),
  customFieldValues: z.array(riskCustomFieldValueSchema).default([])
});

export type RiskIdParams = z.infer<typeof riskIdParamsSchema>;
export type RiskCustomFieldValueBody = z.infer<typeof riskCustomFieldValueSchema>;
export type CreateRiskBody = z.infer<typeof createRiskSchema>;

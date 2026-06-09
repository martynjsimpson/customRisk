import { z } from "zod";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const riskIdParamsSchema = z.object({
  registerId: z.string().uuid(),
  riskId: z.string().uuid()
});

const arrayFromQuery = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (Array.isArray(value) ? value : value === undefined ? undefined : [value]), z.array(schema));

const queryBooleanSchema = z.preprocess((value) => {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
}, z.boolean());

export const listRisksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  state: arrayFromQuery(z.enum(["DRAFT", "OPEN", "CLOSED"])).optional(),
  riskLevelId: z.string().uuid().optional(),
  ownerUserId: z.string().uuid().optional(),
  reviewStatus: z.enum(["NOT_REQUIRED", "NOT_REVIEWED", "NOT_DUE", "DUE_SOON", "OVERDUE"]).optional(),
  dueForReview: queryBooleanSchema.optional(),
  overdue: queryBooleanSchema.optional(),
  includeClosed: queryBooleanSchema.default(false),
  validationIssues: queryBooleanSchema.optional(),
  search: z.string().trim().optional(),
  sortBy: z
    .enum(["riskId", "title", "state", "owner", "riskScore", "riskLevel", "nextReviewDate", "systemUpdatedAt"])
    .default("riskId"),
  sortDir: z.enum(["asc", "desc"]).default("asc")
});

export const riskCustomFieldValueSchema = z.object({
  customFieldDefinitionId: z.string().uuid(),
  textValue: z.string().trim().optional(),
  numberValue: z.number().finite().optional(),
  booleanValue: z.boolean().optional(),
  dateValue: dateOnlySchema.optional(),
  personUserId: z.string().uuid().optional(),
  personEmail: z.string().email().optional(),
  dropdownOptionId: z.string().uuid().optional()
});

export const createRiskSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1),
    state: z.enum(["DRAFT", "OPEN", "CLOSED"]).optional(),
    ownerUserId: z.string().uuid(),
    createdDate: dateOnlySchema.optional(),
    likelihoodValueId: z.string().uuid(),
    impactValueId: z.string().uuid(),
    responseStrategyId: z.string().uuid(),
    responseAction: z.string().trim().nullable().optional(),
    acknowledgedWarnings: z.boolean().optional(),
    customFields: z.array(riskCustomFieldValueSchema).optional(),
    customFieldValues: z.array(riskCustomFieldValueSchema).optional()
  })
  .transform((value) => ({
    ...value,
    customFieldValues: value.customFieldValues ?? value.customFields ?? []
  }));

export const updateRiskSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).optional(),
    state: z.enum(["DRAFT", "OPEN", "CLOSED"]).optional(),
    ownerUserId: z.string().uuid().optional(),
    createdDate: dateOnlySchema.optional(),
    likelihoodValueId: z.string().uuid().optional(),
    impactValueId: z.string().uuid().optional(),
    responseStrategyId: z.string().uuid().optional(),
    responseAction: z.string().trim().nullable().optional(),
    acknowledgedWarnings: z.boolean().optional(),
    customFields: z.array(riskCustomFieldValueSchema).optional(),
    customFieldValues: z.array(riskCustomFieldValueSchema).optional()
  })
  .transform((value) => ({
    ...value,
    customFieldValues: value.customFieldValues ?? value.customFields
  }));

export const deleteRiskSchema = z.object({
  confirmation: z.literal("DELETE"),
  deletionReason: z.string().trim().min(1).max(2000).optional()
});

export const createRiskReviewSchema = z.object({
  confirmed: z.literal(true),
  comment: z.string().trim().max(2000).optional()
});

export type RiskIdParams = z.infer<typeof riskIdParamsSchema>;
export type ListRisksQuery = z.infer<typeof listRisksQuerySchema>;
export type RiskCustomFieldValueBody = z.infer<typeof riskCustomFieldValueSchema>;
export type CreateRiskBody = z.infer<typeof createRiskSchema>;
export type UpdateRiskBody = z.infer<typeof updateRiskSchema>;
export type DeleteRiskBody = z.infer<typeof deleteRiskSchema>;
export type CreateRiskReviewBody = z.infer<typeof createRiskReviewSchema>;

import { z } from "zod";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const auditEventParamsSchema = z.object({
  auditEventId: z.string().uuid()
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  dateFrom: dateOnlySchema.optional(),
  dateTo: dateOnlySchema.optional(),
  actorUserId: z.string().uuid().optional(),
  action: z.string().trim().min(1).optional(),
  objectType: z
    .enum([
      "USER",
      "REGISTER",
      "REGISTER_PERMISSION",
      "RISK",
      "RISK_REVIEW",
      "CUSTOM_FIELD",
      "CUSTOM_FIELD_OPTION",
      "LIKELIHOOD_VALUE",
      "IMPACT_VALUE",
      "RISK_LEVEL",
      "RISK_MATRIX",
      "RESPONSE_STRATEGY",
      "EXPORT",
      "AUTH",
      "API_KEY"
    ])
    .optional(),
  registerId: z.string().uuid().optional(),
  riskId: z.string().uuid().optional(),
  displayRiskId: z.string().trim().min(1).optional(),
  ipAddress: z.string().trim().min(1).optional()
});

export type AuditEventParams = z.infer<typeof auditEventParamsSchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;

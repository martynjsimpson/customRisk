import { z } from "zod";

import { riskIdParamsSchema } from "./risks.schemas.js";

export const actionIdParamsSchema = riskIdParamsSchema.extend({
  actionId: z.string().uuid()
});

const responseActionStatusSchema = z.enum([
  "PLANNED",
  "IN_PROGRESS",
  "IMPLEMENTED",
  "DEFERRED",
  "CANCELLED"
]);

export const createActionSchema = z
  .object({
    response: z.string().trim().min(1, "Response is required"),
    status: responseActionStatusSchema.optional(),
    ownerPersonId: z.string().uuid().nullable().optional(),
    ownerEmail: z.string().email().nullable().optional()
  })
  .refine(
    (data) => !(data.ownerPersonId && data.ownerEmail),
    { message: "Provide only one of ownerPersonId or ownerEmail" }
  );

export const updateActionSchema = z
  .object({
    response: z.string().trim().min(1).optional(),
    status: responseActionStatusSchema.optional(),
    ownerPersonId: z.string().uuid().nullable().optional(),
    ownerEmail: z.string().email().nullable().optional()
  })
  .refine(
    (data) => !(data.ownerPersonId && data.ownerEmail),
    { message: "Provide only one of ownerPersonId or ownerEmail" }
  );

export type ActionIdParams = z.infer<typeof actionIdParamsSchema>;
export type CreateActionBody = z.infer<typeof createActionSchema>;
export type UpdateActionBody = z.infer<typeof updateActionSchema>;

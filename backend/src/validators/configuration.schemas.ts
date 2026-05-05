import { z } from "zod";

export const customFieldTypes = [
  "TEXT",
  "MULTILINE_TEXT",
  "BOOLEAN",
  "NUMBER",
  "DATE",
  "DROPDOWN",
  "PERSON_PICKER"
] as const;

export const customFieldParamsSchema = z.object({
  registerId: z.string().uuid(),
  fieldId: z.string().uuid()
});

const customFieldOptionInputSchema = z.object({
  label: z.string().trim().min(1),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean().default(true)
});

export const createCustomFieldSchema = z.object({
  fieldName: z.string().trim().min(1),
  fieldType: z.enum(customFieldTypes),
  helpText: z.string().trim().nullable().optional(),
  isRequired: z.boolean().default(false),
  displayOrder: z.number().int().min(1),
  isActive: z.boolean().default(true),
  options: z.array(customFieldOptionInputSchema).optional()
});

export const updateCustomFieldSchema = z.object({
  fieldName: z.string().trim().min(1).optional(),
  helpText: z.string().trim().nullable().optional(),
  isRequired: z.boolean().optional(),
  displayOrder: z.number().int().min(1).optional(),
  isActive: z.boolean().optional()
});

export type CustomFieldParams = z.infer<typeof customFieldParamsSchema>;
export type CreateCustomFieldBody = z.infer<typeof createCustomFieldSchema>;
export type UpdateCustomFieldBody = z.infer<typeof updateCustomFieldSchema>;

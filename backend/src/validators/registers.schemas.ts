import { z } from "zod";

export const registerIdParamsSchema = z.object({
  registerId: z.string().uuid()
});

export const registerPermissionParamsSchema = z.object({
  registerId: z.string().uuid(),
  permissionId: z.string().uuid()
});

export const createRegisterPermissionSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["REGISTER_ADMIN", "REGISTER_VIEWER"])
});

export const listRegistersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
  sortBy: z.enum(["name", "updatedAt", "createdAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc")
});

export const createRegisterSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  riskIdPrefix: z
    .string()
    .trim()
    .regex(/^[A-Z0-9][A-Z0-9-]*$/, "Use uppercase letters, numbers, and hyphens only")
    .optional(),
  riskIdZeroPaddingEnabled: z.boolean().default(false),
  riskIdZeroPaddingWidth: z.number().int().min(2).max(12).default(4),
  initialRegisterAdminUserIds: z.array(z.string().uuid()).default([])
});

export const updateRegisterSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  riskIdPrefix: z
    .string()
    .trim()
    .regex(/^[A-Z0-9][A-Z0-9-]*$/, "Use uppercase letters, numbers, and hyphens only")
    .nullable()
    .optional(),
  riskIdZeroPaddingEnabled: z.boolean().optional(),
  riskIdZeroPaddingWidth: z.number().int().min(2).max(12).optional(),
  reviewsEnabled: z.boolean().optional(),
  defaultReviewFrequencyMonths: z.number().int().min(1).max(120).optional(),
  allowViewerExport: z.boolean().optional(),
  customFieldValidationEnabled: z.boolean().optional(),
  reviewStatusPosition: z.number().int().min(0).nullable().optional(),
  responseActionMode: z.enum(["SIMPLE", "CHILD_RECORDS"]).optional()
});

export type RegisterIdParams = z.infer<typeof registerIdParamsSchema>;
export type RegisterPermissionParams = z.infer<typeof registerPermissionParamsSchema>;
export type CreateRegisterPermissionBody = z.infer<typeof createRegisterPermissionSchema>;
export type ListRegistersQuery = z.infer<typeof listRegistersQuerySchema>;
export type CreateRegisterBody = z.infer<typeof createRegisterSchema>;
export type UpdateRegisterBody = z.infer<typeof updateRegisterSchema>;

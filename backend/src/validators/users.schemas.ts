import { z } from "zod";

export const userIdParamsSchema = z.object({
  userId: z.string().uuid()
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
  isActive: z.coerce.boolean().optional(),
  isSystemAdmin: z.coerce.boolean().optional(),
  sortBy: z.enum(["name", "email", "createdAt", "updatedAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc")
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1),
  isSystemAdmin: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().email().transform((value) => value.trim().toLowerCase()).optional(),
  password: z.string().min(1).optional(),
  isSystemAdmin: z.boolean().optional(),
  isActive: z.boolean().optional()
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;

import { z } from "zod";

export const savedViewIdParamsSchema = z.object({
  registerId: z.string().uuid(),
  viewId: z.string().uuid()
});

export const savedViewRegisterParamsSchema = z.object({
  registerId: z.string().uuid()
});

export const createSavedViewSchema = z.object({
  name: z.string().trim().min(1).max(255),
  filters: z.record(z.string(), z.unknown()).optional(),
  sort: z.record(z.string(), z.unknown()).optional(),
  columns: z.array(z.string()).optional()
});

export const updateSavedViewSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  sort: z.record(z.string(), z.unknown()).optional(),
  columns: z.array(z.string()).optional()
});

export type SavedViewIdParams = z.infer<typeof savedViewIdParamsSchema>;
export type SavedViewRegisterParams = z.infer<typeof savedViewRegisterParamsSchema>;
export type CreateSavedViewBody = z.infer<typeof createSavedViewSchema>;
export type UpdateSavedViewBody = z.infer<typeof updateSavedViewSchema>;

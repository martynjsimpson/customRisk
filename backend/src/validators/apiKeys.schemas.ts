import { z } from "zod";

export const apiKeyIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(255),
  userId: z.string().uuid(),
  expiresAt: z.coerce.date().optional()
});

export type ApiKeyIdParams = z.infer<typeof apiKeyIdParamsSchema>;
export type CreateApiKeyBody = z.infer<typeof createApiKeySchema>;

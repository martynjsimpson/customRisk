import { z } from "zod";

export const myRisksQuerySchema = z.object({
  search: z.string().trim().optional(),
  state: z.enum(["DRAFT", "OPEN", "CLOSED"]).optional(),
  riskLevel: z.string().trim().optional(),
  registerId: z.string().uuid().optional()
});

export type MyRisksQuery = z.infer<typeof myRisksQuerySchema>;

import { z } from "zod";

const uuidSchema = z.uuid();

export const listReportsOverviewSchema = z.object({
  query: z.object({
    programId: uuidSchema.optional(),
    batchId: uuidSchema.optional(),
    candidateId: uuidSchema.optional(),
  }),
});

export type ListReportsOverviewInput = z.infer<
  typeof listReportsOverviewSchema
>["query"];

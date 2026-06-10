import { userStatuses } from "@lms/shared";
import { z } from "zod";

const uuidSchema = z.uuid();
const userStatusSchema = z.enum(userStatuses);

export const listCandidatesSchema = z.object({
  query: z.object({
    programId: uuidSchema.optional(),
    batchId: uuidSchema.optional(),
    status: userStatusSchema.optional(),
    search: z.string().trim().min(1).optional(),
    includeArchived: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  }),
});

export const createCandidateSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2),
    email: z.email().transform((email) => email.toLowerCase()),
    password: z.string().min(8),
    candidateCode: z.string().trim().min(2).transform((code) => code.toUpperCase()),
    programId: uuidSchema,
    batchId: uuidSchema.optional(),
    status: userStatusSchema.default("active"),
  }),
});

export const candidateIdParamSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export type ListCandidatesInput = z.infer<typeof listCandidatesSchema>["query"];
export type CreateCandidateInput = z.infer<typeof createCandidateSchema>["body"];

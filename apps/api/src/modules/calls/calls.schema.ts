import { workflowStatuses } from "@lms/shared";
import { z } from "zod";

const uuidSchema = z.uuid();
const workflowStatusSchema = z.enum(workflowStatuses);

export const listCallsSchema = z.object({
  query: z.object({
    programId: uuidSchema.optional(),
    batchId: uuidSchema.optional(),
    candidateId: uuidSchema.optional(),
    status: workflowStatusSchema.optional(),
    includeArchived: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  }),
});

export const getCallSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export const createCallSchema = z.object({
  body: z.object({
    candidateId: uuidSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional(),
    scheduledStartAt: z.string().datetime(),
    scheduledEndAt: z.string().datetime(),
    meetingLink: z.string().url().optional(),
  }),
});

export const updateCallSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    scheduledStartAt: z.string().datetime().optional(),
    scheduledEndAt: z.string().datetime().optional(),
    meetingLink: z.string().url().optional(),
  }),
});

export const cancelCallSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export type ListCallsInput = z.infer<typeof listCallsSchema>["query"];
export type CreateCallInput = z.infer<typeof createCallSchema>["body"];
export type UpdateCallInput = z.infer<typeof updateCallSchema>["body"];

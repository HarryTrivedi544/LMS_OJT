import { workflowStatuses } from "@lms/shared";
import { z } from "zod";

const uuidSchema = z.uuid();
const workflowStatusSchema = z.enum(workflowStatuses);

export const listProgramsSchema = z.object({
  query: z.object({
    status: workflowStatusSchema.optional(),
    search: z.string().trim().min(1).optional(),
    includeArchived: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  }),
});

export const createProgramSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2),
    code: z.string().trim().min(2).transform((code) => code.toUpperCase()),
    status: workflowStatusSchema.default("draft"),
  }),
});

export const updateProgramSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      code: z.string().trim().min(2).transform((code) => code.toUpperCase()).optional(),
      status: workflowStatusSchema.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required.",
    }),
});

export const createBatchSchema = z.object({
  params: z.object({ programId: uuidSchema }),
  body: z.object({
    name: z.string().trim().min(2),
    code: z.string().trim().min(2).transform((code) => code.toUpperCase()),
    status: workflowStatusSchema.default("draft"),
  }),
});

export const updateBatchSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      code: z.string().trim().min(2).transform((code) => code.toUpperCase()).optional(),
      status: workflowStatusSchema.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required.",
    }),
});

export const listBatchesSchema = z.object({
  params: z.object({ programId: uuidSchema }),
  query: z.object({
    includeArchived: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: uuidSchema }),
});

export const programIdParamSchema = z.object({
  params: z.object({ programId: uuidSchema }),
});

export const batchIdParamSchema = z.object({
  params: z.object({ batchId: uuidSchema }),
});

export const createProgramAssignmentSchema = z.object({
  params: z.object({ programId: uuidSchema }),
  body: z.object({
    userId: uuidSchema,
    role: z.literal("Program Admin"),
  }),
});

export const createBatchAssignmentSchema = z.object({
  params: z.object({ batchId: uuidSchema }),
  body: z.object({
    userId: uuidSchema,
    role: z.literal("Program Lead"),
  }),
});

export type ListProgramsInput = z.infer<typeof listProgramsSchema>["query"];
export type CreateProgramInput = z.infer<typeof createProgramSchema>["body"];
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>["body"];
export type CreateBatchInput = z.infer<typeof createBatchSchema>["body"];
export type ListBatchesInput = z.infer<typeof listBatchesSchema>["query"];
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>["body"];
export type CreateProgramAssignmentInput = z.infer<
  typeof createProgramAssignmentSchema
>["body"];
export type CreateBatchAssignmentInput = z.infer<
  typeof createBatchAssignmentSchema
>["body"];

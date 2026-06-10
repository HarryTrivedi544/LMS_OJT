import { workflowStatuses } from "@lms/shared";
import { z } from "zod";

const uuidSchema = z.uuid();
const workflowStatusSchema = z.enum(workflowStatuses);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.");
const optionalTextSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .nullish()
    .transform((value) => value || undefined);

export const timesheetEntrySchema = z.object({
  workDate: dateSchema,
  dayLabel: z.string().trim().min(1).max(20),
  hours: z.number().min(0).max(24),
  summary: optionalTextSchema(1000),
  blockers: optionalTextSchema(1000),
});

export const listTimesheetsSchema = z.object({
  query: z.object({
    programId: uuidSchema.optional(),
    batchId: uuidSchema.optional(),
    candidateId: uuidSchema.optional(),
    status: workflowStatusSchema.optional(),
    weekStartDate: dateSchema.optional(),
    includeArchived: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  }),
});

export const createTimesheetSchema = z.object({
  body: z.object({
    candidateId: uuidSchema.optional(),
    weekStartDate: dateSchema,
    weekEndDate: dateSchema,
    entries: z.array(timesheetEntrySchema).min(1).max(7),
  }),
});

export const updateTimesheetSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    entries: z.array(timesheetEntrySchema).min(1).max(7),
  }),
});

export const reviewTimesheetSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z.object({
    status: z.enum(["under_review", "approved", "rejected", "revision_required"]),
    reviewNote: z.string().trim().max(2000).optional(),
  }),
});

export type ListTimesheetsInput = z.infer<typeof listTimesheetsSchema>["query"];
export type CreateTimesheetInput = z.infer<typeof createTimesheetSchema>["body"];
export type UpdateTimesheetInput = z.infer<typeof updateTimesheetSchema>["body"];
export type TimesheetEntryInput = z.infer<typeof timesheetEntrySchema>;
export type ReviewTimesheetInput = z.infer<typeof reviewTimesheetSchema>["body"];

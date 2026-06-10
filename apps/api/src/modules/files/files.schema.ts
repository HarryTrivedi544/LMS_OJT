import { z } from "zod";

const uuidSchema = z.uuid();

export const fileModules = [
  "candidates",
  "tasks",
  "submissions",
  "timesheets",
  "reviews",
  "certificates",
  "chat-attachments",
] as const;

export const listFilesSchema = z.object({
  query: z.object({
    module: z.enum(fileModules).optional(),
    candidateId: uuidSchema.optional(),
  }),
});

export const getFileSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export const downloadFileSchema = z.object({
  query: z.object({
    token: z.string().min(1),
  }),
});

export type ListFilesInput = z.infer<typeof listFilesSchema>["query"];
export type FileModule = (typeof fileModules)[number];

import { roles, userStatuses } from "@lms/shared";
import { z } from "zod";

const roleSchema = z.enum(roles);
const userStatusSchema = z.enum(userStatuses);
const uuidSchema = z.uuid();

export const listUsersSchema = z.object({
  query: z.object({
    role: roleSchema.optional(),
    status: userStatusSchema.optional(),
    search: z.string().trim().min(1).optional(),
    includeArchived: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    email: z.email().transform((email) => email.toLowerCase()),
    fullName: z.string().trim().min(2),
    role: roleSchema,
    status: userStatusSchema.default("active"),
    password: z.string().min(8),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
  body: z
    .object({
      fullName: z.string().trim().min(2).optional(),
      role: roleSchema.optional(),
      status: userStatusSchema.optional(),
      password: z.string().min(8).optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required.",
    }),
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: uuidSchema,
  }),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>["query"];
export type CreateUserInput = z.infer<typeof createUserSchema>["body"];
export type UpdateUserInput = z.infer<typeof updateUserSchema>["body"];

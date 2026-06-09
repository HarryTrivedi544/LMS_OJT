import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.email().transform((email) => email.toLowerCase()),
    password: z.string().min(8),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(32).optional(),
  }),
});

export const logoutSchema = refreshSchema;

export type LoginInput = z.infer<typeof loginSchema>["body"];
export type RefreshInput = z.infer<typeof refreshSchema>["body"];
export type LogoutInput = z.infer<typeof logoutSchema>["body"];

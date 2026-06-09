import { z } from "zod";

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const apiSuccessSchema = <TData extends z.ZodType>(data: TData) =>
  z.object({
    success: z.literal(true),
    data,
  });

export const healthResponseSchema = apiSuccessSchema(
  z.object({
    service: z.literal("lms-api"),
    status: z.literal("ok"),
    timestamp: z.string(),
  }),
);

export const authUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  fullName: z.string(),
  role: z.enum(["Super Admin", "Program Admin", "Program Lead", "Candidate"]),
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresIn: z.literal("30m"),
  user: authUserSchema,
});

export const loginResponseSchema = apiSuccessSchema(authTokensSchema);
export const refreshResponseSchema = apiSuccessSchema(authTokensSchema);

export type ApiError = z.infer<typeof apiErrorSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

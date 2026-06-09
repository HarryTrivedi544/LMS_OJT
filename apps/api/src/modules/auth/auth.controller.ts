import type { RequestHandler } from "express";

import { env } from "../../config/env.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { loginSchema, logoutSchema, refreshSchema } from "./auth.schema.js";
import { AuthService } from "./auth.service.js";

const authService = new AuthService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  ipAddress: request.ip,
  userAgent: request.header("user-agent"),
});

const getRefreshTokenFromCookie = (request: Parameters<RequestHandler>[0]) =>
  request.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME] as string | undefined;

const setRefreshTokenCookie = (
  response: Parameters<RequestHandler>[1],
  refreshToken: string,
  refreshTokenExpiresAt: string,
) => {
  response.cookie(env.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/api/v1/auth",
    expires: new Date(refreshTokenExpiresAt),
  });
};

const clearRefreshTokenCookie = (response: Parameters<RequestHandler>[1]) => {
  response.clearCookie(env.REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/api/v1/auth",
  });
};

export const login = asyncHandler(async (request, response) => {
  const input = loginSchema.parse({ body: request.body });
  const data = await authService.login(input.body, getContext(request));

  setRefreshTokenCookie(response, data.refreshToken, data.refreshTokenExpiresAt);

  response.status(200).json({ success: true, data });
});

export const refresh = asyncHandler(async (request, response) => {
  const input = refreshSchema.parse({
    body: {
      ...request.body,
      refreshToken: request.body?.refreshToken ?? getRefreshTokenFromCookie(request),
    },
  });
  const data = await authService.refresh(input.body);

  setRefreshTokenCookie(response, data.refreshToken, data.refreshTokenExpiresAt);

  response.status(200).json({ success: true, data });
});

export const logout = asyncHandler(async (request, response) => {
  const input = logoutSchema.parse({
    body: {
      ...request.body,
      refreshToken: request.body?.refreshToken ?? getRefreshTokenFromCookie(request),
    },
  });
  const data = await authService.logout(input.body, getContext(request));

  clearRefreshTokenCookie(response);

  response.status(200).json({ success: true, data });
});

export const me = asyncHandler(async (request, response) => {
  const data = await authService.getCurrentUser(request.auth?.userId ?? "");

  response.status(200).json({ success: true, data });
});

import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { loginSchema, logoutSchema, refreshSchema } from "./auth.schema.js";
import { AuthService } from "./auth.service.js";

const authService = new AuthService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  ipAddress: request.ip,
  userAgent: request.header("user-agent"),
});

export const login = asyncHandler(async (request, response) => {
  const input = loginSchema.parse({ body: request.body });
  const data = await authService.login(input.body, getContext(request));

  response.status(200).json({ success: true, data });
});

export const refresh = asyncHandler(async (request, response) => {
  const input = refreshSchema.parse({ body: request.body });
  const data = await authService.refresh(input.body);

  response.status(200).json({ success: true, data });
});

export const logout = asyncHandler(async (request, response) => {
  const input = logoutSchema.parse({ body: request.body });
  const data = await authService.logout(input.body, getContext(request));

  response.status(200).json({ success: true, data });
});

export const me = asyncHandler(async (request, response) => {
  const data = await authService.getCurrentUser(request.auth?.userId ?? "");

  response.status(200).json({ success: true, data });
});

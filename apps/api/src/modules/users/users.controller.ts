import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  createUserSchema,
  listUsersSchema,
  updateUserSchema,
  userIdParamSchema,
} from "./users.schema.js";
import { UsersService } from "./users.service.js";

const usersService = new UsersService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  actorId: request.auth?.userId ?? "",
  ipAddress: request.ip,
  userAgent: request.header("user-agent"),
});

export const listUsers = asyncHandler(async (request, response) => {
  const input = listUsersSchema.parse({ query: request.query });
  const data = await usersService.listUsers(input.query);

  response.status(200).json({ success: true, data });
});

export const createUser = asyncHandler(async (request, response) => {
  const input = createUserSchema.parse({ body: request.body });
  const data = await usersService.createUser(input.body, getContext(request));

  response.status(201).json({ success: true, data });
});

export const updateUser = asyncHandler(async (request, response) => {
  const input = updateUserSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await usersService.updateUser(
    input.params.id,
    input.body,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const archiveUser = asyncHandler(async (request, response) => {
  const input = userIdParamSchema.parse({ params: request.params });
  const data = await usersService.archiveUser(input.params.id, getContext(request));

  response.status(200).json({ success: true, data });
});

export const restoreUser = asyncHandler(async (request, response) => {
  const input = userIdParamSchema.parse({ params: request.params });
  const data = await usersService.restoreUser(input.params.id, getContext(request));

  response.status(200).json({ success: true, data });
});

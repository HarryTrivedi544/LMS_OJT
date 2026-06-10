import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  cancelCallSchema,
  createCallSchema,
  getCallSchema,
  listCallsSchema,
  updateCallSchema,
} from "./calls.schema.js";
import { CallsService } from "./calls.service.js";

const callsService = new CallsService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  actorId: request.auth?.userId ?? "",
  role: request.auth?.role ?? "Candidate",
  ipAddress: request.ip,
  userAgent: request.header("user-agent"),
});

export const listCalls = asyncHandler(async (request, response) => {
  const input = listCallsSchema.parse({ query: request.query });
  const data = await callsService.listCalls(input.query, getContext(request));

  response.status(200).json({ success: true, data });
});

export const getCall = asyncHandler(async (request, response) => {
  const input = getCallSchema.parse({ params: request.params });
  const data = await callsService.getCall(input.params.id, getContext(request));

  response.status(200).json({ success: true, data });
});

export const createCall = asyncHandler(async (request, response) => {
  const input = createCallSchema.parse({ body: request.body });
  const data = await callsService.createCall(input.body, getContext(request));

  response.status(201).json({ success: true, data });
});

export const updateCall = asyncHandler(async (request, response) => {
  const input = updateCallSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await callsService.updateCall(input.params.id, input.body, getContext(request));

  response.status(200).json({ success: true, data });
});

export const cancelCall = asyncHandler(async (request, response) => {
  const input = cancelCallSchema.parse({ params: request.params });
  const data = await callsService.cancelCall(input.params.id, getContext(request));

  response.status(200).json({ success: true, data });
});

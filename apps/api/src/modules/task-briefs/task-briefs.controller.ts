import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  acknowledgeTaskBriefSchema,
  createTaskBriefSchema,
  getTaskBriefSchema,
  listTaskBriefsSchema,
  reviewTaskBriefSchema,
  submitTaskBriefSchema,
} from "./task-briefs.schema.js";
import { TaskBriefsService } from "./task-briefs.service.js";

const taskBriefsService = new TaskBriefsService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  actorId: request.auth?.userId ?? "",
  role: request.auth?.role ?? "Candidate",
  ipAddress: request.ip,
  userAgent: request.header("user-agent"),
});

export const listTaskBriefs = asyncHandler(async (request, response) => {
  const input = listTaskBriefsSchema.parse({ query: request.query });
  const data = await taskBriefsService.listTaskBriefs(input.query, getContext(request));

  response.status(200).json({ success: true, data });
});

export const getTaskBrief = asyncHandler(async (request, response) => {
  const input = getTaskBriefSchema.parse({ params: request.params });
  const data = await taskBriefsService.getTaskBrief(input.params.id, getContext(request));

  response.status(200).json({ success: true, data });
});

export const createTaskBrief = asyncHandler(async (request, response) => {
  const input = createTaskBriefSchema.parse({ body: request.body });
  const data = await taskBriefsService.createTaskBrief(input.body, getContext(request));

  response.status(201).json({ success: true, data });
});

export const acknowledgeTaskBrief = asyncHandler(async (request, response) => {
  const input = acknowledgeTaskBriefSchema.parse({ params: request.params });
  const data = await taskBriefsService.acknowledgeTaskBrief(
    input.params.id,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const submitTaskBrief = asyncHandler(async (request, response) => {
  const input = submitTaskBriefSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await taskBriefsService.submitTaskBrief(
    input.params.id,
    input.body,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const reviewTaskBrief = asyncHandler(async (request, response) => {
  const input = reviewTaskBriefSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await taskBriefsService.reviewTaskBrief(
    input.params.id,
    input.body,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

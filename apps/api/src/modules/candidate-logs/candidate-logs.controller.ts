import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  createCandidateLogSchema,
  listCandidateLogsSchema,
  reviewCandidateLogSchema,
} from "./candidate-logs.schema.js";
import { CandidateLogsService } from "./candidate-logs.service.js";

const candidateLogsService = new CandidateLogsService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  actorId: request.auth?.userId ?? "",
  role: request.auth?.role ?? "Candidate",
  ipAddress: request.ip,
  userAgent: request.header("user-agent"),
});

export const listCandidateLogs = asyncHandler(async (request, response) => {
  const input = listCandidateLogsSchema.parse({ query: request.query });
  const data = await candidateLogsService.listLogs(input.query, getContext(request));

  response.status(200).json({ success: true, data });
});

export const createCandidateLog = asyncHandler(async (request, response) => {
  const input = createCandidateLogSchema.parse({ body: request.body });
  const data = await candidateLogsService.createLog(input.body, getContext(request));

  response.status(201).json({ success: true, data });
});

export const reviewCandidateLog = asyncHandler(async (request, response) => {
  const input = reviewCandidateLogSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await candidateLogsService.reviewLog(
    input.params.id,
    input.body,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

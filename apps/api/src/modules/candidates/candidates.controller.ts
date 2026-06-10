import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  candidateIdParamSchema,
  createCandidateSchema,
  listCandidatesSchema,
} from "./candidates.schema.js";
import { CandidatesService } from "./candidates.service.js";

const candidatesService = new CandidatesService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  actorId: request.auth?.userId ?? "",
  role: request.auth?.role ?? "Candidate",
  ipAddress: request.ip,
  userAgent: request.header("user-agent"),
});

export const listCandidateOptions = asyncHandler(async (request, response) => {
  const data = await candidatesService.listOptions(getContext(request));

  response.status(200).json({ success: true, data });
});

export const listCandidates = asyncHandler(async (request, response) => {
  const input = listCandidatesSchema.parse({ query: request.query });
  const data = await candidatesService.listCandidates(input.query, getContext(request));

  response.status(200).json({ success: true, data });
});

export const createCandidate = asyncHandler(async (request, response) => {
  const input = createCandidateSchema.parse({ body: request.body });
  const data = await candidatesService.createCandidate(input.body, getContext(request));

  response.status(201).json({ success: true, data });
});

export const archiveCandidate = asyncHandler(async (request, response) => {
  const input = candidateIdParamSchema.parse({ params: request.params });
  const data = await candidatesService.archiveCandidate(
    input.params.id,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const restoreCandidate = asyncHandler(async (request, response) => {
  const input = candidateIdParamSchema.parse({ params: request.params });
  const data = await candidatesService.restoreCandidate(
    input.params.id,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

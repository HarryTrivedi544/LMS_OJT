import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  completeQuarterlyKpiSummarySchema,
  createQuarterlyKpiSummarySchema,
  getQuarterlyKpiSummarySchema,
  listQuarterlyKpiSummariesSchema,
  updateQuarterlyKpiSummarySchema,
} from "./quarterly-kpi-summaries.schema.js";
import { QuarterlyKpiSummariesService } from "./quarterly-kpi-summaries.service.js";

const quarterlyKpiSummariesService = new QuarterlyKpiSummariesService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  actorId: request.auth?.userId ?? "",
  role: request.auth?.role ?? "Candidate",
  ipAddress: request.ip,
  userAgent: request.header("user-agent"),
});

export const listQuarterlyKpiSummaries = asyncHandler(async (request, response) => {
  const input = listQuarterlyKpiSummariesSchema.parse({ query: request.query });
  const data = await quarterlyKpiSummariesService.listQuarterlyKpiSummaries(
    input.query,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const getQuarterlyKpiSummary = asyncHandler(async (request, response) => {
  const input = getQuarterlyKpiSummarySchema.parse({ params: request.params });
  const data = await quarterlyKpiSummariesService.getQuarterlyKpiSummary(
    input.params.id,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const createQuarterlyKpiSummary = asyncHandler(async (request, response) => {
  const input = createQuarterlyKpiSummarySchema.parse({ body: request.body });
  const data = await quarterlyKpiSummariesService.createQuarterlyKpiSummary(
    input.body,
    getContext(request),
  );

  response.status(201).json({ success: true, data });
});

export const updateQuarterlyKpiSummary = asyncHandler(async (request, response) => {
  const input = updateQuarterlyKpiSummarySchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await quarterlyKpiSummariesService.updateQuarterlyKpiSummary(
    input.params.id,
    input.body,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const completeQuarterlyKpiSummary = asyncHandler(async (request, response) => {
  const input = completeQuarterlyKpiSummarySchema.parse({ params: request.params });
  const data = await quarterlyKpiSummariesService.completeQuarterlyKpiSummary(
    input.params.id,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

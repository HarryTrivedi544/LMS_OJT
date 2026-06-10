import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  completeKpiReviewSchema,
  createKpiReviewSchema,
  getKpiReviewSchema,
  listKpiReviewsSchema,
  updateKpiReviewSchema,
} from "./kpi-reviews.schema.js";
import { KpiReviewsService } from "./kpi-reviews.service.js";

const kpiReviewsService = new KpiReviewsService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  actorId: request.auth?.userId ?? "",
  role: request.auth?.role ?? "Candidate",
  ipAddress: request.ip,
  userAgent: request.header("user-agent"),
});

export const listKpiReviews = asyncHandler(async (request, response) => {
  const input = listKpiReviewsSchema.parse({ query: request.query });
  const data = await kpiReviewsService.listKpiReviews(input.query, getContext(request));

  response.status(200).json({ success: true, data });
});

export const getKpiReview = asyncHandler(async (request, response) => {
  const input = getKpiReviewSchema.parse({ params: request.params });
  const data = await kpiReviewsService.getKpiReview(input.params.id, getContext(request));

  response.status(200).json({ success: true, data });
});

export const createKpiReview = asyncHandler(async (request, response) => {
  const input = createKpiReviewSchema.parse({ body: request.body });
  const data = await kpiReviewsService.createKpiReview(input.body, getContext(request));

  response.status(201).json({ success: true, data });
});

export const updateKpiReview = asyncHandler(async (request, response) => {
  const input = updateKpiReviewSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await kpiReviewsService.updateKpiReview(
    input.params.id,
    input.body,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const completeKpiReview = asyncHandler(async (request, response) => {
  const input = completeKpiReviewSchema.parse({ params: request.params });
  const data = await kpiReviewsService.completeKpiReview(
    input.params.id,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  acknowledgePhasePromotionReviewSchema,
  createPhasePromotionReviewSchema,
  decidePhasePromotionBySuperAdminSchema,
  getPhasePromotionReviewSchema,
  listPhasePromotionReviewsSchema,
  reviewPhasePromotionByProgramAdminSchema,
  submitPhasePromotionReviewSchema,
  updatePhasePromotionReviewSchema,
} from "./phase-promotion-reviews.schema.js";
import { PhasePromotionReviewsService } from "./phase-promotion-reviews.service.js";

const phasePromotionReviewsService = new PhasePromotionReviewsService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  actorId: request.auth?.userId ?? "",
  role: request.auth?.role ?? "Candidate",
  ipAddress: request.ip,
  userAgent: request.header("user-agent"),
});

export const listPhasePromotionReviews = asyncHandler(async (request, response) => {
  const input = listPhasePromotionReviewsSchema.parse({ query: request.query });
  const data = await phasePromotionReviewsService.listPhasePromotionReviews(
    input.query,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const getPhasePromotionReview = asyncHandler(async (request, response) => {
  const input = getPhasePromotionReviewSchema.parse({ params: request.params });
  const data = await phasePromotionReviewsService.getPhasePromotionReview(
    input.params.id,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const createPhasePromotionReview = asyncHandler(async (request, response) => {
  const input = createPhasePromotionReviewSchema.parse({ body: request.body });
  const data = await phasePromotionReviewsService.createPhasePromotionReview(
    input.body,
    getContext(request),
  );

  response.status(201).json({ success: true, data });
});

export const updatePhasePromotionReview = asyncHandler(async (request, response) => {
  const input = updatePhasePromotionReviewSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await phasePromotionReviewsService.updatePhasePromotionReview(
    input.params.id,
    input.body,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const submitPhasePromotionReview = asyncHandler(async (request, response) => {
  const input = submitPhasePromotionReviewSchema.parse({ params: request.params });
  const data = await phasePromotionReviewsService.submitPhasePromotionReview(
    input.params.id,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const reviewPhasePromotionByProgramAdmin = asyncHandler(async (request, response) => {
  const input = reviewPhasePromotionByProgramAdminSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await phasePromotionReviewsService.reviewByProgramAdmin(
    input.params.id,
    input.body,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const decidePhasePromotionBySuperAdmin = asyncHandler(async (request, response) => {
  const input = decidePhasePromotionBySuperAdminSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await phasePromotionReviewsService.decideBySuperAdmin(
    input.params.id,
    input.body,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const acknowledgePhasePromotionReview = asyncHandler(async (request, response) => {
  const input = acknowledgePhasePromotionReviewSchema.parse({ params: request.params });
  const data = await phasePromotionReviewsService.acknowledgePhasePromotionReview(
    input.params.id,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

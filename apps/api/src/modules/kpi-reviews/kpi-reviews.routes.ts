import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import {
  completeKpiReview,
  createKpiReview,
  getKpiReview,
  listKpiReviews,
  updateKpiReview,
} from "./kpi-reviews.controller.js";
import {
  acknowledgePhasePromotionReview,
  createPhasePromotionReview,
  decidePhasePromotionBySuperAdmin,
  getPhasePromotionReview,
  listPhasePromotionReviews,
  reviewPhasePromotionByProgramAdmin,
  submitPhasePromotionReview,
  updatePhasePromotionReview,
} from "./phase-promotion-reviews.controller.js";
import {
  completeQuarterlyKpiSummary,
  createQuarterlyKpiSummary,
  getQuarterlyKpiSummary,
  listQuarterlyKpiSummaries,
  updateQuarterlyKpiSummary,
} from "./quarterly-kpi-summaries.controller.js";

export const kpiReviewsRouter = Router();

kpiReviewsRouter.use(authenticate);

kpiReviewsRouter.get("/phase-promotions", listPhasePromotionReviews);
kpiReviewsRouter.get("/phase-promotions/:id", getPhasePromotionReview);
kpiReviewsRouter.post("/phase-promotions", createPhasePromotionReview);
kpiReviewsRouter.put("/phase-promotions/:id", updatePhasePromotionReview);
kpiReviewsRouter.post("/phase-promotions/:id/submit", submitPhasePromotionReview);
kpiReviewsRouter.post(
  "/phase-promotions/:id/program-admin-review",
  reviewPhasePromotionByProgramAdmin,
);
kpiReviewsRouter.post(
  "/phase-promotions/:id/super-admin-decision",
  decidePhasePromotionBySuperAdmin,
);
kpiReviewsRouter.post("/phase-promotions/:id/acknowledge", acknowledgePhasePromotionReview);
kpiReviewsRouter.get("/quarterly-summaries", listQuarterlyKpiSummaries);
kpiReviewsRouter.get("/quarterly-summaries/:id", getQuarterlyKpiSummary);
kpiReviewsRouter.post("/quarterly-summaries", createQuarterlyKpiSummary);
kpiReviewsRouter.put("/quarterly-summaries/:id", updateQuarterlyKpiSummary);
kpiReviewsRouter.post("/quarterly-summaries/:id/complete", completeQuarterlyKpiSummary);
kpiReviewsRouter.get("/", listKpiReviews);
kpiReviewsRouter.get("/:id", getKpiReview);
kpiReviewsRouter.post("/", createKpiReview);
kpiReviewsRouter.put("/:id", updateKpiReview);
kpiReviewsRouter.post("/:id/complete", completeKpiReview);

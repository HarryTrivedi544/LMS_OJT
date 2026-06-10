import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import {
  completeKpiReview,
  createKpiReview,
  getKpiReview,
  listKpiReviews,
  updateKpiReview,
} from "./kpi-reviews.controller.js";

export const kpiReviewsRouter = Router();

kpiReviewsRouter.use(authenticate);

kpiReviewsRouter.get("/", listKpiReviews);
kpiReviewsRouter.get("/:id", getKpiReview);
kpiReviewsRouter.post("/", createKpiReview);
kpiReviewsRouter.put("/:id", updateKpiReview);
kpiReviewsRouter.post("/:id/complete", completeKpiReview);

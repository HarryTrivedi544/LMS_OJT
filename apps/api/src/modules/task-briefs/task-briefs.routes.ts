import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import {
  acknowledgeTaskBrief,
  createTaskBrief,
  getTaskBrief,
  listTaskBriefs,
  reviewTaskBrief,
  submitTaskBrief,
} from "./task-briefs.controller.js";

export const taskBriefsRouter = Router();

taskBriefsRouter.use(authenticate);

taskBriefsRouter.get("/", listTaskBriefs);
taskBriefsRouter.get("/:id", getTaskBrief);
taskBriefsRouter.post("/", createTaskBrief);
taskBriefsRouter.post("/:id/acknowledge", acknowledgeTaskBrief);
taskBriefsRouter.put("/:id/submit", submitTaskBrief);
taskBriefsRouter.post("/:id/review", reviewTaskBrief);

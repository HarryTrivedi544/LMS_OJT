import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import {
  createCandidateLog,
  listCandidateLogs,
  reviewCandidateLog,
} from "./candidate-logs.controller.js";

export const candidateLogsRouter = Router();

candidateLogsRouter.use(authenticate);

candidateLogsRouter.get("/", listCandidateLogs);
candidateLogsRouter.post("/", createCandidateLog);
candidateLogsRouter.post("/:id/review", reviewCandidateLog);

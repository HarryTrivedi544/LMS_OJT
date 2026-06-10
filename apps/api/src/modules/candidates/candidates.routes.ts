import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import {
  archiveCandidate,
  createCandidate,
  listCandidateOptions,
  listCandidates,
  restoreCandidate,
} from "./candidates.controller.js";

export const candidatesRouter = Router();

candidatesRouter.use(authenticate);

candidatesRouter.get("/options", listCandidateOptions);
candidatesRouter.get("/", listCandidates);
candidatesRouter.post("/", createCandidate);
candidatesRouter.post("/:id/archive", archiveCandidate);
candidatesRouter.post("/:id/restore", restoreCandidate);

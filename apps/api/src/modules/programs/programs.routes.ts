import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { authorizeRoles } from "../../middleware/authorize-roles.js";
import {
  archiveBatch,
  archiveProgram,
  createBatch,
  createBatchAssignment,
  createProgram,
  createProgramAssignment,
  listBatchAssignments,
  listBatches,
  listProgramAssignments,
  listPrograms,
  restoreBatch,
  restoreProgram,
  updateBatch,
  updateProgram,
} from "./programs.controller.js";

export const programsRouter = Router();

programsRouter.use(authenticate, authorizeRoles("Super Admin"));

programsRouter.get("/", listPrograms);
programsRouter.post("/", createProgram);
programsRouter.patch("/:id", updateProgram);
programsRouter.post("/:id/archive", archiveProgram);
programsRouter.post("/:id/restore", restoreProgram);

programsRouter.get("/:programId/batches", listBatches);
programsRouter.post("/:programId/batches", createBatch);
programsRouter.get("/:programId/assignments", listProgramAssignments);
programsRouter.post("/:programId/assignments", createProgramAssignment);

programsRouter.patch("/batches/:id", updateBatch);
programsRouter.post("/batches/:id/archive", archiveBatch);
programsRouter.post("/batches/:id/restore", restoreBatch);
programsRouter.get("/batches/:batchId/assignments", listBatchAssignments);
programsRouter.post("/batches/:batchId/assignments", createBatchAssignment);

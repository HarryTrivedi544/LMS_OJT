import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import {
  downloadFile,
  getFile,
  listFiles,
  uploadFile,
  uploadMiddleware,
} from "./files.controller.js";

export const filesRouter = Router();

filesRouter.get("/download", downloadFile);

filesRouter.use(authenticate);

filesRouter.get("/", listFiles);
filesRouter.get("/:id", getFile);
filesRouter.post("/upload", uploadMiddleware, uploadFile);

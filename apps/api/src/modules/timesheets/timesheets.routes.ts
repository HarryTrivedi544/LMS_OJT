import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import {
  createTimesheet,
  listTimesheets,
  reviewTimesheet,
  updateTimesheet,
} from "./timesheets.controller.js";

export const timesheetsRouter = Router();

timesheetsRouter.use(authenticate);

timesheetsRouter.get("/", listTimesheets);
timesheetsRouter.post("/", createTimesheet);
timesheetsRouter.put("/:id", updateTimesheet);
timesheetsRouter.post("/:id/review", reviewTimesheet);

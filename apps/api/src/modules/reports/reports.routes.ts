import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { getReportsOverview } from "./reports.controller.js";

export const reportsRouter = Router();

reportsRouter.use(authenticate);

reportsRouter.get("/overview", getReportsOverview);

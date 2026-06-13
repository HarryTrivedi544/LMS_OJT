import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { listReportsOverviewSchema } from "./reports.schema.js";
import { ReportsService } from "./reports.service.js";

const reportsService = new ReportsService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  actorId: request.auth?.userId ?? "",
  role: request.auth?.role ?? "Candidate",
});

export const getReportsOverview = asyncHandler(async (request, response) => {
  const input = listReportsOverviewSchema.parse({ query: request.query });
  const data = await reportsService.getOverview(input.query, getContext(request));

  response.status(200).json({ success: true, data });
});

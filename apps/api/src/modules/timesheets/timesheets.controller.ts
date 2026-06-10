import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  createTimesheetSchema,
  listTimesheetsSchema,
  reviewTimesheetSchema,
  updateTimesheetSchema,
} from "./timesheets.schema.js";
import { TimesheetsService } from "./timesheets.service.js";

const timesheetsService = new TimesheetsService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  actorId: request.auth?.userId ?? "",
  role: request.auth?.role ?? "Candidate",
  ipAddress: request.ip,
  userAgent: request.header("user-agent"),
});

export const listTimesheets = asyncHandler(async (request, response) => {
  const input = listTimesheetsSchema.parse({ query: request.query });
  const data = await timesheetsService.listTimesheets(input.query, getContext(request));

  response.status(200).json({ success: true, data });
});

export const createTimesheet = asyncHandler(async (request, response) => {
  const input = createTimesheetSchema.parse({ body: request.body });
  const data = await timesheetsService.createTimesheet(input.body, getContext(request));

  response.status(201).json({ success: true, data });
});

export const updateTimesheet = asyncHandler(async (request, response) => {
  const input = updateTimesheetSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await timesheetsService.updateTimesheet(
    input.params.id,
    input.body,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const reviewTimesheet = asyncHandler(async (request, response) => {
  const input = reviewTimesheetSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await timesheetsService.reviewTimesheet(
    input.params.id,
    input.body,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

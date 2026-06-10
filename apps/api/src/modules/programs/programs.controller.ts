import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import {
  batchIdParamSchema,
  createBatchAssignmentSchema,
  createBatchSchema,
  createProgramAssignmentSchema,
  createProgramSchema,
  idParamSchema,
  listBatchesSchema,
  listProgramsSchema,
  programIdParamSchema,
  updateBatchSchema,
  updateProgramSchema,
} from "./programs.schema.js";
import { ProgramsService } from "./programs.service.js";

const programsService = new ProgramsService();

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  actorId: request.auth?.userId ?? "",
  ipAddress: request.ip,
  userAgent: request.header("user-agent"),
});

export const listPrograms = asyncHandler(async (request, response) => {
  const input = listProgramsSchema.parse({ query: request.query });
  const data = await programsService.listPrograms(input.query);

  response.status(200).json({ success: true, data });
});

export const createProgram = asyncHandler(async (request, response) => {
  const input = createProgramSchema.parse({ body: request.body });
  const data = await programsService.createProgram(input.body, getContext(request));

  response.status(201).json({ success: true, data });
});

export const updateProgram = asyncHandler(async (request, response) => {
  const input = updateProgramSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await programsService.updateProgram(
    input.params.id,
    input.body,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const archiveProgram = asyncHandler(async (request, response) => {
  const input = idParamSchema.parse({ params: request.params });
  const data = await programsService.archiveProgram(input.params.id, getContext(request));

  response.status(200).json({ success: true, data });
});

export const restoreProgram = asyncHandler(async (request, response) => {
  const input = idParamSchema.parse({ params: request.params });
  const data = await programsService.restoreProgram(input.params.id, getContext(request));

  response.status(200).json({ success: true, data });
});

export const listBatches = asyncHandler(async (request, response) => {
  const input = listBatchesSchema.parse({
    params: request.params,
    query: request.query,
  });
  const data = await programsService.listBatches(input.params.programId, input.query);

  response.status(200).json({ success: true, data });
});

export const createBatch = asyncHandler(async (request, response) => {
  const input = createBatchSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await programsService.createBatch(
    input.params.programId,
    input.body,
    getContext(request),
  );

  response.status(201).json({ success: true, data });
});

export const updateBatch = asyncHandler(async (request, response) => {
  const input = updateBatchSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await programsService.updateBatch(
    input.params.id,
    input.body,
    getContext(request),
  );

  response.status(200).json({ success: true, data });
});

export const archiveBatch = asyncHandler(async (request, response) => {
  const input = idParamSchema.parse({ params: request.params });
  const data = await programsService.archiveBatch(input.params.id, getContext(request));

  response.status(200).json({ success: true, data });
});

export const restoreBatch = asyncHandler(async (request, response) => {
  const input = idParamSchema.parse({ params: request.params });
  const data = await programsService.restoreBatch(input.params.id, getContext(request));

  response.status(200).json({ success: true, data });
});

export const listProgramAssignments = asyncHandler(async (request, response) => {
  const input = programIdParamSchema.parse({ params: request.params });
  const data = await programsService.listProgramAssignments(input.params.programId);

  response.status(200).json({ success: true, data });
});

export const createProgramAssignment = asyncHandler(async (request, response) => {
  const input = createProgramAssignmentSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await programsService.createProgramAssignment(
    input.params.programId,
    input.body,
    getContext(request),
  );

  response.status(201).json({ success: true, data });
});

export const listBatchAssignments = asyncHandler(async (request, response) => {
  const input = batchIdParamSchema.parse({ params: request.params });
  const data = await programsService.listBatchAssignments(input.params.batchId);

  response.status(200).json({ success: true, data });
});

export const createBatchAssignment = asyncHandler(async (request, response) => {
  const input = createBatchAssignmentSchema.parse({
    params: request.params,
    body: request.body,
  });
  const data = await programsService.createBatchAssignment(
    input.params.batchId,
    input.body,
    getContext(request),
  );

  response.status(201).json({ success: true, data });
});

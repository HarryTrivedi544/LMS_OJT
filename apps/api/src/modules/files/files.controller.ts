import multer from "multer";
import type { RequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { fileModules } from "./files.schema.js";
import { downloadFileSchema, getFileSchema, listFilesSchema } from "./files.schema.js";
import { FilesService } from "./files.service.js";

const filesService = new FilesService();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const getContext = (request: Parameters<RequestHandler>[0]) => ({
  actorId: request.auth?.userId ?? "",
  role: request.auth?.role ?? "Candidate",
  ipAddress: request.ip,
  userAgent: request.header("user-agent"),
});

export const uploadMiddleware = upload.single("file");

export const listFiles = asyncHandler(async (request, response) => {
  const input = listFilesSchema.parse({ query: request.query });
  const data = await filesService.listFiles(input.query, getContext(request));

  response.status(200).json({ success: true, data });
});

export const getFile = asyncHandler(async (request, response) => {
  const input = getFileSchema.parse({ params: request.params });
  const data = await filesService.getFile(input.params.id, getContext(request));

  response.status(200).json({ success: true, data });
});

export const uploadFile = asyncHandler(async (request, response) => {
  const uploadedFile = request.file;

  if (!uploadedFile) {
    response.status(400).json({
      success: false,
      error: { code: "file_required", message: "A file must be provided." },
    });
    return;
  }

  const moduleName = String(request.body.module ?? "");
  const candidateId = request.body.candidateId
    ? String(request.body.candidateId)
    : undefined;

  if (!fileModules.includes(moduleName as (typeof fileModules)[number])) {
    response.status(400).json({
      success: false,
      error: { code: "invalid_module", message: "A valid file module is required." },
    });
    return;
  }

  const data = await filesService.uploadFile(
    {
      module: moduleName as (typeof fileModules)[number],
      candidateId,
      originalName: uploadedFile.originalname,
      mimeType: uploadedFile.mimetype,
      sizeBytes: uploadedFile.size,
      buffer: uploadedFile.buffer,
    },
    getContext(request),
  );

  response.status(201).json({ success: true, data });
});

export const downloadFile = asyncHandler(async (request, response) => {
  const input = downloadFileSchema.parse({ query: request.query });
  const { file, buffer } = await filesService.downloadByToken(input.query.token);

  response.setHeader("Content-Type", file.mimeType);
  response.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(file.originalName)}"`,
  );
  response.status(200).send(buffer);
});

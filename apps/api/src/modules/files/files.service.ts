import { readFile } from "node:fs/promises";

import jwt from "jsonwebtoken";
import type { Role } from "@lms/shared";

import { env } from "../../config/env.js";
import { resolveStoragePath, saveUploadedFile } from "../../integrations/storage/file-storage.js";
import { HttpError } from "../../errors/http-error.js";
import type { FileModule, ListFilesInput } from "./files.schema.js";
import { FilesRepository, type StoredFileRecord } from "./files.repository.js";

type ActorContext = {
  actorId: string;
  role: Role;
  ipAddress?: string;
  userAgent?: string;
};

const moduleMaxBytes: Record<FileModule, number> = {
  candidates: 5 * 1024 * 1024,
  tasks: 10 * 1024 * 1024,
  submissions: 10 * 1024 * 1024,
  timesheets: 5 * 1024 * 1024,
  reviews: 5 * 1024 * 1024,
  certificates: 5 * 1024 * 1024,
  "chat-attachments": 10 * 1024 * 1024,
};

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const toFileResponse = (file: StoredFileRecord, downloadUrl?: string) => ({
  id: file.id,
  originalName: file.originalName,
  mimeType: file.mimeType,
  sizeBytes: file.sizeBytes,
  module: file.module,
  ownerUserId: file.ownerUserId,
  candidateId: file.candidateId,
  isPrivate: file.isPrivate,
  isActive: file.isActive,
  createdAt: file.createdAt.toISOString(),
  updatedAt: file.updatedAt.toISOString(),
  deletedAt: file.deletedAt?.toISOString() ?? null,
  downloadUrl: downloadUrl ?? null,
});

const createSignedDownloadToken = (fileId: string) =>
  jwt.sign({ fileId }, env.SIGNED_URL_SECRET, { expiresIn: "15m" });

export class FilesService {
  constructor(private readonly repository = new FilesRepository()) {}

  async listFiles(input: ListFilesInput, context: ActorContext) {
    const files = await this.repository.list({
      ...input,
      actorId: context.actorId,
      role: context.role,
    });

    return files.map((file) =>
      toFileResponse(file, this.buildSignedDownloadUrl(file.id)),
    );
  }

  async getFile(id: string, context: ActorContext) {
    const canAccess = await this.repository.canAccessFile({
      fileId: id,
      actorId: context.actorId,
      role: context.role,
    });

    if (!canAccess) {
      throw new HttpError(404, "file_not_found", "File not found.");
    }

    const file = await this.repository.findById(id);

    if (!file) {
      throw new HttpError(404, "file_not_found", "File not found.");
    }

    return toFileResponse(file, this.buildSignedDownloadUrl(file.id));
  }

  async uploadFile(
    input: {
      module: FileModule;
      candidateId?: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      buffer: Buffer;
    },
    context: ActorContext,
  ) {
    if (!allowedMimeTypes.has(input.mimeType)) {
      throw new HttpError(400, "file_type_not_allowed", "This file type is not allowed.");
    }

    const maxBytes = moduleMaxBytes[input.module];

    if (input.sizeBytes > maxBytes) {
      throw new HttpError(400, "file_too_large", "File exceeds the allowed size for this module.");
    }

    let candidateId = input.candidateId;

    if (context.role === "Candidate") {
      if (input.module !== "candidates") {
        throw new HttpError(
          403,
          "candidate_upload_scope_denied",
          "Candidates can upload only profile files.",
        );
      }

      const ownCandidate = await this.repository.findCandidateByUserId(context.actorId);

      if (!ownCandidate) {
        throw new HttpError(404, "candidate_not_found", "Active candidate not found.");
      }

      candidateId = ownCandidate.id;
    }

    const storageKey = await saveUploadedFile({
      module: input.module,
      originalName: input.originalName,
      buffer: input.buffer,
    });

    const file = await this.repository.create({
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey,
      module: input.module,
      ownerUserId: context.actorId,
      candidateId,
      isPrivate: true,
    });

    if (!file) {
      throw new HttpError(500, "file_upload_failed", "Failed to save file metadata.");
    }

    await this.repository.audit({
      actorType: "user",
      actorId: context.actorId,
      action: "file.uploaded",
      entityType: "file",
      entityId: file.id,
      newValue: toFileResponse(file),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    await this.repository.emitDomainEvent({
      eventName: "file.uploaded",
      entityType: "file",
      entityId: file.id,
      actorType: "user",
      actorId: context.actorId,
      payload: toFileResponse(file),
    });

    return toFileResponse(file, this.buildSignedDownloadUrl(file.id));
  }

  async downloadByToken(token: string) {
    let fileId: string;

    try {
      const payload = jwt.verify(token, env.SIGNED_URL_SECRET) as { fileId: string };
      fileId = payload.fileId;
    } catch {
      throw new HttpError(401, "invalid_download_token", "Download link is invalid or expired.");
    }

    const file = await this.repository.findById(fileId);

    if (!file) {
      throw new HttpError(404, "file_not_found", "File not found.");
    }

    const absolutePath = resolveStoragePath(file.storageKey);
    const buffer = await readFile(absolutePath);

    return {
      file,
      buffer,
    };
  }

  private buildSignedDownloadUrl(fileId: string) {
    const token = createSignedDownloadToken(fileId);

    return `${env.API_BASE_URL}/api/v1/files/download?token=${encodeURIComponent(token)}`;
  }
}

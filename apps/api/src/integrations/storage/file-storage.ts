import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { env } from "../../config/env.js";

export const resolveStoragePath = (...segments: string[]) =>
  path.resolve(env.FILE_STORAGE_ROOT, ...segments);

export const saveUploadedFile = async (input: {
  module: string;
  originalName: string;
  buffer: Buffer;
}) => {
  const extension = path.extname(input.originalName);
  const storageKey = path.posix.join(input.module, `${randomUUID()}${extension}`);
  const absolutePath = resolveStoragePath(storageKey);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.buffer);

  return storageKey;
};

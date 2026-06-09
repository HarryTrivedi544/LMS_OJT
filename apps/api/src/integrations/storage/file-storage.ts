import path from "node:path";

import { env } from "../../config/env.js";

export const resolveStoragePath = (...segments: string[]) =>
  path.resolve(env.FILE_STORAGE_ROOT, ...segments);

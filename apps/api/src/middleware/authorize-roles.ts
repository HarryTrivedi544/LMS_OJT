import type { Role } from "@lms/shared";
import type { RequestHandler } from "express";

import { HttpError } from "../errors/http-error.js";

export const authorizeRoles =
  (...allowedRoles: Role[]): RequestHandler =>
  (request, _response, next) => {
    if (!request.auth) {
      next(new HttpError(401, "unauthenticated", "Authentication is required."));
      return;
    }

    if (!allowedRoles.includes(request.auth.role)) {
      next(new HttpError(403, "forbidden", "You do not have permission."));
      return;
    }

    next();
  };

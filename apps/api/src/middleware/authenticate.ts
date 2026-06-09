import type { RequestHandler } from "express";

import { HttpError } from "../errors/http-error.js";
import { AuthRepository } from "../modules/auth/auth.repository.js";
import { verifyAccessToken } from "../security/tokens.js";

const repository = new AuthRepository();

export const authenticate: RequestHandler = async (request, _response, next) => {
  const header = request.header("authorization");
  const [scheme, token] = header?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    next(new HttpError(401, "missing_access_token", "Access token is required."));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await repository.findActiveUserById(payload.sub);

    if (!user) {
      next(new HttpError(401, "invalid_access_token", "Access token is invalid."));
      return;
    }

    request.auth = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch {
    next(new HttpError(401, "invalid_access_token", "Access token is invalid."));
  }
};

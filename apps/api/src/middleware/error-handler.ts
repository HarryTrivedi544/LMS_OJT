import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { HttpError } from "../errors/http-error.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      success: false,
      error: {
        code: "validation_error",
        message: "Request validation failed.",
        details: error.flatten(),
      },
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected error";

  response.status(500).json({
    success: false,
    error: {
      code: "internal_server_error",
      message,
    },
  });
};

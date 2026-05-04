import type { ErrorRequestHandler, RequestHandler } from "express";
import type { Logger } from "pino";

import { ApiError } from "../errors/apiError.js";
import { sendError } from "../utils/apiResponse.js";

export function notFoundHandler(): RequestHandler {
  return (_request, response) => {
    sendError(response, 404, "NOT_FOUND", "Route not found");
  };
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    if (error instanceof ApiError) {
      sendError(response, error.statusCode, error.code, error.message, error.fields);
      return;
    }

    logger.error(
      {
        error,
        method: request.method,
        path: request.originalUrl
      },
      "Unhandled API error"
    );

    sendError(response, 500, "INTERNAL_ERROR", "An unexpected error occurred");
  };
}

import type { ErrorRequestHandler, RequestHandler } from "express";

import { ApiError } from "../errors/apiError.js";
import { logger } from "../config/logger.js";
import { sendError } from "../utils/apiResponse.js";

function isJsonParseError(error: unknown): error is SyntaxError & { type: string } {
  return error instanceof SyntaxError && "type" in error && error.type === "entity.parse.failed";
}

function getSafeRouteLabel(request: Parameters<RequestHandler>[0]) {
  if (typeof request.route?.path === "string") {
    return `${request.baseUrl}${request.route.path}`;
  }

  return request.baseUrl || "unmatched";
}

export function notFoundHandler(): RequestHandler {
  return (request, response) => {
    logger.debug({ method: request.method, path: request.path }, "Route not found");
    sendError(response, 404, "NOT_FOUND", "Route not found", undefined, request.requestId);
  };
}

export function errorHandler(): ErrorRequestHandler {
  return (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    if (isJsonParseError(error)) {
      sendError(response, 400, "VALIDATION_ERROR", "Invalid JSON request body", {
        body: "Request body must be valid JSON"
      }, request.requestId);
      return;
    }

    if (error instanceof ApiError) {
      if (error.statusCode >= 500) {
        logger.error({ error, method: request.method, route: getSafeRouteLabel(request) }, "API error");
      } else {
        logger.info({ code: error.code, statusCode: error.statusCode, method: request.method, route: getSafeRouteLabel(request) }, "Client error response");
      }
      sendError(response, error.statusCode, error.code, error.message, error.fields, request.requestId, error.warnings);
      return;
    }

    logger.error(
      {
        error,
        method: request.method,
        route: getSafeRouteLabel(request)
      },
      "Unhandled API error"
    );

    sendError(response, 500, "INTERNAL_ERROR", "An unexpected error occurred", undefined, request.requestId);
  };
}

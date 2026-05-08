import type { RequestHandler } from "express";

import { logger } from "../config/logger.js";
import { metricsRegistry, normaliseHttpRoute, startTimer } from "../observability/metrics.js";
import { createRequestContext, runWithObservabilityContext } from "../observability/requestContext.js";

function getRouteTemplate(request: Parameters<RequestHandler>[0]) {
  if (typeof request.route?.path === "string") {
    return `${request.baseUrl}${request.route.path}`;
  }

  return undefined;
}

export function requestContextMiddleware(): RequestHandler {
  return (request, response, next) => {
    const context = createRequestContext(request.headers);

    request.requestId = context.requestId;
    request.correlationId = context.correlationId;
    request.traceId = context.traceId;

    response.setHeader("X-Request-Id", context.requestId);
    response.setHeader("X-Correlation-Id", context.correlationId);

    runWithObservabilityContext(context, () => next());
  };
}

export function requestMetricsMiddleware(): RequestHandler {
  return (request, response, next) => {
    const stop = startTimer();

    response.on("finish", () => {
      const durationMs = stop();
      const route = normaliseHttpRoute(getRouteTemplate(request));

      metricsRegistry.observeHttpRequest({
        durationMs,
        method: request.method,
        route,
        statusCode: response.statusCode
      });

      logger.info(
        {
          durationMs: Number(durationMs.toFixed(2)),
          method: request.method,
          route,
          statusCode: response.statusCode
        },
        "HTTP request completed"
      );
    });

    next();
  };
}

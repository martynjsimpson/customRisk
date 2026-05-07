import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express from "express";
import type { Logger } from "pino";

import { getCorsAllowedOrigins } from "./config/env.js";
import { logger as defaultLogger } from "./config/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { recordHttpRequest } from "./observability/metrics.js";
import { createApiRouter } from "./routes/index.js";

export interface CreateAppOptions {
  logger?: Logger;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const appLogger = options.logger ?? defaultLogger;
  const allowedOrigins = getCorsAllowedOrigins();

  if (process.env.NODE_ENV === "production" && allowedOrigins.includes("*")) {
    throw new Error("CORS_ALLOWED_ORIGINS must not contain wildcard origins in production");
  }

  app.disable("x-powered-by");
  app.use(cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    }
  }));
  app.use((request, response, next) => {
    const startedAt = process.hrtime.bigint();

    response.once("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const requestPath = request.originalUrl.split("?", 1)[0] ?? request.path;
      recordHttpRequest(request.method, requestPath, response.statusCode, durationMs);
    });

    next();
  });
  app.use(express.json());

  app.use("/api/v1", createApiRouter());

  if (process.env.NODE_ENV === "production") {
    const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../public");
    app.use(express.static(publicDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        next();
        return;
      }
      res.sendFile(join(publicDir, "index.html"));
    });
  }

  app.use(notFoundHandler());
  app.use(errorHandler(appLogger));

  return app;
}

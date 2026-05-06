import express from "express";
import cors from "cors";
import type { Logger } from "pino";

import { getCorsAllowedOrigins } from "./config/env.js";
import { logger as defaultLogger } from "./config/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
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
  app.use(express.json());

  app.use("/api/v1", createApiRouter());

  app.use(notFoundHandler());
  app.use(errorHandler(appLogger));

  return app;
}

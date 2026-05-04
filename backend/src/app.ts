import express from "express";
import type { Logger } from "pino";

import { logger as defaultLogger } from "./config/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createApiRouter } from "./routes/index.js";

export interface CreateAppOptions {
  logger?: Logger;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const appLogger = options.logger ?? defaultLogger;

  app.disable("x-powered-by");
  app.use(express.json());

  app.use("/api/v1", createApiRouter());

  app.use(notFoundHandler());
  app.use(errorHandler(appLogger));

  return app;
}

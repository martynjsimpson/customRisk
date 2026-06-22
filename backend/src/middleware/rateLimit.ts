import rateLimit from "express-rate-limit";

import { getNodeEnv, getRateLimitMaxLogin, getRateLimitWindowMs } from "../config/env.js";
import { sendError } from "../utils/apiResponse.js";

const isDevelopment = getNodeEnv() === "development";

export const loginRateLimit = rateLimit({
  windowMs: getRateLimitWindowMs(),
  max: isDevelopment ? 1000 : getRateLimitMaxLogin(),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (request, response) => {
    sendError(response, 429, "RATE_LIMITED", "Too many authentication attempts", undefined, request.requestId);
  }
});

export const refreshRateLimit = rateLimit({
  windowMs: getRateLimitWindowMs(),
  max: isDevelopment ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (request, response) => {
    sendError(response, 429, "RATE_LIMITED", "Too many refresh attempts", undefined, request.requestId);
  }
});

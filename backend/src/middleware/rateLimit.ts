import rateLimit from "express-rate-limit";

import { getRateLimitMaxLogin, getRateLimitWindowMs } from "../config/env.js";
import { sendError } from "../utils/apiResponse.js";

export const loginRateLimit = rateLimit({
  windowMs: getRateLimitWindowMs(),
  max: getRateLimitMaxLogin(),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (request, response) => {
    sendError(response, 429, "RATE_LIMITED", "Too many authentication attempts", undefined, request.requestId);
  }
});

export const refreshRateLimit = rateLimit({
  windowMs: getRateLimitWindowMs(),
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (request, response) => {
    sendError(response, 429, "RATE_LIMITED", "Too many refresh attempts", undefined, request.requestId);
  }
});

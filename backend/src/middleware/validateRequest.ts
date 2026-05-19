import type { NextFunction, Request, Response } from "express";
import type { ZodError, ZodSchema } from "zod";

import { ApiError } from "../errors/apiError.js";

export interface RequestSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function zodToFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
    if (!(key in fields)) {
      fields[key] = issue.message;
    }
  }
  return fields;
}

export function validateRequest(schemas: RequestSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.params !== undefined) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        next(new ApiError(400, "VALIDATION_ERROR", "Invalid request parameters", zodToFields(result.error)));
        return;
      }
      req.params = result.data as Record<string, string>;
    }

    if (schemas.query !== undefined) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        next(new ApiError(400, "VALIDATION_ERROR", "Invalid query parameters", zodToFields(result.error)));
        return;
      }
      // Express 5 made req.query a read-only getter; override with validated/coerced data
      Object.defineProperty(req, "query", { value: result.data, writable: true, configurable: true, enumerable: true });
    }

    if (schemas.body !== undefined) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        next(new ApiError(400, "VALIDATION_ERROR", "Invalid request body", zodToFields(result.error)));
        return;
      }
      req.body = result.data;
    }

    next();
  };
}

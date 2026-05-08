import type { Response } from "express";

import type { ApiErrorCode, ErrorFields } from "../errors/apiError.js";

export type ApiMeta = Record<string, unknown>;

export interface ApiSuccessResponse<TData> {
  data: TData;
  meta?: ApiMeta;
}

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: ErrorFields;
    requestId?: string;
  };
}

export function sendData<TData>(
  response: Response,
  data: TData,
  statusCode = 200,
  meta?: ApiMeta
) {
  const body: ApiSuccessResponse<TData> = meta ? { data, meta } : { data };
  return response.status(statusCode).json(body);
}

export function sendError(
  response: Response,
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  fields?: ErrorFields,
  requestId?: string
) {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
      ...(requestId ? { requestId } : {})
    }
  };

  return response.status(statusCode).json(body);
}

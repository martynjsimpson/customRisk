import type { Request } from "express";

export type TypedRequestBody<TBody> = Request<Record<string, string>, unknown, TBody>;

export type TypedRequestQuery<TQuery> = Request<Record<string, string>, unknown, unknown, TQuery>;

export type TypedRequest<
  TBody = unknown,
  TQuery = unknown,
  TParams extends Record<string, string> = Record<string, string>
> = Request<TParams, unknown, TBody, TQuery>;

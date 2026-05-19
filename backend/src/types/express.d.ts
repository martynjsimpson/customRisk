import type { Request } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

export interface AuthenticatedActor {
  id: string;
  name: string;
  email: string;
  isSystemAdmin: boolean;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      actor?: AuthenticatedActor;
      correlationId?: string;
      requestId?: string;
      traceId?: string;
    }
  }
}

export type TypedRequestBody<TBody> = Request<ParamsDictionary, unknown, TBody>;

export type TypedRequestQuery<TQuery> = Request<ParamsDictionary, unknown, unknown, TQuery>;

export type TypedRequest<
  TBody = unknown,
  TQuery = unknown,
  TParams extends ParamsDictionary = ParamsDictionary
> = Request<TParams, unknown, TBody, TQuery>;

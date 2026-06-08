import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRouteHandler = (
  request: Request<any, any, any, any>,
  response: Response,
  next: NextFunction
) => unknown;

export function asyncRoute(handler: AsyncRouteHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

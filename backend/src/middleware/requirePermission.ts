import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../errors/apiError.js";
import { canManageRegister, canViewRegister, canExportRegister } from "../permissions/registerAccess.js";
import { canEditRisk, canViewRisk } from "../permissions/riskAccess.js";

function requireActor(request: Request) {
  if (!request.actor) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  return request.actor;
}

function hiddenNotFound() {
  return new ApiError(404, "NOT_FOUND", "Resource not found");
}

export function requireSystemAdmin(request: Request, _response: Response, next: NextFunction) {
  try {
    const actor = requireActor(request);
    if (!actor.isSystemAdmin) {
      throw new ApiError(403, "FORBIDDEN", "System Admin permission is required");
    }
    next();
  } catch (error) {
    next(error);
  }
}

function routeParam(request: Request, name: string): string | undefined {
  const value = request.params[name];
  return typeof value === "string" ? value : undefined;
}

export function requireRegisterAccess(paramName = "registerId") {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const actor = requireActor(request);
      const registerId = routeParam(request, paramName);
      if (!registerId || !(await canViewRegister(actor, registerId))) {
        throw hiddenNotFound();
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRegisterManagement(paramName = "registerId") {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const actor = requireActor(request);
      const registerId = routeParam(request, paramName);
      if (!registerId || !(await canManageRegister(actor, registerId))) {
        throw hiddenNotFound();
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRiskView(registerParam = "registerId", riskParam = "riskId") {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const actor = requireActor(request);
      const registerId = routeParam(request, registerParam);
      const riskId = routeParam(request, riskParam);
      if (!registerId || !riskId || !(await canViewRisk(actor, registerId, riskId))) {
        throw hiddenNotFound();
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRiskEdit(registerParam = "registerId", riskParam = "riskId") {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const actor = requireActor(request);
      const registerId = routeParam(request, registerParam);
      const riskId = routeParam(request, riskParam);
      if (!registerId || !riskId || !(await canEditRisk(actor, registerId, riskId))) {
        throw hiddenNotFound();
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireExportAccess(paramName = "registerId") {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const actor = requireActor(request);
      const registerId = routeParam(request, paramName);
      if (!registerId || !(await canExportRegister(actor, registerId))) {
        throw hiddenNotFound();
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

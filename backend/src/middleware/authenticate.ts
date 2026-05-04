import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../auth/tokens.js";
import { prisma } from "../db/prisma.js";
import { ApiError } from "../errors/apiError.js";

export async function authenticate(request: Request, _response: Response, next: NextFunction) {
  try {
    const header = request.header("authorization");
    const [scheme, token] = header?.split(" ") ?? [];

    if (scheme !== "Bearer" || !token) {
      throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        isSystemAdmin: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
    }

    request.actor = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }

    next(new ApiError(401, "UNAUTHENTICATED", "Authentication is required"));
  }
}

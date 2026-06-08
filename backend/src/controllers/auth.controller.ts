import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

import { ApiError } from "../errors/apiError.js";
import { sendData } from "../utils/apiResponse.js";
import { getCurrentSession, login, logout, refreshSession } from "../services/auth.service.js";
import type { LoginRequestBody } from "../validators/auth.schemas.js";
import { REFRESH_COOKIE_NAME, getRefreshTokenFromRequest } from "../utils/cookies.js";

const AUTH_COOKIE_PATH = "/api/v1/auth";

function getRefreshToken(request: Request) {
  return getRefreshTokenFromRequest(request);
}

function setRefreshCookie(response: Response, token: string, expiresAt: Date) {
  response.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: AUTH_COOKIE_PATH,
    expires: expiresAt
  });
}

function clearRefreshCookie(response: Response) {
  response.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: AUTH_COOKIE_PATH
  });
}

export async function loginController(
  request: Request<ParamsDictionary, unknown, LoginRequestBody>,
  response: Response
) {
  const session = await login(request.body.email, request.body.password);
  setRefreshCookie(response, session.refreshToken, session.refreshTokenExpiresAt);

  sendData(response, {
    accessToken: session.accessToken,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      isSystemAdmin: session.user.isSystemAdmin
    }
  });
}

export async function refreshController(request: Request, response: Response) {
  const refreshToken = getRefreshToken(request);
  if (!refreshToken) {
    throw new ApiError(401, "UNAUTHENTICATED", "Refresh token is required");
  }

  const session = await refreshSession(refreshToken);
  setRefreshCookie(response, session.refreshToken, session.refreshTokenExpiresAt);

  sendData(response, {
    accessToken: session.accessToken
  });
}

export async function logoutController(request: Request, response: Response) {
  if (!request.actor) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  await logout(request.actor.id, getRefreshToken(request));
  clearRefreshCookie(response);
  sendData(response, { success: true });
}

export async function meController(request: Request, response: Response) {
  if (!request.actor) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  sendData(response, await getCurrentSession(request.actor.id));
}

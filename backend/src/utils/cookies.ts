import type { Request } from "express";

export const REFRESH_COOKIE_NAME = "refreshToken";

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();

  if (!cookieHeader) {
    return cookies;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName || rawValue.length === 0) {
      continue;
    }
    cookies.set(rawName, decodeURIComponent(rawValue.join("=")));
  }

  return cookies;
}

export function getRefreshTokenFromRequest(request: Request): string | undefined {
  return parseCookies(request.headers.cookie).get(REFRESH_COOKIE_NAME);
}

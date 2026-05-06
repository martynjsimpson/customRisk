import { ApiError } from "../errors/apiError.js";
import type { AuthenticatedActor } from "../types/express.js";

export function actorOrThrow(request: { actor?: AuthenticatedActor }) {
  if (!request.actor) {
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required");
  }

  return request.actor;
}

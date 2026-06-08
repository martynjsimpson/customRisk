import type { Request, Response } from "express";

import {
  completeRiskReview,
  listRiskReviews
} from "../services/reviews.service.js";
import { actorOrThrow } from "../utils/actorOrThrow.js";
import { sendData } from "../utils/apiResponse.js";
import type {
  CreateRiskReviewBody,
  RiskIdParams
} from "../validators/risks.schemas.js";

export async function listRiskReviewsController(
  request: Request<RiskIdParams>,
  response: Response
) {
  sendData(
    response,
    await listRiskReviews(
      actorOrThrow(request),
      request.params.registerId,
      request.params.riskId
    )
  );
}

export async function completeRiskReviewController(
  request: Request<RiskIdParams, unknown, CreateRiskReviewBody>,
  response: Response
) {
  sendData(
    response,
    await completeRiskReview(
      actorOrThrow(request),
      request.params.registerId,
      request.params.riskId,
      request.body
    ),
    201
  );
}

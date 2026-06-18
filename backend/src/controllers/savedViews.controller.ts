import type { Request, Response } from "express";

import {
  createSavedView,
  deleteSavedView,
  listSavedViews,
  updateSavedView
} from "../services/savedViews.service.js";
import { actorOrThrow } from "../utils/actorOrThrow.js";
import { sendData } from "../utils/apiResponse.js";
import type {
  CreateSavedViewBody,
  SavedViewIdParams,
  SavedViewRegisterParams,
  UpdateSavedViewBody
} from "../validators/savedViews.schemas.js";

export async function listSavedViewsController(
  request: Request<SavedViewRegisterParams>,
  response: Response
) {
  sendData(response, await listSavedViews(actorOrThrow(request), request.params.registerId));
}

export async function createSavedViewController(
  request: Request<SavedViewRegisterParams, unknown, CreateSavedViewBody>,
  response: Response
) {
  sendData(
    response,
    await createSavedView(actorOrThrow(request), request.params.registerId, request.body),
    201
  );
}

export async function updateSavedViewController(
  request: Request<SavedViewIdParams, unknown, UpdateSavedViewBody>,
  response: Response
) {
  sendData(
    response,
    await updateSavedView(
      actorOrThrow(request),
      request.params.registerId,
      request.params.viewId,
      request.body
    )
  );
}

export async function deleteSavedViewController(
  request: Request<SavedViewIdParams>,
  response: Response
) {
  await deleteSavedView(actorOrThrow(request), request.params.registerId, request.params.viewId);
  response.status(204).send();
}

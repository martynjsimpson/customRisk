import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

import {
  listUnresolvedPersonReferences,
  searchPersons
} from "../services/personReference.service.js";
import { sendData } from "../utils/apiResponse.js";

type PersonSearchQuery = {
  q: string;
  limit: number;
};

export async function searchPersonsController(
  request: Request<ParamsDictionary, unknown, unknown, PersonSearchQuery>,
  response: Response
) {
  const { q, limit } = request.query;
  sendData(response, await searchPersons(q, limit));
}

export async function listUnresolvedPersonReferencesController(
  _request: Request,
  response: Response
) {
  sendData(response, await listUnresolvedPersonReferences());
}

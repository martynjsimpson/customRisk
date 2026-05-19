import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

import { actorOrThrow } from "../utils/actorOrThrow.js";
import { sendData } from "../utils/apiResponse.js";
import {
  listTemplates,
  getTemplate,
  createTemplate,
  createTemplateFromRegister,
  updateTemplate,
  deactivateTemplate,
  publishTemplateVersion,
  compareRegisterToTemplate,
  applyTemplateUpdateToDraft
} from "../services/template.service.js";
import { createRegisterFromTemplate } from "../services/registers.service.js";
import type {
  TemplateParams,
  CompareParams,
  ListTemplatesQuery,
  CreateTemplateWithSnapshotBody,
  CreateTemplateBody,
  UpdateTemplateBody,
  CreateRegisterFromTemplateBody,
  PublishTemplateVersionBody
} from "../validators/template.schemas.js";
import type { RegisterIdParams } from "../validators/registers.schemas.js";
import type { RegisterConfigSnapshot } from "../types/configSnapshot.js";

export async function listTemplatesController(
  request: Request<ParamsDictionary, unknown, unknown, ListTemplatesQuery>,
  response: Response
) {
  sendData(response, await listTemplates(request.query.includeInactive));
}

export async function getTemplateController(
  request: Request<TemplateParams>,
  response: Response
) {
  sendData(response, await getTemplate(request.params.templateId));
}

export async function createTemplateController(
  request: Request<ParamsDictionary, unknown, CreateTemplateWithSnapshotBody>,
  response: Response
) {
  const actor = actorOrThrow(request);
  const { name, description, snapshotJson } = request.body;
  sendData(
    response,
    await createTemplate(
      { name, description, snapshotJson: snapshotJson as unknown as RegisterConfigSnapshot },
      actor.id,
      actor.name,
      actor.email
    ),
    201
  );
}

export async function createTemplateFromRegisterController(
  request: Request<RegisterIdParams, unknown, CreateTemplateBody>,
  response: Response
) {
  const actor = actorOrThrow(request);
  const { name, description } = request.body;
  sendData(
    response,
    await createTemplateFromRegister(
      request.params.registerId,
      { name, description },
      actor.id,
      actor.name,
      actor.email
    ),
    201
  );
}

export async function updateTemplateController(
  request: Request<TemplateParams, unknown, UpdateTemplateBody>,
  response: Response
) {
  const actor = actorOrThrow(request);
  sendData(
    response,
    await updateTemplate(request.params.templateId, request.body, actor.id, actor.name, actor.email)
  );
}

export async function deactivateTemplateController(
  request: Request<TemplateParams>,
  response: Response
) {
  const actor = actorOrThrow(request);
  sendData(
    response,
    await deactivateTemplate(request.params.templateId, actor.id, actor.name, actor.email)
  );
}

export async function publishTemplateVersionController(
  request: Request<TemplateParams, unknown, PublishTemplateVersionBody>,
  response: Response
) {
  const actor = actorOrThrow(request);
  sendData(
    response,
    await publishTemplateVersion(
      request.params.templateId,
      { snapshotJson: request.body.snapshotJson as unknown as RegisterConfigSnapshot },
      actor.id,
      actor.name,
      actor.email
    ),
    201
  );
}

export async function createRegisterFromTemplateController(
  request: Request<ParamsDictionary, unknown, CreateRegisterFromTemplateBody>,
  response: Response
) {
  const actor = actorOrThrow(request);
  const { templateVersionId, name } = request.body;
  sendData(
    response,
    await createRegisterFromTemplate(templateVersionId, name, actor.id, actor.name, actor.email),
    201
  );
}

export async function compareRegisterToTemplateController(
  request: Request<CompareParams>,
  response: Response
) {
  sendData(
    response,
    await compareRegisterToTemplate(request.params.registerId, request.params.templateVersionId)
  );
}

export async function applyTemplateUpdateToDraftController(
  request: Request<CompareParams>,
  response: Response
) {
  const actor = actorOrThrow(request);
  sendData(
    response,
    await applyTemplateUpdateToDraft(
      request.params.registerId,
      request.params.templateVersionId,
      actor.id,
      actor.name,
      actor.email
    ),
    201
  );
}

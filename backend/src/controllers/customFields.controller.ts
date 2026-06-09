import type { Request, Response } from "express";

import {
  activateCustomField,
  createCustomField,
  createCustomFieldOption,
  deactivateCustomField,
  deactivateCustomFieldOption,
  getCustomField,
  listCustomFields,
  listCustomFieldOptions,
  migrateCustomFieldType,
  previewFieldTypeMigration,
  updateCustomField,
  updateCustomFieldOption
} from "../services/customFields.service.js";
import { getRegisterConfig, getRiskFormConfig } from "../services/registerConfig.service.js";
import { actorOrThrow } from "../utils/actorOrThrow.js";
import { sendData } from "../utils/apiResponse.js";
import type {
  CreateCustomFieldBody,
  CreateCustomFieldOptionBody,
  CustomFieldOptionParams,
  CustomFieldParams,
  MigrateFieldTypeBody,
  MigrateFieldTypeQuery,
  UpdateCustomFieldBody,
  UpdateCustomFieldOptionBody
} from "../validators/customFields.schemas.js";
import type { RegisterIdParams } from "../validators/registers.schemas.js";

export async function getRegisterConfigController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  sendData(response, await getRegisterConfig(request.params.registerId));
}

export async function getRiskFormConfigController(
  request: Request<RegisterIdParams>,
  response: Response
) {
  sendData(response, await getRiskFormConfig(request.params.registerId, actorOrThrow(request)));
}

export async function listCustomFieldsController(request: Request<RegisterIdParams>, response: Response) {
  sendData(response, await listCustomFields(request.params.registerId));
}

export async function createCustomFieldController(
  request: Request<RegisterIdParams, unknown, CreateCustomFieldBody>,
  response: Response
) {
  sendData(
    response,
    await createCustomField(actorOrThrow(request), request.params.registerId, request.body),
    201
  );
}

export async function getCustomFieldController(request: Request<CustomFieldParams>, response: Response) {
  sendData(response, await getCustomField(request.params.registerId, request.params.fieldId));
}

export async function updateCustomFieldController(
  request: Request<CustomFieldParams, unknown, UpdateCustomFieldBody>,
  response: Response
) {
  sendData(
    response,
    await updateCustomField(actorOrThrow(request), request.params.registerId, request.params.fieldId, request.body)
  );
}

export async function activateCustomFieldController(request: Request<CustomFieldParams>, response: Response) {
  sendData(
    response,
    await activateCustomField(actorOrThrow(request), request.params.registerId, request.params.fieldId)
  );
}

export async function deactivateCustomFieldController(request: Request<CustomFieldParams>, response: Response) {
  sendData(
    response,
    await deactivateCustomField(actorOrThrow(request), request.params.registerId, request.params.fieldId)
  );
}

export async function previewFieldTypeMigrationController(
  request: Request<CustomFieldParams, unknown, unknown, MigrateFieldTypeQuery>,
  response: Response
) {
  sendData(
    response,
    await previewFieldTypeMigration(
      request.params.registerId,
      request.params.fieldId,
      request.query.targetType
    )
  );
}

export async function migrateCustomFieldTypeController(
  request: Request<CustomFieldParams, unknown, MigrateFieldTypeBody>,
  response: Response
) {
  sendData(
    response,
    await migrateCustomFieldType(
      actorOrThrow(request),
      request.params.registerId,
      request.params.fieldId,
      request.body.targetType
    )
  );
}

export async function listCustomFieldOptionsController(request: Request<CustomFieldParams>, response: Response) {
  sendData(response, await listCustomFieldOptions(request.params.registerId, request.params.fieldId));
}

export async function createCustomFieldOptionController(
  request: Request<CustomFieldParams, unknown, CreateCustomFieldOptionBody>,
  response: Response
) {
  sendData(
    response,
    await createCustomFieldOption(
      actorOrThrow(request),
      request.params.registerId,
      request.params.fieldId,
      request.body
    ),
    201
  );
}

export async function updateCustomFieldOptionController(
  request: Request<CustomFieldOptionParams, unknown, UpdateCustomFieldOptionBody>,
  response: Response
) {
  sendData(
    response,
    await updateCustomFieldOption(
      actorOrThrow(request),
      request.params.registerId,
      request.params.fieldId,
      request.params.optionId,
      request.body
    )
  );
}

export async function deactivateCustomFieldOptionController(
  request: Request<CustomFieldOptionParams>,
  response: Response
) {
  sendData(
    response,
    await deactivateCustomFieldOption(
      actorOrThrow(request),
      request.params.registerId,
      request.params.fieldId,
      request.params.optionId
    )
  );
}

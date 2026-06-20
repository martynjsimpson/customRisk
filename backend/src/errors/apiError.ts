export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "VALIDATION_WARNING"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "INVALID_MODE"
  | "INVALID_OPERATION";

export type ErrorFields = Record<string, string>;

export interface FieldWarning {
  fieldId: string;
  fieldName: string;
  message: string;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;
  readonly fields?: ErrorFields;
  readonly warnings?: FieldWarning[];

  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    fields?: ErrorFields,
    warnings?: FieldWarning[]
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    this.warnings = warnings;
  }
}

import { Alert, Stack, Text } from "@mantine/core";
import { isAxiosError } from "axios";

import type { FieldWarning } from "../api/risks.api";

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
    warnings?: FieldWarning[];
  };
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.error?.message ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function getApiErrorFields(error: unknown) {
  if (!isAxiosError<ApiErrorBody>(error)) {
    return undefined;
  }

  return error.response?.data?.error?.fields;
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (!isAxiosError<ApiErrorBody>(error)) {
    return undefined;
  }

  return error.response?.data?.error?.code;
}

export function getApiErrorWarnings(error: unknown): FieldWarning[] | undefined {
  if (!isAxiosError<ApiErrorBody>(error)) {
    return undefined;
  }

  return error.response?.data?.error?.warnings;
}

export function formatApiErrorFieldName(field: string) {
  if (field === "_root" || field === "body") {
    return "Request";
  }

  if (field.startsWith("field.")) {
    return "";
  }

  return field
    .replace(/\.(\d+)(?=\.|$)/g, " $1")
    .replace(/\./g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function ApiErrorAlert({
  error,
  fallback
}: {
  error: unknown;
  fallback?: string;
}) {
  if (!error) {
    return null;
  }

  const fields = getApiErrorFields(error);

  return (
    <Alert color="red">
      <Stack gap={4}>
        <Text>{getApiErrorMessage(error, fallback)}</Text>
        {fields
          ? Object.entries(fields)
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([field, message]) => (
                <Text key={field} size="sm">
                  {formatApiErrorFieldName(field)
                    ? `${formatApiErrorFieldName(field)}: ${message}`
                    : message}
                </Text>
              ))
          : null}
      </Stack>
    </Alert>
  );
}

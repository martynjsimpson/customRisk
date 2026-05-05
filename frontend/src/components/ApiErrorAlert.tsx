import { Alert, Stack, Text } from "@mantine/core";
import { isAxiosError } from "axios";

interface ApiErrorBody {
  error?: {
    message?: string;
    fields?: Record<string, string>;
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
    <Alert color="red" variant="light">
      <Stack gap={4}>
        <Text>{getApiErrorMessage(error, fallback)}</Text>
        {fields
          ? Object.entries(fields).map(([field, message]) => (
              <Text key={field} size="sm">
                {field}: {message}
              </Text>
            ))
          : null}
      </Stack>
    </Alert>
  );
}

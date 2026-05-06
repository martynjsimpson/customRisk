import { Alert, Button, PasswordInput, Stack, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/session";
import { getApiErrorMessage } from "../components/ApiErrorAlert";

export function LoginPage() {
  const { accessToken, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm({
    initialValues: {
      email: "",
      password: ""
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Enter a valid email"),
      password: (value) => (value.length > 0 ? null : "Enter your password")
    }
  });

  if (accessToken) {
    return <Navigate to="/" replace />;
  }

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        setError(null);
        setIsSubmitting(true);
        try {
          await login(values.email, values.password);
          navigate("/", { replace: true });
        } catch (caught) {
          setError(getApiErrorMessage(caught, "Login failed"));
        } finally {
          setIsSubmitting(false);
        }
      })}
    >
      <Stack gap="md">
        <Title order={2}>Log in</Title>
        {error ? (
          <Alert color="red">
            {error}
          </Alert>
        ) : null}
        <TextInput
          label="Email"
          autoComplete="username"
          data-bwignore={null}
          data-lpignore={null}
          data-1p-ignore={null}
          {...form.getInputProps("email")}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          data-bwignore={null}
          data-lpignore={null}
          data-1p-ignore={null}
          {...form.getInputProps("password")}
        />
        <Button type="submit" loading={isSubmitting}>
          Log in
        </Button>
      </Stack>
    </form>
  );
}

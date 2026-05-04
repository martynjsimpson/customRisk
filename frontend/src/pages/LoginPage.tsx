import { Alert, Button, PasswordInput, Stack, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/session";

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
          const message =
            isAxiosError(caught) && caught.response?.data?.error?.message
              ? caught.response.data.error.message
              : "Login failed";
          setError(message);
        } finally {
          setIsSubmitting(false);
        }
      })}
    >
      <Stack gap="md">
        <Title order={2}>Log in</Title>
        {error ? (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        ) : null}
        <TextInput label="Email" autoComplete="email" {...form.getInputProps("email")} />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          {...form.getInputProps("password")}
        />
        <Button type="submit" loading={isSubmitting}>
          Log in
        </Button>
      </Stack>
    </form>
  );
}

import {
  Button,
  Card,
  Divider,
  Group,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { type MantineColorScheme, useMantineColorScheme } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "react-router-dom";

import { changeMyPassword, updateMyProfile } from "../api/profile.api";
import { updateMyPreferences } from "../api/preferences.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { useAuth } from "../auth/session";
import { useFeatureFlags } from "../hooks/useFeatureFlags";

export function ProfilePage() {
  const { user, setPreferences, logout } = useAuth();
  const flags = useFeatureFlags();
  const navigate = useNavigate();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const nameForm = useForm({
    initialValues: { name: user?.name ?? "" },
    validate: { name: (v) => (v.trim().length > 0 ? null : "Name is required") }
  });

  const passwordForm = useForm({
    initialValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    validate: {
      confirmPassword: (v, values) =>
        v === values.newPassword ? null : "Passwords do not match"
    }
  });

  const updateNameMutation = useMutation({
    mutationFn: (name: string) => updateMyProfile(name),
    onSuccess: () => {
      notifications.show({ message: "Name updated.", color: "green" });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changeMyPassword(currentPassword, newPassword),
    onSuccess: async () => {
      notifications.show({ message: "Password changed. Please log in again.", color: "green" });
      await logout();
      navigate("/login");
    }
  });

  const preferencesMutation = useMutation({
    mutationFn: (scheme: MantineColorScheme) => updateMyPreferences({ colorScheme: scheme }),
    onSuccess: (data) => {
      setPreferences(data);
    }
  });

  function handleColorSchemeChange(value: string) {
    const scheme = value as MantineColorScheme;
    setColorScheme(scheme);
    preferencesMutation.mutate(scheme);
  }

  return (
    <Stack gap="lg" maw={520}>
      <Title order={2}>My Profile</Title>

      <Card withBorder padding="lg">
        <Stack gap="md">
          <Title order={4}>Display Name</Title>
          <form
            onSubmit={nameForm.onSubmit((values) => {
              updateNameMutation.mutate(values.name);
            })}
          >
            <Stack gap="sm">
              {updateNameMutation.error ? (
                <ApiErrorAlert error={updateNameMutation.error} />
              ) : null}
              <TextInput label="Name" {...nameForm.getInputProps("name")} />
              <Group>
                <Button type="submit" loading={updateNameMutation.isPending}>
                  Save name
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Card>

      <Card withBorder padding="lg">
        <Stack gap="md">
          <Title order={4}>Change Password</Title>
          <form
            onSubmit={passwordForm.onSubmit((values) => {
              changePasswordMutation.mutate({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword
              });
            })}
          >
            <Stack gap="sm">
              {changePasswordMutation.error ? (
                <ApiErrorAlert error={changePasswordMutation.error} />
              ) : null}
              <PasswordInput
                label="Current password"
                autoComplete="current-password"
                data-bwignore={null}
                data-lpignore={null}
                data-1p-ignore={null}
                {...passwordForm.getInputProps("currentPassword")}
              />
              <PasswordInput
                label="New password"
                autoComplete="new-password"
                data-bwignore={null}
                data-lpignore={null}
                data-1p-ignore={null}
                {...passwordForm.getInputProps("newPassword")}
              />
              <PasswordInput
                label="Confirm new password"
                autoComplete="new-password"
                data-bwignore={null}
                data-lpignore={null}
                data-1p-ignore={null}
                {...passwordForm.getInputProps("confirmPassword")}
              />
              <Text size="xs" c="dimmed">
                Changing your password will end all other active sessions.
              </Text>
              <Group>
                <Button type="submit" loading={changePasswordMutation.isPending}>
                  Change password
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Card>

      {flags.userPreferences && (
        <Card withBorder padding="lg">
          <Stack gap="md">
            <Title order={4}>Appearance</Title>
            <Divider />
            <Group justify="space-between">
              <Text size="sm">Colour scheme</Text>
              <SegmentedControl
                value={colorScheme}
                onChange={handleColorSchemeChange}
                data={[
                  { label: "Auto", value: "auto" },
                  { label: "Light", value: "light" },
                  { label: "Dark", value: "dark" }
                ]}
              />
            </Group>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

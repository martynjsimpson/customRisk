import {
  Badge,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Tabs,
  Textarea,
  TextInput,
  Title
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

import {
  addRegisterPermission,
  getRegister,
  listRegisterPermissionCandidates,
  listRegisterPermissions,
  removeRegisterPermission,
  updateRegister
} from "../api/registers.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { RegisterAuditPanel } from "../features/audit/RegisterAuditPanel";
import { RegisterConfigurationPanel } from "../features/configuration/RegisterConfigurationPanel";
import { RiskRegisterPanel } from "../features/risks/RiskRegisterPanel";
import { usePermissions } from "../hooks/usePermissions";

export function RegisterDetailPage() {
  const { registerId = "" } = useParams();
  const queryClient = useQueryClient();
  const { isSystemAdmin } = usePermissions();
  const registerQuery = useQuery({
    queryKey: ["register", registerId],
    queryFn: () => getRegister(registerId),
    enabled: Boolean(registerId)
  });
  const permissionsQuery = useQuery({
    queryKey: ["register-permissions", registerId],
    queryFn: () => listRegisterPermissions(registerId),
    enabled: Boolean(registerId)
  });
  const canManage = isSystemAdmin || registerQuery.data?.effectiveRole === "REGISTER_ADMIN";
  const usersQuery = useQuery({
    queryKey: ["register-permission-candidates", registerId],
    queryFn: () => listRegisterPermissionCandidates(registerId),
    enabled: Boolean(registerId) && canManage
  });

  const settingsForm = useForm({
    initialValues: {
      name: "",
      description: "",
      riskIdPrefix: "",
      riskIdZeroPaddingEnabled: false,
      riskIdZeroPaddingWidth: 4,
      reviewsEnabled: true,
      defaultReviewFrequencyMonths: 12,
      allowViewerExport: false
    }
  });

  useEffect(() => {
    const register = registerQuery.data;
    if (register) {
      settingsForm.setValues({
        name: register.name,
        description: register.description ?? "",
        riskIdPrefix: register.riskIdPrefix ?? "",
        riskIdZeroPaddingEnabled: register.riskIdZeroPaddingEnabled,
        riskIdZeroPaddingWidth: register.riskIdZeroPaddingWidth,
        reviewsEnabled: register.reviewsEnabled,
        defaultReviewFrequencyMonths: register.defaultReviewFrequencyMonths,
        allowViewerExport: register.allowViewerExport
      });
    }
  }, [registerQuery.data]);

  const permissionForm = useForm({
    initialValues: {
      userId: "",
      role: "REGISTER_VIEWER" as "REGISTER_ADMIN" | "REGISTER_VIEWER"
    }
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["register", registerId] }),
      queryClient.invalidateQueries({ queryKey: ["register-permissions", registerId] }),
      queryClient.invalidateQueries({ queryKey: ["registers"] })
    ]);
  };
  const updateMutation = useMutation({
    mutationFn: () =>
      updateRegister(registerId, {
        ...settingsForm.values,
        riskIdPrefix: settingsForm.values.riskIdPrefix || null
      }),
    onSuccess: invalidate
  });
  const addPermissionMutation = useMutation({
    mutationFn: () => addRegisterPermission(registerId, permissionForm.values),
    onSuccess: async () => {
      permissionForm.reset();
      await invalidate();
    }
  });
  const removePermissionMutation = useMutation({
    mutationFn: (permissionId: string) => removeRegisterPermission(registerId, permissionId),
    onSuccess: invalidate
  });

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={1}>{registerQuery.data?.name ?? "Register"}</Title>
        <Badge>{registerQuery.data?.effectiveRole}</Badge>
      </Group>
      <ApiErrorAlert error={registerQuery.error} fallback="Unable to load register" />
      <Tabs defaultValue="risks">
        <Tabs.List>
          <Tabs.Tab value="risks">Risks</Tabs.Tab>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
          {canManage ? <Tabs.Tab value="configuration">Configuration</Tabs.Tab> : null}
          {canManage ? <Tabs.Tab value="permissions">Permissions</Tabs.Tab> : null}
          {canManage ? <Tabs.Tab value="audit">Audit</Tabs.Tab> : null}
        </Tabs.List>
        <Tabs.Panel value="risks" pt="md">
          {registerQuery.data ? <RiskRegisterPanel register={registerQuery.data} /> : null}
        </Tabs.Panel>
        <Tabs.Panel value="settings" pt="md">
          <form
            onSubmit={settingsForm.onSubmit(() => {
              updateMutation.mutate();
            })}
          >
            <Stack>
              <ApiErrorAlert error={updateMutation.error} fallback="Unable to save register settings" />
              <TextInput label="Name" disabled={!canManage} {...settingsForm.getInputProps("name")} />
              <Textarea label="Description" disabled={!canManage} {...settingsForm.getInputProps("description")} />
              <TextInput label="Risk ID prefix" disabled={!canManage} {...settingsForm.getInputProps("riskIdPrefix")} />
              <Checkbox
                label="Zero-pad risk IDs"
                disabled={!canManage}
                {...settingsForm.getInputProps("riskIdZeroPaddingEnabled", { type: "checkbox" })}
              />
              <NumberInput
                label="Padding width"
                min={2}
                max={12}
                disabled={!canManage}
                {...settingsForm.getInputProps("riskIdZeroPaddingWidth")}
              />
              <Checkbox
                label="Reviews enabled"
                disabled={!canManage}
                {...settingsForm.getInputProps("reviewsEnabled", { type: "checkbox" })}
              />
              <NumberInput
                label="Default review frequency months"
                min={1}
                max={120}
                disabled={!canManage}
                {...settingsForm.getInputProps("defaultReviewFrequencyMonths")}
              />
              <Checkbox
                label="Allow Register Viewers to export"
                disabled={!canManage}
                {...settingsForm.getInputProps("allowViewerExport", { type: "checkbox" })}
              />
              {canManage ? <Button type="submit">Save settings</Button> : null}
            </Stack>
          </form>
        </Tabs.Panel>
        <Tabs.Panel value="configuration" pt="md">
          {canManage ? <RegisterConfigurationPanel registerId={registerId} /> : null}
        </Tabs.Panel>
        <Tabs.Panel value="permissions" pt="md">
          <Stack>
            <ApiErrorAlert error={permissionsQuery.error} fallback="Unable to load permissions" />
            <ApiErrorAlert error={usersQuery.error} fallback="Unable to load permission candidates" />
            <ApiErrorAlert error={addPermissionMutation.error} fallback="Unable to add permission" />
            <ApiErrorAlert error={removePermissionMutation.error} fallback="Unable to remove permission" />
            <form
              onSubmit={permissionForm.onSubmit(() => {
                addPermissionMutation.mutate();
              })}
            >
              <Group align="end">
                <Select
                  label="User"
                  data={(usersQuery.data ?? []).map((user) => ({
                    value: user.id,
                    label: `${user.name} (${user.email})`
                  }))}
                  searchable
                  required
                  {...permissionForm.getInputProps("userId")}
                />
                <Select
                  label="Role"
                  data={[
                    { value: "REGISTER_ADMIN", label: "Register Admin" },
                    { value: "REGISTER_VIEWER", label: "Register Viewer" }
                  ]}
                  {...permissionForm.getInputProps("role")}
                />
                <Button type="submit">Add</Button>
              </Group>
            </form>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(permissionsQuery.data ?? []).map((permission) => (
                  <Table.Tr key={permission.id}>
                    <Table.Td>{permission.user.name}</Table.Td>
                    <Table.Td>
                      <Badge>{permission.role}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end">
                        <Button
                          variant="subtle"
                          color="red"
                          onClick={() => removePermissionMutation.mutate(permission.id)}
                        >
                          Remove
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="audit" pt="md">
          {canManage ? <RegisterAuditPanel registerId={registerId} /> : null}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

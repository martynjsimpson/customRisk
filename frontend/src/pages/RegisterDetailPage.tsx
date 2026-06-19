import {
  Badge,
  Button,
  Fieldset,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  Tabs,
  Title
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import {
  addRegisterPermission,
  getRegister,
  listRegisterPermissionCandidates,
  listRegisterPermissions,
  removeRegisterPermission
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
      <Group justify="space-between" align="flex-start">
        <Stack gap={0}>
          <Title order={1}>{registerQuery.data?.name ?? "Register"}</Title>
          {registerQuery.data?.description ? (
            <Text c="dimmed">{registerQuery.data.description}</Text>
          ) : null}
        </Stack>
        <Badge>{registerQuery.data?.effectiveRole}</Badge>
      </Group>
      {registerQuery.isLoading ? <Loader /> : null}
      <ApiErrorAlert error={registerQuery.error} fallback="Unable to load register" />
      <Tabs defaultValue="risks">
        <Tabs.List>
          <Tabs.Tab value="risks">Risks</Tabs.Tab>
          {canManage ? <Tabs.Tab value="configuration">Configuration</Tabs.Tab> : null}
          {canManage ? <Tabs.Tab value="permissions">Permissions</Tabs.Tab> : null}
          {canManage ? <Tabs.Tab value="audit">Audit</Tabs.Tab> : null}
        </Tabs.List>
        <Tabs.Panel value="risks" pt="md">
          {registerQuery.data ? <RiskRegisterPanel register={registerQuery.data} /> : null}
        </Tabs.Panel>
        <Tabs.Panel value="configuration" pt="md">
          {canManage ? <RegisterConfigurationPanel registerId={registerId} canManage={canManage} /> : null}
        </Tabs.Panel>
        <Tabs.Panel value="permissions" pt="md">
          <Stack>
            <ApiErrorAlert error={permissionsQuery.error} fallback="Unable to load permissions" />
            <ApiErrorAlert error={usersQuery.error} fallback="Unable to load permission candidates" />
            <ApiErrorAlert error={addPermissionMutation.error} fallback="Unable to add permission" />
            <ApiErrorAlert error={removePermissionMutation.error} fallback="Unable to remove permission" />
            <Fieldset legend="Add Permission">
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
                  <Button type="submit" loading={addPermissionMutation.isPending}>Add</Button>
                </Group>
              </form>
            </Fieldset>
            <Fieldset legend="Current Permissions">
              {permissionsQuery.isLoading ? <Loader /> : null}
              <Table.ScrollContainer minWidth={640}>
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
                          <Group justify="flex-end" wrap="nowrap">
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
                    {permissionsQuery.data?.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={3}>
                          <Text c="dimmed">No register permissions have been assigned.</Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : null}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Fieldset>
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="audit" pt="md">
          {canManage ? <RegisterAuditPanel registerId={registerId} /> : null}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

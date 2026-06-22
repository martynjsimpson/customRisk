import {
  Badge,
  Button,
  Fieldset,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation } from "@tanstack/react-query";

import {
  addRegisterPermission,
  removeRegisterPermission,
  type RegisterPermission
} from "../../api/registers.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";

interface PermissionCandidate {
  id: string;
  name: string;
  email: string;
}

interface RegisterPermissionsPanelProps {
  registerId: string;
  permissions: RegisterPermission[];
  candidates: PermissionCandidate[];
  isLoading: boolean;
  permissionsError: unknown;
  candidatesError: unknown;
  onSuccess: () => Promise<void>;
}

export function RegisterPermissionsPanel({
  registerId,
  permissions,
  candidates,
  isLoading,
  permissionsError,
  candidatesError,
  onSuccess
}: RegisterPermissionsPanelProps) {
  const permissionForm = useForm({
    initialValues: {
      userId: "",
      role: "REGISTER_VIEWER" as "REGISTER_ADMIN" | "REGISTER_VIEWER"
    }
  });

  const addPermissionMutation = useMutation({
    mutationFn: () => addRegisterPermission(registerId, permissionForm.values),
    onSuccess: async () => {
      permissionForm.reset();
      await onSuccess();
    }
  });

  const removePermissionMutation = useMutation({
    mutationFn: (permissionId: string) => removeRegisterPermission(registerId, permissionId),
    onSuccess
  });

  return (
    <Stack>
      <ApiErrorAlert error={permissionsError} fallback="Unable to load permissions" />
      <ApiErrorAlert error={candidatesError} fallback="Unable to load permission candidates" />
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
              data={candidates.map((user) => ({
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
        {isLoading ? <Loader /> : null}
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
              {permissions.map((permission) => (
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
              {permissions.length === 0 ? (
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
  );
}

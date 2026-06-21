import {
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  PasswordInput,
  Stack,
  Table,
  Text,
  TextInput
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  activateUser,
  createUser,
  deactivateUser,
  listUsers,
  updateUser,
  type UserRecord
} from "../../api/users.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";

export function UsersPanel() {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const [opened, { open, close }] = useDisclosure(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const form = useForm({
    initialValues: {
      name: "",
      email: "",
      password: "",
      isSystemAdmin: false,
      isActive: true
    }
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["users"] });
  };
  const closeAndInvalidate = async () => {
    close();
    await invalidate();
  };
  const createMutation = useMutation({ mutationFn: createUser, onSuccess: closeAndInvalidate });
  const updateMutation = useMutation({
    mutationFn: ({ userId, values }: { userId: string; values: Partial<typeof form.values> }) =>
      updateUser(userId, values),
    onSuccess: closeAndInvalidate
  });
  const activateMutation = useMutation({ mutationFn: activateUser, onSuccess: invalidate });
  const deactivateMutation = useMutation({ mutationFn: deactivateUser, onSuccess: invalidate });

  const startCreate = () => {
    createMutation.reset();
    updateMutation.reset();
    setEditingUser(null);
    form.setValues({ name: "", email: "", password: "", isSystemAdmin: false, isActive: true });
    open();
  };

  const startEdit = (user: UserRecord) => {
    createMutation.reset();
    updateMutation.reset();
    setEditingUser(user);
    form.setValues({
      name: user.name,
      email: user.email,
      password: "",
      isSystemAdmin: user.isSystemAdmin,
      isActive: user.isActive
    });
    open();
  };

  return (
    <Stack>
      <Group justify="flex-end">
        <Button onClick={startCreate}>Add user</Button>
      </Group>
      <ApiErrorAlert error={usersQuery.error} fallback="Unable to load users" />
      <ApiErrorAlert error={activateMutation.error} fallback="Unable to activate user" />
      <ApiErrorAlert error={deactivateMutation.error} fallback="Unable to deactivate user" />
      {usersQuery.isLoading ? <Loader /> : null}
      <Table.ScrollContainer minWidth={760}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Roles</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(usersQuery.data?.data ?? []).map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>{user.name}</Table.Td>
                <Table.Td>{user.email}</Table.Td>
                <Table.Td>{user.isSystemAdmin ? <Badge>System Admin</Badge> : null}</Table.Td>
                <Table.Td>
                  <Badge color={user.isActive ? "green" : "gray"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                    <Button variant="light" size="xs" onClick={() => startEdit(user)}>Edit</Button>
                    {user.isActive ? (
                      <Button variant="light" size="xs" color="red" onClick={() => deactivateMutation.mutate(user.id)}>Deactivate</Button>
                    ) : (
                      <Button variant="light" size="xs" onClick={() => activateMutation.mutate(user.id)}>Activate</Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {usersQuery.data?.data.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed">No users found.</Text>
                </Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Modal opened={opened} onClose={close} title={editingUser ? "Edit user" : "Add user"}>
        <form
          onSubmit={form.onSubmit(async (values) => {
            if (editingUser) {
              const payload: Partial<typeof values> = values.password
                ? { ...values }
                : {
                    name: values.name,
                    email: values.email,
                    isSystemAdmin: values.isSystemAdmin,
                    isActive: values.isActive
                  };
              updateMutation.mutate({ userId: editingUser.id, values: payload });
            } else {
              createMutation.mutate(values);
            }
          })}
        >
          <Stack>
            <ApiErrorAlert
              error={editingUser ? updateMutation.error : createMutation.error}
              fallback={editingUser ? "Unable to update user" : "Unable to create user"}
            />
            <TextInput label="Name" required {...form.getInputProps("name")} />
            <TextInput label="Email" required {...form.getInputProps("email")} />
            <PasswordInput
              label={editingUser ? "New password" : "Password"}
              required={!editingUser}
              {...form.getInputProps("password")}
            />
            <Checkbox label="System Admin" {...form.getInputProps("isSystemAdmin", { type: "checkbox" })} />
            <Checkbox label="Active" {...form.getInputProps("isActive", { type: "checkbox" })} />
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>Save</Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}

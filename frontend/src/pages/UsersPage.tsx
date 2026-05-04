import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Table,
  TextInput,
  Title
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
} from "../api/users.api";

export function UsersPage() {
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
  const createMutation = useMutation({ mutationFn: createUser, onSuccess: invalidate });
  const updateMutation = useMutation({
    mutationFn: ({ userId, values }: { userId: string; values: Partial<typeof form.values> }) =>
      updateUser(userId, values),
    onSuccess: invalidate
  });
  const activateMutation = useMutation({ mutationFn: activateUser, onSuccess: invalidate });
  const deactivateMutation = useMutation({ mutationFn: deactivateUser, onSuccess: invalidate });

  const startCreate = () => {
    setEditingUser(null);
    form.setValues({ name: "", email: "", password: "", isSystemAdmin: false, isActive: true });
    open();
  };

  const startEdit = (user: UserRecord) => {
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
      <Group justify="space-between">
        <Title order={1}>Users</Title>
        <Button onClick={startCreate}>
          Add user
        </Button>
      </Group>
      <Table striped highlightOnHover>
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
                <Group gap="xs" justify="flex-end">
                  <ActionIcon variant="subtle" aria-label="Edit user" onClick={() => startEdit(user)}>
                    E
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    aria-label={user.isActive ? "Deactivate user" : "Activate user"}
                    onClick={() =>
                      user.isActive
                        ? deactivateMutation.mutate(user.id)
                        : activateMutation.mutate(user.id)
                    }
                  >
                    {user.isActive ? "D" : "A"}
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
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
              await updateMutation.mutateAsync({ userId: editingUser.id, values: payload });
            } else {
              await createMutation.mutateAsync(values);
            }
            close();
          })}
        >
          <Stack>
            <TextInput label="Name" required {...form.getInputProps("name")} />
            <TextInput label="Email" required {...form.getInputProps("email")} />
            <PasswordInput
              label={editingUser ? "New password" : "Password"}
              required={!editingUser}
              {...form.getInputProps("password")}
            />
            <Checkbox label="System Admin" {...form.getInputProps("isSystemAdmin", { type: "checkbox" })} />
            <Checkbox label="Active" {...form.getInputProps("isActive", { type: "checkbox" })} />
            <Button type="submit">Save</Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}

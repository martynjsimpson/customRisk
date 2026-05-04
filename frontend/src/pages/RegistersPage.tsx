import {
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Stack,
  Table,
  Textarea,
  TextInput,
  Title
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { createRegister, listRegisters } from "../api/registers.api";
import { listUsers } from "../api/users.api";
import { usePermissions } from "../hooks/usePermissions";

export function RegistersPage() {
  const queryClient = useQueryClient();
  const { isSystemAdmin } = usePermissions();
  const registersQuery = useQuery({ queryKey: ["registers"], queryFn: listRegisters });
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    enabled: isSystemAdmin
  });
  const [opened, { open, close }] = useDisclosure(false);
  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      riskIdPrefix: "",
      initialRegisterAdminUserIds: [] as string[],
      riskIdZeroPaddingEnabled: false,
      riskIdZeroPaddingWidth: 4
    }
  });
  const createMutation = useMutation({
    mutationFn: createRegister,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registers"] });
    }
  });

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={1}>Registers</Title>
        {isSystemAdmin ? <Button onClick={open}>Create register</Button> : null}
      </Group>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Role</Table.Th>
            <Table.Th>Open risks</Table.Th>
            <Table.Th>Overdue</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(registersQuery.data?.data ?? []).map((register) => (
            <Table.Tr key={register.id}>
              <Table.Td>
                <Button component={Link} to={`/registers/${register.id}`} variant="subtle" px={0}>
                  {register.name}
                </Button>
              </Table.Td>
              <Table.Td>
                <Badge variant="light">{register.effectiveRole}</Badge>
              </Table.Td>
              <Table.Td>{register.openRisksCount}</Table.Td>
              <Table.Td>{register.overdueRisksCount}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal opened={opened} onClose={close} title="Create register">
        <form
          onSubmit={form.onSubmit(async (values) => {
            await createMutation.mutateAsync({
              ...values,
              riskIdPrefix: values.riskIdPrefix || undefined,
              initialRegisterAdminUserIds: values.initialRegisterAdminUserIds
            });
            close();
            form.reset();
          })}
        >
          <Stack>
            <TextInput label="Name" required {...form.getInputProps("name")} />
            <Textarea label="Description" {...form.getInputProps("description")} />
            <TextInput label="Risk ID prefix" {...form.getInputProps("riskIdPrefix")} />
            <MultiSelect
              label="Register Admins"
              data={(usersQuery.data?.data ?? []).map((user) => ({
                value: user.id,
                label: `${user.name} (${user.email})`
              }))}
              searchable
              {...form.getInputProps("initialRegisterAdminUserIds")}
            />
            <Checkbox
              label="Zero-pad risk IDs"
              {...form.getInputProps("riskIdZeroPaddingEnabled", { type: "checkbox" })}
            />
            <NumberInput
              label="Padding width"
              min={2}
              max={12}
              {...form.getInputProps("riskIdZeroPaddingWidth")}
            />
            <Button type="submit" loading={createMutation.isPending}>
              Create
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}

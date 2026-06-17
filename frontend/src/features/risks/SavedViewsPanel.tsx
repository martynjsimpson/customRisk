import {
  ActionIcon,
  Button,
  Group,
  Menu,
  Modal,
  Stack,
  Text,
  TextInput,
  Tooltip
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { IconBookmark, IconChevronDown, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSavedView,
  deleteSavedView,
  listSavedViews,
  type SavedView
} from "../../api/savedViews.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import type { RiskListQuery } from "../../api/risks.api";

interface SavedViewsPanelProps {
  registerId: string;
  currentFilters: RiskListQuery;
  currentColumns: string[];
  onApply: (view: SavedView) => void;
}

export function SavedViewsPanel({
  registerId,
  currentFilters,
  currentColumns,
  onApply
}: SavedViewsPanelProps) {
  const queryClient = useQueryClient();
  const [saveOpened, { open: openSave, close: closeSave }] = useDisclosure(false);

  const viewsQuery = useQuery({
    queryKey: ["saved-views", registerId],
    queryFn: () => listSavedViews(registerId)
  });

  const form = useForm({
    initialValues: { name: "" },
    validate: {
      name: (v) => (v.trim().length === 0 ? "Name is required" : null)
    }
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["saved-views", registerId] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createSavedView(registerId, {
        name: form.values.name.trim(),
        filters: currentFilters as object,
        columns: { columns: currentColumns }
      }),
    onSuccess: async () => {
      closeSave();
      form.reset();
      await invalidate();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSavedView(registerId, id),
    onSuccess: invalidate
  });

  const startSave = () => {
    createMutation.reset();
    form.reset();
    openSave();
  };

  const views = viewsQuery.data ?? [];

  return (
    <>
      <Group gap="xs" wrap="nowrap">
        <Menu shadow="md" width={240} position="bottom-start">
          <Menu.Target>
            <Button
              variant="default"
              size="sm"
              leftSection={<IconBookmark size={16} />}
              rightSection={<IconChevronDown size={14} />}
            >
              Views
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {views.length === 0 ? (
              <Menu.Item disabled>No saved views</Menu.Item>
            ) : (
              views.map((view) => (
                <Menu.Item
                  key={view.id}
                  onClick={() => onApply(view)}
                  rightSection={
                    <Tooltip label="Delete view" withArrow>
                      <ActionIcon
                        variant="subtle"
                        size="xs"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(view.id);
                        }}
                      >
                        <IconTrash size={12} />
                      </ActionIcon>
                    </Tooltip>
                  }
                >
                  <Text size="sm" truncate>
                    {view.name}
                  </Text>
                </Menu.Item>
              ))
            )}
            <Menu.Divider />
            <Menu.Item onClick={startSave}>Save current view…</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Modal opened={saveOpened} onClose={closeSave} title="Save view">
        <form onSubmit={form.onSubmit(() => { createMutation.mutate(); })}>
          <Stack>
            <ApiErrorAlert error={createMutation.error} fallback="Unable to save view" />
            <TextInput
              label="View name"
              placeholder="e.g. Open high-risk items"
              required
              {...form.getInputProps("name")}
            />
            <Button type="submit" loading={createMutation.isPending}>
              Save
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}

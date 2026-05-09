import { Button, Checkbox, Divider, Popover, Stack, Text } from "@mantine/core";
import { IconColumns } from "@tabler/icons-react";
import { useState } from "react";

export interface PickerColumn {
  key: string;
  label: string;
}

export interface ColumnGroup {
  label?: string;
  columns: PickerColumn[];
}

interface ColumnPickerProps {
  groups: ColumnGroup[];
  visibleColumns: string[];
  onChange: (visibleColumns: string[]) => void;
}

export function ColumnPicker({ groups, visibleColumns, onChange }: ColumnPickerProps) {
  const [opened, setOpened] = useState(false);

  function toggle(key: string, checked: boolean) {
    if (checked) {
      onChange([...visibleColumns, key]);
    } else {
      onChange(visibleColumns.filter((k) => k !== key));
    }
  }

  const allColumns = groups.flatMap((g) => g.columns);
  const showGroupLabels = groups.length > 1 || Boolean(groups[0]?.label);

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-end" withArrow shadow="md" width={240}>
      <Popover.Target>
        <Button
          variant="light"
          leftSection={<IconColumns size={16} />}
          onClick={() => setOpened((o) => !o)}
        >
          Columns
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          {groups.map((group, groupIndex) => (
            <Stack key={group.label ?? groupIndex} gap="xs">
              {showGroupLabels && group.label ? (
                <>
                  {groupIndex > 0 ? <Divider /> : null}
                  <Text size="xs" c="dimmed" fw={600}>
                    {group.label}
                  </Text>
                </>
              ) : null}
              {group.columns.map((col) => (
                <Checkbox
                  key={col.key}
                  label={col.label}
                  checked={visibleColumns.includes(col.key)}
                  onChange={(e) => toggle(col.key, e.currentTarget.checked)}
                />
              ))}
            </Stack>
          ))}
          {allColumns.length === 0 ? (
            <Text size="sm" c="dimmed">No columns available.</Text>
          ) : null}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

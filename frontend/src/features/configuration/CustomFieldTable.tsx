import { ActionIcon, Badge, Button, Group, Table } from "@mantine/core";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconGripVertical } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import type { CustomFieldDefinition, CustomFieldType } from "../../api/customFields.api";
import { CORE_RISK_FIELDS } from "../risks/coreRiskFields";

interface CustomFieldTableProps {
  fields: CustomFieldDefinition[];
  onReorder: (fieldId: string, newDisplayOrder: number) => void;
  onEditField: (field: CustomFieldDefinition) => void;
  onOpenOptions: (field: CustomFieldDefinition) => void;
  onActivateField: (fieldId: string) => void;
  onDeactivateField: (fieldId: string) => void;
  readOnly?: boolean;
}

const fieldTypeLabels: Record<CustomFieldType, string> = {
  TEXT: "Text",
  MULTILINE_TEXT: "Multi-line text",
  BOOLEAN: "Boolean",
  NUMBER: "Number",
  DATE: "Date",
  DROPDOWN: "Dropdown",
  PERSON_PICKER: "Person Picker"
};

type CombinedField =
  | { kind: "core"; id: string; displayOrder: number; fieldName: string; fieldType: string; isRequired: boolean; isActive: true }
  | (CustomFieldDefinition & { kind: "custom"; fieldTypeLabel: string });

function buildOrderedFields(fields: CustomFieldDefinition[]): CombinedField[] {
  return [
    ...CORE_RISK_FIELDS.map((f) => ({ ...f, kind: "core" as const, isActive: true as const })),
    ...fields.map((f) => ({ ...f, kind: "custom" as const, fieldTypeLabel: fieldTypeLabels[f.fieldType] }))
  ].sort((a, b) => a.displayOrder - b.displayOrder || a.fieldName.localeCompare(b.fieldName));
}

function computeNewDisplayOrder(
  prev: CombinedField | undefined,
  next: CombinedField | undefined
): number {
  if (!prev && !next) return 10;
  if (!prev) return Math.max(1, next!.displayOrder - 10);
  if (!next) return prev.displayOrder + 10;
  const mid = Math.floor((prev.displayOrder + next.displayOrder) / 2);
  return mid > prev.displayOrder ? mid : prev.displayOrder + 1;
}

interface SortableRowProps {
  field: CombinedField;
  onEditField: (field: CustomFieldDefinition) => void;
  onOpenOptions: (field: CustomFieldDefinition) => void;
  onActivateField: (fieldId: string) => void;
  onDeactivateField: (fieldId: string) => void;
  readOnly?: boolean;
}

function SortableRow({ field, onEditField, onOpenOptions, onActivateField, onDeactivateField, readOnly }: SortableRowProps) {
  const isCore = field.kind === "core";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    disabled: isCore || readOnly
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined
  };

  return (
    <Table.Tr ref={setNodeRef} style={style} {...(isCore ? {} : attributes)}>
      <Table.Td style={{ width: 36 }}>
        {isCore || readOnly ? null : (
          <ActionIcon variant="transparent" color="gray" style={{ cursor: "grab" }} {...listeners}>
            <IconGripVertical size={16} />
          </ActionIcon>
        )}
      </Table.Td>
      <Table.Td>{field.fieldName}</Table.Td>
      <Table.Td>{field.kind === "core" ? field.fieldType : field.fieldTypeLabel}</Table.Td>
      <Table.Td>{field.isRequired ? "Yes" : "No"}</Table.Td>
      <Table.Td>
        <Badge color={isCore ? "blue" : field.isActive ? "green" : "gray"}>
          {isCore ? "Core" : field.isActive ? "Active" : "Inactive"}
        </Badge>
      </Table.Td>
      {!readOnly ? (
        <Table.Td>
          <Group justify="flex-end" gap="xs">
            {field.kind === "custom" && field.fieldType === "DROPDOWN" ? (
              <Button variant="subtle" onClick={() => onOpenOptions(field)}>
                Options
              </Button>
            ) : null}
            {field.kind === "custom" ? (
              <Button variant="subtle" onClick={() => onEditField(field)}>
                Edit
              </Button>
            ) : null}
            {field.kind === "custom" ? (
              field.isActive ? (
                <Button color="red" variant="subtle" onClick={() => onDeactivateField(field.id)}>
                  Deactivate
                </Button>
              ) : (
                <Button variant="subtle" onClick={() => onActivateField(field.id)}>
                  Activate
                </Button>
              )
            ) : null}
          </Group>
        </Table.Td>
      ) : <Table.Td />}
    </Table.Tr>
  );
}

export function CustomFieldTable({
  fields,
  onReorder,
  onEditField,
  onOpenOptions,
  onActivateField,
  onDeactivateField,
  readOnly
}: CustomFieldTableProps) {
  const [orderedFields, setOrderedFields] = useState<CombinedField[]>(() => buildOrderedFields(fields));

  useEffect(() => {
    setOrderedFields(buildOrderedFields(fields));
  }, [fields]);

  const itemIds = useMemo(() => orderedFields.map((f) => f.id), [orderedFields]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedFields.findIndex((f) => f.id === active.id);
    const newIndex = orderedFields.findIndex((f) => f.id === over.id);
    const newOrder = arrayMove(orderedFields, oldIndex, newIndex);

    const prev = newIndex > 0 ? newOrder[newIndex - 1] : undefined;
    const next = newIndex < newOrder.length - 1 ? newOrder[newIndex + 1] : undefined;
    const newDisplayOrder = computeNewDisplayOrder(prev, next);

    setOrderedFields(newOrder);
    onReorder(active.id as string, newDisplayOrder);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <Table.ScrollContainer minWidth={760}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 36 }} />
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Required</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {orderedFields.map((field) => (
                <SortableRow
                  key={field.id}
                  field={field}
                onEditField={onEditField}
                onOpenOptions={onOpenOptions}
                onActivateField={onActivateField}
                onDeactivateField={onDeactivateField}
                readOnly={readOnly}
              />
            ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </SortableContext>
    </DndContext>
  );
}

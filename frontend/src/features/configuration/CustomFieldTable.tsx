import { Badge, Button, Group, Table } from "@mantine/core";
import { useMemo } from "react";

import type { CustomFieldDefinition, CustomFieldType } from "../../api/customFields.api";
import { CORE_RISK_FIELDS } from "../risks/coreRiskFields";

interface CustomFieldTableProps {
  fields: CustomFieldDefinition[];
  onEditField: (field: CustomFieldDefinition) => void;
  onOpenOptions: (field: CustomFieldDefinition) => void;
  onActivateField: (fieldId: string) => void;
  onDeactivateField: (fieldId: string) => void;
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

export function CustomFieldTable({
  fields,
  onEditField,
  onOpenOptions,
  onActivateField,
  onDeactivateField
}: CustomFieldTableProps) {
  const orderedFieldRows = useMemo(
    () =>
      [
        ...CORE_RISK_FIELDS.map((field) => ({
          ...field,
          kind: "core" as const,
          isActive: true
        })),
        ...fields.map((field) => ({
          ...field,
          kind: "custom" as const,
          fieldTypeLabel: fieldTypeLabels[field.fieldType]
        }))
      ].sort((left, right) => left.displayOrder - right.displayOrder || left.fieldName.localeCompare(right.fieldName)),
    [fields]
  );

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Order</Table.Th>
          <Table.Th>Name</Table.Th>
          <Table.Th>Type</Table.Th>
          <Table.Th>Required</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {orderedFieldRows.map((field) => (
          <Table.Tr key={field.id}>
            <Table.Td>{field.displayOrder}</Table.Td>
            <Table.Td>{field.fieldName}</Table.Td>
            <Table.Td>{field.kind === "core" ? field.fieldType : field.fieldTypeLabel}</Table.Td>
            <Table.Td>{field.isRequired ? "Yes" : "No"}</Table.Td>
            <Table.Td>
              <Badge color={field.kind === "core" ? "blue" : field.isActive ? "green" : "gray"}>
                {field.kind === "core" ? "Core" : field.isActive ? "Active" : "Inactive"}
              </Badge>
            </Table.Td>
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
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

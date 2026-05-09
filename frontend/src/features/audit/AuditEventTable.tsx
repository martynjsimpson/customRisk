import { Badge, Table, Text } from "@mantine/core";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { Fragment, useState } from "react";

import type { AuditEvent } from "../../api/audit.api";
import { AuditEventDetail, hasAuditDetail } from "./AuditEventDetail";

export function AuditEventTable({
  events,
  showObject = false,
  showRegister = false
}: {
  events: AuditEvent[];
  showObject?: boolean;
  showRegister?: boolean;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={32} />
          <Table.Th>When</Table.Th>
          <Table.Th>Actor</Table.Th>
          <Table.Th>Action</Table.Th>
          {showRegister && <Table.Th>Register</Table.Th>}
          {showObject && <Table.Th>Object</Table.Th>}
          <Table.Th>Summary</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {events.map((event) => {
          const canExpand = hasAuditDetail(event);
          const isExpanded = expandedIds.has(event.id);

          return (
            <Fragment key={event.id}>
              <Table.Tr
                onClick={canExpand ? () => toggle(event.id) : undefined}
                style={canExpand ? { cursor: "pointer" } : undefined}
              >
                <Table.Td>
                  {canExpand &&
                    (isExpanded ? (
                      <IconChevronDown size={14} color="gray" />
                    ) : (
                      <IconChevronRight size={14} color="gray" />
                    ))}
                </Table.Td>
                <Table.Td>{new Date(event.occurredAt).toLocaleString()}</Table.Td>
                <Table.Td>{event.actor?.name ?? "System"}</Table.Td>
                <Table.Td>
                  <Badge>{event.action}</Badge>
                </Table.Td>
                {showRegister && <Table.Td>{event.registerDisplayName ?? "—"}</Table.Td>}
                {showObject && <Table.Td>{event.objectDisplayName ?? event.objectId}</Table.Td>}
                <Table.Td>{event.summary}</Table.Td>
              </Table.Tr>
              {canExpand && isExpanded && (
                <Table.Tr>
                  <Table.Td
                    colSpan={5 + (showObject ? 1 : 0) + (showRegister ? 1 : 0)}
                    p={0}
                    style={{
                      backgroundColor:
                        "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))"
                    }}
                  >
                    <AuditEventDetail event={event} />
                  </Table.Td>
                </Table.Tr>
              )}
            </Fragment>
          );
        })}
        {events.length === 0 ? (
          <Table.Tr>
            <Table.Td colSpan={5 + (showObject ? 1 : 0) + (showRegister ? 1 : 0)}>
              <Text c="dimmed">No audit events found.</Text>
            </Table.Td>
          </Table.Tr>
        ) : null}
      </Table.Tbody>
    </Table>
  );
}

import { Badge, Button, Group, Loader, Stack, Table, Text, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  deleteResponseAction,
  listResponseActions,
  RESPONSE_ACTION_STATUS_LABELS,
  type ResponseAction,
  type ResponseActionStatus,
} from "../../api/responseActions.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { ResponseActionModal } from "./ResponseActionModal";

// Map each status to a Mantine colour consistent with the app's badge conventions.
const STATUS_BADGE_COLOR: Record<ResponseActionStatus, string> = {
  PLANNED:     "blue",
  IN_PROGRESS: "yellow",
  IMPLEMENTED: "green",
  DEFERRED:    "gray",
  CANCELLED:   "dark",
};

interface ResponseActionsPanelProps {
  registerId: string;
  riskId: string;
  /** Whether the current user can create new actions (Admin or Risk Owner) */
  canCreate: boolean;
  /** Whether the current user can change the owner field */
  canChangeOwner: boolean;
  /** Whether the current user can delete actions */
  canDelete: boolean;
  /**
   * When set, the panel only shows actions whose owner.userId matches this id.
   * Used for the RESPONSE_ACTION_OWNER restricted view.
   */
  filterToUserId?: string | null;
}

export function ResponseActionsPanel({
  registerId,
  riskId,
  canCreate,
  canChangeOwner,
  canDelete,
  filterToUserId,
}: ResponseActionsPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ResponseAction | null>(null);

  const queryClient = useQueryClient();

  const actionsQuery = useQuery({
    queryKey: ["registers", registerId, "risks", riskId, "actions"],
    queryFn: () => listResponseActions(registerId, riskId),
  });

  const actions = actionsQuery.data ?? [];
  const visibleActions = filterToUserId
    ? actions.filter((a) => a.owner.userId === filterToUserId)
    : actions;

  function openCreate() {
    setEditingAction(null);
    setModalOpen(true);
  }

  function openEdit(action: ResponseAction) {
    setEditingAction(action);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingAction(null);
  }

  const deleteMutation = useMutation({
    mutationFn: (action: ResponseAction) =>
      deleteResponseAction(registerId, riskId, action.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["registers", registerId, "risks", riskId, "actions"],
      });
    },
  });

  function handleDelete(action: ResponseAction) {
    if (window.confirm("Delete this response action? This cannot be undone.")) {
      deleteMutation.mutate(action);
    }
  }

  // Whether the current user can edit a given row. Admins/Risk Owners can edit
  // any row; Response Action Owners can only edit their own (filtered above).
  const canEditRow = canChangeOwner
    ? true // admin / risk owner — can edit anything visible
    : Boolean(filterToUserId); // response action owner — can edit own rows

  return (
    <>
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Title order={4}>Risk Responses</Title>
          {canCreate ? (
            <Button variant="light" size="xs" onClick={openCreate}>
              Add Action
            </Button>
          ) : null}
        </Group>

        <ApiErrorAlert error={actionsQuery.error} fallback="Unable to load response actions" />

        {actionsQuery.isLoading ? (
          <Loader size="sm" />
        ) : (
          <Table.ScrollContainer minWidth={480}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Response</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Owner</Table.Th>
                  {canEditRow ? <Table.Th /> : null}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {visibleActions.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={canEditRow ? 4 : 3}>
                      <Text c="dimmed" size="sm">
                        No response actions recorded.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  visibleActions.map((action) => (
                    <Table.Tr key={action.id}>
                      <Table.Td>
                        <Text size="sm" lineClamp={2}>
                          {action.response}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={STATUS_BADGE_COLOR[action.status]} size="sm">
                          {RESPONSE_ACTION_STATUS_LABELS[action.status]}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {action.owner.displayName ?? action.owner.email ?? "—"}
                        </Text>
                      </Table.Td>
                      {canEditRow ? (
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <Button
                              variant="light"
                              size="xs"
                              onClick={() => openEdit(action)}
                            >
                              Edit
                            </Button>
                            {canDelete ? (
                              <Button
                                variant="light"
                                color="red"
                                size="xs"
                                onClick={() => handleDelete(action)}
                              >
                                Delete
                              </Button>
                            ) : null}
                          </Group>
                        </Table.Td>
                      ) : null}
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>

      <ResponseActionModal
        registerId={registerId}
        riskId={riskId}
        opened={modalOpen}
        action={editingAction}
        canChangeOwner={canChangeOwner}
        canDelete={canDelete}
        onClose={closeModal}
      />
    </>
  );
}

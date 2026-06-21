import { Button, Group, Modal, Select, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  createResponseAction,
  deleteResponseAction,
  updateResponseAction,
  RESPONSE_ACTION_STATUSES,
  RESPONSE_ACTION_STATUS_LABELS,
  type ResponseAction,
  type ResponseActionStatus,
} from "../../api/responseActions.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { PersonPicker } from "../../components/PersonPicker";

interface ResponseActionModalProps {
  registerId: string;
  riskId: string;
  opened: boolean;
  /** Existing action to edit; null means create mode */
  action: ResponseAction | null;
  /** Whether the actor can change the Owner field */
  canChangeOwner: boolean;
  /** Whether the actor can delete the action */
  canDelete: boolean;
  onClose: () => void;
}

interface ActionFormValues {
  response: string;
  status: ResponseActionStatus;
  ownerEmail: string;
}

const STATUS_OPTIONS = RESPONSE_ACTION_STATUSES.map((s) => ({
  value: s,
  label: RESPONSE_ACTION_STATUS_LABELS[s],
}));

export function ResponseActionModal({
  registerId,
  riskId,
  opened,
  action,
  canChangeOwner,
  canDelete,
  onClose,
}: ResponseActionModalProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(action);

  const form = useForm<ActionFormValues>({
    initialValues: {
      response: "",
      status: "PLANNED",
      ownerEmail: "",
    },
    validate: {
      response: (v) => (v.trim() ? null : "Response is required"),
    },
  });

  const { setValues } = form;
  useEffect(() => {
    if (opened) {
      if (action) {
        setValues({
          response: action.response,
          status: action.status,
          ownerEmail: action.owner.email ?? "",
        });
      } else {
        setValues({ response: "", status: "PLANNED", ownerEmail: "" });
      }
    }
  }, [opened, action, setValues]);

  const invalidateActions = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["registers", registerId, "risks", riskId, "actions"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["audit", "risk", registerId, riskId],
      }),
    ]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const { response, status, ownerEmail } = form.values;
      const payload = {
        response,
        status,
        ...(canChangeOwner && ownerEmail ? { ownerEmail } : {}),
      };
      return isEdit
        ? updateResponseAction(registerId, riskId, action!.id, payload)
        : createResponseAction(registerId, riskId, payload);
    },
    onSuccess: async () => {
      await invalidateActions();
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteResponseAction(registerId, riskId, action!.id),
    onSuccess: async () => {
      await invalidateActions();
      onClose();
    },
  });

  function handleClose() {
    saveMutation.reset();
    deleteMutation.reset();
    onClose();
  }

  const handleDelete = () => {
    if (window.confirm("Delete this response action? This cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={isEdit ? "Edit Response Action" : "Add Response Action"}
      size="lg"
      centered
    >
      <form onSubmit={form.onSubmit(() => saveMutation.mutate())}>
        <Stack>
          <ApiErrorAlert error={saveMutation.error} fallback="Unable to save response action" />
          <ApiErrorAlert error={deleteMutation.error} fallback="Unable to delete response action" />
          <Textarea
            label="Response"
            required
            minRows={3}
            {...form.getInputProps("response")}
          />
          <Select
            label="Status"
            data={STATUS_OPTIONS}
            {...form.getInputProps("status")}
          />
          {canChangeOwner ? (
            <PersonPicker
              label="Owner"
              value={form.values.ownerEmail}
              onChange={(email) => form.setFieldValue("ownerEmail", email)}
              error={form.errors["ownerEmail"] as string | undefined}
            />
          ) : (
            <TextInput
              label="Owner"
              value={action?.owner.displayName ?? action?.owner.email ?? "—"}
              readOnly
              disabled
            />
          )}
          <Group justify="space-between">
            {canDelete && isEdit ? (
              <Button
                color="red"
                variant="outline"
                size="xs"
                loading={deleteMutation.isPending}
                onClick={handleDelete}
                type="button"
              >
                Delete
              </Button>
            ) : (
              <Text />
            )}
            <Group gap="xs">
              <Button variant="subtle" size="xs" onClick={handleClose} type="button">
                Cancel
              </Button>
              <Button size="xs" type="submit" loading={saveMutation.isPending}>
                {isEdit ? "Save" : "Add"}
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

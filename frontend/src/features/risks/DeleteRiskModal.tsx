import { Alert, Button, Group, Modal, Stack, Textarea } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { deleteRisk } from "../../api/risks.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";

interface DeleteRiskModalProps {
  registerId: string;
  riskId: string | null;
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

export function DeleteRiskModal({ registerId, riskId, opened, onClose, onSuccess }: DeleteRiskModalProps) {
  const [deletionReason, setDeletionReason] = useState("");

  const deleteMutation = useMutation({
    mutationFn: () => deleteRisk(registerId, riskId!, { deletionReason: deletionReason || undefined }),
    onSuccess: async () => {
      setDeletionReason("");
      onClose();
      await onSuccess();
    }
  });

  return (
    <Modal opened={opened && Boolean(riskId)} onClose={onClose} title="Delete risk">
      <Stack>
        <Alert color="red">This permanently deletes the risk after writing an audit snapshot.</Alert>
        <ApiErrorAlert error={deleteMutation.error} fallback="Unable to delete risk" />
        <Textarea
          label="Deletion reason"
          value={deletionReason}
          onChange={(event) => setDeletionReason(event.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button color="red" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

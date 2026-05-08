import { Alert, Button, Checkbox, Group, Modal, Stack, Textarea } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { completeRiskReview } from "../../api/risks.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";

interface ReviewModalProps {
  register: { reviewsEnabled: boolean; reviewAttestationText: string };
  registerId: string;
  riskId: string | null;
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

export function ReviewModal({
  register,
  registerId,
  riskId,
  opened,
  onClose,
  onSuccess
}: ReviewModalProps) {
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [reviewComment, setReviewComment] = useState("");

  const reviewMutation = useMutation({
    mutationFn: () =>
      completeRiskReview(registerId, riskId!, {
        confirmed: true,
        comment: reviewComment || undefined
      }),
    onSuccess: async () => {
      setReviewConfirmed(false);
      setReviewComment("");
      onClose();
      await onSuccess();
    }
  });

  return (
    <Modal opened={opened && Boolean(riskId)} onClose={onClose} title="Review risk">
      <Stack>
        <ApiErrorAlert error={reviewMutation.error} fallback="Unable to complete review" />
        <Alert>
          {register.reviewsEnabled ? register.reviewAttestationText : "Reviews are disabled for this register."}
        </Alert>
        <Textarea label="Comment" value={reviewComment} onChange={(event) => setReviewComment(event.currentTarget.value)} />
        <Checkbox
          label="Confirm review"
          checked={reviewConfirmed}
          onChange={(event) => setReviewConfirmed(event.currentTarget.checked)}
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!reviewConfirmed}
            loading={reviewMutation.isPending}
            onClick={() => reviewMutation.mutate()}
          >
            Complete review
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

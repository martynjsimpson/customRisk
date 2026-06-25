import { Alert, Button, Checkbox, Group, Modal, Stack, Textarea } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { completeRiskReview } from "../../api/risks.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import type { ReviewCommentMode } from "../../api/registers.api";

interface ReviewModalProps {
  register: { reviewsEnabled: boolean; reviewAttestationText: string; reviewCommentMode: ReviewCommentMode };
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

  function handleClose() {
    reviewMutation.reset();
    setReviewConfirmed(false);
    setReviewComment("");
    onClose();
  }

  const commentMode = register.reviewCommentMode;
  const commentMissing = commentMode === "MANDATORY" && reviewComment.trim() === "";

  return (
    <Modal opened={opened && Boolean(riskId)} onClose={handleClose} title="Review risk">
      <Stack>
        <ApiErrorAlert error={reviewMutation.error} fallback="Unable to complete review" />
        <Alert>
          {register.reviewsEnabled ? register.reviewAttestationText : "Reviews are disabled for this register."}
        </Alert>
        {commentMode !== "DISABLED" ? (
          <Textarea
            label="Comment"
            required={commentMode === "MANDATORY"}
            value={reviewComment}
            onChange={(event) => setReviewComment(event.currentTarget.value)}
          />
        ) : null}
        <Checkbox
          label="Confirm review"
          checked={reviewConfirmed}
          onChange={(event) => setReviewConfirmed(event.currentTarget.checked)}
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>Cancel</Button>
          <Button
            disabled={!reviewConfirmed || commentMissing}
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

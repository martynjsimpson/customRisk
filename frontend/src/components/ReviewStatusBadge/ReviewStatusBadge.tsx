import { Badge } from "@mantine/core";

interface ReviewStatusBadgeProps {
  status: string;
}

export function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  const color =
    status === "OVERDUE"
      ? "red"
      : status === "DUE_SOON"
        ? "yellow"
        : status === "NOT_REVIEWED"
          ? "gray"
          : "green";

  return <Badge color={color}>{status.replace(/_/g, " ")}</Badge>;
}

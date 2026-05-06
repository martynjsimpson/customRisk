import { Badge } from "@mantine/core";

import { getReadableTextColor } from "../../utils/color";

interface RiskLevelBadgeProps {
  riskLevel: { name: string; color?: string | null };
}

export function RiskLevelBadge({ riskLevel }: RiskLevelBadgeProps) {
  if (!riskLevel.color) {
    return <Badge>{riskLevel.name}</Badge>;
  }

  return (
    <Badge
      style={{
        backgroundColor: riskLevel.color,
        color: getReadableTextColor(riskLevel.color),
        borderColor: riskLevel.color
      }}
    >
      {riskLevel.name}
    </Badge>
  );
}

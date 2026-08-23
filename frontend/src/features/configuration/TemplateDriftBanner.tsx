import { Alert, Button, Group, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import type { LinkedTemplate } from "../../api/registers.api";

interface TemplateDriftBannerProps {
  linkedTemplate: LinkedTemplate | null;
  onViewChanges: () => void;
}

// Shown on a register's page when the register is linked to a template that has since
// published a newer version. Register Admins who only visit the Risks tab would otherwise
// never notice the drift, since the comparison lives inside the Configuration tab.
// See docs/architecture — this banner surfaces linkedTemplate.isLatest, which the backend
// already computes; there is no drift-detection logic on the frontend.
export function TemplateDriftBanner({ linkedTemplate, onViewChanges }: TemplateDriftBannerProps) {
  if (!linkedTemplate || linkedTemplate.isLatest) return null;

  return (
    <Alert
      data-testid="template-drift-banner"
      icon={<IconAlertTriangle size={16} />}
      color="orange"
      variant="light"
      title="A new template version is available"
    >
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Text size="sm">
          This register is linked to <strong>{linkedTemplate.templateName}</strong> v{linkedTemplate.linkedVersionNumber},
          but v{linkedTemplate.latestPublishedVersionNumber} has since been published. Review the differences and decide
          whether to apply the update.
        </Text>
        <Button
          data-testid="template-drift-banner-cta"
          size="xs"
          variant="light"
          color="orange"
          onClick={onViewChanges}
        >
          View changes
        </Button>
      </Group>
    </Alert>
  );
}

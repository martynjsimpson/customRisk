import { Alert, Box, Fieldset, Paper, Stack, Tabs } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { getConfigVersionStatus } from "../../api/configVersion.api";
import { useFeatureFlags } from "../../hooks/useFeatureFlags";
import { ConfigVersionBanner } from "./ConfigVersionBanner";
import { FieldConfigTab } from "./FieldConfigTab";
import { RegisterSettingsTab } from "./RegisterSettingsTab";
import { ScoringConfigurationPanel } from "./ScoringConfigurationPanel";
import { TemplateLinkPanel } from "./TemplateLinkPanel";

interface RegisterConfigurationPanelProps {
  registerId: string;
  canManage: boolean;
}

export function RegisterConfigurationPanel({ registerId, canManage }: RegisterConfigurationPanelProps) {
  const flags = useFeatureFlags();
  const draftConfigMode = flags.draftConfig && canManage;

  const statusQuery = useQuery({
    queryKey: ["config-version-status", registerId],
    queryFn: () => getConfigVersionStatus(registerId),
    enabled: draftConfigMode
  });
  const hasDraft = statusQuery.data?.hasDraft ?? false;
  const configLocked = draftConfigMode && !hasDraft;

  return (
    <Stack>
      {draftConfigMode ? (
        <Paper withBorder p="sm">
          <Stack gap="sm">
            <ConfigVersionBanner registerId={registerId} canManage={canManage} />
            <TemplateLinkPanel registerId={registerId} canManage={canManage} />
          </Stack>
        </Paper>
      ) : null}
      {configLocked ? (
        <Alert color="blue" title="Configuration is version-controlled">
          Create a draft using the banner above to edit register configuration.
        </Alert>
      ) : null}
      <Tabs defaultValue="settings">
        <Tabs.List>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
          <Tabs.Tab value="fields">Fields</Tabs.Tab>
          <Tabs.Tab value="scoring">Scoring</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="settings" pt="md">
          <RegisterSettingsTab registerId={registerId} />
        </Tabs.Panel>
        <Tabs.Panel value="fields" pt="md">
          <Fieldset legend="Field Configuration">
            <Box style={configLocked ? { opacity: 0.5, pointerEvents: "none" } : undefined}>
              <FieldConfigTab registerId={registerId} draftConfigMode={draftConfigMode} />
            </Box>
          </Fieldset>
        </Tabs.Panel>
        <Tabs.Panel value="scoring" pt="md">
          <ScoringConfigurationPanel registerId={registerId} draftConfigMode={draftConfigMode} configLocked={configLocked} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

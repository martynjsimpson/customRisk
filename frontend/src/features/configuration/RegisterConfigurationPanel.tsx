import { Paper, Stack, Tabs } from "@mantine/core";

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
          <FieldConfigTab registerId={registerId} draftConfigMode={draftConfigMode} />
        </Tabs.Panel>
        <Tabs.Panel value="scoring" pt="md">
          <ScoringConfigurationPanel registerId={registerId} draftConfigMode={draftConfigMode} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

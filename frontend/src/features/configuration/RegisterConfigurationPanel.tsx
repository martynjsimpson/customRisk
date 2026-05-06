import { Tabs } from "@mantine/core";

import { FieldConfigTab } from "./FieldConfigTab";
import { RegisterSettingsTab } from "./RegisterSettingsTab";
import { ScoringConfigurationPanel } from "./ScoringConfigurationPanel";

interface RegisterConfigurationPanelProps {
  registerId: string;
}

export function RegisterConfigurationPanel({ registerId }: RegisterConfigurationPanelProps) {
  return (
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
        <FieldConfigTab registerId={registerId} />
      </Tabs.Panel>
      <Tabs.Panel value="scoring" pt="md">
        <ScoringConfigurationPanel registerId={registerId} />
      </Tabs.Panel>
    </Tabs>
  );
}

import { Box, Fieldset, Tabs } from "@mantine/core";

import { ImpactConfigTab } from "./ImpactConfigTab";
import { LikelihoodConfigTab } from "./LikelihoodConfigTab";
import { MatrixConfigTab } from "./MatrixConfigTab";
import { RiskLevelConfigTab } from "./RiskLevelConfigTab";

interface ScoringConfigurationPanelProps {
  registerId: string;
  draftConfigMode?: boolean;
  configLocked?: boolean;
}

export function ScoringConfigurationPanel({ registerId, draftConfigMode, configLocked }: ScoringConfigurationPanelProps) {
  const lockedStyle = configLocked ? { opacity: 0.5, pointerEvents: "none" as const } : undefined;

  return (
    <Tabs defaultValue="likelihood">
      <Tabs.List>
        <Tabs.Tab value="likelihood">Likelihood</Tabs.Tab>
        <Tabs.Tab value="impact">Impact</Tabs.Tab>
        <Tabs.Tab value="risk-levels">Risk Levels</Tabs.Tab>
        <Tabs.Tab value="matrix">Matrix</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="likelihood" pt="md">
        <Fieldset legend="Likelihood">
          <Box style={lockedStyle}>
            <LikelihoodConfigTab registerId={registerId} draftConfigMode={draftConfigMode} />
          </Box>
        </Fieldset>
      </Tabs.Panel>
      <Tabs.Panel value="impact" pt="md">
        <Fieldset legend="Impact">
          <Box style={lockedStyle}>
            <ImpactConfigTab registerId={registerId} draftConfigMode={draftConfigMode} />
          </Box>
        </Fieldset>
      </Tabs.Panel>
      <Tabs.Panel value="risk-levels" pt="md">
        <Fieldset legend="Risk Levels">
          <Box style={lockedStyle}>
            <RiskLevelConfigTab registerId={registerId} draftConfigMode={draftConfigMode} />
          </Box>
        </Fieldset>
      </Tabs.Panel>
      <Tabs.Panel value="matrix" pt="md">
        <Fieldset legend="Risk Matrix">
          <Box style={lockedStyle}>
            <MatrixConfigTab registerId={registerId} draftConfigMode={draftConfigMode} />
          </Box>
        </Fieldset>
      </Tabs.Panel>
    </Tabs>
  );
}

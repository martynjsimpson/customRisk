import { Tabs } from "@mantine/core";

import { ImpactConfigTab } from "./ImpactConfigTab";
import { LikelihoodConfigTab } from "./LikelihoodConfigTab";
import { MatrixConfigTab } from "./MatrixConfigTab";
import { RiskLevelConfigTab } from "./RiskLevelConfigTab";

interface ScoringConfigurationPanelProps {
  registerId: string;
  draftConfigMode?: boolean;
}

export function ScoringConfigurationPanel({ registerId, draftConfigMode }: ScoringConfigurationPanelProps) {
  return (
    <Tabs defaultValue="likelihood">
      <Tabs.List>
        <Tabs.Tab value="likelihood">Likelihood</Tabs.Tab>
        <Tabs.Tab value="impact">Impact</Tabs.Tab>
        <Tabs.Tab value="risk-levels">Risk Levels</Tabs.Tab>
        <Tabs.Tab value="matrix">Matrix</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="likelihood" pt="md">
        <LikelihoodConfigTab registerId={registerId} draftConfigMode={draftConfigMode} />
      </Tabs.Panel>
      <Tabs.Panel value="impact" pt="md">
        <ImpactConfigTab registerId={registerId} draftConfigMode={draftConfigMode} />
      </Tabs.Panel>
      <Tabs.Panel value="risk-levels" pt="md">
        <RiskLevelConfigTab registerId={registerId} draftConfigMode={draftConfigMode} />
      </Tabs.Panel>
      <Tabs.Panel value="matrix" pt="md">
        <MatrixConfigTab registerId={registerId} draftConfigMode={draftConfigMode} />
      </Tabs.Panel>
    </Tabs>
  );
}

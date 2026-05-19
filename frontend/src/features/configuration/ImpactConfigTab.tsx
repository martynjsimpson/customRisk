import {
  createImpactValue,
  deactivateImpactValue,
  type ImpactValue,
  updateImpactValue
} from "../../api/scoring.api";
import { ScoringValueConfigTab } from "./ScoringValueConfigTab";

interface ImpactConfigTabProps {
  registerId: string;
  draftConfigMode?: boolean;
}

export function ImpactConfigTab({ registerId, draftConfigMode }: ImpactConfigTabProps) {
  return (
    <ScoringValueConfigTab<ImpactValue>
      registerId={registerId}
      draftConfigMode={draftConfigMode}
      labels={{
        title: "Impact Values",
        addButton: "Add impact",
        createModalTitle: "Add impact value",
        editModalTitle: "Edit impact value",
        emptyState: "No impact values configured",
        loadError: "Unable to load configuration",
        createError: "Unable to create impact value",
        updateError: "Unable to update impact value",
        deactivateError: "Unable to deactivate impact value",
        activateError: "Unable to activate impact value"
      }}
      selectValues={(config) => config.impactValues}
      createValue={createImpactValue}
      updateValue={updateImpactValue}
      deactivateValue={deactivateImpactValue}
    />
  );
}

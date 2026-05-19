import {
  createLikelihoodValue,
  deactivateLikelihoodValue,
  type LikelihoodValue,
  updateLikelihoodValue
} from "../../api/scoring.api";
import { ScoringValueConfigTab } from "./ScoringValueConfigTab";

interface LikelihoodConfigTabProps {
  registerId: string;
  draftConfigMode?: boolean;
}

export function LikelihoodConfigTab({ registerId, draftConfigMode }: LikelihoodConfigTabProps) {
  return (
    <ScoringValueConfigTab<LikelihoodValue>
      registerId={registerId}
      draftConfigMode={draftConfigMode}
      labels={{
        title: "Likelihood Values",
        addButton: "Add likelihood",
        createModalTitle: "Add likelihood value",
        editModalTitle: "Edit likelihood value",
        emptyState: "No likelihood values configured",
        loadError: "Unable to load configuration",
        createError: "Unable to create likelihood value",
        updateError: "Unable to update likelihood value",
        deactivateError: "Unable to deactivate likelihood value",
        activateError: "Unable to activate likelihood value"
      }}
      selectValues={(config) => config.likelihoodValues}
      createValue={createLikelihoodValue}
      updateValue={updateLikelihoodValue}
      deactivateValue={deactivateLikelihoodValue}
    />
  );
}

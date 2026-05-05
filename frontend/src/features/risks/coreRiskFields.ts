export type CoreRiskFieldId =
  | "title"
  | "description"
  | "state"
  | "createdDate"
  | "ownerUserId"
  | "likelihoodValueId"
  | "impactValueId"
  | "riskScore"
  | "responseStrategyId"
  | "responseAction";

export interface CoreRiskField {
  id: CoreRiskFieldId;
  displayOrder: number;
  fieldName: string;
  fieldType: string;
  isRequired: boolean;
}

export const CORE_RISK_FIELDS: CoreRiskField[] = [
  { id: "title",              displayOrder: 100, fieldName: "Risk Title",             fieldType: "Text",              isRequired: true  },
  { id: "description",        displayOrder: 200, fieldName: "Risk Description",       fieldType: "Multi-line text",   isRequired: true  },
  { id: "state",              displayOrder: 300, fieldName: "State",                  fieldType: "State",             isRequired: true  },
  { id: "createdDate",        displayOrder: 400, fieldName: "Created Date",           fieldType: "Date",              isRequired: true  },
  { id: "ownerUserId",        displayOrder: 500, fieldName: "Risk Owner",             fieldType: "Person Picker",     isRequired: true  },
  { id: "likelihoodValueId",  displayOrder: 600, fieldName: "Likelihood",             fieldType: "Likelihood",        isRequired: true  },
  { id: "impactValueId",      displayOrder: 700, fieldName: "Impact",                 fieldType: "Impact",            isRequired: true  },
  { id: "riskScore",          displayOrder: 750, fieldName: "Risk Score",              fieldType: "Number (calculated)", isRequired: false },
  { id: "responseStrategyId", displayOrder: 800, fieldName: "Risk Response Strategy", fieldType: "Response Strategy", isRequired: true  },
  { id: "responseAction",     displayOrder: 900, fieldName: "Risk Response Action",   fieldType: "Multi-line text",   isRequired: false },
];

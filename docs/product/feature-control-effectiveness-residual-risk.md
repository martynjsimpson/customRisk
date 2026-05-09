# Custom Risk — Control Effectiveness and Residual Risk Suggestions

**Version:** 0.1  
**Status:** Draft / Post-MVP feature extension  
**Applies to:** Post-MVP feature exploration  
**Related documents:** PRD.md, data-model.md

---

## 1. Purpose

This document extends the Product Requirements Document with a post-MVP feature concept for using child-record Risk Response Actions as control evidence to suggest residual Likelihood and/or residual Impact values.

The feature is intended to help Risk Owners make better residual risk assessments by showing how linked Risk Response Actions, their implementation status, and their configured control category may affect the risk.

The system should provide a suggested residual assessment only. It must not automatically overwrite the residual Likelihood, residual Impact, residual Risk Score, or residual Risk Level selected by the user.

---

## 2. Product Rationale

Risk Response Actions often represent controls, treatments, mitigations, or tasks that reduce a risk.

Examples:

- Enforce MFA
- Deploy endpoint detection
- Update supplier contract terms
- Introduce monthly access reviews
- Provide user awareness training
- Implement segregation of duties
- Add compensating monitoring

A Risk Owner assessing residual risk should be able to see whether those actions are planned, in progress, implemented, failed, or unreviewed.

Where the register uses inherent and residual risk fields, the system can help the Risk Owner by suggesting a residual Likelihood and/or Impact based on linked Risk Response Actions. This supports consistency and transparency while preserving human accountability.

---

## 3. Scope

This feature only applies when all of the following are true:

1. The register uses child-record Risk Response Actions.
2. The register has inherent and residual risk fields enabled.
3. The register has residual risk suggestion rules enabled.
4. One or more Risk Response Actions are linked to the risk.
5. The linked Risk Response Actions have the configured fields needed for calculation.

This feature does not apply to simple field mode Risk Response Actions.

---

## 4. Design Principles

1. **Suggested, not automatic:** the system suggests residual Likelihood and/or Impact but does not apply the values without user action.
2. **Register-configurable:** categories, status multipliers, calculation settings, and caps are configured per register.
3. **Transparent:** users should be able to see why a suggestion was made.
4. **Auditable:** configuration changes and user decisions should be traceable.
5. **Methodology-neutral:** the product must not hard-code assumptions such as "technical controls are always better than governance controls".
6. **No runaway reduction:** multiple controls should not stack fully by default.
7. **Future-proof for assurance:** the model should not prevent later support for evidence, testing, assurance reviews, or control effectiveness ratings.

---

## 5. Core Concepts

### 5.1 Risk Response Action

A Risk Response Action is a child record linked to one or more risks. In this feature, a Risk Response Action may be treated as a control or treatment that can affect residual risk.

### 5.2 Action Status

Action Status describes the implementation or operating state of the Risk Response Action.

Example values:

- Planned
- In Progress
- Implemented
- Failed
- Ineffective
- Unreviewed
- Deferred
- Cancelled

Status values are configured per register.

### 5.3 Control Category

Control Category describes the broad type of Risk Response Action.

Example values:

- Technical
- Operational
- Governance
- Physical
- Contractual
- Process
- Detective
- Preventive
- Corrective

Category values are configured per register.

The system must not treat any category as inherently stronger by default unless the Register Admin configures it that way.

### 5.4 Affects

Affects describes which scoring input the Risk Response Action is intended to influence.

Allowed values:

- Likelihood
- Impact
- Both

A Risk Response Action affecting Both contributes to both suggested residual Likelihood and suggested residual Impact calculations.

### 5.5 Suggested Residual Values

Suggested residual values are calculated by applying configured action effects to the inherent Likelihood and/or inherent Impact.

The suggestion is displayed to the user as guidance. The saved residual values remain user-selected fields.

---

## 6. Register Configuration

Register Admins should be able to enable or disable residual risk suggestions per register.

When enabled, Register Admins configure:

1. action categories;
2. category base effects;
3. action statuses;
4. status multipliers;
5. whether actions can affect Likelihood, Impact, or Both;
6. the diminishing returns model;
7. maximum reduction caps;
8. behaviour for failed, ineffective, overdue, or unreviewed actions;
9. whether users can apply suggested values from the UI;
10. whether deviations from suggestions are merely allowed or highlighted.

---

## 7. Action Category Configuration

Each category should support:

| Field | Description |
|---|---|
| Name | Display name, such as Technical or Governance. |
| Description | Optional explanation for users. |
| Base likelihood effect | Default level movement applied to Likelihood before status and diminishing returns. |
| Base impact effect | Default level movement applied to Impact before status and diminishing returns. |
| Display order | Ordering in configuration and forms. |
| Active | Whether the category can be selected for new actions. |

Base effects should be stored as signed decimal values.

Examples:

| Category | Base Likelihood Effect | Base Impact Effect |
|---|---:|---:|
| Technical | -1.00 | -0.50 |
| Operational | -0.75 | -0.75 |
| Governance | -0.50 | -0.25 |

Negative values reduce residual risk. Positive values increase residual risk.

The exact values are configured per register.

---

## 8. Action Status Configuration

Each status should support:

| Field | Description |
|---|---|
| Name | Display name, such as Planned or Implemented. |
| Description | Optional explanation for users. |
| Effect multiplier | Multiplier applied to the category effect. |
| Counts as active | Whether the action is still operationally relevant. |
| Counts as implemented | Whether the action should be treated as implemented. |
| Display order | Ordering in forms and status displays. |
| Active | Whether the status can be selected for new actions. |

Example status multipliers:

| Status | Multiplier | Meaning |
|---|---:|---|
| Planned | 0.00 | No residual reduction yet. |
| In Progress | 0.25 | Partial credit. |
| Implemented | 1.00 | Full configured credit. |
| Unreviewed | 0.50 | Partial or uncertain credit. |
| Failed | -1.00 | Negative impact. |
| Ineffective | -0.50 | Reduced or negative impact. |
| Cancelled | 0.00 | No credit. |

The exact values are configured per register.

Failed or ineffective controls may increase residual Likelihood or Impact if the register configuration uses a negative multiplier applied to a negative base effect, or a positive status effect model. The implementation must make this behaviour clear in the configuration UI.

---

## 9. Calculation Model

### 9.1 Inputs

For each linked Risk Response Action, the calculation uses:

- action category;
- action status;
- affects value;
- category base effect;
- status multiplier;
- inherent Likelihood;
- inherent Impact;
- register Likelihood scale;
- register Impact scale;
- register-level caps and diminishing returns rules.

### 9.2 Action Effect

The base action effect is:

```text
action_effect = category_base_effect × status_multiplier
```

For an action affecting Likelihood, use the category's Likelihood effect.

For an action affecting Impact, use the category's Impact effect.

For an action affecting Both, calculate separate effects for Likelihood and Impact.

### 9.3 Example Single Action

Risk Response Action:

- Action: Enforce MFA
- Category: Technical
- Affects: Likelihood
- Status: Implemented

Register configuration:

- Technical base Likelihood effect: -1.00
- Implemented multiplier: 1.00

Calculation:

```text
action_likelihood_effect = -1.00 × 1.00
action_likelihood_effect = -1.00
```

If the inherent Likelihood is 4, the suggested residual Likelihood is 3.

---

## 10. Multiple Actions and Diminishing Returns

Multiple Risk Response Actions should not stack fully by default.

The preferred first version should use a simple diminishing returns model that is easy to explain and audit.

### 10.1 Recommended v1 Model

For each affected dimension, calculate the action effects, sort them by absolute effect strength, then apply diminishing return factors.

Example default diminishing return factors:

| Ordered action | Factor |
|---:|---:|
| 1st strongest effect | 1.00 |
| 2nd strongest effect | 0.50 |
| 3rd strongest effect | 0.25 |
| 4th and later effects | 0.10 |

Calculation:

```text
combined_effect =
  strongest_effect × factor_1
  + second_strongest_effect × factor_2
  + third_strongest_effect × factor_3
  + remaining_effects × factor_n
```

This should be configurable per register.

### 10.2 Caps

Register Admins should configure maximum total movement per dimension.

Example:

| Dimension | Maximum reduction | Maximum increase |
|---|---:|---:|
| Likelihood | -2 levels | +1 level |
| Impact | -2 levels | +1 level |

Caps prevent controls from reducing residual values unrealistically.

### 10.3 Rounding

Because category effects and diminishing returns may produce decimal results, the register must define rounding behaviour.

Recommended options:

- round to nearest level;
- round towards no change;
- round down;
- round up.

Recommended default:

```text
round towards no change
```

This is conservative and avoids overstating control effectiveness.

### 10.4 Bounds

Suggested residual Likelihood and Impact must stay within the configured scale.

For example, on a 1–5 scale:

- suggested value cannot go below 1;
- suggested value cannot go above 5.

---

## 11. Suggested Residual Calculation

For Likelihood:

```text
suggested_residual_likelihood =
  inherent_likelihood + capped_diminishing_likelihood_effect
```

For Impact:

```text
suggested_residual_impact =
  inherent_impact + capped_diminishing_impact_effect
```

Then:

1. apply rounding;
2. apply lower and upper scale bounds;
3. resolve residual Risk Score using the register's residual formula;
4. resolve residual Risk Level using the register's matrix behaviour.

The system should show each step in an explainable way.

---

## 12. UI Behaviour

### 12.1 Risk Detail Screen

Where enabled, the Risk detail screen should show:

- linked Risk Response Actions;
- each action's status;
- each action's category;
- each action's affects value;
- calculated contribution to suggested residual Likelihood and/or Impact;
- suggested residual Likelihood;
- suggested residual Impact;
- suggested residual Risk Score;
- suggested residual Risk Level;
- currently selected residual values;
- difference between selected values and suggested values.

### 12.2 Risk Edit Screen

The Risk edit screen should not silently update residual values.

It may show:

```text
Suggested residual Likelihood: 3
Current residual Likelihood: 4
```

The user may optionally select an action such as:

```text
Apply suggested residual values
```

Applying suggested values should populate the editable residual fields, but the user remains responsible for saving the risk.

### 12.3 No Explanation Required for Difference

The Risk Owner should not be required to explain why they choose a residual value different from the suggestion.

The UI may highlight the difference, but it should not block save.

### 12.4 Explainability Panel

The UI should provide an explanation panel or expandable details section showing:

- which actions contributed;
- which actions did not contribute;
- category effect;
- status multiplier;
- diminishing return factor;
- cap applied;
- final suggested movement.

Example:

```text
Suggested Likelihood reduction: -1 level

Included actions:
1. Enforce MFA: Technical × Implemented = -1.00, factor 1.00, contribution -1.00
2. Monthly access review: Governance × In Progress = -0.13, factor 0.50, contribution -0.06

Cap applied: none
Rounded result: -1 level
```

---

## 13. Permissions

### 13.1 Configuration

Only System Admins and Register Admins for the register can configure:

- categories;
- category weights;
- statuses;
- status multipliers;
- diminishing return rules;
- caps;
- residual suggestion enablement.

### 13.2 Viewing Suggestions

Users who can view the risk can view residual suggestions only if they can view the linked Risk Response Actions and relevant action fields.

Field visibility rules must be respected.

### 13.3 Applying Suggestions

Users who can edit residual risk fields may apply the suggestion to the editable residual fields.

A user who cannot edit residual risk fields may see the suggestion if they have view permission, but cannot apply it.

---

## 14. Audit Requirements

The following must be audited:

- residual suggestion feature enabled or disabled for a register;
- category created, updated, activated, or deactivated;
- category weighting changed;
- status created, updated, activated, or deactivated;
- status multiplier changed;
- diminishing returns configuration changed;
- caps changed;
- user applies a suggested residual value;
- residual values saved after applying a suggestion.

Audit records for applied suggestions should include:

- previous residual Likelihood and Impact;
- suggested residual Likelihood and Impact;
- final saved residual Likelihood and Impact;
- linked action IDs considered;
- calculation configuration version or snapshot where practical.

The system does not need to audit every time a suggestion is displayed, unless a later compliance requirement demands it.

---

## 15. Data Model Considerations

This feature is post-MVP and should not change the MVP data model.

A future data model should consider these entities:

### 15.1 Risk Response Action Category

Stores configured action categories per register.

Fields may include:

- id;
- register_id;
- name;
- description;
- base_likelihood_effect;
- base_impact_effect;
- display_order;
- is_active;
- created_at;
- updated_at.

### 15.2 Risk Response Action Status

Stores configured action statuses per register.

Fields may include:

- id;
- register_id;
- name;
- description;
- effect_multiplier;
- counts_as_active;
- counts_as_implemented;
- display_order;
- is_active;
- created_at;
- updated_at.

### 15.3 Risk Response Action Fields

Risk Response Actions should include:

- category_id;
- status_id;
- affects: Likelihood, Impact, or Both.

### 15.4 Residual Suggestion Configuration

Stores per-register calculation settings.

Fields may include:

- register_id;
- suggestions_enabled;
- diminishing_return_factors_json;
- max_likelihood_reduction;
- max_likelihood_increase;
- max_impact_reduction;
- max_impact_increase;
- rounding_mode;
- created_at;
- updated_at.

### 15.5 Calculation Snapshot

When a user applies suggested values, the system should store enough calculation context to explain the decision later.

This may be stored in audit metadata rather than as a dedicated table for v1.

---

## 16. API Considerations

Possible future endpoints:

```text
GET /api/v1/registers/:registerId/residual-suggestion-config
PATCH /api/v1/registers/:registerId/residual-suggestion-config

GET /api/v1/registers/:registerId/risk-response-action-categories
POST /api/v1/registers/:registerId/risk-response-action-categories
PATCH /api/v1/registers/:registerId/risk-response-action-categories/:categoryId
POST /api/v1/registers/:registerId/risk-response-action-categories/:categoryId/deactivate

GET /api/v1/registers/:registerId/risk-response-action-statuses
POST /api/v1/registers/:registerId/risk-response-action-statuses
PATCH /api/v1/registers/:registerId/risk-response-action-statuses/:statusId
POST /api/v1/registers/:registerId/risk-response-action-statuses/:statusId/deactivate

GET /api/v1/registers/:registerId/risks/:riskId/residual-suggestion
POST /api/v1/registers/:registerId/risks/:riskId/apply-residual-suggestion
```

The exact route shape should be defined in the implementing phase ticket and reflected in the Postman collection, following `docs/architecture/api-standards.md`.

---

## 17. Example Calculation

Risk:

- Inherent Likelihood: 4
- Inherent Impact: 5

Linked actions:

| Action | Category | Affects | Status |
|---|---|---|---|
| Enforce MFA | Technical | Likelihood | Implemented |
| Monthly access review | Governance | Likelihood | In Progress |
| Supplier contract update | Contractual | Impact | Implemented |

Configuration:

| Category | Likelihood Effect | Impact Effect |
|---|---:|---:|
| Technical | -1.00 | -0.50 |
| Governance | -0.50 | -0.25 |
| Contractual | -0.25 | -1.00 |

| Status | Multiplier |
|---|---:|
| Planned | 0.00 |
| In Progress | 0.25 |
| Implemented | 1.00 |

Diminishing factors:

| Ordered action | Factor |
|---:|---:|
| 1st | 1.00 |
| 2nd | 0.50 |
| 3rd+ | 0.25 |

Likelihood effects:

```text
Enforce MFA = -1.00 × 1.00 = -1.00
Monthly access review = -0.50 × 0.25 = -0.125
```

Apply diminishing returns:

```text
-1.00 × 1.00 = -1.00
-0.125 × 0.50 = -0.0625
combined = -1.0625
```

Round towards no change:

```text
suggested likelihood movement = -1
suggested residual likelihood = 4 - 1 = 3
```

Impact effects:

```text
Supplier contract update = -1.00 × 1.00 = -1.00
```

Suggested residual Impact:

```text
5 - 1 = 4
```

Suggested residual assessment:

| Field | Value |
|---|---:|
| Suggested Residual Likelihood | 3 |
| Suggested Residual Impact | 4 |

The user may choose to apply these values or select different residual values.

---

## 18. Edge Cases

### 18.1 No linked actions

If no linked Risk Response Actions exist, the system should show that no residual suggestion is available.

### 18.2 Actions without category

If category is required by register configuration, actions without category should not contribute.

If category is optional, uncategorised actions should not contribute unless the register defines a default uncategorised effect.

### 18.3 Actions without status

If status is required by register configuration, actions without status should not contribute.

### 18.4 Cancelled actions

Cancelled actions should normally have zero effect.

### 18.5 Failed or ineffective actions

Failed or ineffective actions may increase suggested residual risk if configured to do so.

### 18.6 Unreviewed actions

Unreviewed actions may receive partial, zero, or negative credit depending on register configuration.

### 18.7 Overdue action reviews

A future version may reduce credit for actions whose review is overdue.

The v1 design should not prevent this.

### 18.8 Multiple actions in same category

Multiple actions in the same category should be subject to diminishing returns.

A future version may support category-specific caps.

### 18.9 Actions linked to multiple risks

A linked action may contribute to multiple risks, but the calculation is performed per risk.

### 18.10 Manually selected residual values differ from suggestion

The system should allow this.

No mandatory explanation is required for v1.

---

## 19. Future Enhancements

This feature should not block later support for:

- control testing;
- assurance evidence;
- attachments;
- control effectiveness ratings;
- last tested date;
- control operating effectiveness;
- design effectiveness;
- automatic expiry of control credit;
- review-based multiplier changes;
- category-specific caps;
- advanced formula builder integration;
- dashboard views of control coverage;
- reports showing residual risk suggestions vs accepted residual risk;
- risk acceptance workflows;
- mandatory explanation when residual risk differs materially from suggestion, if later required.

---

## 20. Out of Scope for v1 of This Feature

The following are out of scope for the first version of this feature:

- independent manual effectiveness rating per action;
- formal control assurance/testing workflow;
- evidence attachments;
- automatic residual risk updates without user action;
- mandatory explanation for rejecting a suggestion;
- machine-learning-based effectiveness scoring;
- cross-register action reuse;
- global category weighting across all registers.

---

## 21. Open Implementation Questions

1. Should failed controls always be allowed to increase residual risk, or should that be optional per register?
2. Should caps apply separately to each category as well as to the overall dimension?
3. Should rounding mode default to "towards no change" for conservative behaviour?
4. Should suggestions be recalculated live in the UI or only requested from the backend?
5. Should applying a suggestion create a distinct audit action before the risk is saved, or only when the risk is saved?
6. Should configuration changes create a versioned calculation snapshot for future audit explainability?

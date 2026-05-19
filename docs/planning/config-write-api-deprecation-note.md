# Configuration Write API Deprecation Note

**Status:** Working note  
**Date:** 2026-05-20  
**Purpose:** Preserve context for later follow-up on the configuration editing model

---

## 1. Why this note exists

Custom Risk now has a draft-based configuration workflow for register settings, custom fields, scoring values, risk levels, and the risk matrix.

Recent bug-fix work restored draft-mode editing by routing frontend changes through the draft snapshot update API instead of relying on the older direct live-edit endpoints.

That raised the follow-up question:

> If configuration editing is now draft-first, do we still need the old direct edit APIs for fields and other configuration entities?

This note is here so that future work can pick up that thread without having to reconstruct the context from commits and chat history.

---

## 2. Current position

At the moment:

- **draft edits** should go through `PATCH /registers/:registerId/config-versions/draft`;
- **published live config** is still stored in relational tables and remains the source used by risk forms and other live reads;
- **publish** is the operation that writes the draft snapshot back into the live relational config tables;
- some older **direct live-edit write endpoints** still exist for custom fields, scoring values, risk levels, matrix updates, and similar configuration objects.

These older write endpoints may still be serving one or both of these roles:

- backward compatibility while `draftConfig` remains feature-flagged or transitional;
- a fallback live-edit path when no draft workflow is in use.

---

## 3. Architectural direction

If the draft configuration workflow is the long-term editing model, the likely direction is:

- keep the **read APIs** that expose live or draft-aware configuration bundles;
- keep the **publish path** that applies the snapshot to relational tables;
- plan to **deprecate and eventually remove** the older direct live-edit configuration write APIs.

In that target model:

- draft snapshot APIs are the only supported way to change configuration;
- relational config tables remain important as the published runtime model;
- direct write APIs become redundant because they bypass the draft/publish discipline.

---

## 4. What probably stays vs what is a deprecation candidate

### Likely to stay

- `GET /registers/:id/config`
- `GET /registers/:id/risk-form-config`
- `GET /registers/:id/matrix` or equivalent read surfaces, if still useful as read-only slices
- config version status/list/create/update/publish/discard APIs

### Likely deprecation candidates

- direct custom field create/update/activate/deactivate writes
- direct dropdown option create/update/deactivate writes
- direct likelihood create/update/deactivate writes
- direct impact create/update/deactivate writes
- direct risk level create/update/activate/deactivate writes
- direct matrix update writes

This is a directional list, not yet an approved removal plan.

---

## 5. What must be true before removal

Do not remove the old direct write APIs until all of the following are true:

1. The product decision is explicit that configuration editing is draft-only.
2. The frontend no longer depends on direct live-edit mutation paths in any supported mode.
3. Feature-flag behavior has been reviewed so there is no hidden non-draft path still relying on the old endpoints.
4. Runtime behavioral tests exist for the major draft workflows:
   - custom fields
   - dropdown options
   - scoring values / risk levels
   - risk matrix
5. API docs and Postman examples have been updated.
6. Any audit expectations tied to the direct endpoints have been mapped to the draft-update and publish flow.

---

## 6. Recommended next step when resuming

When this work is picked up again, the first task should be:

**Create a small endpoint inventory that classifies every configuration API route as one of:**

- keep as-is;
- keep but mark transitional;
- deprecate;
- remove after migration.

That inventory should be based on actual route definitions and current frontend usage, not assumption.

---

## 7. Important caution

This should not be treated as a simple cleanup task.

Removing the old direct write APIs is a product and architecture decision, not only a refactor, because it changes:

- how configuration edits are allowed to happen;
- whether non-draft editing remains supported at all;
- which API contracts external or internal tools can rely on.

Treat this as a deliberate follow-up decision with a small migration plan, not an opportunistic code deletion.

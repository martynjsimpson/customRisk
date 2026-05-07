# Custom Risk - Prompt Templates

**Version:** 1.0
**Date:** 2026-05-04
**Status:** Draft
**Applies to:** AI-assisted implementation sessions

---

## 1. Purpose

This document provides reusable prompt patterns for AI-assisted build sessions.

It is not a source of truth for scope, tickets, architecture, permissions, audit, security, or schema. Use the planning, product, and architecture documents for those details.

---

## 2. General Ticket Prompt

Use this when starting any implementation backlog ticket.

```text
Implement ticket {ticket_id} from docs/planning/Implementation_Backlog.md.

Before coding:
- read docs/planning/AI_Build_Instructions.md;
- read the relevant docs/planning/Phase_*.md file;
- read the authoritative product and architecture docs referenced by that phase;
- confirm the implementation does not add anything excluded by docs/product/MVP_Scope.md.

During implementation:
- keep changes scoped to {ticket_id};
- follow existing project patterns;
- enforce backend permissions;
- add validation and audit events where required;
- update docs only if implementation intentionally changes a documented decision.

Before finishing:
- run relevant typecheck/test commands;
- summarize changed files and verification;
- call out anything that could not be completed.
```

---

## 3. Phase Start Prompt

Use this when beginning a whole phase rather than a single ticket.

```text
Start Phase {phase_number}: {phase_name}.

Read:
- docs/planning/AI_Build_Instructions.md;
- docs/planning/Phase_{phase_number}_{phase_name}.md, or the matching phase document;
- docs/planning/Implementation_Backlog.md;
- all authoritative documents listed in the phase brief.

Review the phase entry criteria and identify the first implementation ticket to work on.
Do not implement out-of-scope features.
If the phase plan conflicts with an authoritative product or architecture document, stop and explain the conflict.
```

---

## 4. Review Prompt

Use this after a ticket or phase is implemented.

```text
Review the implementation for {ticket_id_or_phase}.

Focus on:
- behavioural regressions;
- missing validation;
- missing backend permission checks;
- missing audit events;
- transaction safety;
- secret/logging issues;
- missing or weak tests;
- drift from the authoritative docs.

Lead with findings ordered by severity and include file/line references where possible.
If no issues are found, say that clearly and identify any remaining test gaps or residual risk.
```

---

## 5. Documentation Update Prompt

Use this when implementation intentionally changes a documented decision.

```text
Update the documentation for this intentional implementation change:

{brief_change_summary}

Before editing:
- identify the authoritative document for the changed topic using docs/planning/AI_Build_Instructions.md;
- update only the authoritative document and any necessary references;
- avoid duplicating long lists or policy details across docs.

After editing:
- summarize the changed docs;
- note any follow-up implementation or planning impact.
```

---

## 6. Example

```text
Implement ticket P0-01 from docs/planning/Implementation_Backlog.md.

Before coding:
- read docs/planning/AI_Build_Instructions.md;
- read docs/planning/Phase_0_Environment.md;
- read docs/architecture/Technical_Architecture.md;
- confirm the implementation does not add anything excluded by docs/product/MVP_Scope.md.

Keep changes scoped to the repository/package foundation.
Before finishing, run the relevant typecheck commands if they exist and summarize changed files and verification.
```

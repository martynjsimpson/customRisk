# Custom Risk - Phase 4 Scoring

**Version:** 1.0
**Date:** 2026-05-04
**Status:** Draft
**Applies to:** MVP Phase 4
**Authoritative backlog:** [Implementation_Backlog.md](Implementation_Backlog.md)

---

## 1. Purpose

Phase 4 implements configurable likelihood, impact, risk levels, matrix mappings, score calculation, and risk level display.

This document is a phase execution brief. Ticket-level detail remains in [Implementation_Backlog.md](Implementation_Backlog.md).

---

## 2. Authoritative Inputs

Read these before implementation:

- [MVP_Functional_Spec.md](../product/MVP_Functional_Spec.md) for scoring configuration behaviour.
- [MVP_Data_Model.md](../product/MVP_Data_Model.md) for scoring values, risk level lookup, and recalculation rules.
- [API_Route_Map.md](../architecture/API_Route_Map.md) for scoring routes.
- [Permission_Model.md](../architecture/Permission_Model.md) for scoring configuration access.
- [Audit_Model.md](../architecture/Audit_Model.md) for scoring configuration audit events.

---

## 3. Phase Objective

At the end of Phase 4, each register should have configurable scoring values and matrix mappings that drive calculated risk score and risk level values.

---

## 4. Backlog Tickets

The authoritative ticket details live in [Implementation_Backlog.md](Implementation_Backlog.md):

- P4-01 - Likelihood Configuration API
- P4-02 - Impact Configuration API
- P4-03 - Risk Level Configuration API
- P4-04 - Risk Matrix API
- P4-05 - Scoring Recalculation Behaviour
- P4-06 - Scoring Frontend

---

## 5. Entry Criteria

- Phase 2 risk create/edit logic is complete.
- Phase 3 configuration patterns are established.
- Register foundation defaults are available for likelihood, impact, risk levels, and matrix values.

---

## 6. Exit Criteria

- Register Admins can manage likelihood, impact, and risk level values.
- Register Admins can configure the risk matrix.
- Risk save is blocked when a required active matrix cell is missing.
- Score and level recalculate from backend logic.
- Users cannot directly edit calculated score or level values.
- Scoring changes are audited.

---

## 7. Handoff to Phase 5

Phase 5 may begin when risk list/detail views can display calculated score and level consistently.

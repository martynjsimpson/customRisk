# Custom Risk - Phase 2 Risk Register Core

**Version:** 1.0
**Date:** 2026-05-04
**Status:** Draft
**Applies to:** MVP Phase 2
**Authoritative backlog:** [Implementation_Backlog.md](Implementation_Backlog.md)

---

## 1. Purpose

Phase 2 implements the core risk register workflows: risk creation, listing, detail, editing, hard delete, calculated values, ownership rules, and CSV export.

This document is a phase execution brief. Ticket-level detail remains in [Implementation_Backlog.md](Implementation_Backlog.md).

---

## 2. Authoritative Inputs

Read these before implementation:

- [MVP_Functional_Spec.md](../product/MVP_Functional_Spec.md) for risk workflow behaviour and screen expectations.
- [MVP_Data_Model.md](../product/MVP_Data_Model.md) for Risk ID generation, calculated values, and transaction rules.
- [API_Route_Map.md](../architecture/API_Route_Map.md) for risk and export routes.
- [Permission_Model.md](../architecture/Permission_Model.md) for risk visibility, edit, delete, and export rules.
- [Audit_Model.md](../architecture/Audit_Model.md) for risk create/update/delete/export audit events.
- [Security_Model.md](../architecture/Security_Model.md) for validation and sensitive data handling.

---

## 3. Phase Objective

At the end of Phase 2, authorised users should be able to use a register as a working risk list, with correct permissions, calculated fields, audit events, and CSV export.

---

## 4. Backlog Tickets

The authoritative ticket details live in [Implementation_Backlog.md](Implementation_Backlog.md):

- P2-01 - Risk Service Foundation
- P2-02 - Risk List API
- P2-03 - Risk Create API
- P2-04 - Risk Detail API
- P2-05 - Risk Update API
- P2-06 - Risk Hard Delete API
- P2-07 - CSV Export API
- P2-08 - Risk Register Frontend

---

## 5. Entry Criteria

- Phase 1 is complete.
- Register permissions and actor context are available.
- Default register configuration is seeded when registers are created.
- Audit writes can occur inside transactions.

---

## 6. Exit Criteria

- Risk records can be listed, created, viewed, edited, and hard-deleted according to permissions.
- Risk ID, score, level, and next review date are calculated by backend logic.
- Closed risks are excluded by default from operational views.
- CSV export respects permissions and filters.
- Core risk workflows are available in the frontend.
- Required risk audit events are written.

---

## 7. Handoff to Phase 3

Phase 3 may begin when risk create/edit forms can consume configuration data and custom field validation hooks are ready to be completed.

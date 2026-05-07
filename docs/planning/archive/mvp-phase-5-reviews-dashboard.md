# Custom Risk - Phase 5 Reviews and Dashboard

**Version:** 1.0
**Date:** 2026-05-04
**Status:** Draft
**Applies to:** MVP Phase 5
**Authoritative backlog:** [Implementation_Backlog.md](Implementation_Backlog.md)

---

## 1. Purpose

Phase 5 implements risk review workflows, review status logic, dashboards, My Work, admin summaries, and audit read views.

This document is a phase execution brief. Ticket-level detail remains in [Implementation_Backlog.md](Implementation_Backlog.md).

---

## 2. Authoritative Inputs

Read these before implementation:

- [MVP_Functional_Spec.md](../product/MVP_Functional_Spec.md) for review, dashboard, and audit UI behaviour.
- [MVP_Data_Model.md](../product/MVP_Data_Model.md) for review dates, review records, and derived status rules.
- [API_Route_Map.md](../architecture/API_Route_Map.md) for review, dashboard, and audit read routes.
- [Permission_Model.md](../architecture/Permission_Model.md) for dashboard and audit visibility.
- [Audit_Model.md](../architecture/Audit_Model.md) for audit access and event detail rules.

---

## 3. Phase Objective

At the end of Phase 5, Risk Owners should be able to find and review assigned risks, Register Admins should see overdue work, and authorised users should be able to inspect relevant audit history.

---

## 4. Backlog Tickets

The authoritative ticket details live in [Implementation_Backlog.md](Implementation_Backlog.md):

- P5-01 - Risk Review API
- P5-02 - Review Status and Overdue Logic
- P5-03 - Dashboard APIs
- P5-04 - Audit Read APIs
- P5-05 - Dashboard and Review Frontend

---

## 5. Entry Criteria

- Phases 1 through 4 are complete.
- Risk records include owners, dates, states, scores, and levels.
- Audit-producing routes exist for core workflows.
- Frontend navigation can expose role-aware dashboard areas.

---

## 6. Exit Criteria

- Reviews can be completed and recorded immutably through the UI.
- Last and next review dates update correctly.
- Review status, overdue, and due-soon logic match the data model.
- Dashboard APIs return role-appropriate data.
- Audit read routes enforce access rules.
- Dashboard, review, and audit UI workflows are available.

---

## 7. Handoff to Phase 6

Phase 6 may begin when core user journeys are implemented end to end and ready for verification, hardening, and usability review.

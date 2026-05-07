# Custom Risk - Phase 6 Hardening

**Version:** 1.0
**Date:** 2026-05-04
**Status:** Draft
**Applies to:** MVP Phase 6
**Authoritative backlog:** [Implementation_Backlog.md](Implementation_Backlog.md)

---

## 1. Purpose

Phase 6 verifies and hardens the MVP across seed data, permissions, audit coverage, validation, security, usability, and acceptance scenarios.

This document is a phase execution brief. Ticket-level detail remains in [Implementation_Backlog.md](Implementation_Backlog.md).

---

## 2. Authoritative Inputs

Read these before implementation:

- [MVP_Scope.md](../product/MVP_Scope.md) for final scope control.
- [MVP_Functional_Spec.md](../product/MVP_Functional_Spec.md) for acceptance scenarios and UX expectations.
- [MVP_Data_Model.md](../product/MVP_Data_Model.md) for seed data and derived value checks.
- [Permission_Model.md](../architecture/Permission_Model.md) for permission test coverage.
- [Audit_Model.md](../architecture/Audit_Model.md) for audit completeness.
- [Security_Model.md](../architecture/Security_Model.md) for authentication/session/security hardening.
- [AI_Build_Instructions.md](AI_Build_Instructions.md) for final implementation governance.

---

## 3. Phase Objective

At the end of Phase 6, the MVP should be ready for realistic use and acceptance review, with known permission, audit, validation, security, and usability gaps closed or explicitly documented.

---

## 4. Backlog Tickets

The authoritative ticket details live in [Implementation_Backlog.md](Implementation_Backlog.md):

- P6-01 - Seed and Demo Data
- P6-02 - Permission Test Suite
- P6-03 - Audit Completeness Review
- P6-04 - Validation and Error Handling Hardening
- P6-05 - Security Hardening
- P6-06 - Usability and Responsive Pass
- P6-07 - End-to-End Acceptance Scenarios

---

## 5. Entry Criteria

- Phases 1 through 5 are complete.
- Core MVP workflows exist in backend and frontend.
- Required routes, permissions, audit writes, and UI screens have first-pass implementations.

---

## 6. Exit Criteria

- Seed/demo data supports realistic acceptance testing.
- Permission tests cover the major MVP roles and hidden-resource behaviour.
- Audit coverage is reviewed and missing events are fixed.
- Validation and error responses are consistent.
- Auth/session/security controls are verified.
- Frontend screens have loading, error, empty, and responsive states where needed.
- End-to-end MVP acceptance scenarios pass.

---

## 7. Completion

After Phase 6, remaining work should be classified as either MVP defects, documentation updates, or post-MVP scope. Product expansion should be planned outside the MVP phase set.

# Custom Risk - Phase 3 Configuration

**Version:** 1.0
**Date:** 2026-05-04
**Status:** Draft
**Applies to:** MVP Phase 3
**Authoritative backlog:** [Implementation_Backlog.md](Implementation_Backlog.md)

---

## 1. Purpose

Phase 3 implements register-specific custom field configuration, dropdown options, field ordering, required-field rules, and runtime validation of custom field values.

This document is a phase execution brief. Ticket-level detail remains in [Implementation_Backlog.md](Implementation_Backlog.md).

---

## 2. Authoritative Inputs

Read these before implementation:

- [MVP_Functional_Spec.md](../product/MVP_Functional_Spec.md) for configuration UI and validation behaviour.
- [MVP_Data_Model.md](../product/MVP_Data_Model.md) for custom field definitions, values, and inactive reference handling.
- [API_Route_Map.md](../architecture/API_Route_Map.md) for configuration routes.
- [Permission_Model.md](../architecture/Permission_Model.md) for configuration access rules.
- [Audit_Model.md](../architecture/Audit_Model.md) for configuration audit events.

---

## 3. Phase Objective

At the end of Phase 3, Register Admins should be able to configure custom fields for an assigned register, and risk forms should enforce those field definitions.

---

## 4. Backlog Tickets

The authoritative ticket details live in [Implementation_Backlog.md](Implementation_Backlog.md):

- P3-01 - Register Configuration Bundle API
- P3-02 - Custom Field Definition API
- P3-03 - Dropdown Option API
- P3-04 - Custom Field Value Validation
- P3-05 - Configuration Frontend

---

## 5. Entry Criteria

- Phase 2 is complete.
- Risk create/edit endpoints exist.
- Register configuration endpoints can be protected by the permission service.
- Existing risks can render referenced configuration values.

---

## 6. Exit Criteria

- Register Admins can add, edit, order, activate, and deactivate supported custom fields.
- Dropdown options can be managed for dropdown fields.
- Required custom fields are enforced on risk save.
- Inactive referenced values remain renderable for existing risks.
- Configuration changes are audited.
- Configuration UI is available from the frontend.

---

## 7. Handoff to Phase 4

Phase 4 may begin when register configuration screens and risk forms can reliably consume active and inactive configuration values.

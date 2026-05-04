# Custom Risk - Phase 1 Foundation

**Version:** 1.0
**Date:** 2026-05-04
**Status:** Draft
**Applies to:** MVP Phase 1
**Authoritative backlog:** [Implementation_Backlog.md](Implementation_Backlog.md)

---

## 1. Purpose

Phase 1 establishes the product foundation: database schema, backend shell, validation, local authentication, users, registers, permissions, audit writing, and the initial frontend shell.

This document is a phase execution brief. Ticket-level detail remains in [Implementation_Backlog.md](Implementation_Backlog.md).

---

## 2. Authoritative Inputs

Read these before implementation:

- [MVP_Scope.md](../product/MVP_Scope.md) for MVP boundaries.
- [MVP_Functional_Spec.md](../product/MVP_Functional_Spec.md) for user-facing behaviour.
- [MVP_Data_Model.md](../product/MVP_Data_Model.md) for logical data rules and transactions.
- [Technical_Architecture.md](../architecture/Technical_Architecture.md) for implementation structure.
- [Schema.md](../architecture/Schema.md) and `../../backend/prisma/schema.prisma` for the drafted Prisma schema.
- [API_Route_Map.md](../architecture/API_Route_Map.md) for routes and response contracts.
- [Permission_Model.md](../architecture/Permission_Model.md), [Audit_Model.md](../architecture/Audit_Model.md), and [Security_Model.md](../architecture/Security_Model.md) for policy details.

---

## 3. Phase Objective

At the end of Phase 1, the MVP should have a secure local login flow, System Admin user management, register creation/assignment, initial audit writes, and a frontend shell for those foundation workflows.

---

## 4. Backlog Tickets

The authoritative ticket details live in [Implementation_Backlog.md](Implementation_Backlog.md):

- P1-01 - Prisma Schema and Initial Migration
- P1-02 - Backend App Shell
- P1-03 - Validation and Error Utilities
- P1-04 - Password and Token Utilities
- P1-05 - Local Authentication Routes
- P1-06 - Audit Framework
- P1-07 - Permission Service
- P1-08 - User Management API
- P1-09 - Register Foundation API
- P1-10 - Register Permission API
- P1-11 - Frontend App Shell and Auth UI
- P1-12 - Users and Registers Frontend Foundation

---

## 5. Entry Criteria

- Phase 0 is complete.
- Local PostgreSQL is available.
- Required environment variables are documented.
- The drafted Prisma schema is available.

---

## 6. Exit Criteria

- Initial Prisma migration applies cleanly.
- Backend app shell exposes the versioned API and health endpoint.
- Local authentication works with secure password and token handling.
- System Admin can manage users.
- System Admin can create registers and assign Register Admins.
- Register permissions are enforced server-side.
- Foundation audit events are written without secrets.
- Frontend login, navigation, users, and register foundation screens are usable.

---

## 7. Handoff to Phase 2

Phase 2 may begin when register access, actor context, audit writing, and frontend authenticated routing are stable enough for risk-record workflows.

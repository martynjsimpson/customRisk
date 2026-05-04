# Custom Risk - Phase 0 Environment and Bootstrap

**Version:** 1.0
**Date:** 2026-05-04
**Status:** Draft
**Applies to:** MVP implementation bootstrap
**Authoritative backlog:** [Implementation_Backlog.md](Implementation_Backlog.md)

---

## 1. Purpose

Phase 0 creates the empty development environment and runnable project skeleton required before product implementation starts.

This phase is implementation-only. It does not add MVP product scope and should not be used to decide product behaviour.

---

## 2. Authoritative Inputs

Use these documents as the source of truth:

- [Technical_Architecture.md](../architecture/Technical_Architecture.md) for runtime, framework, repository, and deployment direction.
- [Security_Model.md](../architecture/Security_Model.md) for secret handling and local configuration expectations.
- [AI_Build_Instructions.md](AI_Build_Instructions.md) for documentation governance and implementation workflow.
- [Implementation_Backlog.md](Implementation_Backlog.md) for ticket-level deliverables and acceptance criteria.

---

## 3. Phase Objective

At the end of Phase 0, a developer should be able to configure the local environment, start the application stack, and run basic quality gates against an otherwise empty product.

---

## 4. Scope

Phase 0 covers:

- repository and package foundation;
- local environment configuration;
- Docker and local PostgreSQL runtime;
- basic scripts for typecheck, tests, linting, and formatting where practical.

Phase 0 does not cover:

- Prisma schema implementation;
- authentication;
- product screens;
- seed/demo data beyond environment placeholders.

---

## 5. Backlog Tickets

The authoritative ticket details live in [Implementation_Backlog.md](Implementation_Backlog.md):

- P0-01 - Repository and Package Foundation
- P0-02 - Local Environment Configuration
- P0-03 - Docker and Local Runtime
- P0-04 - Development Scripts and Quality Gates

---

## 6. Entry Criteria

- Product and architecture docs are available.
- The target repository location is known.
- Local development is expected to use Node 20, PostgreSQL, and Docker as described in the architecture docs.

---

## 7. Exit Criteria

- Backend and frontend package skeletons exist.
- Required local environment variables are documented in `.env.example`.
- Docker Compose can start the app and database services.
- Basic quality scripts exist and can be run by later phases.
- No real secrets are committed.

---

## 8. Handoff to Phase 1

Phase 1 may begin when an empty PostgreSQL database can be started locally and the backend/frontend project shells can be typechecked.

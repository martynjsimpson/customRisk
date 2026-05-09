# Planning Docs — Structure Guide

This directory contains three distinct types of document. They work together but serve different purposes.

---

## `post-mvp-backlog.md` — Master index

The single entry point for post-MVP planning. Contains:

- the phase index table (phase number, theme, status, ticket range, links);
- the sequencing and parallelism summary;
- cross-phase dependency narrative;
- the governance checklist every ticket must follow before starting and before marking done.

**Start here** when reasoning about sequencing, deciding what to build next, or onboarding to the backlog.

---

## `PM0-*.md` — Phase 0 governance documents

Five documents produced as the deliverables of Phase 0. They define the rules and patterns that every subsequent phase must follow:

| File | Purpose |
|---|---|
| `PM0-01-scope-baseline.md` | Maps every PRD capability and MVP deferral to a post-MVP phase; records non-goals |
| `PM0-02-data-model-extension.md` | Safe schema-extension principles and migration sequencing rules |
| `PM0-03-api-versioning-compatibility.md` | API versioning decisions, route namespace conventions, error-code extension rules |
| `PM0-04-audit-permission-extension.md` | Audit and permission model extension rules for new object types |
| `PM0-05-feature-flag-migration-toggles.md` | Feature flag and migration toggle pattern for staged post-MVP features |

These are **governance references**, not ticket lists. Each phase file's dependency preamble points to the relevant PM0 docs for that phase.

---

## `phases/phase-NN-*.md` — Implementation ticket files

One file per post-MVP phase (Phase 1 through Phase 14). Each file contains:

- a phase goal;
- a dependency preamble (must-have prerequisites, parallel phases, what this phase unlocks);
- individual `PM{phase}-{N}` tickets with goals, deliverables, and acceptance criteria.

**Use these files** when doing implementation work on a specific phase.

---

## `ai-build-instructions.md`

Instructions for AI build agents working on this codebase. Not a planning document.

# Custom Risk — AI Build Instructions

**Version:** 1.1  
**Date:** 2026-05-04  
**Status:** Draft  
**Applies to:** MVP implementation  

---

## 1. Purpose

This document tells future AI coding sessions how to use the Custom Risk documentation set without duplicating it.

It is not the source of truth for product scope, technical stack, API routes, schema, permissions, audit, or security. It is a routing and governance guide for implementation work.

---

## 2. Source-of-Truth Map

Use the following documents as authoritative:

| Topic | Authoritative document |
|---|---|
| MVP scope and exclusions | `docs/product/MVP_Scope.md` |
| User-facing behaviour, screens, validation, acceptance criteria | `docs/product/MVP_Functional_Spec.md` |
| Logical data model, derived values, seed data, transaction boundaries | `docs/product/MVP_Data_Model.md` |
| Long-term product intent | `docs/product/PRD.md` |
| Runtime, frameworks, deployment, repo structure | `docs/architecture/Technical_Architecture.md` |
| REST routes, request/response shapes, route-level auth, route audit events | `docs/architecture/API_Route_Map.md` |
| Permission rules and effective access | `docs/architecture/Permission_Model.md` |
| Audit event model and audit access | `docs/architecture/Audit_Model.md` |
| Authentication, sessions, passwords, tokens, CORS, secret handling | `docs/architecture/Security_Model.md` |
| Drafted Prisma schema reference | `docs/architecture/Schema.md` and `backend/prisma/schema.prisma` |
| Ticket breakdown | `docs/planning/Implementation_Backlog.md` |
| Phase execution detail | `docs/planning/Phase_*.md` |
| AI-ready implementation prompts | `docs/prompts/*.md` |

If this document appears to conflict with an authoritative document, use the authoritative document and update this file only if the guidance itself is wrong.

---

## 3. Precedence Rules

When documents overlap, use this order:

1. MVP Functional Specification for user-facing behaviour.
2. MVP Scope for what is in or out.
3. Architecture documents for implementation contracts.
4. MVP Data Model for logical data rules and transactions.
5. PRD for long-term intent only where MVP documents are silent.
6. Current codebase for implementation state.

Do not use the PRD to pull post-MVP capabilities into MVP unless a later approved planning document explicitly changes scope.

---

## 4. AI Operating Rules

Before starting an implementation task:

1. Identify the relevant backlog ticket or phase section.
2. Read the source documents listed for that topic in section 2.
3. Confirm the task does not require an MVP-excluded feature from `MVP_Scope.md`.
4. Identify required permission checks from `Permission_Model.md`.
5. Identify required audit events from `Audit_Model.md` and `API_Route_Map.md`.
6. Identify relevant security rules from `Security_Model.md`.
7. Identify transaction requirements from `MVP_Data_Model.md`.
8. Identify tests required by the backlog ticket.

While implementing:

- prefer existing project patterns over new abstractions;
- keep changes scoped to the ticket;
- enforce permissions in the backend, not only the UI;
- validate request bodies and query parameters server-side;
- write audit events where required;
- avoid committing secrets or logging sensitive values;
- do not introduce a new framework, major library, or architectural pattern without approval.

Before finishing:

- run relevant tests or explain why they could not be run;
- confirm the task did not add out-of-scope MVP features;
- update docs if implementation intentionally changes a documented decision;
- summarize changed files and verification.

---

## 5. Stop-and-Ask Triggers

Stop and ask for clarification before implementing when:

- the requested feature is excluded by `MVP_Scope.md`;
- the request changes security, audit, permission, schema, or token behaviour;
- the request requires a new major dependency or framework;
- the request would alter the drafted Prisma schema beyond the current implementation plan;
- the permission model is ambiguous for the requested workflow;
- the audit requirement conflicts with secret-redaction or privacy rules;
- a route would reveal hidden resource existence;
- a feature requires background jobs, email delivery, imports, templates, attachments, webhooks, or advanced reporting;
- a frontend workflow requires a screen not present in the MVP screen inventory.

---

## 6. Documentation Hygiene

Avoid copying long lists from authoritative docs into planning or prompt docs.

Use references instead:

- refer to `MVP_Scope.md` for exclusions instead of repeating the full exclusion list;
- refer to `Technical_Architecture.md` for stack details instead of repeating library versions;
- refer to `API_Route_Map.md` for routes instead of copying route inventories;
- refer to `Permission_Model.md`, `Audit_Model.md`, and `Security_Model.md` for policy details;
- refer to `MVP_Data_Model.md` for derived values and transactions.

Short summaries are acceptable when they help the reader understand a ticket, but the detailed rule should live in only one authoritative document.

---

## 7. Done Criteria for AI Build Tasks

A task is done when:

- implementation matches the relevant authoritative documents;
- server-side validation is present;
- backend permissions are enforced;
- audit events are created where required;
- required transactions protect related writes;
- tests cover the main happy path and important failure paths;
- frontend UI, if included, is role-aware and handles loading/error/empty states;
- no out-of-scope MVP feature was introduced;
- docs are updated if implementation intentionally changed a documented decision.

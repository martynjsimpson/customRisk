# Active Release

Status: active  
Version: v1.9.0  
Release type: product release  
Goal: Ship the current v1.9.0 branch scope: personal saved views, API key management baseline, and the supporting release/runtime/documentation changes already present on the branch.

## Selected work items

- PM11-01 - Ship personal saved views and tighten reporting-export foundations
  - Status: in active release; implementation exists and release-readiness verification remains.
  - Scope: personal saved views for risk-register table filters, sort, and columns; shared views, charts, scheduled reports, report-builder scope, and CSV import remain out of scope.
- PM13-01 - Finish and verify API key management baseline
  - Status: in active release; current worktree contains active API key implementation changes.
  - Scope: user self-service API key create/list/revoke, System Admin list/revoke oversight, one-time raw key reveal, safe prefix-only audit evidence, and v1.9.0 inherit-user-permissions scope.

## Release-supporting branch changes

- Release scope is anchored at commit `b755b052df235380222825400ee41c6c58ab6d2d` (`chore: bump version to 1.9.0`) and includes all subsequent committed changes on this branch plus current uncommitted worktree changes, excluding `docs/planningV3/` planning metadata.
- Package and changelog metadata for v1.9.0 are part of the current branch.
- The current branch aligns the practical runtime/toolchain on Node 22 through `.nvmrc`, CI, and Docker, while the package engine constraint remains `>=20.19`.
- ADR-0009 is part of the release documentation for the API key and saved-view decisions.
- Current branch changes outside `docs/planningV3/` are considered v1.9.0 release scope unless explicitly removed, whether they are already committed after `b755b052df235380222825400ee41c6c58ab6d2d` or still uncommitted.
- `docs/planningV3/` edits are release-management metadata and are not themselves product payload.

## Out of scope

- Recreating slices, batches, or phase documents as active planning objects
- Pulling broad roadmap work into release scope without a refined work item
- API key request authentication middleware and immediate deactivated-user key-auth enforcement (`PM13-03`)
- Shared saved views, report builder, charts, scheduled reports, and CSV import
- First-class child-record response actions, advanced review rules, notifications, attachments, enterprise auth, and template-library extensions

## Required agents

- Product Manager
- Release Manager
- Backend Developer
- Frontend Developer
- Test Engineer

## Blockers

- `PM13-01` still has in-flight uncommitted implementation and test changes that need final audit.
- `PM11-01` and `PM13-01` both depend on explicit feature-flag release decisions (`FEATURE_SAVED_VIEWS`, `FEATURE_API_KEYS`).
- `PM13-03` remains an explicit deferred hardening follow-up for API-key request authentication and deactivated-user key-auth enforcement.
- Regression, typecheck, lint, and release documentation sign-off are still pending.

## Decisions needed

- Should `FEATURE_SAVED_VIEWS` be enabled by default for the v1.9.0 deployment target?
- Should `FEATURE_API_KEYS` be enabled by default for the v1.9.0 deployment target?
- Should `PM13-03` remain a post-v1.9.0 follow-up, or should release sign-off require pulling it into this release?
- Should the package `engines.node` constraint be tightened to Node 22, or remain `>=20.19` while `.nvmrc`, CI, and Docker use Node 22?

## Test / sign-off

- Scope approval: approved for v1.9.0
- Implementation complete: pending
- Regression test pass: pending
- Documentation pass: pending
- Release sign-off: pending

## Release notes draft

- Personal saved views let users save and reapply risk-register filter, sort, and column state.
- API key management adds user self-service key generation/revocation and System Admin oversight/revocation.
- API keys use inherit-user-permissions scope for v1.9.0; scoped keys are deferred.
- Saved views remain personal-only for v1.9.0; shared views and broader report-building remain deferred.
- Node 22 is the active local, CI, and Docker runtime target for this branch.

## Observed branch/worktree activity

- The active branch is `chore/planning-docs-cleanup-2`.
- The branch is the active v1.9.0 release branch.
- Scope starts immediately after `b755b052df235380222825400ee41c6c58ab6d2d` and runs through the current uncommitted worktree state.
- All branch changes outside `docs/planningV3/`, including currently uncommitted changes, are part of the v1.9.0 release scope unless explicitly removed.
- Committed changes after `b755b052df235380222825400ee41c6c58ab6d2d` include saved views, API key foundations, ADR-0009, legacy planning updates, v1.9.0 changelog/env metadata, and Node 22 CI/runtime alignment.
- Current uncommitted tracked changes focus on the final `PM13-01` API key self-service/admin split, tests, and ADR wording.
- `docs/work-management-model.md` is currently untracked release-management documentation outside `docs/planningV3/`; because it is outside the excluded Planning V3 docs, it is part of the v1.9.0 branch scope if retained and should be intentionally included or removed before release sign-off.

## Recommended follow-on candidates

### Candidate A - Close adjacent audit gaps

- PM13-03 - Harden API key authentication and deactivated-user enforcement
- PM2-05A - Close the remaining person-assignment admin and audit gaps

Why this candidate:
- Reduces security and audit caveats left after v1.9.0
- Keeps follow-up scope near the currently touched code

### Candidate B - Finish the advanced field foundation

- PM5-CORE - Finish the advanced custom-field model

Why this candidate:
- Reduces future rework across imports, scoring, reporting, and permissions
- Creates a cleaner base for several later roadmap items

### Candidate C - Start the workflow expansion chain

- PM7-CORE - Introduce child-record response actions
- PM8-CORE - Extend MVP reviews into rule-driven review workflows

Why this candidate:
- Opens the largest missing workflow capability in the product
- Creates the dependency base for notifications and richer reporting later

## Operating rules

1. This file is the only active delivery scope once a release is approved.
2. Do not add unapproved backlog items here just because they look related.
3. Keep the selected scope small enough to complete, test, and release cleanly.
4. Update blockers, decisions, and sign-off as work progresses.
5. The Release Manager maintains version, blockers, and sign-off state as release work progresses.

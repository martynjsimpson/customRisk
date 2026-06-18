# Planning V3

This directory uses the `Request -> Work item -> Active release -> Done` model.

- `requests.md` is the human-friendly intake file.
- `backlog.yml` is the PM-refined, agent-readable backlog.
- `active-release.md` is the only current delivery scope.

There are no slices, batches, or active phase documents in this model. Release versions are assigned later by the Release Manager after the release scope is approved. The old `docs/planning/` files remain migration and reference sources only.

Agents should not read old planning files by default. Agents should not create new planning files, phase files, or side-car backlog files without human approval. This model is intentionally small so it can later migrate to GitHub Issues if that becomes useful.

## Request status model

Requests use the following statuses:

- `inbox` - captured but not yet reviewed.
- `needs-refinement` - reviewed, but needs PM clarification, splitting, scoping, or human input before work items are reliable.
- `refined` - one or more backlog work items exist, but none are currently selected for active delivery.
- `in-active-release` - one or more derived work items are currently selected in `active-release.md`.
- `partially-done` - some of the request outcome has shipped or is complete, but meaningful scope remains.
- `done` - the request's intended outcome is satisfied.
- `deferred` - valid request, but not currently planned.
- `rejected` - out of scope or deliberately not being pursued.
- `duplicate` - covered by another request or work item.

## Status boundaries

Request status reflects what happened to the human-facing ask.

Work item status reflects what happened to the refined implementation work.

Active release status reflects what is currently being built and released.

Do not try to make request status mirror every downstream work item status.

## Operating rules

1. Capture rough ideas, bugs, improvements, and migration carry-forwards in `requests.md`.
2. Refine selected requests into actionable work items in `backlog.yml`.
3. Select only the current approved delivery scope in `active-release.md`.
4. Move completed work to `done` status inside `backlog.yml` only when code, tests, docs, or release evidence justify it.
5. Keep old planning documents as optional reference, not as the normal starting point.

## How each role should use this directory

### Human

- Add new requests freely to `requests.md`.
- Approve or reject proposed release scope in `active-release.md`.
- Do not worry about work item status when capturing requests.
- Avoid editing `backlog.yml` unless you want to refine work directly.

### Product Manager

- Review inbox requests and turn them into clear work items.
- When refining a request, mark it `refined`.
- Split large requests into smaller work items where needed.
- Keep acceptance criteria in `backlog.yml` strong enough that agents do not need old phase docs as their first step.
- When selected work items enter `active-release.md`, update the linked request to `in-active-release`.
- After release, update the request to `done` or `partially-done` based on whether the human-facing ask is fully satisfied.
- If only some derived work items shipped, prefer `partially-done` unless the remaining work is clearly out of scope for the original request.
- Propose release candidates from `ready`, `needs-audit`, or `shippable-candidate` work.

### Principal Architect

- Review cross-cutting changes, sequencing, and dependencies.
- Confirm whether architecture, ADRs, or schema constraints change work-item scope.
- Add notes only where architectural guidance materially affects delivery.

### Backend Developer

- Start from `backlog.yml`, not old planning phases.
- Use `evidence` and `acceptance` to identify the real backend work.
- Update status only when implementation and tests justify it.

### Frontend Developer

- Start from `backlog.yml` and the active release.
- Treat `requests.md` as user intent and `backlog.yml` as delivery scope.
- Add UI evidence or remaining gaps back into the backlog when needed.

### Test Engineer

- Verify acceptance criteria from `backlog.yml`.
- Record missing evidence, regression risk, and sign-off state in `active-release.md`.
- Push uncertain items back to `needs-audit` or `needs-test` instead of guessing.

### Release Manager

- Use `active-release.md` as the only current release scope.
- Assign the release version later, once scope is approved.
- Track blockers, sign-off, and release notes draft in `active-release.md`.
- Do not infer release scope from the full backlog.

## Migration notes

- `docs/work-management-model.md` and this directory describe the same operating model.
- `docs/planning/` is still useful for historic detail, but only as a fallback reference.
- `docs/product/prd.md`, relevant architecture docs, ADRs, code, and tests are the primary truth sources for current capability status.

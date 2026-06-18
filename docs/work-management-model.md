# customRisk Work Management Model

## Purpose

This model replaces sprawling planning documents with a small, practical workflow that supports both human thinking and AI-agent delivery.

It exists to answer four simple questions:

1. What have we noticed, wanted, or asked for?
2. What actionable work has the Product Manager refined from those requests?
3. What are we actively building and releasing now?
4. What has shipped?

The goal is to avoid using Markdown planning folders as a pseudo-project-management system while still keeping everything repo-local, agent-readable, and easy to migrate to GitHub Issues later if desired.

---

## Core model

```text
Request → Work item → Active release → Done
```

There are no separate concepts of slices or batches. In this project, a selected group of work items is effectively the active release, because coding sessions normally conclude with a release.

The release version does not need to be known when planning starts. The Release Manager determines the version later, once the release scope is approved.

---

## File structure

```text
docs/work/
  README.md
  requests.md
  backlog.yml
  active-release.md
```

### `requests.md`

Human-friendly intake.

This is where ideas, bugs, annoyances, improvements, security concerns, documentation gaps, and technical debt are captured quickly.

It is intentionally Markdown, not YAML, because it is the file the human is most likely to edit directly.

Requests may be rough. They do not need to be implementation-ready.

### `backlog.yml`

PM-refined work items.

This is the structured backlog that agents work from. The Product Manager turns requests into one or more actionable work items here.

Work items should include enough structure for agents to understand scope, acceptance criteria, dependencies, status, evidence, and likely owners.

This file may later be migrated to GitHub Issues if that becomes useful.

### `active-release.md`

Current coding-session and release scope.

This file describes the approved or proposed release currently being worked on. It should contain the selected work items, release goal, out-of-scope items, status, blockers, required agents, and test/sign-off state.

It should not become a second backlog.

### `README.md`

Operating guide for the work-management model.

It explains how humans and agents should use the files in `docs/work/`.

---

## Request lifecycle

A request is the human-facing capture of something wanted or noticed.

Examples:

- “The custom field modal resets while typing.”
- “I want attachments on risks.”
- “Saved views look mostly done; can we ship them?”
- “The planning docs are too complex.”
- “API keys need hardening before release.”

Requests belong in `requests.md`.

A request can become:

- one backlog work item;
- several backlog work items;
- a duplicate of existing work;
- a deferred idea;
- a rejected/out-of-scope item;
- a request needing human clarification;
- a partially completed request delivered across more than one release;
- a completed request marked with the release version that delivered it.

The human should be able to add requests without thinking about phases, tickets, agents, releases, or architecture.

---

## Work item lifecycle

A work item is an actionable, PM-refined unit of work in `backlog.yml`.

A work item should be clear enough for agents to implement, test, or audit.

A typical work item should include:

- ID
- source request, if any
- title
- type: feature, bug, chore, audit, docs, security, refactor
- capability or area
- status
- priority
- confidence
- summary
- acceptance criteria
- remaining work
- dependencies
- suggested agents
- evidence
- notes
- `done_in` when completed and released

Existing legacy ticket IDs such as `PM11-01` can be preserved as work item IDs where useful.

New work does not need to use the old PM numbering scheme unless there is a reason to maintain continuity.

---

## Active release lifecycle

An active release is the selected group of work items for the next coding session/release.

It lives in `active-release.md`.

The release may start with:

```text
Version: TBD
Release type: TBD
Status: proposed
```

The Release Manager determines the version only after the human approves the release scope.

An active release should include:

- release goal
- selected work item IDs
- out-of-scope items
- required agents
- blockers
- decisions needed
- test/sign-off status
- release status
- version and branch once known

---

## Completion and pruning lifecycle

Planning V3 is not a historical archive.

It is an operating model for work that is still alive, being refined, being delivered, or recently completed.

The durable record of shipped work is:

- `CHANGELOG.md`
- git commits
- release tags
- PR or branch history
- tests
- code
- ADRs where architectural decisions matter

Completed requests and work items may remain in Planning V3 temporarily after a release, but they do not need to stay forever.

### When a release completes

After a release:

1. Update `CHANGELOG.md` with the shipped user-facing and technical changes if not already done.
2. Mark completed work items in `backlog.yml` as `status: done`.
3. Add `done_in` to completed work items once the version is known.
4. Update linked requests in `requests.md`.
5. Mark requests as `done` only when the human-facing ask is fully satisfied.
6. Mark requests as `partially-done` when some meaningful scope remains.
7. Add `Done in:` to `done` and `partially-done` requests.
8. Reset `active-release.md` to no active release.
9. Create or update follow-up requests/work items only for remaining scope that still matters.

### Pruning rule

Periodically prune completed planning artifacts to keep Planning V3 small.

When pruning:

- remove requests with `Status: done` where all `Done in:` versions are older than the chosen cutoff;
- remove backlog items with `status: done` where all `done_in` versions are older than the chosen cutoff;
- do not remove `partially-done`, `deferred`, `blocked`, `needs-audit`, `needs-refinement`, `ready`, or `in-active-release` items;
- do not remove items that still contain unresolved remaining work;
- rely on `CHANGELOG.md`, git history, release tags, tests, and code as the durable record after pruning.

Example pruning request:

```text
Prune Planning V3 items completed before v1.12.0.
Remove done requests and done backlog items only when they have no remaining work and their completion is represented in CHANGELOG.md.
Do not remove partially-done, deferred, blocked, or active items.
```

This keeps `requests.md` and `backlog.yml` focused on current and future work rather than becoming another archive.

## Suggested statuses

### Request statuses

```text
inbox
needs-refinement
refined
in-active-release
partially-done
done
deferred
rejected
duplicate
```

Request status reflects the state of the human-facing ask, not the exact status of every derived work item.

Use:

- `inbox` when the request has been captured but not reviewed.
- `needs-refinement` when the request needs PM clarification, splitting, scoping, or human input before reliable work items exist.
- `refined` when one or more backlog work items exist, but none are currently selected for active delivery.
- `in-active-release` when one or more derived work items are selected in `active-release.md`.
- `partially-done` when some of the request outcome has shipped or is complete, but meaningful scope remains.
- `done` when the request's intended outcome is satisfied.
- `deferred` when the request is valid but not currently planned.
- `rejected` when the request is out of scope or deliberately not being pursued.
- `duplicate` when the request is covered by another request or work item.

When a request is `partially-done` or `done`, include a separate `Done in:` field listing the release version or versions that delivered it. Do not encode the release version inside the status value.

Examples:

```text
Status: done
Done in: v1.10.0
```

```text
Status: partially-done
Done in: v1.10.0
Remaining: Broader reporting/export foundations remain open.
```

### Work item statuses

```text
needs-refinement
ready
needs-audit
shippable-candidate
in-progress
needs-test
blocked
done
deferred
```

For completed work items in `backlog.yml`, keep completion metadata separate from status:

```yaml
status: done
done_in:
  - v1.10.0
```

Use `done_in` only after the Release Manager has assigned the actual release version. Until then, keep the release version as `TBD` in `active-release.md`.

### Active release statuses

```text
none
proposed
approved
branch-created
in-progress
testing
ready-for-release
released
cancelled
```

---

## Human workflow

### Capturing work

The human adds rough notes to `requests.md`.

Do not overthink the format. Capture the thought before it is lost.

Example:

```md
## Custom field modal resets while typing

Type: bug
Priority: near-term

When editing custom field options, the modal seems to reset or re-render and I lose what I was doing.

Notes:
- likely frontend
- may be related to option key handling
- needs regression test
```

### Refining work

Periodically ask the Product Manager to review `requests.md` and update `backlog.yml`.

The Product Manager should:

- classify each request;
- check whether it duplicates existing backlog work;
- split large requests into multiple work items;
- add acceptance criteria;
- identify dependencies;
- mark the request as refined, deferred, rejected, duplicate, or needing clarification.

### Planning a release

Ask the Product Manager to propose an active release from ready or shippable-candidate work items.

The proposed release should be small, coherent, and suitable for one coding session/release.

The human approves or changes the proposed release before implementation starts.

### Delivering a release

Once approved:

1. Release Manager determines version and branch.
2. Required agents are activated.
3. Agents work only on the selected work items.
4. Test Engineer verifies acceptance criteria and tests.
5. Release Manager updates changelog and prepares the PR/release.
6. Completed work items are marked `done` with `done_in` once the release version is known by the Product Manager.
7. Related requests are marked `done` or `partially-done` with `Done in:` as appropriate by the Product Manager

---

## Rules

1. `requests.md` is for rough human intake.
2. `backlog.yml` is for refined agent-readable work.
3. `active-release.md` is the only current delivery scope.
4. There is no separate batch or slice concept.
5. The selected active release may contain one or many work items.
6. Version numbers are assigned by the Release Manager after release scope is approved.
7. A completed request uses `Status: done` plus a separate `Done in:` field.
8. A completed work item uses `status: done` plus a separate `done_in` field.
9. Planning V3 is not a historical archive; old done items should be pruned after their release is recorded in `CHANGELOG.md` and git.
10. If a work item is uncertain, its first action is audit or clarification, not implementation.
11. Keep the model small.

---

## One-line summary

`requests.md` captures what the human wants, `backlog.yml` defines the actionable work, and `active-release.md` controls what agents are building and releasing now.

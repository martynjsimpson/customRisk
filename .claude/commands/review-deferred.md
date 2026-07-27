You are acting as the **Product Manager** for customRisk. This command does one thing: review all deferred requests and backlog items to determine whether any should be reclassified as `blocked` (waiting on a named dependency) or promoted back into active consideration.

This is not a planning session. You will not propose a release, refine requests, or touch `docs/work/active-release.md`.

## Step 1: Collect All Deferred Items

Read `docs/work/requests.md` and `docs/work/backlog.yml`.

Collect:
- All requests with `Status: deferred`
- All backlog work items with `status: deferred`

If none are found, tell the user and stop.

## Step 2: Walk Through Each Item

Present the deferred items to the user in a readable list — ID, title, and any existing notes — and ask them to review each one.

For each item, ask the user to classify it:

> **Keep as deferred** — genuinely parked, no dependency, not being considered right now. Leave as-is.
>
> **Reclassify as blocked** — there is a specific thing that needs to happen first before this can proceed. Ask: "What is it blocked on?" Then update the item with `status: blocked` and add `Blocked on: [answer]` / `blocked_on: [answer]`.
>
> **Promote to inbox/needs-refinement** — actually worth doing now or soon. Move request to `## Inbox / needs refinement` with `Status: needs-refinement`. Move backlog item to `status: needs-refinement`.
>
> **Reject** — no longer relevant or explicitly out of scope. Move request to `## Rejected or duplicate requests` with `Status: rejected`. Update backlog item to `status: deferred` with a rejection note, or remove if it has no history worth keeping.

Work through items conversationally — you do not need to present all of them at once if the list is long. Group by theme if that helps.

## Step 3: Write the Changes

Once the user has classified all items, write all changes in one pass:
- Update `docs/work/requests.md`: move each request to its correct section, update its status, add or remove `Blocked on:` as appropriate
- Update `docs/work/backlog.yml`: update status and `blocked_on` fields as appropriate

Tell the user a summary of what changed: how many stayed deferred, how many became blocked, how many were promoted, how many were rejected.

## Constraints

- Do not touch `docs/work/active-release.md`.
- Do not propose a release or select work items.
- Do not refine requests beyond reclassifying their status.
- Only write to `docs/work/requests.md` and `docs/work/backlog.yml`.

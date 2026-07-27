You are acting as the **Release Manager** for customRisk, running a spike session. A spike session is not a release — it produces investigation documents only. No code ships, no version is bumped, and no release pipeline is triggered.

## What This Command Does

Runs the spike work items defined in `docs/work/active-release.md` sequentially. For each spike, the Principal Architect investigates and writes a document to `docs/spikes/[ITEM-ID].md`. All spikes are committed to a single shared branch and merged via a single PR.

## Step 1: Read Scope and Safety Check

Read `docs/work/active-release.md` to get the selected work items. For each selected item, look up its `type` in `docs/work/backlog.yml`.

**Safety check — stop if the release contains non-spike items.**
If any selected work item has a type other than `spike`, stop immediately and tell the user:

> "This release contains non-spike work items: [list them]. The /spike command only handles spike items. Use /release instead, or ask the PM to separate the spike and non-spike items into separate releases."

Do not proceed until the active release contains only spike items.

If all items are spikes, list them (ID, title, one-line summary) and ask:
> "I found [N] spike(s) in the active release. Run all of them, or specific ones?"

Wait for confirmation before proceeding.

## Step 2: Create the Spike Branch

```bash
git checkout main
git pull origin main
git checkout -b docs/spikes-ITEM-ID1-ITEM-ID2
git push -u origin docs/spikes-ITEM-ID1-ITEM-ID2
```

Name the branch after all spike IDs in this session (e.g. `docs/spikes-SPIKE-006-SPIKE-007`). If the branch already exists, you are resuming an interrupted session — skip the branch creation.

Now commit any uncommitted PM doc changes directly to the new branch. The PM edits these files in Cowork without committing:

```bash
git add docs/work/active-release.md docs/work/backlog.yml docs/work/requests.md
git commit -m "docs: planning docs from PM session"
git push origin docs/spikes-ITEM-ID1-ITEM-ID2
```

Only run this commit if at least one of those files is actually modified — skip it if all are clean.

## Step 3: For Each Spike — Run Sequentially

Complete each spike fully before starting the next. All commits go to the same branch.

### 3a. Brief and spawn the Principal Architect

Spawn the `principal-architect` agent as a subagent with a brief drawn from the spike's entry in `docs/work/active-release.md` — that is where the detailed investigation questions, findings prompts, and acceptance criteria live. Use `docs/work/backlog.yml` only for type/capability metadata not present in `active-release.md`. The brief must include:
- The spike ID and title
- The full investigation question and all specific questions the PA must answer (from `active-release.md`)
- Output location: `docs/spikes/ITEM-ID.md`
- Required structure: the document must contain `## Findings` and `## Recommendations` sections
- Recommendations must be specific enough for the PM to write follow-on backlog items and requests directly from them — not high-level observations, but actionable next steps

Instruct the PA to signal you when the document is written.

### 3b. Verify the document

Once the PA signals complete, confirm:
- [ ] `docs/spikes/ITEM-ID.md` exists
- [ ] Contains a `## Findings` section with substantive content
- [ ] Contains a `## Recommendations` section with actionable next steps

If either section is missing or too thin to act on, ask the PA to complete it before continuing.

### 3c. Commit the document and mark done

```bash
git add docs/spikes/ITEM-ID.md
git commit -m "docs: spike investigation output for ITEM-ID"
git push origin docs/spikes-ITEM-ID1-ITEM-ID2
```

Update the spike item's status in `docs/work/active-release.md` to `done` and add `done_in: docs/spikes-ITEM-ID1-ITEM-ID2`:

```bash
git add docs/work/active-release.md
git commit -m "docs: mark ITEM-ID done"
git push origin docs/spikes-ITEM-ID1-ITEM-ID2
```

Do not touch `docs/work/backlog.yml` — the PM closes out backlog items in the next planning session.

Then move on to the next spike.

## Step 4: Wrap Up

Once all spikes are done, set the top-level `Status` in `docs/work/active-release.md` to `ready-for-release` and commit:

```bash
git add docs/work/active-release.md
git commit -m "docs: mark spike release ready-for-release"
git push origin docs/spikes-ITEM-ID1-ITEM-ID2
```

Raise a single PR for all spikes:

```bash
gh pr create \
  --base main \
  --head docs/spikes-ITEM-ID1-ITEM-ID2 \
  --title "Spikes: ITEM-ID1, ITEM-ID2" \
  --body "Investigation output for spike session.

$(for each spike: **ITEM-ID — ITEM-TITLE:** \`docs/spikes/ITEM-ID.md\`)

Review the Findings and Recommendations in each document. Once merged, run a planning session in Cowork to process the recommendations into backlog items."
```

Return to main. If `docs/work/requests.md` has been modified during the session (e.g. the log skill captured a new request while the spikes were running), stash it first:

```bash
git stash push -- docs/work/requests.md
git checkout main
git pull origin main
git stash pop
```

If `docs/work/requests.md` is not modified, skip the stash and just switch:

```bash
git checkout main
git pull origin main
```

Tell the human the PR link and: "Review and merge when you are ready. Then run a planning session in Cowork — it will pick up the completed spikes and turn the recommendations into backlog items."

## Constraints

- Do not bump version numbers.
- Do not update `CHANGELOG.md`.
- Do not tag or trigger the release pipeline.
- Do not involve the Test Engineer.
- Do not touch `docs/work/backlog.yml` or `docs/work/requests.md` — the PM owns both and closes them out in the next planning session.
- All spikes share one branch and one PR.

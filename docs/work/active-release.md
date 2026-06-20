# Active Release

Status: in-progress
Version: v1.16.0

## Release goal

Maintenance-only release: profile and improve CI/CD pipeline performance, and upgrade the project toolchain to Node 24 LTS.

## Selected work items

### MAINT-004 — Investigate and improve CI/CD pipeline performance
Source: REQ-017
Capability: build-toolchain
Status: selected

**Problem:** The CI/CD pipeline is running slowly and impacting developer velocity. The bottleneck is unknown until profiled.

**Acceptance criteria:**
- The CI/CD pipeline bottlenecks are identified and documented.
- At least one concrete improvement is implemented and validated to reduce build or test time.
- CI remains reliable — no regression to test correctness or deployment safety.

**Implementation note:** Profile the current pipeline first to identify the slowest stages. Evaluate caching, parallelisation, and tooling options. Implement the highest-value improvement and measure the result before signing off.

**Key files:** `.github/workflows`
**Tests:** none (CI reliability is the test)
**Agents:** devops-engineer

---

### MAINT-001 — Upgrade toolchain to Node 24 LTS and tighten package engine constraint
Source: REQ-011
Capability: build-toolchain
Status: selected

**Problem:** Node 24 is the current LTS line (LTS from October 2025). The project toolchain and engines constraint should be updated to target it.

**Acceptance criteria:**
- Root `package.json` engines.node is set to `>=24`.
- `.nvmrc`, GitHub Actions CI, and Dockerfile are updated to Node 24.
- Any workspace `package.json` files with their own engines.node field are updated to match.
- CI, local install, and Docker build all pass after the change.
- No version pinning to a non-LTS Node version.

**Implementation note:** Principal Architect must confirm Node 24 compatibility (check for breaking changes in current dependencies) before the devops-engineer executes the upgrade. This item must be isolated — do not bundle with other work. If anything breaks as a result of the upgrade, the relevant agent (Backend Developer, Frontend Developer, etc.) should be started to investigate and fix before the release is signed off.

**Key files:** `package.json`, `.nvmrc`, `.github/workflows`, `Dockerfile`, `backend/package.json`, `frontend/package.json`
**Tests:** full CI pass required
**Agents:** principal-architect, devops-engineer (+ relevant fix agents if breakage occurs)

---

## Required agents

- devops-engineer (MAINT-004, MAINT-001)
- principal-architect (MAINT-001 compatibility confirmation)
- additional agents (Backend Developer, Frontend Developer, Test Engineer) only if MAINT-001 causes breakage

## Decisions

- **MAINT-001 breakage handling** → If the Node 24 upgrade causes anything to break, the relevant agent is started to investigate and fix before the release is signed off. The release does not ship with known breakage.
- **MAINT-001 sequencing** → Principal Architect confirms Node 24 compatibility before devops-engineer executes. PA confirmation is a gate, not a parallel step.
- **Release isolation** → MAINT-001 is intentionally isolated in this release. No other work items should be added to this session.

## Test / sign-off

- [ ] MAINT-004: pipeline improvement implemented and measured
- [ ] MAINT-001: PA compatibility sign-off received
- [ ] MAINT-001: all toolchain files updated to Node 24
- [ ] Full CI pass clean after Node 24 upgrade
- [ ] No regressions introduced

## Blockers

None. Both items are unblocked.

---
*PM: populate this file when proposing a release. Release Manager: update status and completion metadata during and after the release.*

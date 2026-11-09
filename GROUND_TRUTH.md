# Macsense-2 — Ground Truth

**Last verified:** 2026-11-01 (live API state; audit evidence 2026-10-29; merge-train evidence 2026-11-01)
**Canonical branch:** main @ 0b62de1849
**Repository state: UNARCHIVED (verified live 2026-11-04: `archived` = false; the archive recorded below has been lifted)**

> **Delivery note (historical):** this refresh was prepared
> while the repository was archived and read-only, and was
> delivered locally with the 2026-11-01 refresh-pass report
> (`~/workspace/estate-audit/GROUND-TRUTH-REFRESH-PASS-2026-11-01.md`).
> It has since landed in-repo (the post-unarchive landing); the
> repository is unarchived as of the 2026-11-04 live check.

## What this repo is

MacSense creator product trio: an Android app (the "Ari" assistant
client — DAW/mastering view models, FlowCapture, Gemini flows), a
gateway server, and a web studio (static + node tests). A codebase
distinct from macsense-ari; per its own record, the pair's
monetization/disposition decision was intentionally deferred by
Savage.

## The archive — unexplained

This repository was **archived at the account level** when the
2026-11-01 pass recorded it. No D1–D12 ruling archives it (D2
archived durak only), and the 2026-11-01 merge train treated it
as a live repo. The archive's origin is not in any record
available to this pass. **Update 2026-11-04: the repository is
unarchived (live `archived` = false)** — the question of the
archive's origin remains as recorded; the state itself is
resolved.

## Verified current state

- **Head:** `0b62de1849`. Tree = 316 blobs.
- **Tests (audit-run, Lane D):** web **44/44** — once the static
  server is running (`npm run serve`, port 4173, an undocumented
  precondition; without it the smoke test fails ECONNREFUSED — a
  harness precondition, not a code defect). Server **7/7** incl.
  build.
  *Install record — reconciled 2026-11-09 (M-3):* the corrections
  appendix recorded an install `ci_rc=1` against a dossier line
  claiming rc=0 for one install path; neither source record is
  preserved in this repo, so the path was rerun against the
  current tree. Every install path the tree defines returns
  rc=0: `web/` `npm install` rc=0 and `server/` `npm ci` rc=0
  (direct reruns, 2026-11-09, with web tests 44/44 and server
  tests 7/7 passing on the installed trees), and the
  Android/Gradle path's CI job (`build-test`, incl. Gradle
  setup and dependency resolution) is recorded **success** at
  the current head (check runs, 2026-11-04 batch, read via
  API). The dossier's rc=0 is the record that matches the tree;
  the appendix's `ci_rc=1` is not reproducible on any install
  path and is superseded. The one failing job in that CI batch
  is `release`, which failed at *Assemble release APK
  (unsigned)* — a build step, not an install step (carried
  under M-2).
- **Android: NOT RUN** — no Java/Android SDK in the audit
  environment. The Android surface is CODED only.
- The gateway refuses to start without GEMINI_API_KEY.

## Known defects / honest gaps

- Nothing deployed is evidenced (vercel.json + Dockerfile exist;
  live state UNREACHED).
- Products ON now: 0 customer-usable.

## Merged in the 2026-11-01 train

Nothing — the train parked this repo's only open PR (below).

## Parked PRs

- **#92** — "Merge systems integration into main." CI green (11
  checks), diff read in full by the train, mergeable — but the
  merge API returned 404: branch protection blocks this token, and
  the branch's vercel.json build/install-command removals need
  author confirmation. (The archived-state sentence that stood
  here is superseded: the repo is unarchived, verified live
  2026-11-04, and #92 remains open, unmerged.) Unblock:
  protection change or UI merge + vercel.json confirmation —
  the vercel.json ruling is Savage's.

## Where it is going

No direction ruled by Savage for this repo. The open fork is
PR #92's vercel.json change (Savage's ruling); the archive
question above is closed as a state matter.

## Verification ledger (added 2026-11-09)

The M-3 dispute above happened because this repo kept no durable
record of its own verification: two documents disagreed and neither
source record survived in-repo. That class of dispute is now
settled by reading the tree. `verification/ledger.jsonl` is an
append-only, machine-readable ledger — one JSON entry per
measurement, each recording surface (`web`/`server`/`android`),
job, workflow run id, commit, timestamp, per-step outcomes, the
suite counts the job itself measured (or `null` when no count was
preserved — never reconstructed), and a `source` field
(`ci`, `ci-evidence`, `local`, `local-reconciliation`) so
provenance is never blurred.

- **Writers:** the `verification-ledger` job in
  `.github/workflows/ci.yml` (android) and
  `.github/workflows/web-ci.yml` (web, server) runs after the
  measured jobs on pushes to `main` and commits the appended
  ledger back with the built-in `GITHUB_TOKEN` — the write grant
  (`contents: write`) is scoped to that job only (in `web-ci.yml`
  it overrides the workflow-wide `contents: read` for that job
  alone). The recording can never fail the build it records: the
  entry builder warns instead of throwing, the job is
  `continue-on-error`, and the commit step exits 0 even if the
  push cannot land. Failed jobs are recorded faithfully as
  failures. Gateway behavior is untouched by this machinery.
- **Reader:** `node verification/read-ledger.mjs` renders the
  latest state per surface/job; `--check` exits 1 when any
  surface's latest entry is a failure. Fixture tests:
  `node --test verification/read-ledger.test.mjs`. Full format
  documentation: `verification/README.md`.
- **Seed (2026-11-09):** the first entries record the M-3
  reconciliation state — web 44/44 and server 7/7 measured
  locally on the post-M-3 tree (`local-reconciliation`), and the
  android jobs from CI check-run evidence at `719c066a`
  (`ci-evidence`: `build-test` success; `release` failure at
  *Assemble release APK (unsigned)*, the M-2 item). The ledger's
  first recorded failure is therefore deliberate: the record says
  what is true. As of the seed, `read-ledger.mjs --check` exits 1
  on android/release — that is M-2's state, not a ledger defect.
- Not wired: `azure-webapp.yml` and
  `vercel-production-deploy.yml` also execute the web suite as
  part of deployment; the ledger's web surface is recorded by
  Web Studio CI on the push to `main` that precedes any deploy
  of that commit.

## Estate rule

Update this file after any significant repo change. No claims without verification.

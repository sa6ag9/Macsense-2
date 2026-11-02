# Macsense-2 — Ground Truth

**Last verified:** 2026-11-01 (live API state; audit evidence 2026-10-29; merge-train evidence 2026-11-01)
**Canonical branch:** main @ 0b62de1849
**Repository state: ARCHIVED at the account level (read-only)**

> **Delivery note:** because this repository is archived and
> read-only, this refresh could not be delivered by pull request.
> It is delivered locally with the 2026-11-01 refresh-pass report
> (`~/workspace/estate-audit/GROUND-TRUTH-REFRESH-PASS-2026-11-01.md`)
> and takes effect in-repo if/when the repo is unarchived.

## What this repo is

MacSense creator product trio: an Android app (the "Ari" assistant
client — DAW/mastering view models, FlowCapture, Gemini flows), a
gateway server, and a web studio (static + node tests). A codebase
distinct from macsense-ari; per its own record, the pair's
monetization/disposition decision was intentionally deferred by
Savage.

## The archive — unexplained

This repository is **archived at the account level**. No D1–D12
ruling archives it (D2 archived durak only), and the 2026-11-01
merge train treated it as a live repo. The archive's origin is not
in any record available to this pass. Flagged for Savage: archive
by intent, or by accident?

## Verified current state

- **Head:** `0b62de1849`. Tree = 316 blobs.
- **Tests (audit-run, Lane D):** web **44/44** — once the static
  server is running (`npm run serve`, port 4173, an undocumented
  precondition; without it the smoke test fails ECONNREFUSED — a
  harness precondition, not a code defect). Server **7/7** incl.
  build.
  *Carried labeled:* the corrections appendix records an install
  `ci_rc=1` against a dossier line claiming rc=0 for one install
  path — recorded, not reconciled.
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
  author confirmation. While the repo is archived, merges are
  impossible regardless. Unblock: unarchive (Savage's call) +
  protection change or UI merge + vercel.json confirmation.

## Where it is going

No direction ruled by Savage for this repo. The archive question
above is the open fork.

## Estate rule

Update this file after any significant repo change. No claims without verification.

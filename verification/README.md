# Verification ledger

`ledger.jsonl` is this repo's durable, in-tree record of what has
actually been executed, when, and with what outcome — one JSON object
per line, append-only. It exists so a dispute like the M-3 install
record (two documents, two answers, neither source preserved) is
settled by reading the tree instead of reconstructing history.

## Entry shape (schema 1)

| field | meaning |
|---|---|
| `ts` | ISO-8601 timestamp of the measurement |
| `source` | `ci` (appended by a workflow), `ci-evidence` (seeded from check-run evidence read via the API), `local` / `local-reconciliation` (measured on a workstation) — provenance is never blurred |
| `surface` | `web`, `server`, or `android` |
| `workflow`, `job` | the CI workflow/job, or the local equivalent |
| `run_id` | GitHub Actions run id, or `null` for local entries |
| `commit` | the commit the measurement ran against |
| `result` | `success` or `failure` |
| `steps` | per-step `{name, outcome}` (`success`/`failure`/`cancelled`/`skipped`) |
| `counts` | `{tests, passed, failed}` as measured by the job, or `null` when no count was preserved — never reconstructed or hand-written |
| `notes` | free text (preconditions, evidence granularity, caveats) |

## Who writes it

- CI: the `verification-ledger` job in `.github/workflows/ci.yml`
  (android) and `.github/workflows/web-ci.yml` (web, server) runs after
  the measured jobs on pushes to `main`, builds entries with
  `build-entry.mjs` from the job results, step outcomes and parsed
  test counts, and commits the appended ledger back with the built-in
  `GITHUB_TOKEN` (that job only: `contents: write`). The recording
  step never fails the build it records — a recording problem is a
  `::warning`, not a red build.
- By hand (rare): `node verification/append-entry.mjs <entry.json>`
  validates and appends one entry; invalid entries are refused and
  the ledger is left unchanged.

## Who reads it

```sh
node verification/read-ledger.mjs           # latest state per surface/job
node verification/read-ledger.mjs --check   # exit 1 if any latest entry is a failure
node --test verification/read-ledger.test.mjs   # fixture tests for the machinery
```

The seeded first entries (2026-11-09) record the M-3 reconciliation
state: web 44/44 and server 7/7 measured locally on the post-M-3
tree, and the android jobs from CI check-run evidence at commit
`719c066a` (build-test success; release failing at *Assemble release
APK (unsigned)* — defect M-2). Android release is therefore the
ledger's first recorded failure, on purpose: the record says what
is true, not what is comfortable.

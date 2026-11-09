// Builds one ledger entry from environment variables and appends it.
// This is the CI entry point: the verification-ledger jobs in
// .github/workflows/ci.yml and .github/workflows/web-ci.yml set the
// variables below from the workflow/job contexts and call this script
// once per measured job.
//
// Required env: SURFACE, JOB, RESULT (a GitHub job result: success |
// failure | cancelled | skipped — anything other than "success" is
// recorded as a failure; the per-step outcomes keep the detail).
// Optional env: WORKFLOW, RUN_ID, COMMIT, STEPS_JSON (JSON array of
// {name, outcome}), COUNTS_JSON (JSON object {tests, passed, failed}
// or empty), NOTES, LEDGER_PATH.
//
// Exit code is always 0 unless the entry itself cannot be built: the
// ledger records builds, it must never fail the build it records. A
// problem is surfaced as a ::warning annotation instead.

import { appendEntry, defaultLedgerPath } from './lib.mjs';

function parseJsonEnv(name) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return null;
  return JSON.parse(raw);
}

function main() {
  try {
    const steps = parseJsonEnv('STEPS_JSON') || [];
    const counts = parseJsonEnv('COUNTS_JSON');
    const entry = {
      schema: 1,
      ts: new Date().toISOString(),
      source: 'ci',
      surface: process.env.SURFACE,
      workflow: process.env.WORKFLOW || null,
      job: process.env.JOB,
      run_id: process.env.RUN_ID ? Number(process.env.RUN_ID) : null,
      commit: process.env.COMMIT,
      result: process.env.RESULT === 'success' ? 'success' : 'failure',
      steps,
      counts,
      notes: process.env.NOTES || '',
    };
    appendEntry(process.env.LEDGER_PATH || defaultLedgerPath(), entry);
    console.log(`ledger: recorded ${entry.surface}/${entry.job} ${entry.result} for run ${entry.run_id}`);
  } catch (err) {
    console.log(`::warning::verification ledger entry was not recorded: ${err.message}`);
  }
}

main();

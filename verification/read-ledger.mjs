// Renders the verification ledger into a human summary.
//
// Usage:
//   node verification/read-ledger.mjs [--ledger <path>] [--check]
//
// Prints the latest recorded state per (surface, job): result, suite
// counts where the job measured them, when, from what source, and at
// which commit. With --check, exits 1 when any surface's latest entry
// for a job is a failure (or the ledger has no valid entries) — so the
// tree's own record can gate a claim about the repo's state.

import { defaultLedgerPath, failingLatest, latestByJob, readLedger } from './lib.mjs';

function parseArgs(argv) {
  const args = { ledger: process.env.LEDGER_PATH || defaultLedgerPath(), check: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--ledger') {
      args.ledger = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--check') {
      args.check = true;
    }
  }
  return args;
}

function describe(entry) {
  const counts = entry.counts
    ? `tests ${entry.counts.passed}/${entry.counts.tests} passed`
    : 'tests not counted';
  const failedStep = entry.steps.find((s) => s.outcome === 'failure');
  const failNote = entry.result === 'failure' && failedStep
    ? ` — failed step: ${failedStep.name}`
    : '';
  return `${entry.result.toUpperCase()}  ${counts}${failNote}  ${entry.ts}  (${entry.source})  @${entry.commit.slice(0, 8)}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { entries, malformed } = readLedger(args.ledger);
  console.log(`Macsense-2 verification ledger — ${args.ledger}`);
  if (entries.length === 0) {
    console.log('no valid entries recorded');
  } else {
    const stamps = entries.map((e) => e.ts).sort();
    console.log(`${entries.length} entries, ${stamps[0]} .. ${stamps[stamps.length - 1]}`);
    console.log('latest state per surface/job:');
    for (const entry of latestByJob(entries)) {
      console.log(`  ${entry.surface.padEnd(8)} ${entry.job.padEnd(14)} ${describe(entry)}`);
    }
  }
  if (malformed.length > 0) {
    console.log(`warning: ${malformed.length} malformed line(s) skipped (lines: ${malformed.map((m) => m.line).join(', ')})`);
  }
  if (args.check) {
    const failing = failingLatest(entries);
    if (entries.length === 0) {
      console.log('CHECK FAILED: ledger has no valid entries');
      process.exit(1);
    }
    if (failing.length > 0) {
      for (const entry of failing) {
        console.log(`CHECK FAILED: latest ${entry.surface}/${entry.job} entry is a failure (${entry.ts}, ${entry.source})`);
      }
      process.exit(1);
    }
    console.log('CHECK PASSED: every surface/job latest entry is a success');
  }
}

main();

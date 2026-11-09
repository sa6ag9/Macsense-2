// Appends one validated entry to the verification ledger.
//
// Usage:
//   node verification/append-entry.mjs <entry.json> [--ledger <path>]
//   cat <entry.json> | node verification/append-entry.mjs - [--ledger <path>]
//
// The ledger path defaults to verification/ledger.jsonl next to this
// script; LEDGER_PATH in the environment overrides it (used by the
// fixture dry-run in verification/read-ledger.test.mjs).
// Exits non-zero and leaves the ledger unchanged on an invalid entry.

import { readFileSync } from 'node:fs';
import { appendEntry, defaultLedgerPath } from './lib.mjs';

function parseArgs(argv) {
  const args = { input: null, ledger: process.env.LEDGER_PATH || defaultLedgerPath() };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--ledger') {
      args.ledger = argv[i + 1];
      i += 1;
    } else if (args.input === null) {
      args.input = argv[i];
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    console.error('usage: node verification/append-entry.mjs <entry.json|-> [--ledger <path>]');
    process.exit(2);
  }
  const raw = args.input === '-' ? readFileSync(0, 'utf8') : readFileSync(args.input, 'utf8');
  let entry;
  try {
    entry = JSON.parse(raw);
  } catch (err) {
    console.error(`append-entry: input is not valid JSON: ${err.message}`);
    process.exit(1);
  }
  try {
    appendEntry(args.ledger, entry);
  } catch (err) {
    console.error(`append-entry: ${err.message}`);
    process.exit(1);
  }
  console.log(`appended: ${entry.ts} ${entry.surface}/${entry.job} ${entry.result} (${entry.source})`);
}

main();

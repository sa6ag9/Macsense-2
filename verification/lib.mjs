// Shared validation/parsing for the Macsense-2 verification ledger.
//
// The ledger (verification/ledger.jsonl) is the repo's durable record of
// what has actually been executed, when, and with what outcome — one JSON
// object per line, append-only. See verification/README.md and the
// "Verification ledger" section of GROUND_TRUTH.md.

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA = 1;
export const SURFACES = ['web', 'server', 'android'];
export const SOURCES = ['ci', 'ci-evidence', 'local', 'local-reconciliation'];
export const RESULTS = ['success', 'failure'];
export const OUTCOMES = ['success', 'failure', 'cancelled', 'skipped'];

export function defaultLedgerPath() {
  return join(dirname(fileURLToPath(import.meta.url)), 'ledger.jsonl');
}

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.length > 0;
}

// Returns a list of problems with the entry; an empty list means valid.
export function validateEntry(entry) {
  const problems = [];
  if (!isPlainObject(entry)) return ['entry is not a JSON object'];
  if (entry.schema !== SCHEMA) problems.push(`schema must be ${SCHEMA}`);
  if (!isNonEmptyString(entry.ts) || Number.isNaN(Date.parse(entry.ts))) {
    problems.push('ts must be an ISO-8601 timestamp string');
  }
  if (!SOURCES.includes(entry.source)) {
    problems.push(`source must be one of: ${SOURCES.join(', ')}`);
  }
  if (!SURFACES.includes(entry.surface)) {
    problems.push(`surface must be one of: ${SURFACES.join(', ')}`);
  }
  if (!(entry.workflow === null || isNonEmptyString(entry.workflow))) {
    problems.push('workflow must be a non-empty string or null');
  }
  if (!isNonEmptyString(entry.job)) problems.push('job must be a non-empty string');
  if (!(entry.run_id === null || (Number.isInteger(entry.run_id) && entry.run_id > 0))) {
    problems.push('run_id must be a positive integer or null');
  }
  if (!(typeof entry.commit === 'string' && /^[0-9a-f]{7,40}$/i.test(entry.commit))) {
    problems.push('commit must be a hex SHA (7-40 chars)');
  }
  if (!RESULTS.includes(entry.result)) {
    problems.push(`result must be one of: ${RESULTS.join(', ')}`);
  }
  if (!Array.isArray(entry.steps)) {
    problems.push('steps must be an array');
  } else {
    entry.steps.forEach((step, i) => {
      if (!isPlainObject(step) || !isNonEmptyString(step.name) || !OUTCOMES.includes(step.outcome)) {
        problems.push(`steps[${i}] must be {name: string, outcome: ${OUTCOMES.join('|')}}`);
      }
    });
  }
  if (!(entry.counts === null || (
    isPlainObject(entry.counts)
    && Number.isInteger(entry.counts.tests) && entry.counts.tests >= 0
    && Number.isInteger(entry.counts.passed) && entry.counts.passed >= 0
    && Number.isInteger(entry.counts.failed) && entry.counts.failed >= 0
    && entry.counts.passed + entry.counts.failed <= entry.counts.tests
  ))) {
    problems.push('counts must be null or {tests, passed, failed} non-negative integers with passed+failed <= tests');
  }
  if (!(entry.notes === undefined || typeof entry.notes === 'string')) {
    problems.push('notes must be a string when present');
  }
  return problems;
}

// Validates and appends one entry as a single JSONL line. Throws on an
// invalid entry (the ledger file is left unchanged in that case).
export function appendEntry(ledgerPath, entry) {
  const problems = validateEntry(entry);
  if (problems.length > 0) {
    throw new Error(`invalid ledger entry: ${problems.join('; ')}`);
  }
  appendFileSync(ledgerPath, `${JSON.stringify(entry)}\n`, 'utf8');
  return entry;
}

// Parses a ledger file. Malformed lines are collected, not fatal: the
// ledger is evidence, and one damaged line must not erase the rest.
export function readLedger(ledgerPath) {
  const entries = [];
  const malformed = [];
  if (!existsSync(ledgerPath)) return { entries, malformed };
  const lines = readFileSync(ledgerPath, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    if (line.trim() === '') return;
    try {
      const parsed = JSON.parse(line);
      const problems = validateEntry(parsed);
      if (problems.length > 0) {
        malformed.push({ line: idx + 1, error: problems.join('; ') });
      } else {
        entries.push(parsed);
      }
    } catch (err) {
      malformed.push({ line: idx + 1, error: err.message });
    }
  });
  return { entries, malformed };
}

// Groups entries by (surface, job); latest wins by append order (the
// ledger is append-only, so file order is the order evidence arrived).
export function latestByJob(entries) {
  const map = new Map();
  for (const entry of entries) {
    map.set(`${entry.surface}/${entry.job}`, entry);
  }
  return [...map.values()].sort((a, b) => (
    a.surface === b.surface ? a.job.localeCompare(b.job) : a.surface.localeCompare(b.surface)
  ));
}

// Surfaces whose latest recorded job state includes a failure.
export function failingLatest(entries) {
  return latestByJob(entries).filter((entry) => entry.result === 'failure');
}

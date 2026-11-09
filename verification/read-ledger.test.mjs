// Fixture tests for the verification ledger machinery.
// Run: node --test verification/read-ledger.test.mjs
// (Name the file: the sibling scripts are CLIs that run on load.)
// Uses throwaway fixture ledgers in a temp dir; the real ledger is
// only read once (last test) to prove the seeded entries are valid.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { appendEntry, readLedger, validateEntry } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));

function entry(overrides = {}) {
  return {
    schema: 1,
    ts: '2026-11-09T00:00:00Z',
    source: 'local',
    surface: 'web',
    workflow: null,
    job: 'web-test',
    run_id: null,
    commit: '0123456789abcdef0123456789abcdef01234567',
    result: 'success',
    steps: [{ name: 'npm test', outcome: 'success' }],
    counts: { tests: 44, passed: 44, failed: 0 },
    notes: 'fixture',
    ...overrides,
  };
}

function fixtureLedger(t, entries) {
  const dir = mkdtempSync(join(tmpdir(), 'macsense-ledger-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'ledger.jsonl');
  writeFileSync(path, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return path;
}

function runReader(ledgerPath, extraArgs = []) {
  try {
    const out = execFileSync(
      process.execPath,
      [join(here, 'read-ledger.mjs'), '--ledger', ledgerPath, ...extraArgs],
      { encoding: 'utf8' },
    );
    return { code: 0, out };
  } catch (err) {
    return { code: err.status, out: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

test('validateEntry accepts a well-formed entry and rejects bad shapes', () => {
  assert.deepEqual(validateEntry(entry()), []);
  assert.ok(validateEntry(entry({ result: 'green' })).length > 0);
  assert.ok(validateEntry(entry({ surface: 'ios' })).length > 0);
  assert.ok(validateEntry(entry({ counts: { tests: 3, passed: 4, failed: 0 } })).length > 0);
  assert.ok(validateEntry(entry({ commit: 'not-a-sha!' })).length > 0);
});

test('append + reader round-trip on a fixture ledger', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'macsense-ledger-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'ledger.jsonl');
  appendEntry(path, entry());
  appendEntry(path, entry({ ts: '2026-11-09T01:00:00Z', result: 'failure', counts: { tests: 44, passed: 43, failed: 1 } }));
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
  const { out } = runReader(path);
  assert.match(out, /2 entries/);
  assert.match(out, /web\s+web-test\s+FAILURE/); // latest wins
});

test('appendEntry refuses an invalid entry and leaves the file unchanged', (t) => {
  const path = fixtureLedger(t, [entry()]);
  const before = readFileSync(path, 'utf8');
  assert.throws(() => appendEntry(path, entry({ result: 'green' })), /invalid ledger entry/);
  assert.equal(readFileSync(path, 'utf8'), before);
});

test('reader --check fails on a latest failure and passes once superseded', (t) => {
  const failing = fixtureLedger(t, [entry({ result: 'failure' })]);
  assert.equal(runReader(failing, ['--check']).code, 1);

  const recovered = fixtureLedger(t, [
    entry({ result: 'failure', ts: '2026-11-09T00:00:00Z' }),
    entry({ result: 'success', ts: '2026-11-09T02:00:00Z' }),
  ]);
  const res = runReader(recovered, ['--check']);
  assert.equal(res.code, 0, res.out);
  assert.match(res.out, /CHECK PASSED/);
});

test('reader reports malformed lines without losing the valid entries', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'macsense-ledger-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'ledger.jsonl');
  writeFileSync(path, `${JSON.stringify(entry())}\nnot json\n`);
  const { entries, malformed } = readLedger(path);
  assert.equal(entries.length, 1);
  assert.equal(malformed.length, 1);
  assert.match(runReader(path).out, /1 malformed line/);
});

test('the seeded in-repo ledger is valid and covers web, server and android', () => {
  const { entries, malformed } = readLedger(join(here, 'ledger.jsonl'));
  assert.equal(malformed.length, 0);
  const surfaces = new Set(entries.map((e) => e.surface));
  assert.deepEqual([...surfaces].sort(), ['android', 'server', 'web']);
  for (const e of entries) assert.deepEqual(validateEntry(e), []);
});

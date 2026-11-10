"use strict";

/**
 * End-to-end fail-closed proof for the gateway (audit M-1).
 *
 * Boots the real compiled server (dist/index.js) as a child process with a
 * controlled environment and probes it over HTTP:
 *  - production mode without MACSENSE_CLIENT_TOKEN: the process must refuse
 *    to start (non-zero exit, nothing listening);
 *  - loopback development mode without a token: the server starts, /health
 *    answers (declared ungated), and POST /v1/ari/chat is refused 503
 *    gate_not_configured for missing, wrong, and malformed bearer values —
 *    no request ever reaches the Gemini upstream.
 *
 * A per-test upstream is never contacted: the tokenless cases are refused at
 * the gate, before the route handler runs.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const serverRoot = path.join(__dirname, "..");
const entry = path.join(serverRoot, "dist", "index.js");

function startServer(env) {
  const child = spawn(process.execPath, [entry], {
    cwd: serverRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  let err = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (err += d));
  return { child, output: () => out + err };
}

async function waitForListening(server, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.output().includes("listening on")) return;
    if (server.child.exitCode !== null) {
      throw new Error(`server exited early (${server.child.exitCode}): ${server.output()}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`server did not start in time: ${server.output()}`);
}

async function waitForExit(child, timeoutMs = 10000) {
  if (child.exitCode !== null) return child.exitCode;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("child did not exit in time")), timeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

test("gateway: production without MACSENSE_CLIENT_TOKEN refuses to start", async () => {
  const server = startServer({
    GEMINI_API_KEY: "test-key",
    NODE_ENV: "production",
    PORT: "18931",
    MACSENSE_WEB_ROOT: "/nonexistent-web-root",
  });
  try {
    const code = await waitForExit(server.child);
    assert.notEqual(code, 0, "expected non-zero exit in production without a client token");
    assert.match(server.output(), /MACSENSE_CLIENT_TOKEN/);
    assert.doesNotMatch(server.output(), /listening on/);
  } finally {
    server.child.kill();
  }
});

test("gateway: tokenless loopback server refuses /v1/ari/chat with 503, /health stays open", async () => {
  const port = "18932";
  const server = startServer({
    GEMINI_API_KEY: "test-key",
    PORT: port,
    MACSENSE_WEB_ROOT: "/nonexistent-web-root",
  });
  try {
    await waitForListening(server);
    const base = `http://127.0.0.1:${port}`;

    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok", service: "macsense-studio" });

    const body = JSON.stringify({ contents: [{ parts: [{ text: "probe" }] }] });
    for (const headers of [
      {},
      { authorization: "Bearer definitely-wrong" },
      { authorization: "not-a-bearer-header" },
    ]) {
      const res = await fetch(`${base}/v1/ari/chat`, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body,
      });
      assert.equal(res.status, 503, `headers ${JSON.stringify(headers)} must be refused`);
      assert.deepEqual(await res.json(), {
        error: "Client token gate is not configured",
        code: "gate_not_configured",
      });
    }
  } finally {
    server.child.kill();
    await waitForExit(server.child).catch(() => {});
  }
});

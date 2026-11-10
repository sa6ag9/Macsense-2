"use strict";

/**
 * Real validation for server/src/config.ts (compiled to dist/config.js).
 *
 * config.ts calls requireEnv("GEMINI_API_KEY") at import time, so every case runs in a
 * child process with a deliberately controlled environment (process.env is NOT inherited,
 * guaranteeing the variable under test is exactly what each case sets).
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const serverRoot = path.join(__dirname, "..");
const configPath = path.join(serverRoot, "dist", "config.js");

function loadConfig(env) {
  const script = `
    const { config } = require(${JSON.stringify(configPath)});
    process.stdout.write(JSON.stringify(config));
  `;
  return spawnSync(process.execPath, ["-e", script], {
    cwd: serverRoot,
    env,
    encoding: "utf8",
  });
}

test("config: loads with defaults when only GEMINI_API_KEY is set", () => {
  const result = loadConfig({ GEMINI_API_KEY: "test-key" });
  assert.equal(result.status, 0, `expected clean exit, got ${result.status}: ${result.stderr}`);
  const config = JSON.parse(result.stdout);
  assert.equal(config.port, 8787);
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.geminiApiKey, "test-key");
  assert.equal(config.geminiModel, "gemini-2.0-flash");
  assert.deepEqual(config.corsOrigins, []);
  assert.equal(config.clientToken, "");
  assert.equal(config.rateLimitMax, 30);
  assert.equal(config.rateLimitWindowMs, 60000);
});

test("config: parses explicit overrides, CORS list, and trims client token", () => {
  const result = loadConfig({
    GEMINI_API_KEY: "test-key",
    PORT: "9000",
    GEMINI_MODEL: "gemini-custom",
    CORS_ORIGINS: "https://a.example, https://b.example ,, ",
    MACSENSE_CLIENT_TOKEN: "  spaced-token  ",
    RATE_LIMIT_MAX: "60",
    RATE_LIMIT_WINDOW_MS: "120000",
  });
  assert.equal(result.status, 0, `expected clean exit, got ${result.status}: ${result.stderr}`);
  const config = JSON.parse(result.stdout);
  assert.equal(config.port, 9000);
  assert.equal(config.geminiModel, "gemini-custom");
  assert.deepEqual(config.corsOrigins, ["https://a.example", "https://b.example"]);
  assert.equal(config.clientToken, "spaced-token");
  assert.equal(config.rateLimitMax, 60);
  assert.equal(config.rateLimitWindowMs, 120000);
});

test("config: refuses to boot without GEMINI_API_KEY", () => {
  const result = loadConfig({});
  assert.notEqual(result.status, 0, "expected non-zero exit when GEMINI_API_KEY is unset");
  assert.match(result.stderr, /Missing required environment variable: GEMINI_API_KEY/);
});

test("config: refuses to boot with a blank GEMINI_API_KEY", () => {
  const result = loadConfig({ GEMINI_API_KEY: "   " });
  assert.notEqual(result.status, 0, "expected non-zero exit for blank GEMINI_API_KEY");
  assert.match(result.stderr, /Missing required environment variable: GEMINI_API_KEY/);
});

test("config: production without MACSENSE_CLIENT_TOKEN refuses to boot (audit M-1 fail closed)", () => {
  const result = loadConfig({ GEMINI_API_KEY: "test-key", NODE_ENV: "production" });
  assert.notEqual(result.status, 0, "expected non-zero exit in production without a client token");
  assert.match(result.stderr, /Missing required environment variable: MACSENSE_CLIENT_TOKEN/);
});

test("config: production with a blank MACSENSE_CLIENT_TOKEN refuses to boot (audit M-1)", () => {
  const result = loadConfig({
    GEMINI_API_KEY: "test-key",
    NODE_ENV: "production",
    MACSENSE_CLIENT_TOKEN: "   ",
  });
  assert.notEqual(result.status, 0, "expected non-zero exit for a blank client token in production");
  assert.match(result.stderr, /Missing required environment variable: MACSENSE_CLIENT_TOKEN/);
});

test("config: production with MACSENSE_CLIENT_TOKEN set boots and carries the token", () => {
  const result = loadConfig({
    GEMINI_API_KEY: "test-key",
    NODE_ENV: "production",
    MACSENSE_CLIENT_TOKEN: "prod-token",
  });
  assert.equal(result.status, 0, `expected clean exit, got ${result.status}: ${result.stderr}`);
  const config = JSON.parse(result.stdout);
  assert.equal(config.clientToken, "prod-token");
});

test("config: non-loopback HOST without a client token refuses to boot (audit M-1)", () => {
  const result = loadConfig({ GEMINI_API_KEY: "test-key", HOST: "0.0.0.0" });
  assert.notEqual(result.status, 0, "expected non-zero exit for a tokenless non-loopback bind");
  assert.match(result.stderr, /Refusing to start: HOST=0\.0\.0\.0 is not a loopback address/);
});

test("config: explicit HOST override is honored when a client token is set", () => {
  const result = loadConfig({
    GEMINI_API_KEY: "test-key",
    HOST: "0.0.0.0",
    MACSENSE_CLIENT_TOKEN: "tok",
  });
  assert.equal(result.status, 0, `expected clean exit, got ${result.status}: ${result.stderr}`);
  const config = JSON.parse(result.stdout);
  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.clientToken, "tok");
});

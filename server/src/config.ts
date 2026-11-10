import * as dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : fallback;
}

export const config = {
  port: parseInt(optionalEnv("PORT", "8787"), 10),
  host: optionalEnv("HOST", "127.0.0.1"),
  geminiApiKey: requireEnv("GEMINI_API_KEY"),
  geminiModel: optionalEnv("GEMINI_MODEL", "gemini-2.0-flash"),
  corsOrigins: optionalEnv("CORS_ORIGINS", "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0),
  clientToken: (function (): string {
    const token = process.env.MACSENSE_CLIENT_TOKEN?.trim() || "";
    if (token) {
      return token;
    }
    if (process.env.NODE_ENV === "production") {
      // Fail closed (audit M-1): in production the client-token gate must be
      // configured. Without it, requireClientToken would be a no-op and
      // /v1/ari/chat would be a publicly reachable proxy spending the real
      // Gemini key for anyone who finds the URL. Refuse to start instead.
      throw new Error(
        "Missing required environment variable: MACSENSE_CLIENT_TOKEN (required when NODE_ENV=production; the /v1/ari/chat gate fails closed)"
      );
    }
    // Outside production a loopback bind is the containment: refuse to start
    // on a non-loopback interface without the token, so a development server
    // can never be exposed tokenless by accident either.
    const bindHost = (process.env.HOST || "127.0.0.1").trim();
    if (!["127.0.0.1", "::1", "localhost"].includes(bindHost)) {
      throw new Error(
        `Refusing to start: HOST=${bindHost} is not a loopback address and MACSENSE_CLIENT_TOKEN is unset; set MACSENSE_CLIENT_TOKEN or bind HOST to 127.0.0.1`
      );
    }
    return "";
  })(),
  rateLimitMax: parseInt(optionalEnv("RATE_LIMIT_MAX", "30"), 10),
  rateLimitWindowMs: parseInt(optionalEnv("RATE_LIMIT_WINDOW_MS", "60000"), 10),
};

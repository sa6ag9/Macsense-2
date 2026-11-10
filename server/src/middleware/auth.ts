import { NextFunction, Request, Response } from "express";
import { config } from "../config";

/**
 * Bearer-token gate for /v1/ari/chat. Fails closed (audit M-1): when no client token is
 * configured this refuses every request with 503 instead of passing traffic through.
 * That state is reachable only on a loopback-bound non-production server — config.ts
 * refuses to start in production mode, or on a non-loopback bind, without
 * MACSENSE_CLIENT_TOKEN — so the unauthenticated proxy can never be exposed.
 */
export function requireClientToken(req: Request, res: Response, next: NextFunction): void {
  if (!config.clientToken) {
    res.status(503).json({ error: "Client token gate is not configured", code: "gate_not_configured" });
    return;
  }

  const header = req.header("authorization") || "";
  const expected = `Bearer ${config.clientToken}`;

  if (header !== expected) {
    res.status(401).json({ error: "Unauthorized", code: "unauthorized" });
    return;
  }

  next();
}

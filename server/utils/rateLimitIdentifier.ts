import { getCookie, getRequestIP, setCookie, type H3Event } from "h3";
import { randomUUID } from "node:crypto";

const RATELIMIT_CLIENT_COOKIE = "rl_cid";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365 * 2;

/**
 * Stable per-client key for Upstash ratelimit. Prefer real client IP (with
 * `X-Forwarded-For` when the app sits behind a trusted proxy); otherwise issue
 * a long-lived httpOnly cookie so traffic is not grouped under one bucket.
 */
export function getApiRatelimitIdentifier(event: H3Event): string {
  const ip = getRequestIP(event, { xForwardedFor: true });
  if (ip) {
    return `ip:${ip}`;
  }

  let clientId = getCookie(event, RATELIMIT_CLIENT_COOKIE);
  if (!clientId || clientId.length < 8) {
    clientId = randomUUID();
    setCookie(event, RATELIMIT_CLIENT_COOKIE, clientId, {
      path: "/",
      maxAge: COOKIE_MAX_AGE_SEC,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return `cid:${clientId}`;
}

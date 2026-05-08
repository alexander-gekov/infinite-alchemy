import { Ratelimit } from "@upstash/ratelimit";
import type { Redis } from "@upstash/redis";
import { createError, setResponseHeader, type H3Event } from "h3";
import { getApiRatelimitIdentifier } from "./rateLimitIdentifier";

/**
 * Shared token bucket for AI element endpoints (all use this via
 * `createApiRatelimit`):
 * `/api/elements/generate`, `/api/elements/combine`.
 * One bucket per client identifier (IP or per-browser cookie): any of these
 * routes consumes the same tokens.
 *
 * Parameters: `refillRate` tokens per `interval`, capped at `maxTokens` burst.
 * Progression: 10 / "1 d" / 15 → 20 / "1 d" / 30 → 50 / "1 d" / 75.
 */
const apiTokenBucket = Ratelimit.tokenBucket(50, "1 d", 75);

export function createApiRatelimit(redis: Redis) {
  return new Ratelimit({
    redis,
    limiter: apiTokenBucket,
    enableProtection: true,
    timeout: 6000,
    analytics: true,
    prefix: "@upstash/ratelimit",
  });
}

/** Response headers consumed by the client to show remaining AI quota. */
export const RATE_LIMIT_HEADER_REMAINING = "x-ratelimit-remaining";
export const RATE_LIMIT_HEADER_LIMIT = "x-ratelimit-limit";

/**
 * Runs the shared token-bucket limiter for the client identifier, sets rate-limit
 * headers on success, or throws 429 when exceeded.
 */
export async function enforceApiRatelimit(event: H3Event, redis: Redis) {
  const ratelimit = createApiRatelimit(redis);
  const identifier = getApiRatelimitIdentifier(event);
  const result = await ratelimit.limit(identifier);

  if (!result.success) {
    throw createError({
      statusCode: 429,
      message: "Too many requests",
    });
  }

  setResponseHeader(event, RATE_LIMIT_HEADER_REMAINING, String(result.remaining));
  setResponseHeader(event, RATE_LIMIT_HEADER_LIMIT, String(result.limit));

  const pending = result.pending;
  if (pending) {
    await pending.catch(() => undefined);
  }
}

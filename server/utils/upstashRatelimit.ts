import { Ratelimit } from "@upstash/ratelimit";
import type { Redis } from "@upstash/redis";

/**
 * Shared token bucket for AI / element routes: `refillRate` tokens added per
 * `interval`, capped at `maxTokens` burst. Previously 10 / "1 d" / 15.
 */
const apiTokenBucket = Ratelimit.tokenBucket(20, "1 d", 30);

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

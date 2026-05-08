import { Ratelimit } from "@upstash/ratelimit";
import type { Redis } from "@upstash/redis";

/**
 * Shared token bucket for AI / element routes: `refillRate` tokens added per
 * `interval`, capped at `maxTokens` burst. Progression: 10 / "1 d" / 15 →
 * 20 / "1 d" / 30 → 50 / "1 d" / 75.
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

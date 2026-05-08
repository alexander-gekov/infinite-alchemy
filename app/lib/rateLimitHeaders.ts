/** Must match `server/utils/upstashRatelimit.ts` header names. */
export const RATE_LIMIT_HEADER_REMAINING = "x-ratelimit-remaining";
export const RATE_LIMIT_HEADER_LIMIT = "x-ratelimit-limit";

export function parseRateLimitFromHeaders(headers: Headers): {
  remaining: number;
  limit: number;
} | null {
  const rem = headers.get(RATE_LIMIT_HEADER_REMAINING);
  const lim = headers.get(RATE_LIMIT_HEADER_LIMIT);
  if (rem === null || rem === "" || lim === null || lim === "") {
    return null;
  }
  const remaining = Number(rem);
  const limit = Number(lim);
  if (Number.isNaN(remaining) || Number.isNaN(limit)) {
    return null;
  }
  return { remaining, limit };
}

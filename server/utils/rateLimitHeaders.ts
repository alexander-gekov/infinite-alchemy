import type { H3Event } from "h3";
import { appendResponseHeader } from "h3";

type RatelimitFields = {
  limit: number;
  remaining: number;
  reset: number;
};

/** Standard-style headers so the client can show remaining AI quota. */
export function appendAiRateLimitHeaders(
  event: H3Event,
  result: RatelimitFields
): void {
  appendResponseHeader(event, "X-RateLimit-Limit", String(result.limit));
  appendResponseHeader(event, "X-RateLimit-Remaining", String(result.remaining));
  appendResponseHeader(event, "X-RateLimit-Reset", String(result.reset));
}

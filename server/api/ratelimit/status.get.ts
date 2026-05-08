import { Redis } from "@upstash/redis";
import { createApiRatelimit } from "../../utils/upstashRatelimit";
import { getRateLimitIdentifier } from "../../utils/rateLimitIdentity";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const redis = new Redis({
    url: config.upstashUrl,
    token: config.upstashToken,
  });

  const ratelimit = createApiRatelimit(redis);
  const identifier = getRateLimitIdentifier(event);
  const { remaining, reset } = await ratelimit.getRemaining(identifier);

  return { remaining, reset };
});

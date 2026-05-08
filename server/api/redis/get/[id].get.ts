import { Redis } from "@upstash/redis";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing id",
    });
  }

  if (!config.upstashUrl || !config.upstashToken) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    });
  }

  const redis = new Redis({
    url: config.upstashUrl,
    token: config.upstashToken,
  });

  try {
    const element = await redis.get(id.split("_")[0]);
    return element as string;
  } catch (cause) {
    console.error("[api/redis/get/[id]] get failed:", cause);
    throw createError({
      statusCode: 502,
      statusMessage: "Redis request failed",
      cause,
    });
  }
});

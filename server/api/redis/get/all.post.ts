import { Redis } from "@upstash/redis";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const { ids } = await readBody(event);

  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
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

  const keys = ids.map((id: string) => String(id).split("_")[0]);

  try {
    const elements = await redis.mget(...keys);

    return elements.map((element, index) => ({
      id: ids[index],
      img: (element ?? "") as string,
    }));
  } catch (cause) {
    console.error("[api/redis/get/all] mget failed:", cause);
    throw createError({
      statusCode: 502,
      statusMessage: "Redis request failed",
      cause,
    });
  }
});

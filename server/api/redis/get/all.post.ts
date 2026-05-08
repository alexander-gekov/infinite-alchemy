import { Redis } from "@upstash/redis";

function normalizeIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((id) => String(id).trim())
      .filter((id) => id.length > 0);
  }
  return [];
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const body = await readBody<{ ids?: unknown }>(event).catch(() => null);

  if (!body || typeof body !== "object") {
    throw createError({
      statusCode: 400,
      statusMessage: "Expected a JSON object body.",
    });
  }

  if (!("ids" in body)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing `ids` in JSON body (array of element id strings).",
    });
  }

  const rawIds = body.ids;
  if (!Array.isArray(rawIds)) {
    throw createError({
      statusCode: 400,
      statusMessage: "`ids` must be a JSON array.",
    });
  }

  const ids = normalizeIds(rawIds);
  if (ids.length === 0) {
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

  const keys = ids.map((id: string) => id.split("_")[0]);

  try {
    const elements = await redis.mget(keys);

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

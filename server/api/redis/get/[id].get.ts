import { Redis } from "@upstash/redis";

const config = useRuntimeConfig();

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing id",
    });
  }

  const redis = new Redis({
    url: config.upstashUrl,
    token: config.upstashToken,
  });

  const element = await redis.get(id.split("_")[0]);

  return element as string;
});

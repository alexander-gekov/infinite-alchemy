import { Redis } from "@upstash/redis";

const config = useRuntimeConfig();

export default defineEventHandler(async (event) => {
  const { ids } = await readBody(event);

  if (!ids) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing ids",
    });
  }

  const redis = new Redis({
    url: config.upstashUrl,
    token: config.upstashToken,
  });

  const elements = await redis.mget(ids.map((id: string) => id.split("_")[0]));

  return elements.map((element, index) => ({
    id: ids[index],
    img: element as string,
  }));
});

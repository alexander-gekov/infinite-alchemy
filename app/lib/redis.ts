import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: "https://coherent-bunny-15316.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const redisReadOnly = new Redis({
  url: "https://coherent-bunny-15316.upstash.io",
  token: "AjvUAAIgcDGlX8qJE2A82xsfh9cqfGQhI60KBmfpZkRKioUfcVV3AA",
});

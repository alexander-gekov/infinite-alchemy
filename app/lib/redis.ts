import { Redis } from "@upstash/redis";

const config = useRuntimeConfig();

export const redis = new Redis({
  url: "https://coherent-bunny-15316.upstash.io",
  token: config.upstashToken as string,
});

export const redisReadOnly = new Redis({
  url: "https://coherent-bunny-15316.upstash.io",
  token: "AjvUAAIgcDGlX8qJE2A82xsfh9cqfGQhI60KBmfpZkRKioUfcVV3AA",
});

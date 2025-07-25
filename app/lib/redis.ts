import { Redis } from "@upstash/redis";

export const redisReadOnly = new Redis({
  url: "https://coherent-bunny-15316.upstash.io",
  token: "AjvUAAIgcDGlX8qJE2A82xsfh9cqfGQhI60KBmfpZkRKioUfcVV3AA",
});

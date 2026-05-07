/**
 * Client-side $fetch timeout for OpenRouter routes that run text + image
 * generation. Values below ~60s often abort before the model returns.
 */
export const AI_API_TIMEOUT_MS = 180_000;

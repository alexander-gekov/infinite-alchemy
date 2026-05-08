import { readonly, ref } from "vue";

const remaining = ref<number | null>(null);
const limit = ref<number | null>(null);

export function updateAiRateLimitFromHeaders(headers: Headers): void {
  const r = headers.get("X-RateLimit-Remaining");
  const l = headers.get("X-RateLimit-Limit");
  if (r !== null && r !== "") {
    const n = Number(r);
    if (!Number.isNaN(n)) remaining.value = n;
  }
  if (l !== null && l !== "") {
    const n = Number(l);
    if (!Number.isNaN(n)) limit.value = n;
  }
}

export function useAiRateLimit() {
  return {
    remaining: readonly(remaining),
    limit: readonly(limit),
    updateAiRateLimitFromHeaders,
  };
}

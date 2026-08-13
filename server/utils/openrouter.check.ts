// Self-check for OpenRouter response/error parsing.
// Run with: node --experimental-strip-types server/utils/openrouter.check.ts
import assert from "node:assert/strict";
import { openRouterErrorMessage, toDataUrl } from "./openrouter.ts";

// Image API returns bare base64 plus the media type.
assert.equal(toDataUrl("QUJD", "image/jpeg"), "data:image/jpeg;base64,QUJD");
// media_type is omitted when the format could not be determined.
assert.equal(toDataUrl("QUJD"), "data:image/png;base64,QUJD");
// Chat-style responses already hand back a full data URL.
assert.equal(toDataUrl("data:image/png;base64,QUJD"), "data:image/png;base64,QUJD");

// The generic upstream failure that started all this must name the model,
// the provider and the raw upstream body.
const message = openRouterErrorMessage("black-forest-labs/flux.2-klein-4b", 502, {
  message: "Provider returned error",
  metadata: { provider_name: "Black Forest Labs", raw: { detail: "bad request" } },
});
assert.match(message, /HTTP 502/);
assert.match(message, /model=black-forest-labs\/flux\.2-klein-4b/);
assert.match(message, /provider=Black Forest Labs/);
assert.match(message, /Provider returned error/);
assert.match(message, /bad request/);

// Missing error bodies must not produce "undefined" noise.
const bare = openRouterErrorMessage("google/gemini-2.5-flash", 429);
assert.equal(bare, "OpenRouter request failed (HTTP 429) | model=google/gemini-2.5-flash");

console.log("openrouter parsing checks passed");

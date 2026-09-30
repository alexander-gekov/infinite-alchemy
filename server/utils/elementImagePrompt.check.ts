// Self-check for the element image prompt.
// Run with: node --experimental-strip-types server/utils/elementImagePrompt.check.ts
import assert from "node:assert/strict";
import { elementImagePrompt } from "./elementImagePrompt.ts";

const withDescription = elementImagePrompt(
  "Fire",
  "A blazing flame of heat and light"
);
assert.equal(
  withDescription,
  "3D icon of the most recognizable symbol of Fire (A blazing flame of heat and light), the shape you would see in a Fire emoji. Soft 3D render, smooth glossy surfaces, rounded inflated shapes, natural colors true to the subject, limited palette, one object only, centered, plain white background, flat even lighting, app icon style."
);

const nameOnly = elementImagePrompt("dragon");
assert.equal(
  nameOnly,
  "3D icon of the most recognizable symbol of dragon, the shape you would see in a dragon emoji. Soft 3D render, smooth glossy surfaces, rounded inflated shapes, natural colors true to the subject, limited palette, one object only, centered, plain white background, flat even lighting, app icon style."
);

console.log("element image prompt checks passed");

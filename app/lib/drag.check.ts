// Self-check for the canvas drag geometry.
// Run with: node --experimental-strip-types app/lib/drag.check.ts
import assert from "node:assert/strict";
import { clampToCanvas, isOutside, overlaps } from "./drag.ts";

// Overlap is symmetric and bounded by the hit size on both axes.
assert.equal(overlaps({ x: 0, y: 0 }, { x: 0, y: 0 }), true);
assert.equal(overlaps({ x: 0, y: 0 }, { x: 64, y: 64 }), true);
assert.equal(overlaps({ x: 0, y: 0 }, { x: 65, y: 0 }), false);
assert.equal(overlaps({ x: 0, y: 0 }, { x: 0, y: -65 }), false);
assert.equal(
  overlaps({ x: 10, y: 20 }, { x: 60, y: 70 }),
  overlaps({ x: 60, y: 70 }, { x: 10, y: 20 })
);

// Positions stay inside the canvas, and never go negative on tiny canvases.
const canvas = { width: 500, height: 300 };
assert.deepEqual(clampToCanvas({ x: 100, y: 100 }, canvas), { x: 100, y: 100 });
assert.deepEqual(clampToCanvas({ x: -50, y: -50 }, canvas), { x: 0, y: 0 });
assert.deepEqual(clampToCanvas({ x: 9999, y: 9999 }, canvas), {
  x: 452,
  y: 252,
});
assert.deepEqual(clampToCanvas({ x: 10, y: 10 }, { width: 20, height: 20 }), {
  x: 0,
  y: 0,
});

// Dropping outside the canvas rect is what deletes an element.
const rect = { left: 0, right: 500, top: 0, bottom: 300 };
assert.equal(isOutside({ x: 250, y: 150 }, rect), false);
assert.equal(isOutside({ x: 501, y: 150 }, rect), true);
assert.equal(isOutside({ x: 250, y: -1 }, rect), true);

console.log("drag geometry checks passed");

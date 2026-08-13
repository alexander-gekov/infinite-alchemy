export interface Point {
  x: number;
  y: number;
}

/** Element hit box, in px, used to decide whether two elements touch. */
const HIT_SIZE = 64;
/** How much of an element must stay inside the canvas, in px. */
const KEEP_VISIBLE = 48;

export const overlaps = (a: Point, b: Point, size = HIT_SIZE) =>
  Math.abs(a.x - b.x) <= size && Math.abs(a.y - b.y) <= size;

export const clampToCanvas = (
  point: Point,
  canvas: { width: number; height: number },
  size = KEEP_VISIBLE
): Point => ({
  x: Math.min(Math.max(point.x, 0), Math.max(0, canvas.width - size)),
  y: Math.min(Math.max(point.y, 0), Math.max(0, canvas.height - size)),
});

export const isOutside = (
  point: Point,
  rect: { left: number; right: number; top: number; bottom: number }
) =>
  point.x < rect.left ||
  point.x > rect.right ||
  point.y < rect.top ||
  point.y > rect.bottom;

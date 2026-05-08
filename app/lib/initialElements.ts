/** Compact SVG icons as data URLs — no Redis needed for the four starters. */
function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const FIRE_ICON = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="64" x2="0" y2="0"><stop offset="0%" stop-color="#f97316"/><stop offset="100%" stop-color="#ef4444"/></linearGradient></defs><circle cx="32" cy="36" r="22" fill="url(#g)"/></svg>`
);

const WATER_ICON = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#3b82f6" d="M32 8c-8 16-20 28-20 40a20 20 0 1040 0c0-12-12-24-20-40z"/></svg>`
);

const EARTH_ICON = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="#92400e"/><path fill="#166534" d="M8 40c8-4 16-6 24-6s16 2 24 6v16H8z"/></svg>`
);

const AIR_ICON = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="none" stroke="#94a3b8" stroke-width="4" stroke-linecap="round" d="M12 24h36M16 34h32M10 44h38"/></svg>`
);

/**
 * Every new game starts with these four (sidebar + canvas). Each includes a
 * ready-to-use `img` URL so the client never needs `/api/redis/get/all` here.
 */
export const INITIAL_ELEMENT_SEED = [
  {
    id: "fire",
    name: "fire",
    description: "",
    img: FIRE_ICON,
    position: { x: 100, y: 100 },
  },
  {
    id: "water",
    name: "water",
    description: "",
    img: WATER_ICON,
    position: { x: 393, y: 262 },
  },
  {
    id: "earth",
    name: "earth",
    description: "",
    img: EARTH_ICON,
    position: { x: 329, y: 512 },
  },
  {
    id: "air",
    name: "air",
    description: "",
    img: AIR_ICON,
    position: { x: 100, y: 384 },
  },
] as const;

/** Base id → bundled starter image (for resume when `img` was not persisted). */
export const STARTER_IMG_BY_ID: ReadonlyMap<string, string> = new Map(
  INITIAL_ELEMENT_SEED.map((e) => [e.id, e.img])
);

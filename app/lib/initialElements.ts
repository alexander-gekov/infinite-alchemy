/**
 * Classical elements every new game starts with (no AI / random endpoint).
 * `id` doubles as the Redis image key when cached.
 * Order: earth, fire, water, air.
 */
export const INITIAL_ELEMENT_SEED = [
  {
    id: "earth",
    name: "earth",
    description: "Solid ground and soil; the receptive foundation.",
    position: { x: 0, y: 0 },
  },
  {
    id: "fire",
    name: "fire",
    description: "Heat and light; the active, transforming spark.",
    position: { x: 0, y: 0 },
  },
  {
    id: "water",
    name: "water",
    description: "Flowing liquid; cool, yielding, and dissolving.",
    position: { x: 0, y: 0 },
  },
  {
    id: "air",
    name: "air",
    description: "The invisible wind and breath of the atmosphere.",
    position: { x: 0, y: 0 },
  },
] as const;

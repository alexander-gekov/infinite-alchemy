/**
 * Elements every new game starts with (sidebar + canvas positions).
 * `id` doubles as the Redis image key when cached.
 */
export const INITIAL_ELEMENT_SEED = [
  {
    id: "fire",
    name: "fire",
    description: "",
    position: { x: 100, y: 100 },
  },
  {
    id: "water",
    name: "water",
    description: "",
    position: { x: 393, y: 262 },
  },
  {
    id: "earth",
    name: "earth",
    description: "",
    position: { x: 329, y: 512 },
  },
  {
    id: "air",
    name: "air",
    description: "",
    position: { x: 100, y: 384 },
  },
] as const;

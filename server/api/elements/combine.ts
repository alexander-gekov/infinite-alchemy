import { Redis } from "@upstash/redis";
import {
  generateImageWithOpenRouter,
  openRouterJsonObjectCompletion,
} from "../../utils/openrouter";
import { createApiRatelimit } from "../../utils/upstashRatelimit";
import { getRateLimitIdentifier } from "../../utils/rateLimitIdentity";

type ElementJson = {
  name: string;
  description: string;
};

// Keys are alphabetically sorted (lookup normalises order).
const KNOWN_COMBINATIONS: Record<string, string> = {
  "air+air": "pressure",
  "air+cloud": "sky",
  "air+earth": "dust",
  "air+fire": "energy",
  "air+lava": "stone",
  "air+life": "bird",
  "air+metal": "rust",
  "air+pressure": "wind",
  "air+steam": "cloud",
  "air+stone": "sand",
  "air+water": "rain",
  "bird+bird": "egg",
  "brick+brick": "wall",
  "cloud+water": "rain",
  "dust+fire": "gunpowder",
  "earth+earth": "pressure",
  "earth+energy": "earthquake",
  "earth+fire": "lava",
  "earth+life": "human",
  "earth+plant": "grass",
  "earth+rain": "plant",
  "earth+steam": "geyser",
  "earth+water": "mud",
  "egg+swamp": "lizard",
  "energy+metal": "electricity",
  "energy+swamp": "life",
  "energy+wind": "hurricane",
  "fire+lizard": "dragon",
  "fire+mud": "brick",
  "fire+plant": "tobacco",
  "fire+sand": "glass",
  "fire+sky": "sun",
  "fire+stone": "metal",
  "fire+water": "steam",
  "fire+wood": "charcoal",
  "glass+sand": "time",
  "grass+livestock": "cow",
  "house+house": "village",
  "human+metal": "tool",
  "human+plant": "farmer",
  "human+tool": "engineer",
  "lava+water": "obsidian",
  "life+stone": "egg",
  "lizard+time": "dinosaur",
  "love+time": "life",
  "metal+wheel": "car",
  "metal+wood": "hammer",
  "moon+sky": "night",
  "mud+plant": "swamp",
  "mud+sand": "clay",
  "plant+sun": "oxygen",
  "plant+time": "tree",
  "rain+sun": "rainbow",
  "sand+sand": "desert",
  "sand+wind": "dune",
  "sun+time": "day",
  "tool+tree": "wood",
  "tool+wood": "wheel",
  "village+village": "city",
  "wall+wall": "house",
  "water+water": "sea",
  "water+wood": "boat",
  "wheel+wheel": "bicycle",
};

function lookupCombination(a: string, b: string): string | null {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  const sorted = [na, nb].sort();
  return KNOWN_COMBINATIONS[`${sorted[0]}+${sorted[1]}`] ?? null;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  if (!config.openrouterApiKey) {
    throw createError({
      statusCode: 503,
      message:
        "OpenRouter is not configured. Set the OPENROUTER_API_KEY environment variable.",
    });
  }

  const redis = new Redis({
    url: config.upstashUrl,
    token: config.upstashToken,
  });

  const ratelimit = createApiRatelimit(redis);

  const identifier = getRateLimitIdentifier(event);
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    throw createError({
      statusCode: 429,
      message: "Too many requests",
    });
  }

  const { element1, element2 } = await readBody(event);

  if (!element1 || !element2) {
    throw createError({
      statusCode: 400,
      message: "Both element1 and element2 are required",
    });
  }

  try {
    let name: string;
    let description = "";

    const knownResult = lookupCombination(element1, element2);

    if (knownResult) {
      name = knownResult.charAt(0).toUpperCase() + knownResult.slice(1);
      description = `The result of combining ${element1} and ${element2}`;
    } else {
      const output = await openRouterJsonObjectCompletion<ElementJson>({
        apiKey: config.openrouterApiKey,
        model: config.openrouterTextModel,
        messages: [
          {
            role: "system",
            content: `You are the combination engine for an alchemy game like "Little Alchemy". The player combines two elements to create a new one. Given the two input elements, return the most logical, intuitive real-world result — a single common noun.

Think like the original Little Alchemy game:
- earth + fire = lava
- water + fire = steam
- air + water = rain
- lava + air = stone
- fire + stone = metal

Follow that same style: simple, logical, everyday nouns. Prefer the most obvious, well-known answer. Do NOT be creative or obscure.

Respond with JSON only: {"name":"...","description":"..."}
- name: a single common noun (lowercase, 1-3 words max)
- description: one short sentence`,
          },
          {
            role: "user",
            content: `Combine: ${element1} + ${element2}`,
          },
        ],
        temperature: 0.3,
        referer: config.openrouterHttpReferer,
        appTitle: config.openrouterAppTitle,
      });

      if (!output?.name || !output?.description) {
        throw new Error("Failed to generate element details");
      }

      name = output.name;
      description = output.description;
    }

    const id = name.toLowerCase().replace(/\s+/g, "-");
    const cachedImg = await redis.get<string>(id);
    if (cachedImg) {
      return {
        id,
        name,
        description,
        img: cachedImg,
      };
    }

    const { imageDataUrl } = await generateImageWithOpenRouter({
      apiKey: config.openrouterApiKey,
      model: config.openrouterImageModel,
      prompt: `claymorphic 3D illustration of ${name} (${description}), minimalistic design, smooth surfaces, bright colors, centered, white background, no shadows, high contrast, logo style, flat lighting, high resolution. Avoid clay texture, excessive complexity, or photorealism.`,
      referer: config.openrouterHttpReferer,
      appTitle: config.openrouterAppTitle,
    });

    await redis.set(id, imageDataUrl);

    return {
      id,
      name,
      description,
      img: imageDataUrl,
    };
  } catch (error) {
    console.error("Error generating element:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to generate element",
    });
  }
});

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  generateImageWithOpenRouter,
  openRouterJsonObjectCompletion,
} from "../../utils/openrouter";

type ElementJson = {
  name: string;
  description: string;
};

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

  const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.tokenBucket(10, "1 d", 15),
    enableProtection: true,
    timeout: 6000,
    analytics: true,
    prefix: "@upstash/ratelimit",
  });

  const identifier = getRequestIP(event) || "anonymous";
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    throw createError({
      statusCode: 429,
      message: "Too many requests",
    });
  }

  try {
    const output = await openRouterJsonObjectCompletion<ElementJson>({
      apiKey: config.openrouterApiKey,
      model: config.openrouterTextModel,
      messages: [
        {
          role: "system",
          content: `Generate a random common noun (general categories of people, places, or things) or a random abstract noun (ideas, concepts, or qualities that cannot be touched or seen, e.g. love, freedom, happiness) and a short description.

The name must be a singular common noun in lowercase without punctuation.

Respond with JSON only, using this exact shape: {"name":"...","description":"..."}`,
        },
        {
          role: "user",
          content: "Generate one random element now.",
        },
      ],
      temperature: 1.2,
      seed: Math.floor(Math.random() * 1000000),
      frequencyPenalty: 1.0,
      presencePenalty: 1.0,
      referer: config.openrouterHttpReferer,
      appTitle: config.openrouterAppTitle,
    });

    if (!output?.name || !output?.description) {
      throw new Error("Failed to generate element details");
    }

    const { imageDataUrl } = await generateImageWithOpenRouter({
      apiKey: config.openrouterApiKey,
      model: config.openrouterImageModel,
      prompt: `Claymorphic soft 3D illustration of ${output.name}, minimalistic design, smooth surfaces, pastel colors, centered, white background, no shadows, high contrast, logo style, flat lighting, high resolution`,
      referer: config.openrouterHttpReferer,
      appTitle: config.openrouterAppTitle,
    });

    const id = output.name.toLowerCase().replace(/\s+/g, "-");

    await redis.set(id, imageDataUrl);

    return {
      id,
      name: output.name,
      description: output.description,
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

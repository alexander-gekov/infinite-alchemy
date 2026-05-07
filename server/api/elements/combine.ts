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

  const { prompt } = await readBody(event);

  try {
    let name = prompt;
    let description = "";

    const output = await openRouterJsonObjectCompletion<ElementJson>({
      apiKey: config.openrouterApiKey,
      model: config.openrouterTextModel,
      messages: [
        {
          role: "system",
          content: `Generate a common or abstract noun and description based on the prompt: ${prompt}

Respond with JSON only, using this exact shape: {"name":"...","description":"..."}
- name: a random common or abstract noun, up to 3 words
- description: one short sentence describing the name`,
        },
      ],
      temperature: 1.2,
      referer: config.openrouterHttpReferer,
      appTitle: config.openrouterAppTitle,
    });

    if (!output?.name || !output?.description) {
      throw new Error("Failed to generate element details");
    }

    name = output.name;
    description = output.description;

    const { imageDataUrl } = await generateImageWithOpenRouter({
      apiKey: config.openrouterApiKey,
      model: config.openrouterImageModel,
      prompt: `claymorphic 3D illustration of ${name} (${description}), minimalistic design, smooth surfaces, bright colors, centered, white background, no shadows, high contrast, logo style, flat lighting, high resolution. Avoid clay texture, excessive complexity, or photorealism.`,
      referer: config.openrouterHttpReferer,
      appTitle: config.openrouterAppTitle,
    });

    const id = name.toLowerCase().replace(/\s+/g, "-");

    const existingImage = await redis.get(id);

    if (existingImage) {
      return {
        id,
        name: name,
        description: description,
        img: existingImage,
      };
    }

    await redis.set(id, imageDataUrl);

    return {
      id,
      name: name,
      description: description,
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

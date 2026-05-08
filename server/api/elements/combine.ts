import { Redis } from "@upstash/redis";
import {
  generateImageWithOpenRouter,
  openRouterJsonObjectCompletion,
} from "../../utils/openrouter";
import { appendAiRateLimitHeaders } from "../../utils/rateLimitHeaders";
import { createApiRatelimit } from "../../utils/upstashRatelimit";

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

  const ratelimit = createApiRatelimit(redis);

  const identifier = getRequestIP(event) || "anonymous";
  const rate = await ratelimit.limit(identifier);
  appendAiRateLimitHeaders(event, rate);

  if (!rate.success) {
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

import { Redis } from "@upstash/redis";
import { generateImageWithOpenRouter } from "../../utils/openrouter";
import { createApiRatelimit } from "../../utils/upstashRatelimit";

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
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    throw createError({
      statusCode: 429,
      message: "Too many requests",
    });
  }

  const { prompt } = await readBody(event);

  try {
    const { imageDataUrl } = await generateImageWithOpenRouter({
      apiKey: config.openrouterApiKey,
      model: config.openrouterImageModel,
      prompt: `shiny 3D illustration of ${prompt}, minimalistic design, smooth surfaces, bright colors, centered, white background, no shadows, high contrast, logo style, flat lighting, high resolution`,
      referer: config.openrouterHttpReferer,
      appTitle: config.openrouterAppTitle,
    });

    const id = String(prompt).toLowerCase().replace(/\s+/g, "-");

    const existingImage = await redis.get(id);
    if (existingImage) {
      return {
        id,
        name: prompt || "New Element",
        description: "",
        img: existingImage,
      };
    }

    await redis.set(id, imageDataUrl);

    return {
      id,
      name: prompt || "New Element",
      description: "",
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

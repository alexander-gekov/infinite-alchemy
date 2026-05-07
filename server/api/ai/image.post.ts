import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { generateImageWithOpenRouter } from "../../utils/openrouterImage";

const ASPECT_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
] as const;

const bodySchema = z.object({
  prompt: z.string().min(1).max(8000),
  aspectRatio: z.enum(ASPECT_RATIOS).optional(),
});

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
    redis,
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

  const rawBody = await readBody(event);
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues.map((i) => i.message).join("; "),
    });
  }

  const { prompt, aspectRatio } = parsed.data;

  try {
    const { imageDataUrl, text } = await generateImageWithOpenRouter({
      apiKey: config.openrouterApiKey,
      model: config.openrouterImageModel,
      prompt,
      imageConfig: aspectRatio ? { aspect_ratio: aspectRatio } : undefined,
      referer: config.openrouterHttpReferer,
      appTitle: config.openrouterAppTitle,
    });

    return {
      image: imageDataUrl,
      text,
      model: config.openrouterImageModel,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Image generation failed";
    console.error("OpenRouter image error:", err);
    throw createError({
      statusCode: 502,
      message,
    });
  }
});

import Together from "together-ai";
import { ImageDataB64, ImageDataURL } from "together-ai/resources";
import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis";

const config = useRuntimeConfig();

export default defineEventHandler(async () => {
  const redis = new Redis({
    url: config.upstashUrl,
    token: config.upstashToken,
  });

  // Create a new ratelimiter, that allows 10 requests per 10 seconds
  const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.tokenBucket(5, "5 m", 15),
    analytics: true,
    /**
     * Optional prefix for the keys used in redis. This is useful if you want to share a redis
     * instance with other applications and want to avoid key collisions. The default prefix is
     * "@upstash/ratelimit"
     */
    prefix: "@upstash/ratelimit",
  });

  // Use a constant string to limit all requests with a single ratelimit
  // Or use a userID, apiKey or ip address for individual limits.
  const identifier = "api";
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    return createError({
      statusCode: 429,
      message: "Too many requests",
    });
  }

  const together = new Together({
    apiKey: config.togetheraiApiKey,
  });

  const elementSchema = {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "A random common or abstract noun up to 3 words",
      },
      description: {
        type: "string",
        description: "A short one sentence description of the name.",
      },
    },
    required: ["name", "description"],
  };

  try {
    const extract = await together.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Generate a random common noun (Refer to general categories of people, places, or things) or a random abstract noun (Refer to ideas, concepts, or qualities that cannot be touched or seen (e.g., love, freedom, happiness)) and description and return it in JSON format. The name should be a singular common noun in lowercase without punctuation.",
        },
      ],
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      response_format: { type: "json_object", schema: elementSchema },
      temperature: 1.2,
      seed: Math.floor(Math.random() * 1000000),
      frequency_penalty: 1.0,
      presence_penalty: 1.0,
    });

    let output;
    if (extract?.choices?.[0]?.message?.content) {
      output = JSON.parse(extract?.choices?.[0]?.message?.content) as {
        name: string;
        description: string;
      };
    }

    if (!output?.name || !output?.description) {
      throw new Error("Failed to generate element details");
    }

    const image = await together.images.create({
      prompt: `Claymorphic soft 3D illustration of ${output.name}, minimalistic design, smooth surfaces, pastel colors, centered, white background, no shadows, high contrast, logo style, flat lighting, high resolution`,
      model: "black-forest-labs/FLUX.1-schnell",
      steps: 1,
      response_format: "base64",
      disable_safety_checker: true,
      seed: 123,
    });

    const id = output.name.toLowerCase().replace(/\s+/g, "-");

    await redis.set(
      id,
      `data:image/png;base64,${(image.data[0] as ImageDataB64).b64_json}`
    );

    return {
      id,
      name: output.name,
      description: output.description,
      img: `data:image/png;base64,${(image.data[0] as ImageDataB64).b64_json}`,
    };
  } catch (error) {
    console.error("Error generating element:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to generate element",
    });
  }
});

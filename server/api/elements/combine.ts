import Together from "together-ai";
import { ImageDataB64 } from "together-ai/resources";
import { Ratelimit } from "@upstash/ratelimit"; // for deno: see above
import { Redis } from "@upstash/redis";

const config = useRuntimeConfig();

export default defineEventHandler(async (event) => {
  const redis = new Redis({
    url: config.upstashUrl,
    token: config.upstashToken,
  });

  // Create a new ratelimiter, that allows 10 requests per 10 seconds
  const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.tokenBucket(5, "5 m", 10),
    timeout: 6000,
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

  const { prompt } = await readBody(event);

  const together = new Together({
    apiKey: config.togetheraiApiKey,
  });

  const elementSchema = {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "A random common or abstract noun",
      },
      description: {
        type: "string",
        description: "A short one sentence description of the name.",
      },
    },
    required: ["name", "description"],
  };

  try {
    let name = prompt;
    let description = "";
    const extract = await together.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Generate a common or abstract noun and description based on the prompt: ${prompt}`,
        },
      ],
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      response_format: { type: "json_object", schema: elementSchema },
      temperature: 1.2,
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

    name = output.name;
    description = output.description;

    const image = await together.images.create({
      prompt: `shiny 3D illustration of ${name} (${description}), minimalistic design, smooth surfaces, bright colors, centered, white background, no shadows, high contrast, logo style, flat lighting, high resolution`,
      model: "black-forest-labs/FLUX.1-schnell",
      steps: 2,
      response_format: "base64",
      disable_safety_checker: true,
      seed: 123,
    });

    const imageBase64 = (image.data[0] as ImageDataB64).b64_json;

    const id = name.toLowerCase().replace(/\s+/g, "-");

    const existingImage = await redis.get(id);

    if (existingImage) {
      return {
        id,
        name: name,
        description: description,
        img: existingImage,
      };
    } else {
      await redis.set(id, `data:image/png;base64,${imageBase64}`);
    }

    return {
      id,
      name: name,
      description: description,
      img: `data:image/png;base64,${imageBase64}`,
    };
  } catch (error) {
    console.error("Error generating element:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to generate element",
    });
  }
});

import { Redis } from "@upstash/redis";
import { openRouterJsonObjectCompletion } from "../../utils/openrouter";
import { createApiRatelimit } from "../../utils/upstashRatelimit";
import { getRateLimitIdentifier } from "../../utils/rateLimitIdentity";

type StorySegment =
  | { type: "text"; value: string }
  | { type: "blank"; answer: string; hint1: string; hint2: string };

interface StoryResponse {
  title: string;
  segments: StorySegment[];
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

  const { elements } = await readBody(event);

  if (!Array.isArray(elements) || elements.length < 2) {
    throw createError({
      statusCode: 400,
      message: "At least 2 element names are required",
    });
  }

  try {
    const elementList = elements.slice(0, 20).join(", ");

    const output = await openRouterJsonObjectCompletion<StoryResponse>({
      apiKey: config.openrouterApiKey,
      model: config.openrouterTextModel,
      messages: [
        {
          role: "system",
          content: `You are a creative storyteller for a word-combination game. The player has these elements: ${elementList}.

Write a short, fun story (5-8 sentences) with exactly 3-5 noun blanks. Each blank must be a word that could LOGICALLY result from combining two of the provided elements (e.g. combining "water" and "fire" could produce "steam").

Return JSON only in this exact shape:
{
  "title": "Story Title",
  "segments": [
    { "type": "text", "value": "Once upon a time, " },
    { "type": "blank", "answer": "steam", "hint1": "It rises from a boiling kettle", "hint2": "Invisible force that powers old trains" },
    { "type": "text", "value": " filled the air..." }
  ]
}

Rules:
- "segments" alternates between text and blank segments. The story MUST start and end with a text segment.
- Each blank "answer" must be a single common noun (lowercase, 1-2 words max).
- Each blank has two contextual/thematic hints (NOT the element names themselves).
- The story should be coherent and engaging.
- Keep answers simple and guessable — everyday nouns only.`,
        },
        {
          role: "user",
          content: "Generate a story now.",
        },
      ],
      temperature: 1.0,
      referer: config.openrouterHttpReferer,
      appTitle: config.openrouterAppTitle,
    });

    if (
      !output?.title ||
      !Array.isArray(output?.segments) ||
      output.segments.length < 3
    ) {
      throw new Error("Invalid story structure from AI");
    }

    const hasBlank = output.segments.some(
      (s) => s.type === "blank" && s.answer && s.hint1 && s.hint2
    );
    if (!hasBlank) {
      throw new Error("Story has no valid blanks");
    }

    return output;
  } catch (error) {
    console.error("Error generating story:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to generate story",
    });
  }
});

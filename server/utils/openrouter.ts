const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

type OpenRouterChatResponse = {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      role?: string;
      content?: string | null | unknown[];
      images?: Array<{
        type?: string;
        image_url?: { url?: string };
        imageUrl?: { url?: string };
      }>;
    };
  }>;
  error?: { message?: string };
};

function buildHeaders(options: {
  apiKey: string;
  referer?: string;
  appTitle?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.apiKey}`,
    "Content-Type": "application/json",
  };
  if (options.referer) {
    headers["HTTP-Referer"] = options.referer;
  }
  if (options.appTitle) {
    headers["X-Title"] = options.appTitle;
  }
  return headers;
}

async function postOpenRouter(
  body: Record<string, unknown>,
  headersOpts: {
    apiKey: string;
    referer?: string;
    appTitle?: string;
  }
): Promise<OpenRouterChatResponse> {
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: buildHeaders(headersOpts),
    body: JSON.stringify(body),
  });

  const raw = (await response.json()) as OpenRouterChatResponse;

  if (!response.ok) {
    const msg =
      raw.error?.message ??
      `OpenRouter request failed with status ${response.status}`;
    throw new Error(msg);
  }

  return raw;
}

export type OpenRouterImageConfig = {
  aspect_ratio?: string;
  /** Pixel width when the provider supports explicit dimensions (e.g. BFL FLUX on OpenRouter). */
  width?: number;
  /** Pixel height when the provider supports explicit dimensions (e.g. BFL FLUX on OpenRouter). */
  height?: number;
};

const FLUX_DIM_MIN = 64;

function parseFluxDimension(raw: string | undefined): number | undefined {
  if (raw == null || raw === "") {
    return undefined;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < FLUX_DIM_MIN) {
    return undefined;
  }
  return n;
}

function fluxOutputDimensionsFromEnv():
  | { width: number; height: number }
  | undefined {
  const w = parseFluxDimension(process.env.OPENROUTER_FLUX_IMAGE_WIDTH);
  const h = parseFluxDimension(process.env.OPENROUTER_FLUX_IMAGE_HEIGHT);
  if (w != null && h != null) {
    return { width: w, height: h };
  }
  return undefined;
}

function isBlackForestFluxModel(model: string): boolean {
  const id = model.toLowerCase();
  return id.startsWith("black-forest-labs/") && id.includes("flux");
}

/**
 * Merges caller `image_config` with cost-aware defaults. OpenRouter’s documented
 * `aspect_ratio` presets are all ~1 MP; for BFL FLUX we instead default explicit
 * `width`/`height` (sub-megapixel) unless the caller already set aspect ratio or
 * dimensions. If both aspect ratio and dimensions are present, aspect ratio wins
 * (documented OpenRouter path).
 */
function mergeImageConfig(
  model: string,
  partial?: OpenRouterImageConfig
): OpenRouterImageConfig {
  const merged: OpenRouterImageConfig = { ...(partial ?? {}) };

  const hasAspect =
    typeof merged.aspect_ratio === "string" && merged.aspect_ratio.length > 0;
  const hasDims =
    merged.width != null &&
    merged.height != null &&
    merged.width >= FLUX_DIM_MIN &&
    merged.height >= FLUX_DIM_MIN;

  if (hasAspect && hasDims) {
    delete merged.width;
    delete merged.height;
  }

  if (!hasAspect && !hasDims) {
    if (isBlackForestFluxModel(model)) {
      const fromEnv = fluxOutputDimensionsFromEnv();
      if (fromEnv) {
        merged.width = fromEnv.width;
        merged.height = fromEnv.height;
      } else {
        // Rely on OpenRouter’s documented aspect_ratio presets; explicit
        // width/height in chat `image_config` is not consistently honored and
        // can yield an empty `message.images` for some FLUX routes.
        merged.aspect_ratio = "1:1";
      }
    } else {
      merged.aspect_ratio = "1:1";
    }
  }

  return merged;
}

/**
 * Chat `modalities` for OpenRouter image generation. Gemini image models return
 * both assistant text and an image; FLUX and most other image models return
 * image only (see OpenRouter image generation docs).
 */
function openRouterImageModalities(model: string): Array<"image" | "text"> {
  const id = model.toLowerCase();
  if (id.startsWith("google/") && id.includes("image")) {
    return ["image", "text"];
  }
  return ["image"];
}

function urlFromImageUrlBlock(block: unknown): string | undefined {
  if (!block || typeof block !== "object") {
    return undefined;
  }
  const u = (block as Record<string, unknown>).url;
  return typeof u === "string" && u.length > 0 ? u : undefined;
}

/**
 * OpenRouter usually returns `message.images[].image_url.url`; some payloads use
 * camelCase or put image parts in `content` arrays.
 */
function extractFirstGeneratedImageDataUrl(
  message: unknown
): string | undefined {
  if (!message || typeof message !== "object") {
    return undefined;
  }
  const m = message as Record<string, unknown>;

  const images = m.images;
  if (Array.isArray(images)) {
    for (const item of images) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const img = item as Record<string, unknown>;
      const nested = img.image_url ?? img.imageUrl;
      const url = urlFromImageUrlBlock(nested);
      if (url) {
        return url;
      }
    }
  }

  const content = m.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      if (!part || typeof part !== "object") {
        continue;
      }
      const p = part as Record<string, unknown>;
      if (p.type === "image_url") {
        const nested = p.image_url ?? p.imageUrl;
        const url = urlFromImageUrlBlock(nested);
        if (url) {
          return url;
        }
      }
    }
  }

  return undefined;
}

export async function generateImageWithOpenRouter(options: {
  apiKey: string;
  model: string;
  prompt: string;
  imageConfig?: OpenRouterImageConfig;
  referer?: string;
  appTitle?: string;
}): Promise<{ imageDataUrl: string; text: string | null }> {
  const trimmed = options.prompt.trim();
  if (!trimmed) {
    throw new Error("Prompt must be a non-empty string");
  }

  const imageConfig = mergeImageConfig(options.model, options.imageConfig);

  const body: Record<string, unknown> = {
    model: options.model,
    messages: [{ role: "user", content: trimmed }],
    modalities: openRouterImageModalities(options.model),
    stream: false,
  };

  if (Object.keys(imageConfig).length > 0) {
    body.image_config = imageConfig;
  }

  const raw = await postOpenRouter(body, {
    apiKey: options.apiKey,
    referer: options.referer,
    appTitle: options.appTitle,
  });

  const choice = raw.choices?.[0];
  const message = choice?.message;
  const first = extractFirstGeneratedImageDataUrl(message);
  if (!first) {
    const fr = choice?.finish_reason ?? "unknown";
    throw new Error(
      `OpenRouter returned no image in the response (finish_reason: ${String(fr)})`
    );
  }

  const text = message?.content;
  return {
    imageDataUrl: first,
    text: typeof text === "string" ? text : null,
  };
}

export async function openRouterJsonObjectCompletion<T>(options: {
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature?: number;
  seed?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  referer?: string;
  appTitle?: string;
}): Promise<T> {
  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    response_format: { type: "json_object" },
    stream: false,
  };

  if (options.temperature != null) {
    body.temperature = options.temperature;
  }
  if (options.seed != null) {
    body.seed = options.seed;
  }
  if (options.frequencyPenalty != null) {
    body.frequency_penalty = options.frequencyPenalty;
  }
  if (options.presencePenalty != null) {
    body.presence_penalty = options.presencePenalty;
  }

  const raw = await postOpenRouter(body, {
    apiKey: options.apiKey,
    referer: options.referer,
    appTitle: options.appTitle,
  });

  const content = raw.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenRouter returned no JSON message content");
  }

  return JSON.parse(content) as T;
}

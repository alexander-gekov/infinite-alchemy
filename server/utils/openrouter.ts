const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
      images?: Array<{
        type?: string;
        image_url?: { url?: string };
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
/** ~0.26 MP at 512² — below OpenRouter’s ~1 MP aspect_ratio presets for FLUX. */
const FLUX_DEFAULT_EDGE = 512;

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
      merged.width = fromEnv?.width ?? FLUX_DEFAULT_EDGE;
      merged.height = fromEnv?.height ?? FLUX_DEFAULT_EDGE;
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

  const images = raw.choices?.[0]?.message?.images;
  const first = images?.[0]?.image_url?.url;
  if (!first || typeof first !== "string") {
    throw new Error("OpenRouter returned no image in the response");
  }

  const text = raw.choices?.[0]?.message?.content;
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

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
/**
 * Images have their own endpoint. Image-only models (FLUX, Recraft, Seedream…)
 * are not routable through chat completions — asking for them there fails with
 * an opaque "Provider returned error".
 */
const OPENROUTER_IMAGE_URL = "https://openrouter.ai/api/v1/images";

export type OpenRouterError = {
  message?: string;
  code?: string | number;
  metadata?: { provider_name?: string; raw?: unknown };
};

type OpenRouterChatResponse = {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
    };
  }>;
  error?: OpenRouterError;
};

type OpenRouterImageResponse = {
  data?: Array<{ b64_json?: string; media_type?: string }>;
  error?: OpenRouterError;
};

/**
 * OpenRouter wraps upstream failures in a generic message ("Provider returned
 * error") and puts the useful part in `error.metadata`, so unpack all of it.
 */
export function openRouterErrorMessage(
  model: unknown,
  status: number,
  error?: OpenRouterError
): string {
  const raw = error?.metadata?.raw;
  const detail =
    typeof raw === "string" ? raw : raw == null ? "" : JSON.stringify(raw);

  return [
    `OpenRouter request failed (HTTP ${status})`,
    `model=${String(model)}`,
    error?.metadata?.provider_name && `provider=${error.metadata.provider_name}`,
    error?.message,
    detail && `detail=${detail.slice(0, 500)}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function toDataUrl(base64: string, mediaType?: string): string {
  if (base64.startsWith("data:")) {
    return base64;
  }
  return `data:${mediaType || "image/png"};base64,${base64}`;
}

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

async function postOpenRouter<T extends { error?: OpenRouterError }>(
  url: string,
  body: Record<string, unknown>,
  headersOpts: {
    apiKey: string;
    referer?: string;
    appTitle?: string;
  }
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: buildHeaders(headersOpts),
    body: JSON.stringify(body),
  });

  const raw = (await response.json().catch(() => ({}))) as T;

  if (!response.ok || raw.error) {
    throw new Error(
      openRouterErrorMessage(body.model, response.status, raw.error)
    );
  }

  return raw;
}

export async function generateImageWithOpenRouter(options: {
  apiKey: string;
  model: string;
  prompt: string;
  /**
   * Ratio to request. Must be one of the values the model lists in its
   * `supported_parameters`; pass an empty string to let the provider decide
   * (a few models, e.g. openai/gpt-5-image, reject the parameter entirely).
   */
  aspectRatio?: string;
  referer?: string;
  appTitle?: string;
}): Promise<{ imageDataUrl: string }> {
  const prompt = options.prompt.trim();
  if (!prompt) {
    throw new Error("Prompt must be a non-empty string");
  }

  const aspectRatio = options.aspectRatio ?? "1:1";
  const body: Record<string, unknown> = { model: options.model, prompt };
  if (aspectRatio) {
    body.aspect_ratio = aspectRatio;
  }

  const raw = await postOpenRouter<OpenRouterImageResponse>(
    OPENROUTER_IMAGE_URL,
    body,
    {
      apiKey: options.apiKey,
      referer: options.referer,
      appTitle: options.appTitle,
    }
  );

  const image = raw.data?.[0];
  if (!image?.b64_json) {
    throw new Error(
      `OpenRouter returned no image for model ${options.model}. Check that it is listed at https://openrouter.ai/api/v1/images/models`
    );
  }

  return { imageDataUrl: toDataUrl(image.b64_json, image.media_type) };
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

  const raw = await postOpenRouter<OpenRouterChatResponse>(
    OPENROUTER_CHAT_URL,
    body,
    {
      apiKey: options.apiKey,
      referer: options.referer,
      appTitle: options.appTitle,
    }
  );

  const content = raw.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenRouter returned no JSON message content");
  }

  return JSON.parse(content) as T;
}

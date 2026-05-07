const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_MODALITIES = ["image", "text"] as const;

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

export type OpenRouterImageConfig = {
  aspect_ratio?: string;
};

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

  const body: Record<string, unknown> = {
    model: options.model,
    messages: [{ role: "user", content: trimmed }],
    modalities: [...DEFAULT_MODALITIES],
    stream: false,
  };

  if (
    options.imageConfig &&
    Object.keys(options.imageConfig).length > 0
  ) {
    body.image_config = options.imageConfig;
  }

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const raw = (await response.json()) as OpenRouterChatResponse;

  if (!response.ok) {
    const msg =
      raw.error?.message ??
      `OpenRouter request failed with status ${response.status}`;
    throw new Error(msg);
  }

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

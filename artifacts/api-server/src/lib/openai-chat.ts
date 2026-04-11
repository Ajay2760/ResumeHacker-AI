type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string; code?: string };
};

function defaultOpenAiBaseUrl(): string {
  const raw = process.env.OPENAI_BASE_URL?.trim();
  if (!raw) return "https://api.openai.com/v1";
  return raw.replace(/\/+$/, "");
}

function makeHttpError(status: number, message: string): Error & { status: number } {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  return e;
}

type CompatibleChatInput = {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  /** OpenAI-compatible root, e.g. https://api.openai.com/v1 or https://api.groq.com/openai/v1 */
  baseUrl?: string;
};

function resolveBaseUrl(baseUrl?: string): string {
  const root = (baseUrl ?? defaultOpenAiBaseUrl()).replace(/\/+$/, "");
  return root;
}

export async function openaiChatJson(input: CompatibleChatInput): Promise<string> {
  const url = `${resolveBaseUrl(input.baseUrl)}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    }),
  });

  const body = (await res.json()) as ChatCompletionResponse;
  if (!res.ok) {
    const msg =
      typeof body.error?.message === "string" && body.error.message.trim()
        ? body.error.message.trim()
        : `Chat API HTTP ${res.status}`;
    throw makeHttpError(res.status, msg);
  }

  const text = body.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw makeHttpError(502, "LLM returned an empty response");
  }
  return text;
}

export async function openaiChatText(input: CompatibleChatInput): Promise<string> {
  const url = `${resolveBaseUrl(input.baseUrl)}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    }),
  });

  const body = (await res.json()) as ChatCompletionResponse;
  if (!res.ok) {
    const msg =
      typeof body.error?.message === "string" && body.error.message.trim()
        ? body.error.message.trim()
        : `Chat API HTTP ${res.status}`;
    throw makeHttpError(res.status, msg);
  }

  const text = body.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw makeHttpError(502, "LLM returned an empty response");
  }
  return text;
}

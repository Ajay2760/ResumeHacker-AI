type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string; code?: string };
};

function openaiBaseUrl(): string {
  const raw = process.env.OPENAI_BASE_URL?.trim();
  if (!raw) return "https://api.openai.com/v1";
  return raw.replace(/\/+$/, "");
}

function makeHttpError(status: number, message: string): Error & { status: number } {
  const e = new Error(message) as Error & { status: number };
  e.status = status;
  return e;
}

export async function openaiChatJson(input: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
}): Promise<string> {
  const url = `${openaiBaseUrl()}/chat/completions`;
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
        : `OpenAI HTTP ${res.status}`;
    throw makeHttpError(res.status, msg);
  }

  const text = body.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw makeHttpError(502, "OpenAI returned an empty response");
  }
  return text;
}

export async function openaiChatText(input: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
}): Promise<string> {
  const url = `${openaiBaseUrl()}/chat/completions`;
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
        : `OpenAI HTTP ${res.status}`;
    throw makeHttpError(res.status, msg);
  }

  const text = body.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw makeHttpError(502, "OpenAI returned an empty response");
  }
  return text;
}

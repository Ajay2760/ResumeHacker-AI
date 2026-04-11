import Anthropic from "@anthropic-ai/sdk";

const isReplit =
  !!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL &&
  !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

export function hasAnthropicCredentials(): boolean {
  return isReplit || Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function hasOpenAICredentials(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export type ResumeLlmBackend = "anthropic" | "openai";

/**
 * Which LLM backend resume routes use.
 * - AI_PROVIDER=openai → OpenAI (needs OPENAI_API_KEY)
 * - AI_PROVIDER=anthropic → Anthropic (needs ANTHROPIC_API_KEY or Replit integration)
 * - unset → Anthropic if configured, otherwise OpenAI if configured
 */
export function getResumeLlmBackend(): ResumeLlmBackend {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === "openai") {
    if (!hasOpenAICredentials()) {
      throw new Error("AI_PROVIDER=openai requires OPENAI_API_KEY to be set.");
    }
    return "openai";
  }
  if (explicit === "anthropic") {
    if (!hasAnthropicCredentials()) {
      throw new Error("AI_PROVIDER=anthropic requires ANTHROPIC_API_KEY (or Replit Anthropic integration env vars).");
    }
    return "anthropic";
  }
  if (hasAnthropicCredentials()) {
    return "anthropic";
  }
  if (hasOpenAICredentials()) {
    return "openai";
  }
  throw new Error(
    "No AI API key found. Set ANTHROPIC_API_KEY and/or OPENAI_API_KEY. " +
      "If both are set, Anthropic is used by default — set AI_PROVIDER=openai to use OpenAI instead.",
  );
}

getResumeLlmBackend();

function createAnthropic(): Anthropic {
  if (isReplit) {
    return new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY!,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL!,
    });
  }
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic({ apiKey: key });
}

let _anthropic: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = createAnthropic();
  }
  return _anthropic;
}

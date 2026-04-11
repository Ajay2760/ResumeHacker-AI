import Anthropic from "@anthropic-ai/sdk";

const isReplit =
  !!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL &&
  !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

const hasStandardKey = !!process.env.ANTHROPIC_API_KEY;

if (!isReplit && !hasStandardKey) {
  throw new Error(
    "No Anthropic API key found. Set ANTHROPIC_API_KEY as an environment variable.",
  );
}

export const anthropic = isReplit
  ? new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    })
  : new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

/**
 * Model ID for Messages API calls. Override with ANTHROPIC_MODEL if your key
 * cannot use the default (e.g. regional / tier restrictions).
 */
export function anthropicMessagesModel(): string {
  const fromEnv = process.env.ANTHROPIC_MODEL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return "claude-sonnet-4-20250514";
}

/** OpenAI chat model when AI_PROVIDER / routing selects OpenAI. */
export function openaiMessagesModel(): string {
  const fromEnv = process.env.OPENAI_MODEL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return "gpt-4o-mini";
}

/**
 * Groq chat model (free tier at console.groq.com). Higher daily limits on 8B;
 * override with GROQ_MODEL for e.g. llama-3.3-70b-versatile.
 */
export function groqMessagesModel(): string {
  const fromEnv = process.env.GROQ_MODEL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return "llama-3.3-70b-versatile";
}

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

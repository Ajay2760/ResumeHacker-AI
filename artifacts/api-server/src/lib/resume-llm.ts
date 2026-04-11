import {
  getAnthropic,
  getResumeLlmBackend,
  type ResumeLlmBackend,
  anthropicMessagesModel,
  openaiMessagesModel,
} from "@workspace/integrations-anthropic-ai";
import { openaiChatJson, openaiChatText } from "./openai-chat";

export const resumeLlmBackend: ResumeLlmBackend = getResumeLlmBackend();

const anthropicModelId = anthropicMessagesModel();
const openaiModelId = openaiMessagesModel();

async function anthropicJsonText(system: string, user: string, maxTokens: number): Promise<string> {
  const message = await getAnthropic().messages.create({
    model: anthropicModelId,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected non-text response from AI");
  }
  return content.text;
}

export async function resumeCompleteJson(
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  if (resumeLlmBackend === "openai") {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    return openaiChatJson({
      apiKey: key,
      model: openaiModelId,
      system,
      user,
      maxTokens,
    });
  }
  return anthropicJsonText(system, user, maxTokens);
}

export async function resumeCompleteText(
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  if (resumeLlmBackend === "openai") {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    return openaiChatText({
      apiKey: key,
      model: openaiModelId,
      system,
      user,
      maxTokens,
    });
  }
  return anthropicJsonText(system, user, maxTokens);
}

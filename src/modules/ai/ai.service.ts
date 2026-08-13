import { buildPrompt, ContextBuilder } from "./context-builder";
import {
  deleteAssistantMessagesOlderThan,
  findRecentAssistantMessages,
  insertAssistantMessage,
} from "./assistant.repository";
import { GeminiClient } from "./gemini.client";

const HISTORY_LIMIT = 10;
const HISTORY_TTL_DAYS = 7;

export class AiService {
  constructor(
    private readonly contextBuilder = new ContextBuilder(),
    private readonly geminiClient = new GeminiClient(),
  ) {}

  async sendMessage(
    firebaseUid: string,
    message: string,
  ): Promise<string> {
    const context = await this.contextBuilder.build(firebaseUid);

    await deleteAssistantMessagesOlderThan(
      context.user.id,
      HISTORY_TTL_DAYS,
    );

    const history = await findRecentAssistantMessages(
      context.user.id,
      HISTORY_LIMIT,
    );

    await insertAssistantMessage(context.user.id, "user", message);

    const prompt = buildPrompt(
      context,
      message,
      history.map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
    );

    const reply = await this.geminiClient.generate(prompt);

    await insertAssistantMessage(
      context.user.id,
      "assistant",
      reply,
    );

    return reply;
  }
}

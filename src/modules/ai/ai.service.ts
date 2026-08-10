import { buildPrompt, ContextBuilder } from "./context-builder";
import { GeminiClient } from "./gemini.client";

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
    const prompt = buildPrompt(context, message);

    return this.geminiClient.generate(prompt);
  }
}

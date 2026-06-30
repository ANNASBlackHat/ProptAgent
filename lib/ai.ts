import OpenAI from 'openai';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Get OpenAI client — reads config from SystemSettings first, falls back to env.
 * Called per-request so settings changes take effect without restart.
 */
async function getOpenAIClient(): Promise<{ client: OpenAI; model: string }> {
  let apiKey = process.env.AI_API_KEY;
  let model = process.env.AI_MODEL || 'gpt-4o-mini';
  const baseURL = process.env.AI_BASE_URL;

  try {
    // Dynamically import to avoid circular deps at build time
    const { dbConnect } = await import('@/lib/db');
    const { default: SystemSettings, decryptField } = await import('@/models/SystemSettings');
    await dbConnect();
    const settings = await SystemSettings.getSingleton();

    if (settings.openaiApiKey) {
      const decrypted = decryptField(settings.openaiApiKey);
      if (decrypted) apiKey = decrypted;
    }
    if (settings.aiModel) {
      model = settings.aiModel;
    }
  } catch {
    // Fall back to env vars silently
  }

  const client = new OpenAI({
    apiKey: apiKey || 'dummy-key-to-prevent-build-errors',
    baseURL: baseURL || undefined,
  });

  return { client, model };
}

/**
 * Call the OpenAI Chat Completions API
 * @param messages - Chat message array
 * @param systemPrompt - Optional system instructions to prepend to the messages list
 */
export async function callAI(
  messages: AIMessage[],
  systemPrompt?: string,
  options?: { responseFormat?: 'json_object' | 'text' }
): Promise<string> {
  const { client, model } = await getOpenAIClient();

  try {
    console.log(`[AI Call] Sending ${messages.length} messages. Model: ${model}`);

    const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }

    messages.forEach((msg) => {
      formattedMessages.push({ role: msg.role, content: msg.content });
    });

    const completion = await client.chat.completions.create({
      model,
      messages: formattedMessages,
      response_format: options?.responseFormat ? { type: options.responseFormat } : undefined,
    });

    const response = completion.choices[0]?.message?.content || '';
    console.log(`[AI Call] Success. Response length: ${response.length} chars.`);
    return response;
  } catch (error) {
    console.error('[AI Call] OpenAI API call failed:', error);
    throw error;
  }
}

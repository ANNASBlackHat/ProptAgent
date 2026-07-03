import OpenAI from 'openai';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Helper to retrieve resolved AI configuration.
 * SystemSettings database values take priority over .env variables.
 */
export async function getAIConfig(): Promise<{
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}> {
  let provider = '';
  let baseUrl = '';
  let apiKey = '';
  let model = '';

  try {
    // Dynamically import to avoid circular deps at build time
    const { dbConnect } = await import('@/lib/db');
    const { default: SystemSettings, decryptField } = await import('@/models/SystemSettings');
    await dbConnect();
    const settings = await SystemSettings.getSingleton();

    if (settings) {
      provider = settings.aiProvider || '';
      baseUrl = settings.aiBaseUrl || '';
      model = settings.aiModel || '';

      const resolvedApiKeyEncrypted = settings.aiApiKey || settings.openaiApiKey;
      if (resolvedApiKeyEncrypted) {
        const decrypted = decryptField(resolvedApiKeyEncrypted);
        if (decrypted) {
          apiKey = decrypted;
        }
      }
    }
  } catch (error) {
    console.error('[AI Config] Failed to fetch settings from DB:', error);
  }

  // Resolve config: SystemSettings values take priority over .env vars
  provider = provider || process.env.AI_PROVIDER || 'openai';
  baseUrl = baseUrl !== undefined && baseUrl !== '' ? baseUrl : (process.env.AI_BASE_URL || '');
  apiKey = apiKey || process.env.AI_API_KEY || '';
  model = model || process.env.AI_MODEL || 'gpt-4o-mini';

  return { provider, baseUrl, apiKey, model };
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
  const { baseUrl, apiKey, model } = await getAIConfig();

  if (!apiKey) {
    throw new Error('AI API key is not configured');
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseUrl || undefined,
  });

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

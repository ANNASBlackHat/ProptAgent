import OpenAI from 'openai';

const AI_API_KEY = process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL;

console.log('[AI Init] Base URL:', AI_BASE_URL || 'default (OpenAI)');
console.log('[AI Init] Model:', process.env.AI_MODEL || 'gpt-4o-mini');
console.log('[AI Init] API Key configured:', !!AI_API_KEY);

// Initialize the OpenAI client. We fall back to a dummy key to prevent crashes 
// during build-time or before the buyer enters their key.
const openai = new OpenAI({
  apiKey: AI_API_KEY || 'dummy-key-to-prevent-build-errors',
  baseURL: AI_BASE_URL || undefined,
});

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
  try {
    console.log(`[AI Call] Sending ${messages.length} messages. System prompt length: ${systemPrompt?.length || 0}`);
    
    const formattedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      formattedMessages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.forEach((msg) => {
      formattedMessages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: formattedMessages,
      response_format: options?.responseFormat ? { type: options.responseFormat } : undefined,
    });

    const response = completion.choices[0]?.message?.content || '';
    console.log(`[AI Call] Success. Response length: ${response.length} chars.`);
    return response;
  } catch (error) {
    console.error('[AI Call] OpenAI API call failed. Connection Configuration:', {
      baseURL: AI_BASE_URL || 'default',
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      apiKeyLength: AI_API_KEY?.length || 0,
    });
    console.error('[AI Call] Error details:', error);
    throw error;
  }
}

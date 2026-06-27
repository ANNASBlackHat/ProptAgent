import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

// Initialize the OpenAI client. We fall back to a dummy key to prevent crashes 
// during build-time or before the buyer enters their key.
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY || 'dummy-key-to-prevent-build-errors',
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
  systemPrompt?: string
): Promise<string> {
  try {
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
      model: AI_MODEL,
      messages: formattedMessages,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    throw error;
  }
}

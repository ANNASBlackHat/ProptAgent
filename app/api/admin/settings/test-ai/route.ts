import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { getAIConfig } from '@/lib/ai';
import OpenAI from 'openai';

// POST /api/admin/settings/test-ai — send a test prompt using configured API key
async function handler(_req: AuthenticatedRequest): Promise<Response> {
  try {
    const config = await getAIConfig();

    if (!config.apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is not configured' },
        { status: 400 }
      );
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || undefined,
    });

    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
      max_tokens: 10,
    });

    const response = completion.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({
      success: true,
      data: {
        response,
        provider: config.provider,
        model: config.model,
        baseUrl: config.baseUrl,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'AI connection test failed';
    console.error('[Admin] test-ai error:', error);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler, ['super_admin']);

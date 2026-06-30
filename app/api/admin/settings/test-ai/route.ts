import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { getDecryptedSettings } from '@/lib/settings';
import OpenAI from 'openai';

// POST /api/admin/settings/test-ai — send a test prompt using configured API key
async function handler(_req: AuthenticatedRequest): Promise<Response> {
  try {
    const settings = await getDecryptedSettings();

    if (!settings.openaiApiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key is not configured' },
        { status: 400 }
      );
    }

    const client = new OpenAI({
      apiKey: settings.openaiApiKey,
      baseURL: process.env.AI_BASE_URL || undefined,
    });

    const completion = await client.chat.completions.create({
      model: settings.aiModel || 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Respond with: OK' }],
      max_tokens: 10,
    });

    const response = completion.choices[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      data: { response, model: settings.aiModel },
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

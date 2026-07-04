import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '../../../../../lib/auth';
import { getStripeClient } from '../../../../../lib/stripe';
import { getDecryptedSettings } from '../../../../../lib/settings';

async function testStripeConnectionHandler(req: AuthenticatedRequest): Promise<Response> {
  try {
    if (!req.user || req.user.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access required' }, { status: 403 });
    }

    const settings = await getDecryptedSettings();
    if (!settings.stripeSecretKey) {
      return NextResponse.json(
        { success: false, error: 'Stripe secret key is not configured.' },
        { status: 400 }
      );
    }

    const stripe = await getStripeClient();
    
    // Create a SetupIntent
    const intent = await stripe.setupIntents.create({
      usage: 'off_session',
    });

    // Immediately cancel the SetupIntent to tidy up
    if (intent && intent.id) {
      try {
        await stripe.setupIntents.cancel(intent.id);
      } catch (cancelErr) {
        console.warn('[Stripe Test] Failed to cancel test SetupIntent, ignoring:', cancelErr);
      }
    }

    const mode = settings.stripeSecretKey.startsWith('sk_live') ? 'live' : 'test';

    return NextResponse.json({
      success: true,
      data: {
        mode,
      },
    });
  } catch (error) {
    console.error('[Stripe Connection Test] Verification failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Stripe authentication or API configuration failed.',
      },
      { status: 500 }
    );
  }
}

export const POST = withAuth(testStripeConnectionHandler, ['super_admin']);
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '../../../../lib/auth';
import { dbConnect } from '../../../../lib/db';
import User from '../../../../models/User';
import { getStripeClient } from '../../../../lib/stripe';
import { getDecryptedSettings } from '../../../../lib/settings';

async function createPortalHandler(req: AuthenticatedRequest): Promise<Response> {
  try {
    await dbConnect();

    if (!req.user || !req.user.userId) {
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
    }

    const settings = await getDecryptedSettings();
    if (!settings.stripeEnabled) {
      return NextResponse.json(
        { success: false, error: 'Stripe integration is disabled' },
        { status: 400 }
      );
    }

    const landlord = await User.findById(req.user.userId);
    if (!landlord) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const customerId = landlord.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'No active Stripe billing customer profile found. Please subscribe to a paid plan first.' },
        { status: 400 }
      );
    }

    const stripe = await getStripeClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/billing`,
    });

    return NextResponse.json({
      success: true,
      data: { portalUrl: session.url },
    });
  } catch (error) {
    console.error('[Stripe Portal] Session creation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(createPortalHandler, ['landlord']);
export const dynamic = 'force-dynamic';

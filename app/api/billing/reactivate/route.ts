import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '../../../../lib/auth';
import { dbConnect } from '../../../../lib/db';
import User from '../../../../models/User';
import { getStripeClient } from '../../../../lib/stripe';
import { getDecryptedSettings } from '../../../../lib/settings';

async function reactivateSubscriptionHandler(req: AuthenticatedRequest): Promise<Response> {
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

    const subscriptionId = landlord.stripeSubscriptionId;
    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: 'No active Stripe subscription found to reactivate.' },
        { status: 400 }
      );
    }

    const stripe = await getStripeClient();

    // Update Stripe subscription to turn off cancel_at_period_end
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    // Update user record
    landlord.cancelAtPeriodEnd = false;
    await landlord.save();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('[Stripe Reactivate] Subscription reactivation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(reactivateSubscriptionHandler, ['landlord']);
export const dynamic = 'force-dynamic';

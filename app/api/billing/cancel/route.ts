import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '../../../../lib/auth';
import { dbConnect } from '../../../../lib/db';
import User from '../../../../models/User';
import Plan from '../../../../models/Plan';
import { getStripeClient } from '../../../../lib/stripe';
import { getDecryptedSettings } from '../../../../lib/settings';
import { sendSubscriptionCancelledEmail } from '../../../../lib/email';

async function cancelSubscriptionHandler(req: AuthenticatedRequest): Promise<Response> {
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
        { success: false, error: 'No active Stripe subscription found to cancel.' },
        { status: 400 }
      );
    }

    const stripe = await getStripeClient();
    
    const sub = (await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })) as any;

    const accessUntil = new Date(sub.current_period_end * 1000);

    // Update user record
    landlord.cancelAtPeriodEnd = true;
    landlord.currentPeriodEnd = accessUntil;
    await landlord.save();

    // Resolve plan name
    let planName = 'Premium Plan';
    if (landlord.planSlug) {
      const plan = await Plan.findOne({ slug: landlord.planSlug });
      if (plan) planName = plan.name;
    }

    // Send confirmation email
    try {
      await sendSubscriptionCancelledEmail(landlord.email, {
        planName,
        accessUntil,
      });
    } catch (emailErr) {
      console.error('[Billing API] Error sending cancellation email:', emailErr);
    }

    return NextResponse.json({
      success: true,
      data: { accessUntil },
    });
  } catch (error) {
    console.error('[Stripe Cancel] Subscription cancel error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(cancelSubscriptionHandler, ['landlord']);
export const dynamic = 'force-dynamic';

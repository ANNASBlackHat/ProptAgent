import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '../../../../../../lib/auth';
import { dbConnect } from '../../../../../../lib/db';
import User from '../../../../../../models/User';
import { getStripeClient } from '../../../../../../lib/stripe';
import { getDecryptedSettings } from '../../../../../../lib/settings';

async function forceCancelSubscriptionHandler(
  req: AuthenticatedRequest,
  { params }: { params: { landlordId: string } }
): Promise<Response> {
  try {
    await dbConnect();

    if (!req.user || req.user.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access required' }, { status: 403 });
    }

    const { landlordId } = params;
    const body = await req.json();
    const { reason } = body;

    const landlord = await User.findById(landlordId);
    if (!landlord) {
      return NextResponse.json({ success: false, error: 'Landlord profile not found' }, { status: 404 });
    }

    const subscriptionId = landlord.stripeSubscriptionId;
    const settings = await getDecryptedSettings();

    // Cancel in Stripe if stripe is active and subscription ID is present
    if (subscriptionId && settings.stripeEnabled) {
      try {
        const stripe = await getStripeClient();
        await stripe.subscriptions.cancel(subscriptionId);
      } catch (stripeErr) {
        console.error('[Admin Cancel] Stripe cancel API invocation error:', stripeErr);
        // Continue DB downgrade anyway in case subscription is already closed in Stripe
      }
    }

    // Downgrade database status immediately to Free
    landlord.planId = null;
    landlord.planSlug = 'free';
    landlord.subscriptionStatus = 'cancelled';
    landlord.stripeSubscriptionId = null;
    landlord.cancelAtPeriodEnd = false;
    landlord.currentPeriodStart = null;
    landlord.currentPeriodEnd = null;

    // Append to audit trail
    if (!landlord.subscriptionAuditTrail) {
      landlord.subscriptionAuditTrail = [];
    }
    landlord.subscriptionAuditTrail.push({
      action: 'force-cancel',
      reason: reason || 'Forced admin subscription cancellation',
      timestamp: new Date(),
    });

    await landlord.save();

    return NextResponse.json({
      success: true,
      message: 'Subscription was forced cancelled immediately and downgraded to Free.',
    });
  } catch (error) {
    console.error('[Admin Force Cancel] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(forceCancelSubscriptionHandler, ['super_admin']);
export const dynamic = 'force-dynamic';

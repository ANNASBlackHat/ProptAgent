import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Plan from '@/models/Plan';
import { getStripeClient } from '@/lib/stripe';

async function successHandler(req: AuthenticatedRequest): Promise<Response> {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'session_id is required' },
        { status: 400 }
      );
    }

    const stripe = await getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!req.user || !req.user.userId) {
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
    }

    // Verify metadata landlordId matches current authenticated user
    const sessionLandlordId = session.metadata?.landlordId;
    if (sessionLandlordId !== req.user.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session landlord ID does not match current user' },
        { status: 403 }
      );
    }

    const planSlug = session.metadata?.planSlug;
    const plan = await Plan.findOne({ slug: planSlug });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        planName: plan?.name || 'Premium Plan',
        planSlug,
        customerEmail: session.customer_details?.email,
        paymentStatus: session.payment_status,
        status: session.status,
      },
    });
  } catch (error) {
    console.error('[Stripe] Success check error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(successHandler, ['landlord']);
export const dynamic = 'force-dynamic';

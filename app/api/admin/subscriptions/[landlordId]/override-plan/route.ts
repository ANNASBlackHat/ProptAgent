import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '../../../../../../lib/auth';
import { dbConnect } from '../../../../../../lib/db';
import User from '../../../../../../models/User';
import Plan from '../../../../../../models/Plan';

async function overridePlanHandler(
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
    const { planSlug, reason } = body;

    if (!planSlug) {
      return NextResponse.json({ success: false, error: 'Target planSlug is required' }, { status: 400 });
    }

    const landlord = await User.findById(landlordId);
    if (!landlord) {
      return NextResponse.json({ success: false, error: 'Landlord profile not found' }, { status: 404 });
    }

    let planId = null;

    if (planSlug !== 'free') {
      const plan = await Plan.findOne({ slug: planSlug });
      if (!plan) {
        return NextResponse.json({ success: false, error: `Plan '${planSlug}' not found` }, { status: 404 });
      }
      planId = plan._id;
    }

    // Set updated subscription details bypassing Stripe
    landlord.planId = planId;
    landlord.planSlug = planSlug;
    landlord.subscriptionStatus = planSlug === 'free' ? 'none' : 'active';
    landlord.cancelAtPeriodEnd = false;
    landlord.currentPeriodStart = planSlug === 'free' ? null : new Date();
    landlord.currentPeriodEnd = planSlug === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days extension

    // Append to audit trail
    if (!landlord.subscriptionAuditTrail) {
      landlord.subscriptionAuditTrail = [];
    }
    landlord.subscriptionAuditTrail.push({
      action: 'override-plan',
      planSlug,
      reason: reason || 'Manual admin plan assignment override',
      timestamp: new Date(),
    });

    await landlord.save();

    return NextResponse.json({
      success: true,
      message: `Manually comped landlord to '${planSlug}' tier successfully.`,
    });
  } catch (error) {
    console.error('[Admin Override Plan] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(overridePlanHandler, ['super_admin']);
export const dynamic = 'force-dynamic';

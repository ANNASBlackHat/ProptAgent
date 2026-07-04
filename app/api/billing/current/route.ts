import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '../../../../lib/auth';
import { dbConnect } from '../../../../lib/db';
import Plan from '../../../../models/Plan';
import Property from '../../../../models/Property';
import Unit from '../../../../models/Unit';
import { getLandlordPlanLimits } from '../../../../lib/planLimits';
import { getStripeClient } from '../../../../lib/stripe';
import { getDecryptedSettings } from '../../../../lib/settings';

async function currentBillingHandler(req: AuthenticatedRequest): Promise<Response> {
  try {
    await dbConnect();

    if (!req.user || !req.user.userId) {
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
    }

    const landlordId = req.user.userId;
    const { landlord, limits } = await getLandlordPlanLimits(landlordId);

    if (!landlord) {
      return NextResponse.json({ success: false, error: 'Landlord profile not found' }, { status: 404 });
    }

    // Resolve plan name, price, yearlyPrice
    let planName = 'Free';
    let planSlug = 'free';
    let price = 0;
    let yearlyPrice = 0;

    if (landlord.planSlug) {
      const plan = await Plan.findOne({ slug: landlord.planSlug });
      if (plan) {
        planName = plan.name;
        planSlug = plan.slug;
        price = plan.price;
        yearlyPrice = plan.yearlyPrice;
      }
    }

    // Calculate usage statistics
    const propertiesCount = await Property.countDocuments({ landlordId, isActive: true });
    const unitsCount = await Unit.countDocuments({ landlordId, isActive: true });
    const activeListingsCount = await Unit.countDocuments({ landlordId, status: 'available', isActive: true });
    const applicationsCount = landlord.usageThisMonth?.applications || 0;

    // Get billing interval from Stripe if subscription exists
    let interval = planSlug === 'free' ? 'none' : 'monthly';
    const settings = await getDecryptedSettings();
    if (landlord.stripeSubscriptionId && settings.stripeEnabled) {
      try {
        const stripe = await getStripeClient();
        const sub = (await stripe.subscriptions.retrieve(landlord.stripeSubscriptionId)) as any;
        interval = sub.items.data[0]?.price.recurring?.interval || 'monthly';
      } catch (err) {
        console.error('[Billing API] Error fetching stripe subscription details:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        plan: {
          name: planName,
          slug: planSlug,
          price,
          yearlyPrice,
          limits,
        },
        subscription: {
          status: landlord.subscriptionStatus || 'none',
          currentPeriodStart: landlord.currentPeriodStart || null,
          currentPeriodEnd: landlord.currentPeriodEnd || null,
          trialEndsAt: landlord.trialEndsAt || null,
          cancelAtPeriodEnd: landlord.cancelAtPeriodEnd || false,
          interval,
        },
        usage: {
          properties: {
            current: propertiesCount,
            limit: limits.maxProperties,
          },
          unitsTotal: {
            current: unitsCount,
          },
          activeListings: {
            current: activeListingsCount,
            limit: limits.maxActiveListings,
          },
          applicationsThisMonth: {
            current: applicationsCount,
            limit: limits.maxApplicationsPerMonth,
          },
        },
      },
    });
  } catch (error) {
    console.error('[Billing API] Failed to fetch current billing stats:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(currentBillingHandler, ['landlord']);
export const dynamic = 'force-dynamic';

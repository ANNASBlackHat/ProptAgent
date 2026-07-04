import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Plan from '@/models/Plan';
import User from '@/models/User';
import { getStripeClient } from '@/lib/stripe';
import { getDecryptedSettings } from '@/lib/settings';

async function createCheckoutHandler(req: AuthenticatedRequest): Promise<Response> {
  try {
    await dbConnect();

    const settings = await getDecryptedSettings();
    if (!settings.stripeEnabled) {
      return NextResponse.json(
        { success: false, error: 'Stripe integration is disabled in Admin Settings' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { planSlug, billingInterval } = body;

    if (!planSlug || !['monthly', 'yearly'].includes(billingInterval)) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters. Need planSlug and billingInterval' },
        { status: 400 }
      );
    }

    const plan = await Plan.findOne({ slug: planSlug, isActive: true });
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Active plan not found' },
        { status: 404 }
      );
    }

    if (plan.price === 0) {
      return NextResponse.json(
        { success: false, error: 'Free plan does not require a checkout session' },
        { status: 400 }
      );
    }

    const stripe = await getStripeClient();

    // Sync on the fly if price IDs are missing
    if (!plan.stripePriceIdMonthly || (billingInterval === 'yearly' && plan.yearlyPrice > 0 && !plan.stripePriceIdYearly)) {
      let product;
      if (plan.stripeProductId) {
        try {
          product = await stripe.products.retrieve(plan.stripeProductId);
        } catch {
          product = await stripe.products.create({
            name: plan.name,
            description: plan.description || undefined,
          });
        }
      } else {
        product = await stripe.products.create({
          name: plan.name,
          description: plan.description || undefined,
        });
      }
      plan.stripeProductId = product.id;

      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price,
        currency: settings.stripeCurrency.toLowerCase(),
        recurring: { interval: 'month' },
      });
      plan.stripePriceIdMonthly = monthlyPrice.id;

      if (plan.yearlyPrice > 0) {
        const yearlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.yearlyPrice,
          currency: settings.stripeCurrency.toLowerCase(),
          recurring: { interval: 'year' },
        });
        plan.stripePriceIdYearly = yearlyPrice.id;
      }
      await plan.save();
    }

    const priceId = billingInterval === 'yearly' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: `Stripe price ID for interval '${billingInterval}' is missing.` },
        { status: 400 }
      );
    }

    if (!req.user || !req.user.userId) {
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
    }

    // Get or Create Stripe Customer
    const landlord = await User.findById(req.user.userId);
    if (!landlord) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    let customerId = landlord.stripeCustomerId;
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: landlord.email,
        name: landlord.name,
        metadata: { landlordId: landlord._id.toString() },
      });
      customerId = customer.id;
      landlord.stripeCustomerId = customerId;
      await landlord.save();
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const sessionConfig: any = {
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/api/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing/cancelled`,
      metadata: {
        landlordId: landlord._id.toString(),
        planSlug: plan.slug,
      },
    };

    if (plan.trialDays > 0) {
      sessionConfig.subscription_data = {
        trial_period_days: plan.trialDays,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({
      success: true,
      data: { checkoutUrl: session.url },
    });
  } catch (error) {
    console.error('[Stripe] Checkout creation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(createCheckoutHandler, ['landlord']);
export const dynamic = 'force-dynamic';

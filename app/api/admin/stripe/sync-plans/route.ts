import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import Plan from '@/models/Plan';
import { getStripeClient } from '@/lib/stripe';
import { getDecryptedSettings } from '@/lib/settings';

async function syncPlansHandler(_req: AuthenticatedRequest): Promise<Response> {
  try {
    await dbConnect();
    
    // Check if Stripe is configured and enabled
    const settings = await getDecryptedSettings();
    if (!settings.stripeEnabled) {
      return NextResponse.json(
        { success: false, error: 'Stripe integration is disabled in Admin Settings' },
        { status: 400 }
      );
    }

    const stripe = await getStripeClient();
    const activePlans = await Plan.find({ isActive: true });
    const syncedNames: string[] = [];

    for (const plan of activePlans) {
      // Free plan (price = 0) has no Stripe products or prices
      if (plan.price === 0) {
        continue;
      }

      // 1. Create or retrieve Product
      let product;
      if (plan.stripeProductId) {
        try {
          product = await stripe.products.retrieve(plan.stripeProductId);
          if (product.name !== plan.name || product.description !== plan.description) {
            product = await stripe.products.update(plan.stripeProductId, {
              name: plan.name,
              description: plan.description || undefined,
            });
          }
        } catch {
          // Recreate if deleted/invalid
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

      // 2. Create or retrieve Monthly Price
      let monthlyPrice;
      if (plan.stripePriceIdMonthly) {
        try {
          monthlyPrice = await stripe.prices.retrieve(plan.stripePriceIdMonthly);
          if (monthlyPrice.unit_amount !== plan.price || monthlyPrice.currency !== settings.stripeCurrency.toLowerCase()) {
            monthlyPrice = await stripe.prices.create({
              product: product.id,
              unit_amount: plan.price,
              currency: settings.stripeCurrency.toLowerCase(),
              recurring: { interval: 'month' },
            });
          }
        } catch {
          monthlyPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: plan.price,
            currency: settings.stripeCurrency.toLowerCase(),
            recurring: { interval: 'month' },
          });
        }
      } else {
        monthlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.price,
          currency: settings.stripeCurrency.toLowerCase(),
          recurring: { interval: 'month' },
        });
      }

      plan.stripePriceIdMonthly = monthlyPrice.id;

      // 3. Create or retrieve Yearly Price (optional)
      if (plan.yearlyPrice > 0) {
        let yearlyPrice;
        if (plan.stripePriceIdYearly) {
          try {
            yearlyPrice = await stripe.prices.retrieve(plan.stripePriceIdYearly);
            if (yearlyPrice.unit_amount !== plan.yearlyPrice || yearlyPrice.currency !== settings.stripeCurrency.toLowerCase()) {
              yearlyPrice = await stripe.prices.create({
                product: product.id,
                unit_amount: plan.yearlyPrice,
                currency: settings.stripeCurrency.toLowerCase(),
                recurring: { interval: 'year' },
              });
            }
          } catch {
            yearlyPrice = await stripe.prices.create({
              product: product.id,
              unit_amount: plan.yearlyPrice,
              currency: settings.stripeCurrency.toLowerCase(),
              recurring: { interval: 'year' },
            });
          }
        } else {
          yearlyPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: plan.yearlyPrice,
            currency: settings.stripeCurrency.toLowerCase(),
            recurring: { interval: 'year' },
          });
        }

        plan.stripePriceIdYearly = yearlyPrice.id;
      } else {
        plan.stripePriceIdYearly = undefined;
      }

      await plan.save();
      syncedNames.push(plan.name);
    }

    return NextResponse.json({
      success: true,
      data: { synced: syncedNames },
    });
  } catch (error) {
    console.error('[Stripe] Sync error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(syncPlansHandler, ['super_admin']);
export const dynamic = 'force-dynamic';

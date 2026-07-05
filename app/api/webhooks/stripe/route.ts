import { dbConnect } from '../../../../lib/db';
import User from '../../../../models/User';
import Plan from '../../../../models/Plan';
import { getStripeClient } from '../../../../lib/stripe';
import { getDecryptedSettings } from '../../../../lib/settings';
import {
  sendSubscriptionActivatedEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentFailedEmail,
  sendPaymentSucceededEmail,
  sendTrialEndingEmail,
} from '../../../../lib/email';
import Stripe from 'stripe';


export async function POST(req: Request): Promise<Response> {
  // Return 200 immediately as a best practice for Stripe webhook responses
  // and process the business logic in a try-catch to log errors.
  try {
    await dbConnect();

    const settings = await getDecryptedSettings();
    if (!settings.stripeEnabled) {
      console.warn('[Stripe Webhook] Webhook received but Stripe is disabled in Settings.');
      return new Response('Stripe Disabled', { status: 200 });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('[Stripe Webhook] Missing stripe-signature header.');
      return new Response('Bad Request', { status: 400 });
    }

    const stripe = await getStripeClient();
    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        settings.stripeWebhookSecret
      );
    } catch (err: any) {
      console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`[Stripe Webhook] Event received: ${event.type} (ID: ${event.id})`);

    // Business logic handling for subscription lifecycle
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const landlordId = session.metadata?.landlordId;
        const planSlug = session.metadata?.planSlug;

        if (landlordId && planSlug) {
          const subscriptionId = session.subscription as string;
          const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as any;
          const plan = await Plan.findOne({ slug: planSlug });

          const currentPeriodStart = new Date(subscription.current_period_start * 1000);
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
          const status = subscription.status;

          await User.findByIdAndUpdate(landlordId, {
            planId: plan?._id || null,
            planSlug,
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: session.customer as string,
            subscriptionStatus: status === 'trialing' ? 'trialing' : 'active',
            currentPeriodStart,
            currentPeriodEnd,
            trialEndsAt,
          });

          const landlord = await User.findById(landlordId);
          if (landlord) {
            await sendSubscriptionActivatedEmail(landlord.email, {
              planName: plan?.name || planSlug,
              nextBillingDate: currentPeriodEnd,
              amount: plan?.price || 0,
            });
          }
          console.log(`[Stripe Webhook] Activated plan ${planSlug} for Landlord ID: ${landlordId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;
        const landlord = await User.findOne({ stripeCustomerId: customerId });

        if (landlord) {
          const currentPeriodStart = new Date(subscription.current_period_start * 1000);
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

          const status = subscription.status;
          let subscriptionStatus: string = 'active';
          if (status === 'trialing') subscriptionStatus = 'trialing';
          else if (status === 'past_due') subscriptionStatus = 'past_due';
          else if (status === 'canceled' || status === 'unpaid') subscriptionStatus = 'cancelled';

          const priceId = subscription.items.data[0].price.id;
          const plan = await Plan.findOne({
            $or: [{ stripePriceIdMonthly: priceId }, { stripePriceIdYearly: priceId }],
          });

          const updateData: any = {
            subscriptionStatus,
            currentPeriodStart,
            currentPeriodEnd,
            trialEndsAt,
          };

          if (plan && plan.slug !== landlord.planSlug) {
            updateData.planId = plan._id;
            updateData.planSlug = plan.slug;
          }

          await User.findByIdAndUpdate(landlord._id, updateData);
          console.log(`[Stripe Webhook] Updated subscription for Landlord ID: ${landlord._id}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;
        const landlord = await User.findOne({ stripeCustomerId: customerId });

        if (landlord) {
          const freePlan = await Plan.findOne({ slug: 'free' });
          await User.findByIdAndUpdate(landlord._id, {
            planId: freePlan?._id || null,
            planSlug: 'free',
            subscriptionStatus: 'cancelled',
            stripeSubscriptionId: null,
          });

          await sendSubscriptionCancelledEmail(landlord.email, {
            planName: landlord.planSlug || 'Premium',
            accessUntil: new Date(),
          });
          console.log(`[Stripe Webhook] Cancelled subscription and downgraded Landlord ID: ${landlord._id}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;
        const landlord = await User.findOne({ stripeCustomerId: customerId });

        if (landlord) {
          await User.findByIdAndUpdate(landlord._id, {
            subscriptionStatus: 'past_due',
          });

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          if (landlord.notificationPreferences?.paymentPastDue !== false) {
            await sendPaymentFailedEmail(landlord.email, {
              planName: landlord.planSlug || 'Premium',
              updatePaymentUrl: `${appUrl}/billing`,
            });
          }
          console.log(`[Stripe Webhook] Payment failed. Set past_due on Landlord ID: ${landlord._id}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;
        const landlord = await User.findOne({ stripeCustomerId: customerId });

        if (landlord) {
          const subscriptionId = invoice.subscription as string;
          let nextBillingDate = new Date();
          if (subscriptionId) {
            try {
              const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as any;
              nextBillingDate = new Date(subscription.current_period_end * 1000);

              const updateData: any = {
                currentPeriodEnd: nextBillingDate,
              };
              if (landlord.subscriptionStatus === 'past_due') {
                updateData.subscriptionStatus = 'active';
              }
              await User.findByIdAndUpdate(landlord._id, updateData);
            } catch (err) {
              console.error('[Stripe Webhook] Failed to retrieve subscription for invoicing:', err);
            }
          }

          await sendPaymentSucceededEmail(landlord.email, {
            planName: landlord.planSlug || 'Premium',
            amount: invoice.amount_paid,
            nextBillingDate,
          });
          console.log(`[Stripe Webhook] Payment succeeded. Updated period for Landlord ID: ${landlord._id}`);
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;
        const landlord = await User.findOne({ stripeCustomerId: customerId });

        if (landlord) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          await sendTrialEndingEmail(landlord.email, {
            planName: landlord.planSlug || 'Premium',
            trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000) : new Date(),
            upgradeUrl: `${appUrl}/pricing`,
          });
          console.log(`[Stripe Webhook] Trial will end notification sent for Landlord ID: ${landlord._id}`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return new Response('Success', { status: 200 });
  } catch (error) {
    console.error('[Stripe Webhook] Process error:', error);
    return new Response('Webhook Event Failure Handled', { status: 200 });
  }
}

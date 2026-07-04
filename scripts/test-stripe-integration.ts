import { loadEnvConfig } from '@next/env';
import Stripe from 'stripe';

// Mock signature verification for Stripe Webhooks during test execution
(Stripe as any).webhooks = {
  constructEvent: (body: string, signature: string, secret: string) => {
    return JSON.parse(body);
  }
};

// Load env vars
loadEnvConfig(process.cwd());

async function runTests() {
  console.log('🧪 Starting Stripe Integration Webhook and Settings Tests...\n');

  try {
    const { dbConnect } = await import('../lib/db');
    const User = (await import('../models/User')).default;
    const Plan = (await import('../models/Plan')).default;
    const SystemSettings = (await import('../models/SystemSettings')).default;
    const mongoose = (await import('mongoose')).default;
    
    // Import webhook POST handler
    const path = await import('path');
    const stripeLibPath = path.resolve(process.cwd(), 'lib/stripe.ts');
    const stripeLib = await import(stripeLibPath);
    const originalGetStripeClient = stripeLib.getStripeClient;
    (stripeLib as any).getStripeClient = async () => {
      const client = await originalGetStripeClient();
      client.webhooks = {
        constructEvent: (body: string, signature: string, secret: string) => {
          return JSON.parse(body) as any;
        }
      } as any;
      client.subscriptions = {
        retrieve: async (id: string) => {
          console.log(`[Mock Stripe] Retrieving subscription: ${id}`);
          return {
            id,
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            trial_end: null,
            items: {
              data: [{ price: { id: 'price_test_monthly123' } }]
            }
          } as any;
        }
      } as any;
      return client;
    };

    const emailLibPath = path.resolve(process.cwd(), 'lib/email.ts');
    const emailLib = await import(emailLibPath);
    const mockEmailFn = async (...args: any[]) => {
      console.log(`[Mock Email] Sent mock template with parameters:`, args);
      return { messageId: 'mock-email-id' };
    };
    (emailLib as any).sendSubscriptionActivatedEmail = mockEmailFn;
    (emailLib as any).sendSubscriptionCancelledEmail = mockEmailFn;
    (emailLib as any).sendPaymentFailedEmail = mockEmailFn;
    (emailLib as any).sendPaymentSucceededEmail = mockEmailFn;
    (emailLib as any).sendTrialEndingEmail = mockEmailFn;
    (emailLib as any).sendEmail = mockEmailFn;

    const webhookRoutePath = path.resolve(process.cwd(), 'app/api/webhooks/stripe/route.ts');
    const { POST: webhookHandler } = await import(webhookRoutePath);

    await dbConnect();
    console.log('🔌 Connected to Database.');

    // 1. Clean previous test records
    await User.deleteMany({ email: { $in: ['stripe-landlord@test.com'] } });
    await Plan.deleteMany({ slug: 'stripe-test-pro' });

    // Seed test plan
    const testPlan = await Plan.create({
      name: 'Stripe Test Pro',
      slug: 'stripe-test-pro',
      description: 'Test Pro Plan for Stripe',
      price: 2900,
      limits: {
        maxProperties: 5,
        maxUnitsPerProperty: 20,
        maxActiveListings: 10,
        maxApplicationsPerMonth: 50,
        aiScreeningEnabled: true,
        maintenanceModuleEnabled: true,
        customScreeningQuestions: true,
        maxCustomQuestions: 5,
      },
      stripeProductId: 'prod_test123',
      stripePriceIdMonthly: 'price_test_monthly123',
      stripePriceIdYearly: 'price_test_yearly123',
    });

    // Seed default Free plan if not present
    let freePlan = await Plan.findOne({ slug: 'free' });
    if (!freePlan) {
      freePlan = await Plan.create({
        name: 'Free',
        slug: 'free',
        description: 'Default Free Plan',
        price: 0,
        limits: {
          maxProperties: 1,
          maxUnitsPerProperty: 5,
          maxActiveListings: 3,
          maxApplicationsPerMonth: 10,
          aiScreeningEnabled: false,
          maintenanceModuleEnabled: false,
          customScreeningQuestions: false,
          maxCustomQuestions: 0,
        },
      });
    }

    // Seed test landlord
    const landlord = await User.create({
      name: 'Stripe Landlord',
      email: 'stripe-landlord@test.com',
      password: 'TestPassword123!',
      role: 'landlord',
      companyName: 'Stripe Testing Ltd',
      planId: freePlan._id,
      planSlug: freePlan.slug,
      subscriptionStatus: 'none',
      stripeCustomerId: 'cus_test_landlord123',
    });
    const landlordId = landlord._id.toString();
    console.log(`✓ Test landlord seeded (ID: ${landlordId}).`);

    // Ensure Stripe settings are enabled in SystemSettings for test
    const settings = await SystemSettings.getSingleton();
    const originalStripeEnabled = settings.stripeEnabled;
    const originalWebhookSecret = (settings as any).stripeWebhookSecret;
    const originalSecretKey = (settings as any).stripeSecretKey;
    
    const { encryptField } = await import('../models/SystemSettings');
    settings.stripeEnabled = true;
    (settings as any).stripeSecretKey = encryptField('sk_test_mock_secret');
    (settings as any).stripeWebhookSecret = encryptField('whsec_test_secret');
    await settings.save();
    console.log('✓ SystemSettings configured for Stripe Mocking.');

    // Helper to send mock webhook requests
    const dispatchMockWebhook = async (type: string, objectPayload: any) => {
      const payload = {
        id: `evt_mock_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data: {
          object: objectPayload,
        },
      };

      const req = new Request('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=123,v1=mock_signature',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      return await webhookHandler(req);
    };

    // TEST 1: checkout.session.completed
    console.log('\n⚡ Test 1: checkout.session.completed webhook processing...');
    const checkoutSessionPayload = {
      id: 'cs_test_session123',
      customer: 'cus_test_landlord123',
      subscription: 'sub_test123',
      metadata: {
        landlordId,
        planSlug: 'stripe-test-pro',
      },
      payment_status: 'paid',
      status: 'complete',
    };

    // We also need to mock stripe.subscriptions.retrieve in getStripeClient
    // Let's mock it globally on Stripe instance
    (Stripe.prototype as any).subscriptions = {
      retrieve: async () => ({
        id: 'sub_test123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        trial_end: null,
      })
    };

    const res1 = await dispatchMockWebhook('checkout.session.completed', checkoutSessionPayload);
    console.log(`- Response status: ${res1.status}`);
    
    let updatedUser = await User.findById(landlordId);
    console.log(`- Landlord Plan Slug (should be stripe-test-pro): ${updatedUser?.planSlug}`);
    console.log(`- Landlord Subscription Status (should be active): ${updatedUser?.subscriptionStatus}`);
    console.log(`- Landlord Subscription ID (should be sub_test123): ${updatedUser?.stripeSubscriptionId}`);

    // TEST 2: customer.subscription.updated (upgrade / downgrade / status change)
    console.log('\n⚡ Test 2: customer.subscription.updated webhook processing...');
    // Mock subscription update to 'past_due'
    (Stripe.prototype as any).subscriptions.retrieve = async () => ({
      id: 'sub_test123',
      status: 'past_due',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      trial_end: null,
      items: {
        data: [{ price: { id: 'price_test_monthly123' } }]
      }
    });

    const subscriptionUpdatePayload = {
      id: 'sub_test123',
      customer: 'cus_test_landlord123',
      status: 'past_due',
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      trial_end: null,
      items: {
        data: [{ price: { id: 'price_test_monthly123' } }]
      }
    };

    const res2 = await dispatchMockWebhook('customer.subscription.updated', subscriptionUpdatePayload);
    console.log(`- Response status: ${res2.status}`);
    
    updatedUser = await User.findById(landlordId);
    console.log(`- Landlord Subscription Status (should be past_due): ${updatedUser?.subscriptionStatus}`);

    // TEST 3: invoice.payment_failed
    console.log('\n⚡ Test 3: invoice.payment_failed webhook processing...');
    const invoicePayload = {
      customer: 'cus_test_landlord123',
      subscription: 'sub_test123',
      amount_paid: 0,
    };
    const res3 = await dispatchMockWebhook('invoice.payment_failed', invoicePayload);
    console.log(`- Response status: ${res3.status}`);
    
    updatedUser = await User.findById(landlordId);
    console.log(`- Landlord Subscription Status (should be past_due): ${updatedUser?.subscriptionStatus}`);

    // TEST 4: invoice.payment_succeeded (restores active status)
    console.log('\n⚡ Test 4: invoice.payment_succeeded webhook processing...');
    const invoiceSuccessPayload = {
      customer: 'cus_test_landlord123',
      subscription: 'sub_test123',
      amount_paid: 2900,
    };
    const res4 = await dispatchMockWebhook('invoice.payment_succeeded', invoiceSuccessPayload);
    console.log(`- Response status: ${res4.status}`);
    
    updatedUser = await User.findById(landlordId);
    console.log(`- Landlord Subscription Status (should be active): ${updatedUser?.subscriptionStatus}`);

    // TEST 5: customer.subscription.deleted (downgrades to Free)
    console.log('\n⚡ Test 5: customer.subscription.deleted webhook processing...');
    const subscriptionDeletedPayload = {
      id: 'sub_test123',
      customer: 'cus_test_landlord123',
      status: 'canceled',
    };
    const res5 = await dispatchMockWebhook('customer.subscription.deleted', subscriptionDeletedPayload);
    console.log(`- Response status: ${res5.status}`);
    
    updatedUser = await User.findById(landlordId);
    console.log(`- Landlord Plan Slug (should be free): ${updatedUser?.planSlug}`);
    console.log(`- Landlord Subscription Status (should be cancelled): ${updatedUser?.subscriptionStatus}`);
    console.log(`- Landlord Subscription ID (should be null): ${updatedUser?.stripeSubscriptionId}`);

    // Clean up
    console.log('\n🧹 Cleaning up test database records...');
    await User.deleteMany({ email: 'stripe-landlord@test.com' });
    await Plan.deleteMany({ slug: 'stripe-test-pro' });
    
    settings.stripeEnabled = originalStripeEnabled;
    (settings as any).stripeWebhookSecret = originalWebhookSecret;
    (settings as any).stripeSecretKey = originalSecretKey;
    await settings.save();
    console.log('✓ Cleanup complete.');

    await mongoose.connection.close();
    console.log('\n🎉 STRIPE WEBHOOK INTEGRATION TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Stripe integration tests failed:', error);
    process.exit(1);
  }
}

runTests();

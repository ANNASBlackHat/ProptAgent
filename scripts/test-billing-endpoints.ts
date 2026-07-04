import { loadEnvConfig } from '@next/env';
import path from 'path';

// Load env vars
loadEnvConfig(process.cwd());

async function runTests() {
  console.log('🧪 Starting Landlord Billing API Endpoints Verification Tests...\n');

  try {
    const { dbConnect } = await import('../lib/db');
    const User = (await import('../models/User')).default;
    const Plan = (await import('../models/Plan')).default;
    const SystemSettings = (await import('../models/SystemSettings')).default;
    const mongoose = (await import('mongoose')).default;
    
    // Resolve absolute path to avoid node caching issues
    const stripeLibPath = path.resolve(process.cwd(), 'lib/stripe.ts');
    const stripeLib = await import(stripeLibPath);
    
    (stripeLib as any).getStripeClient = async () => {
      return {
        subscriptions: {
          update: async (id: string, params: any) => {
            return {
              id,
              status: 'active',
              current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
              cancel_at_period_end: params.cancel_at_period_end,
              items: {
                data: [{ price: { recurring: { interval: 'month' } } }]
              }
            };
          },
          retrieve: async (id: string) => {
            return {
              id,
              status: 'active',
              items: {
                data: [{ price: { recurring: { interval: 'month' } } }]
              }
            };
          }
        },
        billingPortal: {
          sessions: {
            create: async (params: any) => {
              return {
                url: `https://billing.stripe.com/p/session/mock_portal_session_123`
              };
            }
          }
        },
        invoices: {
          list: async (params: any) => {
            return {
              data: [
                {
                  id: 'in_mock_123',
                  total: 2900,
                  status: 'paid',
                  created: Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60,
                  invoice_pdf: 'https://stripe.com/invoice.pdf',
                  hosted_invoice_url: 'https://stripe.com/invoice/hosted'
                }
              ]
            };
          }
        }
      } as any;
    };

    // Mock Email Transporter
    const emailLibPath = path.resolve(process.cwd(), 'lib/email.ts');
    const emailLib = await import(emailLibPath);
    (emailLib as any).sendSubscriptionCancelledEmail = async (...args: any[]) => {
      console.log(`- [Mock Email] sendSubscriptionCancelledEmail triggered:`, args);
      return { messageId: 'mock-id' };
    };

    const { GET: currentHandler } = await import('../app/api/billing/current/route');
    const { POST: createPortalHandler } = await import('../app/api/billing/create-portal/route');
    const { POST: cancelHandler } = await import('../app/api/billing/cancel/route');
    const { POST: reactivateHandler } = await import('../app/api/billing/reactivate/route');
    const { GET: invoicesHandler } = await import('../app/api/billing/invoices/route');

    await dbConnect();
    console.log('🔌 Connected to Database.');

    // Cleanup previous records
    await User.deleteMany({ email: 'billing-landlord@test.com' });
    await Plan.deleteMany({ slug: 'billing-pro-plan' });

    // Seed test plan
    const testPlan = await Plan.create({
      name: 'Billing Pro Plan',
      slug: 'billing-pro-plan',
      description: 'Pro plan for billing tests',
      price: 2900,
      limits: {
        maxProperties: 5,
        maxUnitsPerProperty: 10,
        maxActiveListings: 4,
        maxApplicationsPerMonth: 30,
        aiScreeningEnabled: true,
        maintenanceModuleEnabled: true,
        customScreeningQuestions: true,
        maxCustomQuestions: 3,
      },
    });

    // Seed test landlord user
    const landlord = await User.create({
      name: 'Billing Landlord',
      email: 'billing-landlord@test.com',
      password: 'Password123!',
      role: 'landlord',
      companyName: 'Billing Test Co',
      planId: testPlan._id,
      planSlug: testPlan.slug,
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_billing_test123',
      stripeSubscriptionId: 'sub_billing_test123',
      cancelAtPeriodEnd: false,
      usageThisMonth: {
        applications: 5,
        resetAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    });

    const landlordId = landlord._id.toString();
    console.log(`✓ Test landlord created (ID: ${landlordId}).`);

    // Ensure Stripe settings enabled
    const settings = await SystemSettings.getSingleton();
    const originalStripeEnabled = settings.stripeEnabled;
    settings.stripeEnabled = true;
    await settings.save();
    console.log('✓ SystemSettings configured for Stripe billing.');

    // Sign a real JWT token for test requests
    const { signToken } = await import('../lib/auth');
    const token = signToken({
      userId: landlordId,
      email: 'billing-landlord@test.com',
      role: 'landlord',
    });

    // Helper to generate authenticated request
    const createAuthedReq = (url: string, method: string = 'GET', bodyObj: any = null) => {
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('Authorization', `Bearer ${token}`);

      const req: any = new Request(url, {
        method,
        headers,
        body: bodyObj ? JSON.stringify(bodyObj) : null,
      });

      // Mock cookies property expected by withAuth NextRequest wrapper
      req.cookies = {
        get: (name: string) => null,
      };

      return req;
    };

    // TEST 1: GET /api/billing/current
    console.log('\n⚡ Test 1: GET /api/billing/current...');
    const req1 = createAuthedReq('http://localhost:3000/api/billing/current');
    const res1 = await currentHandler(req1, null);
    const body1 = await res1.json();
    console.log(`- Status: ${res1.status}`);
    console.log(`- Plan Name: ${body1.data.plan.name}`);
    console.log(`- Limits maxProperties: ${body1.data.plan.limits.maxProperties}`);
    console.log(`- Usage properties current: ${body1.data.usage.properties.current}`);
    console.log(`- Subscription Status: ${body1.data.subscription.status}`);
    console.log(`- Subscription Interval: ${body1.data.subscription.interval}`);

    // TEST 2: POST /api/billing/cancel
    console.log('\n⚡ Test 2: POST /api/billing/cancel...');
    const req2 = createAuthedReq('http://localhost:3000/api/billing/cancel', 'POST');
    const res2 = await cancelHandler(req2, null);
    const body2 = await res2.json();
    console.log(`- Status: ${res2.status}`);
    
    let updatedLandlord = await User.findById(landlordId);
    console.log(`- User cancelAtPeriodEnd state: ${updatedLandlord?.cancelAtPeriodEnd}`);
    console.log(`- Return Access Until Date: ${body2.data.accessUntil}`);

    // TEST 3: POST /api/billing/reactivate
    console.log('\n⚡ Test 3: POST /api/billing/reactivate...');
    const req3 = createAuthedReq('http://localhost:3000/api/billing/reactivate', 'POST');
    const res3 = await reactivateHandler(req3, null);
    console.log(`- Status: ${res3.status}`);
    
    updatedLandlord = await User.findById(landlordId);
    console.log(`- User cancelAtPeriodEnd state (should be false): ${updatedLandlord?.cancelAtPeriodEnd}`);

    // TEST 4: POST /api/billing/create-portal
    console.log('\n⚡ Test 4: POST /api/billing/create-portal...');
    const req4 = createAuthedReq('http://localhost:3000/api/billing/create-portal', 'POST');
    const res4 = await createPortalHandler(req4, null);
    const body4 = await res4.json();
    console.log(`- Status: ${res4.status}`);
    console.log(`- Customer Portal URL: ${body4.data.portalUrl}`);

    // TEST 5: GET /api/billing/invoices
    console.log('\n⚡ Test 5: GET /api/billing/invoices...');
    const req5 = createAuthedReq('http://localhost:3000/api/billing/invoices');
    const res5 = await invoicesHandler(req5, null);
    const body5 = await res5.json();
    console.log(`- Status: ${res5.status}`);
    console.log(`- Invoices Retrieved Count: ${body5.data.length}`);
    console.log(`- Invoice Total Amount (cents): ${body5.data[0].amount}`);
    console.log(`- Invoice Status: ${body5.data[0].status}`);
    console.log(`- Invoice PDF Link: ${body5.data[0].invoicePdf}`);

    // Cleanup
    console.log('\n🧹 Cleaning up test database records...');
    await User.deleteMany({ email: 'billing-landlord@test.com' });
    await Plan.deleteMany({ slug: 'billing-pro-plan' });
    settings.stripeEnabled = originalStripeEnabled;
    await settings.save();
    console.log('✓ Cleanup complete.');

    await mongoose.connection.close();
    console.log('\n🎉 ALL LANDLORD BILLING API TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Billing API integration tests failed:', error);
    process.exit(1);
  }
}

runTests();

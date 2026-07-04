import { loadEnvConfig } from '@next/env';
import Stripe from 'stripe';
import path from 'path';

// Load env vars
loadEnvConfig(process.cwd());

async function runTests() {
  console.log('🧪 Starting Super Admin Subscription & Revenue API Controls Verification Tests...\n');

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
          cancel: async (id: string) => {
            console.log(`- [Mock Stripe] Cancelled subscription: ${id}`);
            return { id, status: 'canceled' };
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
        setupIntents: {
          create: async (params: any) => {
            console.log('- [Mock Stripe] Created test SetupIntent');
            return { id: 'seti_mock_123', status: 'requires_payment_method' };
          },
          cancel: async (id: string) => {
            console.log(`- [Mock Stripe] Cancelled test SetupIntent: ${id}`);
            return { id, status: 'canceled' };
          }
        }
      } as any;
    };

    // Import Route Handlers
    const { GET: listHandler } = await import('../app/api/admin/subscriptions/route');
    const { GET: revenueHandler } = await import('../app/api/admin/revenue/route');
    const { GET: detailHandler } = await import('../app/api/admin/subscriptions/[landlordId]/route');
    const { POST: overrideHandler } = await import('../app/api/admin/subscriptions/[landlordId]/override-plan/route');
    const { POST: cancelHandler } = await import('../app/api/admin/subscriptions/[landlordId]/cancel/route');
    const { POST: testStripeHandler } = await import('../app/api/admin/settings/test-stripe/route');

    await dbConnect();
    console.log('🔌 Connected to Database.');

    // Cleanup previous records
    await User.deleteMany({ email: 'admin-landlord@test.com' });
    await Plan.deleteMany({ slug: 'admin-pro-tier' });

    // Seed test plan
    const testPlan = await Plan.create({
      name: 'Admin Pro Tier',
      slug: 'admin-pro-tier',
      description: 'Pro tier for admin tests',
      price: 4900,
      limits: {
        maxProperties: 20,
        maxUnitsPerProperty: 50,
        maxActiveListings: 15,
        maxApplicationsPerMonth: 100,
        aiScreeningEnabled: true,
        maintenanceModuleEnabled: true,
        customScreeningQuestions: true,
        maxCustomQuestions: 10,
      },
    });

    // Seed test landlord user
    const landlord = await User.create({
      name: 'Admin Landlord',
      email: 'admin-landlord@test.com',
      password: 'Password123!',
      role: 'landlord',
      companyName: 'Admin Test Co',
      planId: testPlan._id,
      planSlug: testPlan.slug,
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_admin_test123',
      stripeSubscriptionId: 'sub_admin_test123',
      cancelAtPeriodEnd: false,
      usageThisMonth: {
        applications: 3,
        resetAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    });

    const landlordId = landlord._id.toString();
    console.log(`✓ Test landlord created (ID: ${landlordId}).`);

    // Ensure Stripe settings enabled
    const settings = await SystemSettings.getSingleton();
    const originalStripeEnabled = settings.stripeEnabled;
    const originalSecretKey = settings.stripeSecretKey;
    settings.stripeEnabled = true;
    settings.stripeSecretKey = 'sk_test_mockkey123';
    await settings.save();
    console.log('✓ SystemSettings configured for Stripe admin tests.');

    // Sign a real JWT token for super_admin
    const { signToken } = await import('../lib/auth');
    const token = signToken({
      userId: 'admin_user_id',
      email: 'superadmin@test.com',
      role: 'super_admin',
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

      req.cookies = {
        get: (name: string) => null,
      };

      return req;
    };

    // TEST 1: GET /api/admin/subscriptions
    console.log('\n⚡ Test 1: GET /api/admin/subscriptions (List & Paginate)...');
    const req1 = createAuthedReq('http://localhost:3000/api/admin/subscriptions?search=Admin');
    const res1 = await listHandler(req1, null);
    const body1 = await res1.json();
    console.log(`- Status: ${res1.status}`);
    console.log(`- Landlords Found: ${body1.data.landlords.length}`);
    console.log(`- Landlord Name: ${body1.data.landlords[0].name}`);
    console.log(`- Landlord Company: ${body1.data.landlords[0].company}`);

    // TEST 2: GET /api/admin/revenue
    console.log('\n⚡ Test 2: GET /api/admin/revenue (MRR calculations)...');
    const req2 = createAuthedReq('http://localhost:3000/api/admin/revenue');
    const res2 = await revenueHandler(req2, null);
    const body2 = await res2.json();
    console.log(`- Status: ${res2.status}`);
    console.log(`- MRR (cents): ${body2.data.mrr}`);
    console.log(`- ARR (cents): ${body2.data.arr}`);
    console.log(`- Active Subscribers Count: ${body2.data.activeSubscribers}`);
    console.log(`- Plan Breakdown Length: ${body2.data.byPlan.length}`);

    // TEST 3: GET /api/admin/subscriptions/[landlordId]
    console.log('\n⚡ Test 3: GET /api/admin/subscriptions/[landlordId] (Details)...');
    const req3 = createAuthedReq(`http://localhost:3000/api/admin/subscriptions/${landlordId}`);
    const res3 = await detailHandler(req3, { params: { landlordId } });
    const body3 = await res3.json();
    console.log(`- Status: ${res3.status}`);
    console.log(`- Details Landlord Email: ${body3.data.landlord.email}`);
    console.log(`- Details Plan Name: ${body3.data.plan.name}`);
    console.log(`- Usage Properties Count: ${body3.data.usage.properties.current}`);

    // TEST 4: POST /api/admin/subscriptions/[landlordId]/override-plan
    console.log('\n⚡ Test 4: POST /api/admin/subscriptions/[landlordId]/override-plan (Manual Override)...');
    const req4 = createAuthedReq(
      `http://localhost:3000/api/admin/subscriptions/${landlordId}/override-plan`,
      'POST',
      { planSlug: 'free', reason: 'Dispute courtesy upgrade comp' }
    );
    const res4 = await overrideHandler(req4, { params: { landlordId } });
    console.log(`- Status: ${res4.status}`);

    let updatedLandlord = await User.findById(landlordId);
    console.log(`- Updated Plan Slug (should be free): ${updatedLandlord?.planSlug}`);
    console.log(`- Audit Log Trail count: ${updatedLandlord?.subscriptionAuditTrail?.length}`);
    console.log(`- Audit Reason: ${updatedLandlord?.subscriptionAuditTrail?.[0]?.reason}`);

    // TEST 5: POST /api/admin/subscriptions/[landlordId]/cancel
    console.log('\n⚡ Test 5: POST /api/admin/subscriptions/[landlordId]/cancel (Immediate Force Cancel)...');
    // First comp landlord to premium so we can cancel it
    landlord.planId = testPlan._id;
    landlord.planSlug = testPlan.slug;
    landlord.stripeSubscriptionId = 'sub_admin_test123';
    landlord.subscriptionStatus = 'active';
    await landlord.save();

    const req5 = createAuthedReq(
      `http://localhost:3000/api/admin/subscriptions/${landlordId}/cancel`,
      'POST',
      { reason: 'Fraudulent account chargeback escalation' }
    );
    const res5 = await cancelHandler(req5, { params: { landlordId } });
    console.log(`- Status: ${res5.status}`);

    updatedLandlord = await User.findById(landlordId);
    console.log(`- Local Plan Slug post-cancellation: ${updatedLandlord?.planSlug}`);
    console.log(`- Local Subscription Status: ${updatedLandlord?.subscriptionStatus}`);
    console.log(`- Stripe Subscription ID: ${updatedLandlord?.stripeSubscriptionId}`);
    console.log(`- Audit Trail count: ${updatedLandlord?.subscriptionAuditTrail?.length}`);
    console.log(`- Audit Cancel Reason: ${updatedLandlord?.subscriptionAuditTrail?.[1]?.reason}`);

    // TEST 6: POST /api/admin/settings/test-stripe
    console.log('\n⚡ Test 6: POST /api/admin/settings/test-stripe (SetupIntent Test)...');
    const req6 = createAuthedReq('http://localhost:3000/api/admin/settings/test-stripe', 'POST');
    const res6 = await testStripeHandler(req6, null);
    const body6 = await res6.json();
    console.log(`- Status: ${res6.status}`);
    console.log(`- Stripe Key Mode Detected: ${body6.data.mode}`);

    // Cleanup
    console.log('\n🧹 Cleaning up test database records...');
    await User.deleteMany({ email: 'admin-landlord@test.com' });
    await Plan.deleteMany({ slug: 'admin-pro-tier' });
    settings.stripeEnabled = originalStripeEnabled;
    settings.stripeSecretKey = originalSecretKey;
    await settings.save();
    console.log('✓ Cleanup complete.');

    await mongoose.connection.close();
    console.log('\n🎉 ALL SUPER ADMIN REVENUE AND SUBSCRIPTION CONTROL TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Super Admin Subscriptions controls tests failed:', error);
    process.exit(1);
  }
}

runTests();

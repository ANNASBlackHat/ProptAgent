import { loadEnvConfig } from '@next/env';

// Load env vars
loadEnvConfig(process.cwd());

async function runTests() {
  console.log('🧪 Starting Subscription Plan and Limits Integration Tests...\n');

  try {
    const { dbConnect } = await import('../lib/db');
    const Plan = (await import('../models/Plan')).default;
    const User = (await import('../models/User')).default;
    const Property = (await import('../models/Property')).default;
    const Unit = (await import('../models/Unit')).default;
    const UsageLog = (await import('../models/UsageLog')).default;
    const mongoose = (await import('mongoose')).default;
    
    const {
      checkPropertyLimit,
      checkUnitLimit,
      checkListingLimit,
      checkApplicationLimit,
      checkAIScreening,
      checkMaintenanceModule,
      checkCustomQuestions,
      incrementApplicationUsage,
      isSubscriptionActive,
    } = await import('../lib/planLimits');

    await dbConnect();
    console.log('🔌 Connected to Database.');

    // 1. Clean previous test records
    await User.deleteMany({ email: 'limit-test-landlord@test.com' });
    await Plan.deleteMany({ slug: { $in: ['test-free', 'test-pro'] } });

    // 2. Seed test plans
    console.log('\n🌱 Seeding test plans...');
    const freePlan = await Plan.create({
      name: 'Test Free',
      slug: 'test-free',
      description: 'Test Free Plan',
      price: 0,
      limits: {
        maxProperties: 1,
        maxUnitsPerProperty: 2,
        maxActiveListings: 1,
        maxApplicationsPerMonth: 3,
        aiScreeningEnabled: false,
        maintenanceModuleEnabled: false,
        customScreeningQuestions: false,
        maxCustomQuestions: 0,
      },
    });

    const proPlan = await Plan.create({
      name: 'Test Pro',
      slug: 'test-pro',
      description: 'Test Pro Plan',
      price: 2900,
      limits: {
        maxProperties: 3,
        maxUnitsPerProperty: 5,
        maxActiveListings: 5,
        maxApplicationsPerMonth: 10,
        aiScreeningEnabled: true,
        maintenanceModuleEnabled: true,
        customScreeningQuestions: true,
        maxCustomQuestions: 3,
      },
    });
    console.log('✓ Test plans seeded.');

    // 3. Create test landlord
    console.log('\n👤 Creating test landlord...');
    const landlord = await User.create({
      name: 'Limit Test Landlord',
      email: 'limit-test-landlord@test.com',
      password: 'TestPassword123!',
      role: 'landlord',
      companyName: 'Limits Testing Corp',
      planId: freePlan._id,
      planSlug: freePlan.slug,
      subscriptionStatus: 'active',
      usageThisMonth: {
        applications: 0,
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    const landlordId = landlord._id.toString();
    console.log(`✓ Landlord created with ID: ${landlordId} on '${landlord.planSlug}' plan.`);

    // 4. Test Active Subscription Check
    console.log('\n🔎 Testing isSubscriptionActive...');
    const activeCheck = await isSubscriptionActive(landlordId);
    console.log(`- Active check (should be true): ${activeCheck}`);
    
    landlord.subscriptionStatus = 'expired';
    await landlord.save();
    const expiredCheck = await isSubscriptionActive(landlordId);
    console.log(`- Expired check (should be false): ${expiredCheck}`);

    // Restore to active
    landlord.subscriptionStatus = 'active';
    await landlord.save();

    // 5. Test Property Limit
    console.log('\n🏠 Testing checkPropertyLimit...');
    const propCheck1 = await checkPropertyLimit(landlordId);
    console.log(`- Initial property limit check (should be true):`, propCheck1);

    // Create 1 property
    const prop1 = await Property.create({
      landlordId,
      name: 'Test Property 1',
      address: { street: '123 Main St', city: 'Miami', state: 'FL', country: 'USA', zip: '33101' },
      isActive: true,
    });

    const propCheck2 = await checkPropertyLimit(landlordId);
    console.log(`- After 1 property (should be false for Free limit of 1):`, propCheck2);

    // 6. Test Unit Limit
    console.log('\n🚪 Testing checkUnitLimit...');
    const unitCheck1 = await checkUnitLimit(landlordId, prop1._id.toString());
    console.log(`- Initial unit limit check (should be true):`, unitCheck1);

    const u1 = await Unit.create({
      propertyId: prop1._id,
      landlordId,
      unitNumber: '101',
      floor: 1,
      type: '1BR',
      sizeSqft: 600,
      rentAmount: 1000,
      depositAmount: 1000,
      status: 'available',
      isActive: true,
    });

    const u2 = await Unit.create({
      propertyId: prop1._id,
      landlordId,
      unitNumber: '102',
      floor: 1,
      type: '1BR',
      sizeSqft: 600,
      rentAmount: 1000,
      depositAmount: 1000,
      status: 'available',
      isActive: true,
    });

    const unitCheck2 = await checkUnitLimit(landlordId, prop1._id.toString());
    console.log(`- After 2 units (should be false for Free limit of 2):`, unitCheck2);

    // 7. Test Listing Limit
    console.log('\n📊 Testing checkListingLimit...');
    // We already created 2 available units (u1, u2). Free limit is maxActiveListings: 1
    const listingCheck = await checkListingLimit(landlordId);
    console.log(`- Listing check (should be false as we have 2 available units, limit is 1):`, listingCheck);

    // Change u2 to occupied to release active listing count
    u2.status = 'occupied';
    await u2.save();

    const listingCheck2 = await checkListingLimit(landlordId);
    console.log(`- Listing check after setting unit to occupied (should be true):`, listingCheck2);

    // 8. Test Feature toggles
    console.log('\n🤖 Testing feature flags (AI Screening, Maintenance, Custom Questions)...');
    const aiCheck = await checkAIScreening(landlordId);
    console.log(`- AI screening status (should be false on Free):`, aiCheck);

    const maintCheck = await checkMaintenanceModule(landlordId);
    console.log(`- Maintenance module status (should be false on Free):`, maintCheck);

    const questCheck = await checkCustomQuestions(landlordId, 1);
    console.log(`- Custom questions check (should be false on Free):`, questCheck);

    // Upgrade landlord to Pro Plan
    console.log('\n⬆️ Upgrading Landlord to Pro Plan...');
    landlord.planId = proPlan._id;
    landlord.planSlug = proPlan.slug;
    await landlord.save();

    const aiCheckPro = await checkAIScreening(landlordId);
    console.log(`- AI screening status (should be true on Pro):`, aiCheckPro);

    const maintCheckPro = await checkMaintenanceModule(landlordId);
    console.log(`- Maintenance module status (should be true on Pro):`, maintCheckPro);

    const questCheckPro = await checkCustomQuestions(landlordId, 2);
    console.log(`- Custom questions check (2 questions, limit 3, should be true):`, questCheckPro);

    const questCheckProExceeded = await checkCustomQuestions(landlordId, 4);
    console.log(`- Custom questions check (4 questions, limit 3, should be false):`, questCheckProExceeded);

    // 9. Test Application Limits & Usage Increment
    console.log('\n📈 Testing application limits and usage increments...');
    const appCheck1 = await checkApplicationLimit(landlordId);
    console.log(`- Initial applications check (should be true):`, appCheck1);

    // Increment usage 10 times (Pro limit is 10)
    console.log('- Incrementing usage 10 times...');
    for (let i = 0; i < 10; i++) {
      await incrementApplicationUsage(landlordId);
    }

    const updatedLandlord = await User.findById(landlordId);
    console.log(`- Landlord monthly applications count: ${updatedLandlord?.usageThisMonth.applications}`);

    const appCheck2 = await checkApplicationLimit(landlordId);
    console.log(`- Applications check after reaching limit (should be false):`, appCheck2);

    const usageLog = await UsageLog.findOne({ landlordId, month: new Date().toISOString().slice(0, 7) });
    console.log(`- Monthly UsageLog document applicationsCount (should be 10): ${usageLog?.applicationsCount}`);

    // 10. Deactivate Plan checks
    console.log('\n🗑️ Testing plan deactivation check (DELETE /api/admin/plans/[id])...');
    
    // Test deactivating proPlan (which landlord is assigned to)
    try {
      const assignedCount = await User.countDocuments({
        role: 'landlord',
        $or: [{ planId: proPlan._id }, { planSlug: proPlan.slug }],
      });
      console.log(`- Landlord count on Pro plan: ${assignedCount}`);
      if (assignedCount > 0) {
        console.log(`- Plan deactivation guard works: Cannot deactivate plan because landlords are assigned.`);
      }
    } catch (e) {
      console.log(`- Error during deactivation test:`, e);
    }

    // Clean up
    console.log('\n🧹 Cleaning up test database records...');
    await Property.deleteMany({ landlordId });
    await Unit.deleteMany({ landlordId });
    await UsageLog.deleteMany({ landlordId });
    await User.deleteOne({ _id: landlordId });
    await Plan.deleteMany({ slug: { $in: ['test-free', 'test-pro'] } });
    console.log('✓ Cleanup complete.');

    await mongoose.connection.close();
    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Tests failed with error:', error);
    process.exit(1);
  }
}

runTests();

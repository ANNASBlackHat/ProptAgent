import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Plan from '@/models/Plan';
import User from '@/models/User';
import { sanitizeObject } from '@/lib/sanitize';

// GET /api/admin/plans — list all plans with landlord counts
async function getPlans(_req: AuthenticatedRequest) {
  try {
    await dbConnect();

    // Find all plans
    const plans = await Plan.find().sort({ price: 1 }).lean();

    // Aggregate landlord count per plan
    const aggregates = await User.aggregate([
      { $match: { role: 'landlord' } },
      {
        $group: {
          _id: '$planId',
          slugGroup: { $first: '$planSlug' },
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap: Record<string, number> = {};
    aggregates.forEach((agg) => {
      if (agg._id) {
        countMap[agg._id.toString()] = agg.count;
      } else if (agg.slugGroup) {
        countMap[agg.slugGroup] = agg.count;
      }
    });

    const enrichedPlans = plans.map((plan) => {
      const countById = countMap[plan._id.toString()] || 0;
      const countBySlug = countMap[plan.slug] || 0;
      return {
        ...plan,
        landlordCount: Math.max(countById, countBySlug),
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedPlans,
    });
  } catch (error) {
    console.error('GET /api/admin/plans error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}

// POST /api/admin/plans — create a new plan
async function createPlan(req: AuthenticatedRequest) {
  try {
    await dbConnect();

    const rawBody = await req.json();
    const body = sanitizeObject(rawBody);

    const { name, slug, description, price, yearlyPrice, trialDays, isFeatured, limits } = body;

    if (!name || !slug || !description || price === undefined || !limits) {
      return NextResponse.json(
        { success: false, error: 'Name, slug, description, price, and limits are required' },
        { status: 400 }
      );
    }

    // Verify slug uniqueness
    const existing = await Plan.findOne({ slug: slug.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Plan slug '${slug}' is already taken.` },
        { status: 400 }
      );
    }

    const plan = await Plan.create({
      name,
      slug: slug.toLowerCase(),
      description,
      price,
      yearlyPrice: yearlyPrice || 0,
      trialDays: trialDays || 0,
      isFeatured: !!isFeatured,
      isActive: true,
      limits: {
        maxProperties: limits.maxProperties !== undefined ? Number(limits.maxProperties) : -1,
        maxUnitsPerProperty: limits.maxUnitsPerProperty !== undefined ? Number(limits.maxUnitsPerProperty) : -1,
        maxActiveListings: limits.maxActiveListings !== undefined ? Number(limits.maxActiveListings) : -1,
        maxApplicationsPerMonth: limits.maxApplicationsPerMonth !== undefined ? Number(limits.maxApplicationsPerMonth) : -1,
        aiScreeningEnabled: !!limits.aiScreeningEnabled,
        maintenanceModuleEnabled: !!limits.maintenanceModuleEnabled,
        customScreeningQuestions: !!limits.customScreeningQuestions,
        maxCustomQuestions: limits.maxCustomQuestions !== undefined ? Number(limits.maxCustomQuestions) : 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: plan,
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/admin/plans error:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create plan' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getPlans, ['super_admin']);
export const POST = withAuth(createPlan, ['super_admin']);
export const dynamic = 'force-dynamic';

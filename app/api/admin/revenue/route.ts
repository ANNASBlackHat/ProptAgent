import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '../../../../lib/auth';
import { dbConnect } from '../../../../lib/db';
import User from '../../../../models/User';
import Plan from '../../../../models/Plan';

async function revenueStatsHandler(req: AuthenticatedRequest): Promise<Response> {
  try {
    await dbConnect();

    if (!req.user || req.user.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access required' }, { status: 403 });
    }

    // 1. Fetch active, trialing, past_due subscribers
    const activeSubscribers = await User.countDocuments({ role: 'landlord', subscriptionStatus: 'active' });
    const trialingSubscribers = await User.countDocuments({ role: 'landlord', subscriptionStatus: 'trialing' });
    const pastDueSubscribers = await User.countDocuments({ role: 'landlord', subscriptionStatus: 'past_due' });

    // 2. Fetch monthly cancellations & new users count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const cancelledThisMonth = await User.countDocuments({
      role: 'landlord',
      $or: [
        { subscriptionStatus: 'cancelled', currentPeriodEnd: { $gte: startOfMonth } },
        { cancelAtPeriodEnd: true, updatedAt: { $gte: startOfMonth } },
      ],
    });

    const newThisMonth = await User.countDocuments({
      role: 'landlord',
      createdAt: { $gte: startOfMonth },
    });

    // 3. Group by plan to calculate MRR and ARR
    const plans = await Plan.find();
    
    // Add default Free plan slug in case it isn't seeded or exists
    const allTiers = plans.some((p) => p.slug === 'free')
      ? plans
      : [
          { name: 'Free', slug: 'free', price: 0, yearlyPrice: 0 },
          ...plans,
        ];

    let mrr = 0;
    const byPlan = [];

    for (const plan of allTiers) {
      // Find landlords currently assigned to this plan
      // Include trialing in count but trialing users contribute 0 MRR until conversion
      const activeCount = await User.countDocuments({
        role: 'landlord',
        planSlug: plan.slug,
        subscriptionStatus: 'active',
      });

      const trialingCount = await User.countDocuments({
        role: 'landlord',
        planSlug: plan.slug,
        subscriptionStatus: 'trialing',
      });

      const planRevenue = activeCount * plan.price;
      mrr += planRevenue;

      byPlan.push({
        planName: plan.name,
        slug: plan.slug,
        count: activeCount + trialingCount,
        monthlyRevenue: planRevenue,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        mrr,
        arr: mrr * 12,
        activeSubscribers,
        trialingSubscribers,
        pastDueSubscribers,
        cancelledThisMonth,
        newThisMonth,
        byPlan,
      },
    });
  } catch (error) {
    console.error('[Admin Revenue Stats] Fetch error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(revenueStatsHandler, ['super_admin']);
export const dynamic = 'force-dynamic';

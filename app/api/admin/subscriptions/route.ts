import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '../../../../lib/auth';
import { dbConnect } from '../../../../lib/db';
import User from '../../../../models/User';

async function listSubscriptionsHandler(req: AuthenticatedRequest): Promise<Response> {
  try {
    await dbConnect();

    if (!req.user || req.user.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const planSlug = searchParams.get('planSlug');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1') || 1;
    const limit = parseInt(searchParams.get('limit') || '10') || 10;
    const skip = (page - 1) * limit;

    const query: any = { role: 'landlord' };

    if (status && status !== 'all') {
      query.subscriptionStatus = status;
    }

    if (planSlug && planSlug !== 'all') {
      query.planSlug = planSlug;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const landlords = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedLandlords = landlords.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      company: u.companyName || '',
      planSlug: u.planSlug || 'free',
      subscriptionStatus: u.subscriptionStatus || 'none',
      currentPeriodEnd: u.currentPeriodEnd || null,
      cancelAtPeriodEnd: u.cancelAtPeriodEnd || false,
      stripeCustomerId: u.stripeCustomerId || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        landlords: formattedLandlords,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error('[Admin Subscriptions] List error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(listSubscriptionsHandler, ['super_admin']);
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import Property from '@/models/Property';

// GET /api/admin/landlords — paginated list of all landlords
async function handler(req: AuthenticatedRequest): Promise<Response> {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const isActiveParam = searchParams.get('isActive');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { role: 'landlord' };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActiveParam !== null && isActiveParam !== '') {
      filter.isActive = isActiveParam === 'true';
    }

    const [landlords, total] = await Promise.all([
      User.find(filter)
        .select('name email companyName isActive createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Fetch property counts for each landlord
    const landlordIds = landlords.map((l) => l._id);
    const propertyCounts = await Property.aggregate([
      { $match: { landlordId: { $in: landlordIds } } },
      { $group: { _id: '$landlordId', count: { $sum: 1 } } },
    ]);

    const countMap: Record<string, number> = {};
    propertyCounts.forEach((pc) => {
      countMap[String(pc._id)] = pc.count;
    });

    const result = landlords.map((l) => ({
      _id: l._id,
      name: l.name,
      email: l.email,
      companyName: l.companyName,
      isActive: l.isActive,
      propertyCount: countMap[String(l._id)] || 0,
      createdAt: l.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        landlords: result,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[Admin] GET /api/admin/landlords error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch landlords' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, ['super_admin']);
export const dynamic = 'force-dynamic';

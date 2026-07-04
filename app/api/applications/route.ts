import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Application from '@/models/Application';
import Property from '@/models/Property';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';

// ─── GET /api/applications — protected: landlord ──────────────────────────────
// Returns paginated applications for the logged-in landlord's properties.
// Query: unitId?, status?, page=1, limit=10
async function getApplications(req: AuthenticatedRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get('unitId');
    const status = searchParams.get('status');
    const propertyId = searchParams.get('propertyId');
    const sortBy = searchParams.get('sortBy') || 'createdAt_desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    // Get all properties belonging to the landlord for filtering
    const landlordProperties = await Property.find(
      { landlordId: req.user!.userId, isActive: true },
      { _id: 1 }
    ).lean();
    const propertyIds = landlordProperties.map((p) => p._id);

    // Build query
    const query: Record<string, unknown> = {
      landlordId: req.user!.userId,
      propertyId: propertyId ? propertyId : { $in: propertyIds },
    };
    if (unitId) query.unitId = unitId;
    if (status) query.status = status;

    // Determine sort options
    let sortOption: any = { createdAt: -1 };
    if (sortBy === 'score' || sortBy === 'score_desc') {
      sortOption = { 'aiScore.overall': -1 };
    } else if (sortBy === 'score_asc') {
      sortOption = { 'aiScore.overall': 1 };
    } else if (sortBy === 'createdAt_asc') {
      sortOption = { createdAt: 1 };
    }

    const [applications, total] = await Promise.all([
      Application.find(query)
        .select(
          'tenantInfo.name tenantInfo.email tenantInfo.moveInDate unitId propertyId status aiScore.overall createdAt'
        )
        .populate('unitId', 'unitNumber type rentAmount')
        .populate('propertyId', 'name address')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        applications,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/applications error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getApplications, ['landlord', 'super_admin']);
export const dynamic = 'force-dynamic';

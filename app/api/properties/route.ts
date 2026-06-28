import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Property from '@/models/Property';
import Unit from '@/models/Unit';


// GET /api/properties — list landlord's own properties with unit counts
async function getProperties(req: AuthenticatedRequest) {
  try {
    await dbConnect();

    const properties = await Property.find({
      landlordId: req.user!.userId,
      isActive: true,
    })
      .populate('unitCount')
      .sort({ createdAt: -1 })
      .lean();

    // Compute occupancy rate per property
    const propertyIds = properties.map((p) => p._id);
    const unitStats = await Unit.aggregate([
      { $match: { propertyId: { $in: propertyIds }, isActive: true } },
      {
        $group: {
          _id: '$propertyId',
          total: { $sum: 1 },
          occupied: {
            $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] },
          },
        },
      },
    ]);

    const statsMap = new Map(
      unitStats.map((s) => [
        s._id.toString(),
        { total: s.total, occupied: s.occupied },
      ])
    );

    const enriched = properties.map((p) => {
      const stats = statsMap.get((p._id as mongoose.Types.ObjectId).toString());
      const total = stats?.total ?? 0;
      const occupied = stats?.occupied ?? 0;
      return {
        ...p,
        unitCount: total,
        occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('GET /api/properties error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

// POST /api/properties — create a new property
async function createProperty(req: AuthenticatedRequest) {
  try {
    await dbConnect();

    const body = await req.json();

    const property = await Property.create({
      ...body,
      landlordId: req.user!.userId,
    });

    return NextResponse.json(
      { success: true, data: property },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('POST /api/properties error:', error);
    if (
      error instanceof Error &&
      error.name === 'ValidationError'
    ) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create property' },
      { status: 500 }
    );
  }
}



export const GET = withAuth(getProperties, ['landlord', 'super_admin']);
export const POST = withAuth(createProperty, ['landlord', 'super_admin']);

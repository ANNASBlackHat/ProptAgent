import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import Property from '@/models/Property';
import Unit from '@/models/Unit';
import Application from '@/models/Application';
import Lease from '@/models/Lease';
import MaintenanceRequest from '@/models/MaintenanceRequest';

// GET /api/admin/stats — platform-wide statistics
async function handler(_req: AuthenticatedRequest): Promise<Response> {
  try {
    await dbConnect();

    const [
      totalLandlords,
      totalProperties,
      totalUnits,
      totalApplications,
      totalLeases,
      activeLeases,
      totalMaintenanceRequests,
    ] = await Promise.all([
      User.countDocuments({ role: 'landlord' }),
      Property.countDocuments(),
      Unit.countDocuments(),
      Application.countDocuments(),
      Lease.countDocuments(),
      Lease.countDocuments({ status: 'active' }),
      MaintenanceRequest.countDocuments(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalLandlords,
        totalProperties,
        totalUnits,
        totalApplications,
        totalLeases,
        activeLeases,
        totalMaintenanceRequests,
      },
    });
  } catch (error) {
    console.error('[Admin] GET /api/admin/stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler, ['super_admin']);
export const dynamic = 'force-dynamic';

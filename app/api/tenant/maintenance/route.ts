import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import MaintenanceRequest from '@/models/MaintenanceRequest';

// GET /api/tenant/maintenance — Get all maintenance requests for the logged-in tenant (Tenant only)
async function getTenantMaintenanceRequests(req: AuthenticatedRequest) {
  try {
    await dbConnect();
    const tenantId = req.user!.userId;

    const requests = await MaintenanceRequest.find({ tenantId })
      .select('-landlordNotes') // Ensure private landlord notes are not sent to the tenant
      .populate('propertyId', 'name address')
      .populate('unitId', 'unitNumber type')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error('GET /api/tenant/maintenance error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getTenantMaintenanceRequests, ['tenant']);
export const dynamic = 'force-dynamic';

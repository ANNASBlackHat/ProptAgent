import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import MaintenanceRequest from '@/models/MaintenanceRequest';

// GET /api/maintenance/[id] — Get single maintenance request detail (Landlord or Tenant)
async function getMaintenanceRequest(
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = params;
    const { userId, role } = req.user!;

    let query = MaintenanceRequest.findById(id)
      .populate('tenantId', 'name email phone')
      .populate('propertyId', 'name address')
      .populate('unitId', 'unitNumber type');

    if (role === 'tenant') {
      // Exclude internal landlord notes for tenants
      query = query.select('-landlordNotes');
    } else {
      // Populate the author of the internal notes for landlords
      query = query.populate('landlordNotes.addedBy', 'name');
    }

    const request = await query;

    if (!request) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    // Authorization checks
    if (role === 'tenant') {
      // Tenants can only view their own requests
      const tenantIdStr = (request.tenantId as any)._id
        ? (request.tenantId as any)._id.toString()
        : request.tenantId.toString();

      if (tenantIdStr !== userId) {
        return NextResponse.json(
          { success: false, error: 'Access denied: You can only view your own requests' },
          { status: 403 }
        );
      }
    } else if (role === 'landlord') {
      // Landlords can only view requests for their own properties
      if (request.landlordId.toString() !== userId) {
        return NextResponse.json(
          { success: false, error: 'Access denied: This request does not belong to your properties' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, data: request });
  } catch (error) {
    console.error('GET /api/maintenance/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getMaintenanceRequest, ['landlord', 'tenant']);

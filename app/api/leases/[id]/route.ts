import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Lease from '@/models/Lease';

// GET /api/leases/[id] — Get single lease details
async function getLease(
  req: AuthenticatedRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const landlordId = req.user!.userId;
    const { id } = await context.params;

    const lease = await Lease.findById(id)
      .populate('tenantId', 'name email phone')
      .populate('propertyId', 'name address')
      .populate('unitId', 'unitNumber type rentAmount depositAmount')
      .populate('paymentLog.loggedBy', 'name email')
      .lean();

    if (!lease) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    if (req.user!.role !== 'super_admin' && lease.landlordId.toString() !== landlordId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: lease });
  } catch (error) {
    console.error('GET /api/leases/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lease details' },
      { status: 500 }
    );
  }
}

// PUT /api/leases/[id] — Update lease terms or renew
async function updateLease(
  req: AuthenticatedRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const landlordId = req.user!.userId;
    const { id } = await context.params;

    const body = await req.json();
    const { specialTerms, endDate, monthlyRent } = body;

    const lease = await Lease.findById(id);
    if (!lease) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    if (lease.landlordId.toString() !== landlordId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Access denied' },
        { status: 403 }
      );
    }

    // Update special terms if provided
    if (specialTerms !== undefined) {
      lease.specialTerms = specialTerms;
    }

    // Update rent if provided (used during renewal)
    if (monthlyRent !== undefined) {
      lease.monthlyRent = monthlyRent;
    }

    // If endDate is provided (extension/renewal)
    if (endDate) {
      const newEndDate = new Date(endDate);
      const oldEndDate = new Date(lease.endDate);

      if (newEndDate > oldEndDate) {
        lease.endDate = newEndDate;
        // If it was expiring_soon or expired, set it back to active
        if (lease.status === 'expiring_soon' || lease.status === 'expired') {
          lease.status = 'active';
        }
      } else {
        // Just update it if they are adjusting it
        lease.endDate = newEndDate;
      }
    }

    await lease.save();

    // Fetch the updated lease with populated fields
    const updatedLease = await Lease.findById(id)
      .populate('tenantId', 'name email phone')
      .populate('propertyId', 'name address')
      .populate('unitId', 'unitNumber type rentAmount')
      .lean();

    return NextResponse.json({ success: true, data: updatedLease });
  } catch (error: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error('PUT /api/leases/[id] error:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update lease' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getLease, ['landlord', 'super_admin']);
export const PUT = withAuth(updateLease, ['landlord']);

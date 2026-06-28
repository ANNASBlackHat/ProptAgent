import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Lease from '@/models/Lease';

// GET /api/tenant/lease — Get active lease for the logged-in tenant
async function getTenantLease(req: AuthenticatedRequest) {
  try {
    await dbConnect();
    const tenantId = req.user!.userId;

    // Find active, expiring_soon, or even expired lease for the tenant.
    // If multiple exist, return the most recent active/expiring one, or the latest overall.
    const lease = await Lease.findOne({
      tenantId,
      status: { $in: ['active', 'expiring_soon', 'expired'] },
    })
      .populate('landlordId', 'name email phone companyName logo')
      .populate('propertyId', 'name address description photos')
      .populate('unitId', 'unitNumber type rentAmount depositAmount sizeSqft')
      .populate('paymentLog.loggedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    if (!lease) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({ success: true, data: lease });
  } catch (error) {
    console.error('GET /api/tenant/lease error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lease details' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getTenantLease, ['tenant']);

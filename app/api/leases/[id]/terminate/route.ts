import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Lease from '@/models/Lease';
import Unit from '@/models/Unit';

// POST /api/leases/[id]/terminate — Terminate lease early
async function terminateLease(
  req: AuthenticatedRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const landlordId = req.user!.userId;
    const { id } = await context.params;

    const body = await req.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: 'Termination reason is required' },
        { status: 400 }
      );
    }

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

    if (lease.status === 'terminated') {
      return NextResponse.json(
        { success: false, error: 'Lease is already terminated' },
        { status: 400 }
      );
    }

    // 1. Update lease status and details
    lease.status = 'terminated';
    lease.terminationReason = reason;
    lease.terminatedAt = new Date();
    await lease.save();

    // 2. Revert the unit status to available
    await Unit.findByIdAndUpdate(lease.unitId, { status: 'available' });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Lease terminated successfully, and unit is now available.',
        lease,
      },
    });
  } catch (error) {
    console.error('POST /api/leases/[id]/terminate error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to terminate lease' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(terminateLease, ['landlord']);

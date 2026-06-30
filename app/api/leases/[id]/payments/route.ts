import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Lease from '@/models/Lease';

// POST /api/leases/[id]/payments — Log a new rent payment
async function logPayment(
  req: AuthenticatedRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const landlordId = req.user!.userId;
    const { id } = await context.params;

    const body = await req.json();
    const { paidDate, amount, method, notes } = body;

    if (!paidDate || amount === undefined || !method) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment fields' },
        { status: 400 }
      );
    }

    if (isNaN(Number(amount)) || Number(amount) < 0) {
      return NextResponse.json(
        { success: false, error: 'Payment amount must be a positive number' },
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

    // Append to payment log
    lease.paymentLog.push({
      paidDate: new Date(paidDate),
      amount: Number(amount),
      method,
      notes: notes || '',
      loggedAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      loggedBy: landlordId as any,
    });

    await lease.save();

    return NextResponse.json({
      success: true,
      data: lease.paymentLog[lease.paymentLog.length - 1],
    });
  } catch (error) {
    console.error('POST /api/leases/[id]/payments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log payment' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(logPayment, ['landlord']);

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Unit, { UnitStatus } from '@/models/Unit';

type Context = { params: { id: string } };

const VALID_STATUSES: UnitStatus[] = ['available', 'occupied', 'maintenance', 'reserved'];

// PATCH /api/units/[id]/status — update unit status only
async function patchUnitStatus(req: AuthenticatedRequest, context: unknown) {
  try {
    await dbConnect();

    const { id } = (context as Context).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid unit ID' }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body as { status: UnitStatus };

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const unit = await Unit.findOneAndUpdate(
      { _id: id, landlordId: req.user!.userId, isActive: true },
      { $set: { status } },
      { new: true }
    );

    if (!unit) {
      return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: unit });
  } catch (error) {
    console.error('PATCH /api/units/[id]/status error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update unit status' }, { status: 500 });
  }
}

export const PATCH = withAuth(patchUnitStatus, ['landlord', 'super_admin']);

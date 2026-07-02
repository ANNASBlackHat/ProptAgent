import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Property from '@/models/Property';
import Unit from '@/models/Unit';
import { sanitizeObject } from '@/lib/sanitize';

type Context = { params: { id: string } };

// GET /api/properties/[id]/units — list units for a property
async function getUnits(req: AuthenticatedRequest, context: unknown) {
  try {
    await dbConnect();

    const { id } = (context as Context).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid property ID' }, { status: 400 });
    }

    // Verify landlord owns the property
    const property = await Property.findOne({ _id: id, landlordId: req.user!.userId, isActive: true });
    if (!property) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    const units = await Unit.find({ propertyId: id, isActive: true }).sort({ unitNumber: 1 }).lean();

    return NextResponse.json({ success: true, data: units });
  } catch (error) {
    console.error('GET /api/properties/[id]/units error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch units' }, { status: 500 });
  }
}

// POST /api/properties/[id]/units — create a unit
async function createUnit(req: AuthenticatedRequest, context: unknown) {
  try {
    await dbConnect();

    const { id } = (context as Context).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid property ID' }, { status: 400 });
    }

    // Verify landlord owns the property
    const property = await Property.findOne({ _id: id, landlordId: req.user!.userId, isActive: true });
    if (!property) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    const rawBody = await req.json();
    const body = sanitizeObject(rawBody);

    const unit = await Unit.create({
      ...body,
      propertyId: id,
      landlordId: req.user!.userId,
    });

    return NextResponse.json({ success: true, data: unit }, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/properties/[id]/units error:', error);
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    // Duplicate unit number
    if (
      error instanceof Error &&
      'code' in (error as unknown as Record<string, unknown>) &&
      (error as unknown as Record<string, unknown>).code === 11000
    ) {
      return NextResponse.json(
        { success: false, error: 'Unit number already exists in this property' },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: 'Failed to create unit' }, { status: 500 });
  }
}

export const GET = withAuth(getUnits, ['landlord', 'super_admin']);
export const POST = withAuth(createUnit, ['landlord', 'super_admin']);

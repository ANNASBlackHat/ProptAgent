import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Property from '@/models/Property';
import Unit from '@/models/Unit';
import { sanitizeObject } from '@/lib/sanitize';

// GET /api/properties/[id] — get single property with its units
async function getProperty(req: AuthenticatedRequest, context: unknown) {
  try {
    await dbConnect();

    const { id } = (context as { params: { id: string } }).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid property ID' }, { status: 400 });
    }

    const property = await Property.findOne({
      _id: id,
      landlordId: req.user!.userId,
      isActive: true,
    }).lean();

    if (!property) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    const units = await Unit.find({ propertyId: id, isActive: true }).sort({ unitNumber: 1 }).lean();

    return NextResponse.json({ success: true, data: { ...property, units } });
  } catch (error) {
    console.error('GET /api/properties/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch property' }, { status: 500 });
  }
}

// PUT /api/properties/[id] — update property
async function updateProperty(req: AuthenticatedRequest, context: unknown) {
  try {
    await dbConnect();

    const { id } = (context as { params: { id: string } }).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid property ID' }, { status: 400 });
    }

    const rawBody = await req.json();
    const body = sanitizeObject(rawBody);

    // Strip protected fields
    delete body.landlordId;
    delete body._id;

    const property = await Property.findOneAndUpdate(
      { _id: id, landlordId: req.user!.userId, isActive: true },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!property) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: property });
  } catch (error: unknown) {
    console.error('PUT /api/properties/[id] error:', error);
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to update property' }, { status: 500 });
  }
}

// DELETE /api/properties/[id] — soft delete
async function deleteProperty(req: AuthenticatedRequest, context: unknown) {
  try {
    await dbConnect();

    const { id } = (context as { params: { id: string } }).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid property ID' }, { status: 400 });
    }

    const property = await Property.findOneAndUpdate(
      { _id: id, landlordId: req.user!.userId, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!property) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    // Soft-delete all units belonging to this property
    await Unit.updateMany({ propertyId: id }, { $set: { isActive: false } });

    return NextResponse.json({ success: true, data: { message: 'Property deleted successfully' } });
  } catch (error) {
    console.error('DELETE /api/properties/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete property' }, { status: 500 });
  }
}

export const GET = withAuth(getProperty, ['landlord', 'super_admin']);
export const PUT = withAuth(updateProperty, ['landlord', 'super_admin']);
export const DELETE = withAuth(deleteProperty, ['landlord', 'super_admin']);

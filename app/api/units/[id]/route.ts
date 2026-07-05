import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Unit from '@/models/Unit';
import { sanitizeObject } from '@/lib/sanitize';

type Context = { params: Promise<{ id: string }> | { id: string } };

// Helper: safely resolve params whether sync or async (Next.js 14 vs 15)
async function resolveId(context: unknown): Promise<string> {
  const ctx = context as Context;
  const params = ctx.params instanceof Promise ? await ctx.params : ctx.params;
  return params.id;
}

// GET /api/units/[id] — fetch single unit
async function getUnit(req: AuthenticatedRequest, context: unknown) {
  try {
    await dbConnect();

    const id = await resolveId(context);
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid unit ID' }, { status: 400 });
    }

    const unit = await Unit.findById(id).lean();

    if (!unit || !unit.isActive) {
      return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });
    }

    // Ownership check — super_admin can see any unit
    if (req.user!.role !== 'super_admin') {
      if (unit.landlordId && unit.landlordId.toString() !== req.user!.userId) {
         return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, data: unit });
  } catch (error) {
    console.error('GET /api/units/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch unit' }, { status: 500 });
  }
}

import { deleteFile } from '@/lib/storage';

// PUT /api/units/[id] — update unit
async function updateUnit(req: AuthenticatedRequest, context: unknown) {
  try {
    await dbConnect();

    const id = await resolveId(context);

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid unit ID' }, { status: 400 });
    }

    // Step 1: Find the unit by _id only (works even if landlordId is missing on old docs)
    const existing = await Unit.findById(id);

    if (!existing || !existing.isActive) {
      return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });
    }

    // Step 2: Ownership check — skip for super_admin
    // If landlordId is set on the unit, it must match the requesting user.
    // If landlordId is missing (old doc), we allow the update and repair it.
    if (req.user!.role !== 'super_admin') {
      if (existing.landlordId && existing.landlordId.toString() !== req.user!.userId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    const rawBody = await req.json();
    const body = sanitizeObject(rawBody);

    // Strip protected fields
    delete body.landlordId;
    delete body.propertyId;
    delete body._id;

    // If landlordId was missing on this unit, repair it silently
    if (!existing.landlordId) {
      body.landlordId = req.user!.userId;
    }

    // Call deleteFile for any photos removed in this update
    if (body.photos && Array.isArray(body.photos)) {
      const removedPhotos = (existing.photos || []).filter(
        (ep) => !body.photos.some((np: any) => np.fileId === ep.fileId || np.url === ep.url)
      );
      for (const photo of removedPhotos) {
        if (photo.fileId && photo.provider) {
          await deleteFile(photo.fileId, photo.provider);
        }
      }
    }

    const unit = await Unit.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: unit });
  } catch (error: unknown) {
    console.error('PUT /api/units/[id] error:', error);
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to update unit' }, { status: 500 });
  }
}

// DELETE /api/units/[id] — soft delete unit
async function deleteUnit(req: AuthenticatedRequest, context: unknown) {
  try {
    await dbConnect();

    const id = await resolveId(context);

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid unit ID' }, { status: 400 });
    }

    // Step 1: Find by _id only
    const existing = await Unit.findById(id);

    if (!existing || !existing.isActive) {
      return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });
    }

    // Step 2: Ownership check — skip for super_admin
    if (req.user!.role !== 'super_admin') {
      if (existing.landlordId && existing.landlordId.toString() !== req.user!.userId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    existing.isActive = false;
    await existing.save();

    return NextResponse.json({ success: true, data: { message: 'Unit deleted successfully' } });
  } catch (error) {
    console.error('DELETE /api/units/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete unit' }, { status: 500 });
  }
}

export const GET = withAuth(getUnit, ['landlord', 'super_admin']);
export const PUT = withAuth(updateUnit, ['landlord', 'super_admin']);
export const DELETE = withAuth(deleteUnit, ['landlord', 'super_admin']);


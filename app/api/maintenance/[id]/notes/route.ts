import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import MaintenanceRequest from '@/models/MaintenanceRequest';

// POST /api/maintenance/[id]/notes — Add internal note (Landlord only)
async function addLandlordNote(
  req: AuthenticatedRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const landlordId = req.user!.userId;

    const body = await req.json();
    const { note } = body;

    if (!note || typeof note !== 'string' || !note.trim()) {
      return NextResponse.json(
        { success: false, error: 'Note content is required' },
        { status: 400 }
      );
    }

    // Find request and verify ownership
    const request = await MaintenanceRequest.findById(id);
    if (!request) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    if (request.landlordId.toString() !== landlordId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: You do not own this property' },
        { status: 403 }
      );
    }

    // Append note
    const newNote = {
      note: note.trim(),
      addedAt: new Date(),
      addedBy: new mongoose.Types.ObjectId(landlordId),
    };

    request.landlordNotes.push(newNote);
    await request.save();

    // Re-populate notes author before returning
    const populatedRequest = await MaintenanceRequest.findById(id)
      .populate('landlordNotes.addedBy', 'name')
      .lean();

    return NextResponse.json({
      success: true,
      data: populatedRequest?.landlordNotes || [],
    });
  } catch (error) {
    console.error('POST /api/maintenance/[id]/notes error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(addLandlordNote, ['landlord']);

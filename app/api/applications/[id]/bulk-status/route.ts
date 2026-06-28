import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Application, { ApplicationStatus } from '@/models/Application';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';

const VALID_STATUSES: ApplicationStatus[] = [
  'pending',
  'shortlisted',
  'under_review',
  'approved',
  'declined',
];

// ─── PATCH /api/applications/[id]/bulk-status — protected: landlord ──────────
// Body: { applicationIds: string[], status: ApplicationStatus, note?: string }
// Note: [id] in the URL is ignored for bulk operations — we use body.applicationIds.
async function bulkUpdateStatus(req: AuthenticatedRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const {
      applicationIds,
      status,
      note,
    } = body as { applicationIds: string[]; status: ApplicationStatus; note?: string };

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'applicationIds must be a non-empty array' },
        { status: 400 }
      );
    }
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Verify all applications belong to this landlord
    const applications = await Application.find({
      _id: { $in: applicationIds },
      landlordId: req.user!.role === 'super_admin' ? { $exists: true } : req.user!.userId,
    });

    if (applications.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No matching applications found' },
        { status: 404 }
      );
    }

    const historyEntry = {
      status,
      changedAt: new Date(),
      changedBy: req.user!.userId as unknown as import('mongoose').Types.ObjectId,
      note: note || undefined,
    };

    await Application.updateMany(
      {
        _id: { $in: applications.map((a) => a._id) },
      },
      {
        $set: { status },
        $push: { statusHistory: historyEntry },
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        updated: applications.length,
        status,
        message: `${applications.length} application(s) updated to ${status}`,
      },
    });
  } catch (error) {
    console.error('PATCH /api/applications/[id]/bulk-status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(bulkUpdateStatus, ['landlord', 'super_admin']);

import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Application, { ApplicationStatus } from '@/models/Application';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

const VALID_STATUSES: ApplicationStatus[] = [
  'pending',
  'shortlisted',
  'under_review',
  'approved',
  'declined',
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  shortlisted: 'Shortlisted',
  under_review: 'Under Review',
  approved: 'Approved',
  declined: 'Declined',
};

// ─── PATCH /api/applications/[id]/status — protected: landlord ───────────────
async function updateStatus(
  req: AuthenticatedRequest,
  context: unknown
) {
  try {
    await dbConnect();
    const { id } = (context as { params: { id: string } }).params;
    const body = await req.json();
    const { status, note } = body as { status: ApplicationStatus; note?: string };

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status value' },
        { status: 400 }
      );
    }

    const application = await Application.findById(id);
    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    if (
      req.user!.role !== 'super_admin' &&
      application.landlordId.toString() !== req.user!.userId
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const prevStatus = application.status;
    application.status = status;
    application.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: req.user!.userId as unknown as import('mongoose').Types.ObjectId,
      note: note || undefined,
    });

    await application.save();

    // Send status change email if status changed
    if (prevStatus !== status) {
      try {
        await sendEmail(
          application.tenantInfo.email,
          `Application Update — Status Changed to ${STATUS_LABELS[status]}`,
          `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
              <h2 style="color:#60a5fa;margin-top:0">Application Status Update</h2>
              <p>Hi <strong>${application.tenantInfo.name}</strong>,</p>
              <p>Your rental application status has been updated to:</p>
              <div style="background:#1e293b;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
                <span style="font-size:20px;font-weight:bold;color:#60a5fa;">${STATUS_LABELS[status]}</span>
              </div>
              ${note ? `<p><strong>Note from landlord:</strong> ${note}</p>` : ''}
              <p style="color:#94a3b8;font-size:14px;">If you have questions, please contact the landlord directly.</p>
            </div>
          `
        );
      } catch (emailErr) {
        console.error('Status change email failed:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: { status: application.status, statusHistory: application.statusHistory },
    });
  } catch (error) {
    console.error('PATCH /api/applications/[id]/status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(updateStatus, ['landlord', 'super_admin']);

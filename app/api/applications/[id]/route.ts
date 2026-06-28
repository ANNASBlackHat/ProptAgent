import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Application from '@/models/Application';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';

// ─── GET /api/applications/[id] — protected: landlord ────────────────────────
// Returns full application including aiTranscript and aiScore.
async function getApplication(
  req: AuthenticatedRequest,
  context: unknown
) {
  try {
    await dbConnect();
    const { id } = (context as { params: { id: string } }).params;

    const application = await Application.findById(id)
      .populate('unitId', 'unitNumber type rentAmount depositAmount sizeSqft description photos')
      .populate('propertyId', 'name address photos')
      .populate('statusHistory.changedBy', 'name email')
      .lean();

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Ensure the application belongs to this landlord (or is super_admin)
    if (
      req.user!.role !== 'super_admin' &&
      application.landlordId.toString() !== req.user!.userId
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: application });
  } catch (error) {
    console.error('GET /api/applications/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getApplication, ['landlord', 'super_admin']);

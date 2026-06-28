import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { dbConnect } from '@/lib/db';
import Application from '@/models/Application';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { sendInterviewInvitationEmail } from '@/lib/email';

async function startScreening(
  req: AuthenticatedRequest,
  context: unknown
) {
  try {
    await dbConnect();
    const { id } = (context as { params: { id: string } }).params;

    const application = await Application.findById(id)
      .populate('propertyId', 'name')
      .populate('unitId', 'unitNumber');

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

    // Validates: application must be in status pending/shortlisted/under_review
    const allowedStatuses = ['pending', 'shortlisted', 'under_review'];
    if (!allowedStatuses.includes(application.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot start screening for application in '${application.status}' status.` },
        { status: 400 }
      );
    }

    // Validates: interviewStatus must be not_started
    if (application.interviewStatus && application.interviewStatus !== 'not_started') {
      return NextResponse.json(
        { success: false, error: 'AI screening interview has already been started or completed.' },
        { status: 400 }
      );
    }

    // Generates interviewToken (crypto.randomBytes(32).toString('hex'))
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    application.interviewToken = token;
    application.interviewTokenExpiry = expiry;
    application.interviewStatus = 'sent';
    application.aiScreeningStarted = true;

    await application.save();

    // Sends email to tenant with link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const interviewLink = `${baseUrl}/interview/${token}`;

    const propertyName = (application.propertyId as unknown as { name: string })?.name || 'Property';
    const unitNumber = (application.unitId as unknown as { unitNumber: string })?.unitNumber || 'N/A';

    try {
      await sendInterviewInvitationEmail(
        application.tenantInfo.email,
        application.tenantInfo.name,
        propertyName,
        unitNumber,
        interviewLink
      );
    } catch (emailErr) {
      console.error('Failed to send interview invitation email:', emailErr);
      // We still return success since the token was generated and saved
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Interview invitation sent' },
    });
  } catch (error) {
    console.error('POST /api/applications/[id]/start-screening error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(startScreening, ['landlord', 'super_admin']);

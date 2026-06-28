import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Application from '@/models/Application';

export async function GET(
  req: NextRequest,
  context: unknown
) {
  try {
    await dbConnect();
    const { token } = (context as { params: { token: string } }).params;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const application = await Application.findOne({ interviewToken: token })
      .populate('propertyId', 'name')
      .populate('unitId', 'unitNumber');

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Interview session not found' },
        { status: 404 }
      );
    }

    // Check if already completed
    if (application.interviewStatus === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Interview already completed' },
        { status: 400 }
      );
    }

    // Check if expired
    if (application.interviewTokenExpiry && new Date() > application.interviewTokenExpiry) {
      return NextResponse.json(
        { success: false, error: 'This interview link has expired. Contact your landlord.' },
        { status: 400 }
      );
    }

    const propertyName = (application.propertyId as unknown as { name: string })?.name || 'Property';
    const unitNumber = (application.unitId as unknown as { unitNumber: string })?.unitNumber || 'N/A';

    return NextResponse.json({
      success: true,
      data: {
        applicantName: application.tenantInfo.name,
        propertyName,
        unitNumber,
        interviewStatus: application.interviewStatus,
        aiTranscript: application.aiTranscript || [],
      },
    });
  } catch (error) {
    console.error('GET /api/interview/[token] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

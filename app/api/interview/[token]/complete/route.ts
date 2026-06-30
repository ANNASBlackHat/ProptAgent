import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Application from '@/models/Application';

export async function POST(
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

    const application = await Application.findOne({ interviewToken: token });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Interview session not found' },
        { status: 404 }
      );
    }

    // Update status to completed
    application.interviewStatus = 'completed';
    await application.save();

    // Trigger scoring via internal POST call
    try {
      const origin = req.nextUrl.origin;
      const scoreUrl = `${origin}/api/applications/${application._id}/score`;
      await fetch(scoreUrl, {
        method: 'POST',
        headers: {
          'x-internal-bypass': process.env.JWT_SECRET || '',
        },
      });
    } catch (scoringErr) {
      console.error('Failed to trigger scoring after interview completion:', scoringErr);
      // We still succeed the completion request even if scoring fails
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Interview complete. Thank you!' },
    });
  } catch (error) {
    console.error('POST /api/interview/[token]/complete error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

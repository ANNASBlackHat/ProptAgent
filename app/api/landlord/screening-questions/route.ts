import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';

// ─── GET /api/landlord/screening-questions ────────────────────────────────────
async function getQuestions(
  req: AuthenticatedRequest
) {
  try {
    await dbConnect();
    const landlord = await User.findById(req.user!.userId);

    if (!landlord) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { questions: landlord.screeningQuestions || [] },
    });
  } catch (error) {
    console.error('GET /api/landlord/screening-questions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── PUT /api/landlord/screening-questions ────────────────────────────────────
async function updateQuestions(
  req: AuthenticatedRequest
) {
  try {
    await dbConnect();
    const body = await req.json();
    const { questions } = body as { questions: string[] };

    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { success: false, error: 'Questions must be an array of strings' },
        { status: 400 }
      );
    }

    if (questions.length > 5) {
      return NextResponse.json(
        { success: false, error: 'Maximum of 5 custom screening questions allowed' },
        { status: 400 }
      );
    }

    // Sanitize and validate questions
    const sanitized = questions
      .map((q) => (typeof q === 'string' ? q.trim() : ''))
      .filter((q) => q.length > 0);

    const landlord = await User.findById(req.user!.userId);
    if (!landlord) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    landlord.screeningQuestions = sanitized;
    await landlord.save();

    return NextResponse.json({
      success: true,
      data: { questions: landlord.screeningQuestions },
    });
  } catch (error) {
    console.error('PUT /api/landlord/screening-questions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getQuestions, ['landlord']);
export const PUT = withAuth(updateQuestions, ['landlord']);

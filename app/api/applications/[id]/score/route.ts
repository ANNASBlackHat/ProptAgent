import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Application from '@/models/Application';
import { verifyToken, withAuth, AuthenticatedRequest } from '@/lib/auth';
import { runScoring } from '@/lib/scoring';

export async function POST(
  req: NextRequest,
  context: unknown
) {
  try {
    await dbConnect();
    const { id } = (context as { params: { id: string } }).params;

    const application = await Application.findById(id);
    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if it's an internal call via secret bypass
    const bypassHeader = req.headers.get('x-internal-bypass');
    const isInternal = bypassHeader && bypassHeader === process.env.JWT_SECRET;

    if (!isInternal) {
      // Authenticate landlord
      let token = req.cookies.get('token')?.value;
      if (!token) {
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        return NextResponse.json(
          { success: false, error: 'Authentication token missing or invalid' },
          { status: 401 }
        );
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return NextResponse.json(
          { success: false, error: 'Authentication token is expired or invalid' },
          { status: 401 }
        );
      }

      if (decoded.role !== 'landlord' && decoded.role !== 'super_admin') {
        return NextResponse.json(
          { success: false, error: 'Access denied: insufficient permissions' },
          { status: 403 }
        );
      }

      // Ensure the application belongs to this landlord (or is super_admin)
      if (
        decoded.role !== 'super_admin' &&
        application.landlordId.toString() !== decoded.userId
      ) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Run scoring
    const aiScore = await runScoring(id);

    return NextResponse.json({
      success: true,
      data: { aiScore },
    });
  } catch (error) {
    console.error('POST /api/applications/[id]/score error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET is protected normally using withAuth
async function getScore(req: AuthenticatedRequest, context: unknown) {
  try {
    await dbConnect();
    const { id } = (context as { params: { id: string } }).params;

    const application = await Application.findById(id);
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

    if (!application.aiScore) {
      return NextResponse.json(
        { success: false, error: 'Scoring not yet run' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { aiScore: application.aiScore },
    });
  } catch (error) {
    console.error('GET /api/applications/[id]/score error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getScore, ['landlord', 'super_admin']);

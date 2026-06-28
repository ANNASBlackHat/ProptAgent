import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const handler = async (req: AuthenticatedRequest) => {
  try {
    await dbConnect();

    // The user object is attached to the request by the withAuth middleware
    if (!req.user || !req.user.userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: true, data: user },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
};

export const GET = withAuth(handler);

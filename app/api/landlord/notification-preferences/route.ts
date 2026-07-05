import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';

async function getNotificationPreferences(req: AuthenticatedRequest) {
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
      data: {
        notificationPreferences: landlord.notificationPreferences || {
          newApplication: true,
          leaseExpiring: true,
          maintenanceSubmitted: true,
          paymentPastDue: true,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/landlord/notification-preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function updateNotificationPreferences(req: AuthenticatedRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid preferences payload' },
        { status: 400 }
      );
    }

    const landlord = await User.findById(req.user!.userId);
    if (!landlord) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Merge or set preferences
    landlord.notificationPreferences = {
      newApplication: typeof preferences.newApplication === 'boolean' ? preferences.newApplication : true,
      leaseExpiring: typeof preferences.leaseExpiring === 'boolean' ? preferences.leaseExpiring : true,
      maintenanceSubmitted: typeof preferences.maintenanceSubmitted === 'boolean' ? preferences.maintenanceSubmitted : true,
      paymentPastDue: typeof preferences.paymentPastDue === 'boolean' ? preferences.paymentPastDue : true,
    };

    await landlord.save();

    return NextResponse.json({
      success: true,
      data: { notificationPreferences: landlord.notificationPreferences },
    });
  } catch (error) {
    console.error('PUT /api/landlord/notification-preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getNotificationPreferences, ['landlord']);
export const PUT = withAuth(updateNotificationPreferences, ['landlord']);
export const dynamic = 'force-dynamic';

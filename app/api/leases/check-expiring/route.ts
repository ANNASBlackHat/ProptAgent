import { NextRequest, NextResponse } from 'next/server';
import { checkExpiringLeases } from '@/lib/leaseChecker';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/leases/check-expiring — Trigger lease expiry check
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secretParam = searchParams.get('secret');
  const secretHeader = req.headers.get('x-cron-secret');
  const cronSecret = process.env.CRON_SECRET;

  let isAuthorized = false;

  // 1. Check if cron secret matches
  if (cronSecret && (secretParam === cronSecret || secretHeader === cronSecret)) {
    isAuthorized = true;
  } else {
    // 2. Otherwise, check for authenticated landlord or super_admin session
    let token = req.cookies.get('token')?.value;

    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (token) {
      const decoded = verifyToken(token);
      if (decoded && (decoded.role === 'landlord' || decoded.role === 'super_admin')) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid credentials or secret' },
      { status: 401 }
    );
  }

  try {
    const result = await checkExpiringLeases();
    return NextResponse.json({
      success: true,
      data: {
        message: 'Lease expiry check completed successfully.',
        ...result,
      },
    });
  } catch (error) {
    console.error('GET /api/leases/check-expiring error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run lease expiry check' },
      { status: 500 }
    );
  }
}

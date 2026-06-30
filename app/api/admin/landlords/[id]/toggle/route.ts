import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';

// PATCH /api/admin/landlords/[id]/toggle — activate/deactivate a landlord
async function handler(
  req: AuthenticatedRequest,
  context: { params: { id: string } }
): Promise<Response> {
  try {
    await dbConnect();

    const { id } = context.params;

    const landlord = await User.findOne({ _id: id, role: 'landlord' });
    if (!landlord) {
      return NextResponse.json(
        { success: false, error: 'Landlord not found' },
        { status: 404 }
      );
    }

    landlord.isActive = !landlord.isActive;
    await landlord.save();

    return NextResponse.json({
      success: true,
      data: {
        _id: landlord._id,
        isActive: landlord.isActive,
        message: landlord.isActive
          ? 'Landlord activated successfully'
          : 'Landlord deactivated. Tenant-facing pages for their properties will return 503.',
      },
    });
  } catch (error) {
    console.error('[Admin] PATCH /api/admin/landlords/[id]/toggle error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle landlord status' },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(handler, ['super_admin']);

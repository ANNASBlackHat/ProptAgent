import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Plan from '@/models/Plan';

// GET /api/plans — PUBLIC route to fetch active plans for the pricing page
export async function GET() {
  try {
    await dbConnect();
    const plans = await Plan.find({ isActive: true }).sort({ price: 1 }).lean();
    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    console.error('GET /api/plans public route error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing plans' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';

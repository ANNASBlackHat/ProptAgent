import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import Plan from '@/models/Plan';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { name, email, password, companyName, phone } = body;

    // Validation
    if (!name || !email || !password || !companyName) {
      return NextResponse.json(
        { success: false, error: 'Name, email, password, and company name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email is already registered' },
        { status: 400 }
      );
    }

    // Find the plan with slug: "free"
    const freePlan = await Plan.findOne({ slug: 'free' });
    const planSlug = freePlan ? 'free' : '';
    const planId = freePlan ? freePlan._id : null;
    const subscriptionStatus = freePlan ? 'active' : 'none';

    // Create landlord user
    const user = new User({
      name,
      email,
      password,
      role: 'landlord',
      companyName,
      phone,
      isActive: true,
      planId,
      planSlug,
      subscriptionStatus,
      usageThisMonth: {
        applications: 0,
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days reset period
      },
    });

    await user.save();

    // Sign JWT token
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Create response and set cookie
    const userResponse = user.toObject();
    delete userResponse.password;

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: userResponse,
          token,
        },
      },
      { status: 201 }
    );

    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

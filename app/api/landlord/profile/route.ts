import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';

async function updateProfile(req: AuthenticatedRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const {
      name,
      email,
      phone,
      companyName,
      logo,
      currentPassword,
      newPassword,
      confirmNewPassword,
    } = body;

    const landlord = await User.findById(req.user!.userId).select('+password');
    if (!landlord) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // 1. Check if email is already taken
    if (email && email.toLowerCase() !== landlord.email.toLowerCase()) {
      const existing = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: landlord._id },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Email is already in use by another account' },
          { status: 400 }
        );
      }
      landlord.email = email.toLowerCase();
    }

    // 2. Handle Password Change if requested
    if (currentPassword || newPassword || confirmNewPassword) {
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        return NextResponse.json(
          { success: false, error: 'Please provide current password, new password, and confirmation' },
          { status: 400 }
        );
      }

      // Check current password
      const isMatch = await landlord.comparePassword(currentPassword);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      // Validate new password length
      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 8 characters long' },
          { status: 400 }
        );
      }

      // Verify passwords match
      if (newPassword !== confirmNewPassword) {
        return NextResponse.json(
          { success: false, error: 'New password and confirmation do not match' },
          { status: 400 }
        );
      }

      landlord.password = newPassword;
    }

    // 3. Update profile fields
    if (name) landlord.name = name;
    if (phone !== undefined) landlord.phone = phone;
    if (companyName) landlord.companyName = companyName;
    if (logo !== undefined) landlord.logo = logo;

    await landlord.save();

    // Remove password before returning
    const userObj = landlord.toObject();
    delete userObj.password;

    return NextResponse.json({
      success: true,
      data: { user: userObj },
    });
  } catch (error) {
    console.error('PUT /api/landlord/profile error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(updateProfile, ['landlord']);
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Hash the token received from the URL
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find the user with matching token and unexpired time
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired password reset token' },
        { status: 400 }
      );
    }

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return NextResponse.json(
      { success: true, message: 'Password has been reset successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

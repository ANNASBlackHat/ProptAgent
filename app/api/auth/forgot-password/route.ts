import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return 404 for clarity in testing and user feedback
      return NextResponse.json(
        { success: false, error: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set expiry
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.save();

    // Create reset URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    // Send email
    const emailHtml = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">PropAgent</h1>
          <p style="color: #64748b; margin-top: 4px; font-size: 14px;">AI Tenant Screening & Property Management</p>
        </div>
        
        <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-bottom: 16px;">Reset Your Password</h2>
        <p style="font-size: 16px; line-height: 24px; color: #334155; margin-bottom: 24px;">
          Hello ${user.name},<br/><br/>
          We received a request to reset the password for your PropAgent account. Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
            Reset Password
          </a>
        </div>
        
        <p style="font-size: 14px; line-height: 20px; color: #64748b; margin-bottom: 24px;">
          If the button above does not work, copy and paste the link below into your browser:
        </p>
        <p style="word-break: break-all; color: #2563eb; font-size: 14px; background-color: #f1f5f9; padding: 12px; border-radius: 6px; font-family: monospace;">
          ${resetUrl}
        </p>
        
        <p style="font-size: 14px; line-height: 20px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
          If you did not request this password reset, please ignore this email. Your password will remain secure and unchanged.
        </p>
      </div>
    `;

    await sendEmail(user.email, 'Reset Your PropAgent Password', emailHtml);

    return NextResponse.json(
      { success: true, message: 'Password reset email has been sent' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

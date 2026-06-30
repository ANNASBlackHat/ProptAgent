import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import { getDecryptedSettings } from '@/lib/settings';
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import nodemailer from 'nodemailer';

// POST /api/admin/settings/test-email — send test email to super_admin's own address
async function handler(req: AuthenticatedRequest): Promise<Response> {
  try {
    await dbConnect();

    const adminId = req.user?.userId;
    const admin = await User.findById(adminId).select('email name');
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Admin user not found' }, { status: 404 });
    }

    const settings = await getDecryptedSettings();

    if (!settings.smtpHost) {
      return NextResponse.json(
        { success: false, error: 'SMTP is not configured' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: parseInt(settings.smtpPort, 10),
      secure: parseInt(settings.smtpPort, 10) === 465,
      auth:
        settings.smtpUser && settings.smtpPass
          ? { user: settings.smtpUser, pass: settings.smtpPass }
          : undefined,
    });

    await transporter.sendMail({
      from: settings.smtpFrom,
      to: admin.email,
      subject: `${settings.appName} — Test Email`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
          <h2 style="color: #a855f7; margin-top: 0;">✅ SMTP Test Successful</h2>
          <p>Hi <strong>${admin.name}</strong>,</p>
          <p>This is a test email from <strong>${settings.appName}</strong> to confirm your SMTP configuration is working correctly.</p>
          <div style="background: #1e293b; border-radius: 10px; padding: 16px; margin: 24px 0; border: 1px solid #334155;">
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">
              SMTP Host: <strong style="color: #e2e8f0;">${settings.smtpHost}</strong><br/>
              Port: <strong style="color: #e2e8f0;">${settings.smtpPort}</strong><br/>
              From: <strong style="color: #e2e8f0;">${settings.smtpFrom}</strong>
            </p>
          </div>
          <p style="color: #64748b; font-size: 13px;">Sent via ${settings.appName} Super Admin Panel</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      data: { message: `Test email sent to ${admin.email}` },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Failed to send test email';
    console.error('[Admin] test-email error:', error);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

export const POST = withAuth(handler, ['super_admin']);

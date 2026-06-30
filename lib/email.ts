import nodemailer from 'nodemailer';

/**
 * Get a configured Nodemailer transporter.
 * Reads SMTP settings from SystemSettings first, falls back to env vars.
 */
async function getTransporter(): Promise<{ transporter: nodemailer.Transporter; from: string }> {
  let smtpHost = process.env.SMTP_HOST || '';
  let smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  let smtpUser = process.env.SMTP_USER || '';
  let smtpPass = process.env.SMTP_PASS || '';
  let smtpFrom = process.env.SMTP_FROM || 'noreply@propagent.com';

  try {
    const { dbConnect } = await import('@/lib/db');
    const { default: SystemSettings, decryptField } = await import('@/models/SystemSettings');
    await dbConnect();
    const settings = await SystemSettings.getSingleton();

    if (settings.smtpHost) smtpHost = settings.smtpHost;
    if (settings.smtpPort) smtpPort = parseInt(settings.smtpPort, 10);
    if (settings.smtpUser) smtpUser = settings.smtpUser;
    if (settings.smtpPass) {
      const decrypted = decryptField(settings.smtpPass);
      if (decrypted) smtpPass = decrypted;
    }
    if (settings.smtpFrom) smtpFrom = settings.smtpFrom;
  } catch {
    // Fall back to env vars silently
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth:
      smtpUser && smtpPass
        ? { user: smtpUser, pass: smtpPass }
        : undefined,
  });

  return { transporter, from: smtpFrom };
}

/**
 * Send an email using SMTP (reads config from SystemSettings or env)
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<unknown> {
  const { transporter, from } = await getTransporter();
  try {
    return await transporter.sendMail({ from, to, subject, html });
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
}

/**
 * Send an interview invitation email to the tenant
 */
export async function sendInterviewInvitationEmail(
  to: string,
  applicantName: string,
  propertyName: string,
  unitNumber: string,
  interviewLink: string
): Promise<unknown> {
  const subject = `Your rental application interview for ${propertyName} - Unit ${unitNumber}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; background-color: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
      <h2 style="color: #a855f7; margin-top: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">PropAgent AI Tenant Screening</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #f1f5f9;">Hi <strong>${applicantName}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
        Thank you for submitting your rental application for <strong>${propertyName}</strong> (Unit ${unitNumber}).
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
        The next step in our application process is a brief, friendly online interview with our AI screening assistant. This helps us learn a bit more about you and your housing needs.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${interviewLink}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 15px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);">
          Start AI Screening Interview
        </a>
      </div>
      
      <div style="background-color: #1e293b; border-radius: 10px; padding: 16px; margin: 24px 0; border: 1px solid #334155;">
        <p style="margin: 0; font-size: 13px; color: #fbbf24; font-weight: 600; text-align: center;">
          ⚠️ This link will expire in 48 hours.
        </p>
      </div>
      
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 0;">
        You can complete this interview on your computer or mobile phone at any time. It should take about 5–10 minutes.
      </p>
    </div>
  `;

  return sendEmail(to, subject, html);
}

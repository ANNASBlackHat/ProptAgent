import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@propagent.com';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASS ? {
    user: SMTP_USER,
    pass: SMTP_PASS,
  } : undefined,
});

/**
 * Send an email using SMTP
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param html - HTML body of the email
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<unknown> {
  const mailOptions = {
    from: SMTP_FROM,
    to,
    subject,
    html,
  };

  try {
    return await transporter.sendMail(mailOptions);
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

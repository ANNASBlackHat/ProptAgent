import nodemailer from 'nodemailer';

/**
 * Get a configured Nodemailer transporter.
 * Reads SMTP settings from SystemSettings first, falls back to env vars.
 */
async function getTransporter(): Promise<{ transporter: nodemailer.Transporter; from: string }> {
  let smtpHost = process.env.SMTP_HOST || '';
  let smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  let smtpUser = process.env.SMTP_USER || '';
  let smtpPass = process.env.SMTP_PASS || '';
  let smtpFrom = process.env.SMTP_FROM || '';

  try {
    const { dbConnect } = await import('./db');
    const { default: SystemSettings, decryptField } = await import('../models/SystemSettings');
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

/**
 * Send an email notification when a subscription is activated.
 */
export async function sendSubscriptionActivatedEmail(
  to: string,
  data: { planName: string; nextBillingDate: Date | string; amount: number }
): Promise<unknown> {
  const subject = `Your ${data.planName} subscription is now active!`;
  const formattedAmount = (data.amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const formattedDate = typeof data.nextBillingDate === 'string' ? data.nextBillingDate : new Date(data.nextBillingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const html = `
    <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; background-color: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
      <h2 style="color: #10b981; margin-top: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">PropAgent Subscription Active</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #f1f5f9;">Hi there,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
        Thank you for subscribing! Your <strong>${data.planName}</strong> plan is now active.
      </p>
      <div style="background-color: #1e293b; border-radius: 10px; padding: 16px; margin: 24px 0; border: 1px solid #334155;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #e2e8f0;"><strong>Plan:</strong> ${data.planName}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #e2e8f0;"><strong>Amount:</strong> ${formattedAmount} USD</p>
        <p style="margin: 0; font-size: 14px; color: #e2e8f0;"><strong>Next Billing Date:</strong> ${formattedDate}</p>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 0;">
        You can now access all the premium quotas and features under your plan settings. Happy renting!
      </p>
    </div>
  `;
  return sendEmail(to, subject, html);
}

/**
 * Send an email notification when a subscription is cancelled.
 */
export async function sendSubscriptionCancelledEmail(
  to: string,
  data: { planName: string; accessUntil: Date | string }
): Promise<unknown> {
  const subject = `Your ${data.planName} subscription has been cancelled`;
  const formattedDate = typeof data.accessUntil === 'string' ? data.accessUntil : new Date(data.accessUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const html = `
    <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; background-color: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
      <h2 style="color: #f59e0b; margin-top: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">Subscription Cancelled</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #f1f5f9;">Hi there,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
        Your <strong>${data.planName}</strong> subscription has been cancelled.
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
        You will retain access to your plan features and limits until <strong style="color: #f1f5f9;">${formattedDate}</strong>, after which your account will automatically downgrade to the Free plan.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-top: 24px; margin-bottom: 0;">
        If this was a mistake, you can reactivate your plan at any time from your billing page.
      </p>
    </div>
  `;
  return sendEmail(to, subject, html);
}

/**
 * Send an email notification when payment fails.
 */
export async function sendPaymentFailedEmail(
  to: string,
  data: { planName: string; updatePaymentUrl: string }
): Promise<unknown> {
  const subject = `Urgent: Payment failed for your ${data.planName} subscription`;
  const html = `
    <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; background-color: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
      <h2 style="color: #ef4444; margin-top: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">Payment Failed</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #f1f5f9;">Hi there,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
        We were unable to process your payment for the <strong>${data.planName}</strong> subscription.
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
        Please update your payment details as soon as possible to avoid losing premium access to your landlord tools.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.updatePaymentUrl}" style="display: inline-block; background: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 15px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);">
          Update Payment Method
        </a>
      </div>
    </div>
  `;
  return sendEmail(to, subject, html);
}

/**
 * Send an email notification when payment succeeds.
 */
export async function sendPaymentSucceededEmail(
  to: string,
  data: { planName: string; amount: number; nextBillingDate: Date | string }
): Promise<unknown> {
  const subject = `Payment Confirmed — Receipt for ${data.planName}`;
  const formattedAmount = (data.amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const formattedDate = typeof data.nextBillingDate === 'string' ? data.nextBillingDate : new Date(data.nextBillingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const html = `
    <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; background-color: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
      <h2 style="color: #10b981; margin-top: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">Payment Confirmed</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #f1f5f9;">Hi there,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
        We have successfully processed your payment of <strong>${formattedAmount} USD</strong> for your <strong>${data.planName}</strong> subscription.
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
        Your next renewal date is <strong>${formattedDate}</strong>.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-top: 24px; margin-bottom: 0;">
        Thank you for choosing PropAgent!
      </p>
    </div>
  `;
  return sendEmail(to, subject, html);
}

/**
 * Send an email notification when the trial is ending.
 */
export async function sendTrialEndingEmail(
  to: string,
  data: { planName: string; trialEndDate: Date | string; upgradeUrl: string }
): Promise<unknown> {
  const subject = `Your ${data.planName} trial ends in 3 days`;
  const formattedDate = typeof data.trialEndDate === 'string' ? data.trialEndDate : new Date(data.trialEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const html = `
    <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; background-color: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
      <h2 style="color: #fbbf24; margin-top: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">Trial Period Ending</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #f1f5f9;">Hi there,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
        This is a friendly reminder that your free trial for the <strong>${data.planName}</strong> plan will end in 3 days on <strong>${formattedDate}</strong>.
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
        To prevent any interruption to your landlord screening services and limits, please add a payment method.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.upgradeUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 15px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);">
          Add Payment Method
        </a>
      </div>
    </div>
  `;
  return sendEmail(to, subject, html);
}

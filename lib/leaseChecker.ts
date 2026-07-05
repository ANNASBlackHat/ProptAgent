import { dbConnect } from './db';
import Lease from '@/models/Lease';
import { sendEmail } from './email';

export async function checkExpiringLeases(): Promise<{
  expiringCount: number;
  expiredCount: number;
}> {
  await dbConnect();

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  // 1. Find leases expiring within 30 days that are still marked as active
  const expiringLeases = await Lease.find({
    status: 'active',
    endDate: { $gte: now, $lte: thirtyDaysFromNow },
  })
    .populate('landlordId')
    .populate('tenantId')
    .populate('propertyId')
    .populate('unitId');

  let expiringCount = 0;
  for (const lease of expiringLeases) {
    lease.status = 'expiring_soon';
    await lease.save();
    expiringCount++;

    // Send email to landlord
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const landlord = lease.landlordId as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenant = lease.tenantId as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const property = lease.propertyId as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unit = lease.unitId as any;

    if (landlord && landlord.email && landlord.notificationPreferences?.leaseExpiring !== false) {
      try {
        const formattedEndDate = new Date(lease.endDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        await sendEmail(
          landlord.email,
          `⚠️ Action Required: Lease Expiring Soon for Unit ${unit?.unitNumber || 'N/A'}`,
          `
            <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; background-color: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
              <h2 style="color: #fbbf24; margin-top: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">Lease Expiring Soon</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #f1f5f9;">Hi <strong>${landlord.name}</strong>,</p>
              <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                This is a notification that the lease agreement for <strong>${property?.name || 'Property'}</strong>, Unit <strong>${unit?.unitNumber || 'N/A'}</strong> is expiring soon.
              </p>
              
              <div style="background-color: #1e293b; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #334155;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #cbd5e1;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #94a3b8; width: 120px;">Tenant:</td>
                    <td style="padding: 6px 0; color: #f1f5f9;">${tenant?.name || 'N/A'} (${tenant?.email || 'N/A'})</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">End Date:</td>
                    <td style="padding: 6px 0; color: #fbbf24; font-weight: 600;">${formattedEndDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">Rent:</td>
                    <td style="padding: 6px 0; color: #f1f5f9;">$${lease.monthlyRent.toLocaleString()}/mo</td>
                  </tr>
                </table>
              </div>
              
              <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                You can log into your dashboard to renew the lease with the tenant or arrange for move-out procedures.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/leases/${lease._id}" style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); color: #0f172a; text-decoration: none; padding: 14px 28px; font-size: 15px; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 12px rgba(251, 191, 36, 0.25);">
                  View Lease Details
                </a>
              </div>
              
              <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin-bottom: 0; text-align: center;">
                PropAgent • Automated Property Management Assistant
              </p>
            </div>
          `
        );
      } catch (emailErr) {
        console.error(`Failed to send expiry email for lease ${lease._id}:`, emailErr);
      }
    }
  }

  // 2. Check for active/expiring leases that have actually passed their end date
  const expiredLeases = await Lease.find({
    status: { $in: ['active', 'expiring_soon'] },
    endDate: { $lt: now },
  });

  let expiredCount = 0;
  for (const lease of expiredLeases) {
    lease.status = 'expired';
    await lease.save();
    expiredCount++;
  }

  return { expiringCount, expiredCount };
}

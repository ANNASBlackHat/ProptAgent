import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import MaintenanceRequest from '@/models/MaintenanceRequest';
import Property from '@/models/Property';
import Unit from '@/models/Unit';
import User from '@/models/User';
import { sendEmail } from '@/lib/email';

// PATCH /api/maintenance/[id]/status — Update request status (Landlord only)
async function updateMaintenanceStatus(
  req: AuthenticatedRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const landlordId = req.user!.userId;

    const body = await req.json();
    const { status } = body;

    const ALLOWED_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Find request and verify ownership
    const request = await MaintenanceRequest.findById(id);
    if (!request) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    if (request.landlordId.toString() !== landlordId) {
      return NextResponse.json(
        { success: false, error: 'Access denied: You do not own this property' },
        { status: 403 }
      );
    }

    const oldStatus = request.status;
    request.status = status;

    if (status === 'resolved') {
      request.resolvedAt = new Date();
    } else if (status !== 'resolved' && oldStatus === 'resolved') {
      // Clear resolvedAt if status is reverted from resolved
      request.resolvedAt = undefined;
    }

    await request.save();

    // Fetch tenant, property and unit details for the email
    const [tenant, property, unit] = await Promise.all([
      User.findById(request.tenantId).lean(),
      Property.findById(request.propertyId).lean(),
      Unit.findById(request.unitId).lean(),
    ]);

    if (tenant && oldStatus !== status) {
      const statusLabels: Record<string, string> = {
        open: 'Open 📋',
        in_progress: 'In Progress ⚙️',
        resolved: 'Resolved ✅',
        closed: 'Closed 🔒',
      };

      const statusColors: Record<string, string> = {
        open: '#3b82f6',
        in_progress: '#f59e0b',
        resolved: '#10b981',
        closed: '#64748b',
      };

      try {
        await sendEmail(
          tenant.email,
          `🛠️ Update on your Maintenance Request: ${status.toUpperCase()}`,
          `
            <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; background-color: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
              <h2 style="color: #60a5fa; margin-top: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;">Maintenance Request Status Updated</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #f1f5f9;">Hi <strong>${tenant.name}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                The status of your maintenance request for <strong>${property?.name || 'Property'}</strong>, Unit <strong>${unit?.unitNumber || 'N/A'}</strong> has been updated.
              </p>
              
              <div style="background-color: #1e293b; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #334155;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #cbd5e1;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #94a3b8; width: 120px;">Request Title:</td>
                    <td style="padding: 6px 0; color: #f1f5f9;">${request.title}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">New Status:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: ${statusColors[status] || '#f1f5f9'};">
                      ${statusLabels[status] || status}
                    </td>
                  </tr>
                  ${status === 'resolved' ? `
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">Resolved At:</td>
                    <td style="padding: 6px 0; color: #f1f5f9;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                You can view the full details and history of this request in your tenant portal.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/tenant/maintenance" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);">
                  Go to Tenant Portal
                </a>
              </div>
            </div>
          `
        );
      } catch (emailErr) {
        console.error('Failed to send maintenance status update email:', emailErr);
      }
    }

    return NextResponse.json({ success: true, data: request });
  } catch (error) {
    console.error('PATCH /api/maintenance/[id]/status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(updateMaintenanceStatus, ['landlord']);

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import MaintenanceRequest from '@/models/MaintenanceRequest';
import Lease from '@/models/Lease';
import User from '@/models/User';
import Property from '@/models/Property';
import Unit from '@/models/Unit';
import { sendEmail } from '@/lib/email';
import { sanitizeObject } from '@/lib/sanitize';
import { checkMaintenanceModule } from '@/lib/planLimits';

// GET /api/maintenance — List landlord's maintenance requests with filtering, pagination, and sorting (Urgent + Open first)
async function listMaintenanceRequests(req: AuthenticatedRequest) {
  try {
    await dbConnect();
    const landlordId = req.user!.userId;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const propertyId = searchParams.get('propertyId');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    // Landlords can only view requests for their properties
    const query: Record<string, any> = { landlordId: new mongoose.Types.ObjectId(landlordId) };

    if (status) query.status = status;
    if (urgency) query.urgency = urgency;
    if (propertyId) query.propertyId = new mongoose.Types.ObjectId(propertyId);
    if (category) query.category = category;

    // Convert landlordId to ObjectId for aggregation match
    const matchQuery: Record<string, any> = { landlordId: new mongoose.Types.ObjectId(landlordId) };
    if (status) matchQuery.status = status;
    if (urgency) matchQuery.urgency = urgency;
    if (propertyId) matchQuery.propertyId = new mongoose.Types.ObjectId(propertyId);
    if (category) matchQuery.category = category;

    const total = await MaintenanceRequest.countDocuments(query);

    // Aggregate to sort urgent + open requests to the top
    const rawRequests = await MaintenanceRequest.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          isUrgentOpen: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'open'] },
                  { $eq: ['$urgency', 'urgent'] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
      { $sort: { isUrgentOpen: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const requests = await MaintenanceRequest.populate(rawRequests, [
      { path: 'tenantId', select: 'name email phone' },
      { path: 'propertyId', select: 'name address' },
      { path: 'unitId', select: 'unitNumber type' },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        requests,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/maintenance error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance requests' },
      { status: 500 }
    );
  }
}

// POST /api/maintenance — Create a new maintenance request (Tenant only)
async function createMaintenanceRequest(req: AuthenticatedRequest) {
  try {
    await dbConnect();
    const tenantId = req.user!.userId;

    const rawBody = await req.json();
    const body = sanitizeObject(rawBody);
    const { category, urgency, title, description, photos } = body;

    if (!category || !urgency || !title || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the tenant's active lease
    const activeLease = await Lease.findOne({ tenantId, status: 'active' });
    if (!activeLease) {
      return NextResponse.json(
        { success: false, error: 'No active lease found' },
        { status: 400 }
      );
    }

    // Enforce Maintenance Module plan limits
    const limitCheck = await checkMaintenanceModule(activeLease.landlordId.toString());
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'PLAN_LIMIT_EXCEEDED',
          message: limitCheck.reason,
          limit: limitCheck.limit,
          upgradeUrl: '/billing',
        },
        { status: 403 }
      );
    }

    const newRequest = await MaintenanceRequest.create({
      leaseId: activeLease._id,
      unitId: activeLease.unitId,
      propertyId: activeLease.propertyId,
      landlordId: activeLease.landlordId,
      tenantId,
      category,
      urgency,
      title,
      description,
      photos: photos || [],
      status: 'open',
    });

    // Fetch landlord, property and unit info for email notification
    const [landlord, property, unit, tenant] = await Promise.all([
      User.findById(activeLease.landlordId).lean(),
      Property.findById(activeLease.propertyId).lean(),
      Unit.findById(activeLease.unitId).lean(),
      User.findById(tenantId).lean(),
    ]);

    if (landlord && landlord.notificationPreferences?.maintenanceSubmitted !== false) {
      const urgencyLabels: Record<string, string> = {
        low: '🟢 Low',
        medium: '🟡 Medium',
        urgent: '🔴 URGENT',
      };
      const categoryLabels: Record<string, string> = {
        plumbing: '🔧 Plumbing',
        electrical: '⚡ Electrical',
        hvac: '❄️ HVAC',
        structural: '🏗️ Structural',
        appliance: '🍳 Appliance',
        other: '📋 Other',
      };

      try {
        await sendEmail(
          landlord.email,
          `🛠️ New Maintenance Request (${urgency.toUpperCase()}): ${title}`,
          `
            <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; background-color: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
              <h2 style="color: #60a5fa; margin-top: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;">New Maintenance Request Submitted</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #f1f5f9;">Hi <strong>${landlord.name}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                A new maintenance request has been submitted for <strong>${property?.name || 'Property'}</strong>, Unit <strong>${unit?.unitNumber || 'N/A'}</strong> by tenant <strong>${tenant?.name || 'Tenant'}</strong>.
              </p>
              
              <div style="background-color: #1e293b; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #334155;">
                <h3 style="color: #e2e8f0; margin-top: 0; font-size: 16px; font-weight: 600; border-bottom: 1px solid #334155; padding-bottom: 8px;">Request Details</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #cbd5e1; margin-top: 8px;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #94a3b8; width: 120px;">Title:</td>
                    <td style="padding: 6px 0; color: #f1f5f9;">${title}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">Category:</td>
                    <td style="padding: 6px 0; color: #f1f5f9;">${categoryLabels[category] || category}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">Urgency:</td>
                    <td style="padding: 6px 0; font-weight: 600; color: ${urgency === 'urgent' ? '#ef4444' : urgency === 'medium' ? '#f59e0b' : '#94a3b8'};">
                      ${urgencyLabels[urgency] || urgency}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #94a3b8; vertical-align: top;">Description:</td>
                    <td style="padding: 6px 0; color: #f1f5f9; white-space: pre-line;">${description}</td>
                  </tr>
                </table>
              </div>

              <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
                Please log in to your landlord portal to review the request, inspect any photos, and update the status of the repair.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/maintenance/${newRequest._id}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);">
                  View Request Details
                </a>
              </div>
            </div>
          `
        );
      } catch (emailErr) {
        console.error('Failed to send maintenance email notification:', emailErr);
      }
    }

    return NextResponse.json({ success: true, data: newRequest }, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/maintenance error:', error);
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAuth(listMaintenanceRequests, ['landlord']);
export const POST = withAuth(createMaintenanceRequest, ['tenant']);
export const dynamic = 'force-dynamic';

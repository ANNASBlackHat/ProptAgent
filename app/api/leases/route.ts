import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Lease from '@/models/Lease';
import Application from '@/models/Application';
import Unit from '@/models/Unit';
import User from '@/models/User';
import Property from '@/models/Property';
import { sendEmail } from '@/lib/email';

// GET /api/leases — List landlord's leases with filters and pagination
async function listLeases(req: AuthenticatedRequest) {
  try {
    await dbConnect();
    const landlordId = req.user!.userId;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const unitId = searchParams.get('unitId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { landlordId };
    if (status) {
      query.status = status;
    }
    if (unitId) {
      query.unitId = unitId;
    }

    const total = await Lease.countDocuments(query);
    const leases = await Lease.find(query)
      .populate('tenantId', 'name email phone')
      .populate('propertyId', 'name address')
      .populate('unitId', 'unitNumber type rentAmount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        leases,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/leases error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leases' },
      { status: 500 }
    );
  }
}

// POST /api/leases — Create a lease from an application
async function createLease(req: AuthenticatedRequest) {
  try {
    await dbConnect();
    const landlordId = req.user!.userId;

    const body = await req.json();
    const {
      applicationId,
      startDate,
      endDate,
      monthlyRent,
      depositAmount,
      specialTerms,
    } = body;

    if (!applicationId || !startDate || !endDate || !monthlyRent || !depositAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Find the application and verify ownership
    const application = await Application.findById(applicationId);
    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    if (application.landlordId.toString() !== landlordId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Application does not belong to you' },
        { status: 403 }
      );
    }

    // 2. Find the tenant user
    const tenantUser = await User.findOne({
      email: application.tenantInfo.email.toLowerCase(),
      role: 'tenant',
    });

    if (!tenantUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant user account not found. Please ensure the applicant has a tenant account.',
        },
        { status: 400 }
      );
    }

    // 3. Create the lease
    const lease = await Lease.create({
      applicationId,
      unitId: application.unitId,
      propertyId: application.propertyId,
      landlordId,
      tenantId: tenantUser._id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      monthlyRent,
      depositAmount,
      specialTerms,
      status: 'active',
    });

    // 4. Update unit status to occupied
    await Unit.findByIdAndUpdate(application.unitId, { status: 'occupied' });

    // 5. Update application status to approved
    application.status = 'approved';
    application.statusHistory.push({
      status: 'approved',
      changedAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      changedBy: landlordId as any,
      note: 'Lease agreement created and finalized.',
    });
    await application.save();

    // Fetch property name for the email
    const property = await Property.findById(application.propertyId).lean();
    const unit = await Unit.findById(application.unitId).lean();

    // 6. Send welcome email to tenant
    try {
      const formattedStart = new Date(startDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const formattedEnd = new Date(endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      await sendEmail(
        tenantUser.email,
        `🎉 Welcome to your new home at ${property?.name || 'your property'}!`,
        `
          <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; background-color: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
            <h2 style="color: #10b981; margin-top: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">Congratulations! Your Lease is Active</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #f1f5f9;">Hi <strong>${tenantUser.name}</strong>,</p>
            <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
              We are excited to welcome you! Your lease agreement for <strong>${property?.name || 'Property'}</strong>, Unit <strong>${unit?.unitNumber || 'N/A'}</strong> has been finalized.
            </p>
            
            <div style="background-color: #1e293b; border-radius: 10px; padding: 20px; margin: 24px 0; border: 1px solid #334155;">
              <h3 style="color: #60a5fa; margin-top: 0; font-size: 15px; font-weight: 600; border-bottom: 1px solid #334155; padding-bottom: 8px;">Lease Summary</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #cbd5e1; margin-top: 8px;">
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #94a3b8; width: 140px;">Start Date:</td>
                  <td style="padding: 6px 0; color: #f1f5f9;">${formattedStart}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">End Date:</td>
                  <td style="padding: 6px 0; color: #f1f5f9;">${formattedEnd}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">Monthly Rent:</td>
                  <td style="padding: 6px 0; color: #10b981; font-weight: 600;">$${monthlyRent.toLocaleString()}/mo</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #94a3b8;">Security Deposit:</td>
                  <td style="padding: 6px 0; color: #f1f5f9;">$${depositAmount.toLocaleString()}</td>
                </tr>
                ${specialTerms ? `
                <tr>
                  <td style="padding: 6px 0; font-weight: 600; color: #94a3b8; vertical-align: top;">Special Terms:</td>
                  <td style="padding: 6px 0; color: #f1f5f9; font-style: italic;">${specialTerms}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
              You can access your tenant portal at any time to view your lease terms, track your rent payment history, and submit maintenance requests.
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tenant" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 15px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);">
                Go to Tenant Portal
              </a>
            </div>
            
            <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin-bottom: 0; text-align: center;">
              PropAgent • Simplifying Rental Management
            </p>
          </div>
        `
      );
    } catch (emailErr) {
      console.error('Failed to send lease welcome email:', emailErr);
    }

    return NextResponse.json(
      { success: true, data: lease },
      { status: 201 }
    );
  } catch (error: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error('POST /api/leases error:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(listLeases, ['landlord', 'super_admin']);
export const POST = withAuth(createLease, ['landlord']);

import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import Unit from '@/models/Unit';
import Property from '@/models/Property';
import Application from '@/models/Application';
import User from '@/models/User';
import { sendEmail } from '@/lib/email';

// ─── GET /api/apply/[unitId] — PUBLIC ─────────────────────────────────────────
// Returns unit + property info for the public application form.
// Only works if unit is available and active.
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ unitId: string }> }
) {
  try {
    await dbConnect();
    const { unitId } = await context.params;

    const unit = await Unit.findById(unitId).lean();
    if (!unit) {
      return NextResponse.json(
        { success: false, error: 'Unit not found' },
        { status: 404 }
      );
    }

    if (unit.status !== 'available' || !unit.isActive) {
      return NextResponse.json(
        { success: false, error: 'This unit is not currently accepting applications' },
        { status: 400 }
      );
    }

    const property = await Property.findById(unit.propertyId).lean();
    if (!property || !property.isActive) {
      return NextResponse.json(
        { success: false, error: 'Property not found or inactive' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        unit: {
          _id: unit._id,
          unitNumber: unit.unitNumber,
          type: unit.type,
          sizeSqft: unit.sizeSqft,
          rentAmount: unit.rentAmount,
          depositAmount: unit.depositAmount,
          description: unit.description,
          photos: unit.photos,
        },
        property: {
          _id: property._id,
          name: property.name,
          address: property.address,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/apply/[unitId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── POST /api/apply/[unitId] — PUBLIC ────────────────────────────────────────
// Submits a rental application. Creates tenant account if needed.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ unitId: string }> }
) {
  try {
    await dbConnect();
    const { unitId } = await context.params;

    // Validate unit is accepting applications
    const unit = await Unit.findById(unitId).lean();
    if (!unit) {
      return NextResponse.json(
        { success: false, error: 'Unit not found' },
        { status: 404 }
      );
    }
    if (unit.status !== 'available' || !unit.isActive) {
      return NextResponse.json(
        { success: false, error: 'This unit is not currently accepting applications' },
        { status: 400 }
      );
    }

    const property = await Property.findById(unit.propertyId).lean();
    if (!property || !property.isActive) {
      return NextResponse.json(
        { success: false, error: 'Property not found or inactive' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { tenantInfo, employment, references, additionalNotes } = body;

    // Basic validation
    if (!tenantInfo?.name || !tenantInfo?.email || !tenantInfo?.phone || !tenantInfo?.currentAddress || !tenantInfo?.moveInDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required personal information' },
        { status: 400 }
      );
    }
    if (!employment?.status) {
      return NextResponse.json(
        { success: false, error: 'Employment status is required' },
        { status: 400 }
      );
    }
    if (references && references.length > 2) {
      return NextResponse.json(
        { success: false, error: 'Maximum 2 references allowed' },
        { status: 400 }
      );
    }

    // Create or find tenant user account
    let tenantUser = await User.findOne({ email: tenantInfo.email.toLowerCase() });
    let tempPassword: string | null = null;

    if (!tenantUser) {
      // Generate random 8-char password
      tempPassword = Math.random().toString(36).slice(-4) + Math.random().toString(36).slice(-4);
      tenantUser = await User.create({
        name: tenantInfo.name,
        email: tenantInfo.email.toLowerCase(),
        password: tempPassword,
        role: 'tenant',
        isActive: true,
      });

      // Send welcome email with temp password
      try {
        await sendEmail(
          tenantInfo.email,
          'Welcome to PropAgent — Your Account Details',
          `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
              <h2 style="color:#60a5fa;margin-top:0">Welcome to PropAgent 🏠</h2>
              <p>Hi <strong>${tenantInfo.name}</strong>,</p>
              <p>A tenant account has been created for you. You can use these credentials to log in:</p>
              <div style="background:#1e293b;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="margin:4px 0;"><strong>Email:</strong> ${tenantInfo.email}</p>
                <p style="margin:4px 0;"><strong>Temporary Password:</strong> <code style="background:#334155;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
              </div>
              <p style="color:#94a3b8;font-size:14px;">Please log in and change your password as soon as possible.</p>
            </div>
          `
        );
      } catch (emailErr) {
        console.error('Welcome email failed:', emailErr);
      }
    }

    // Create the application
    const applicationLink = `/apply/${unitId}`;
    const application = await Application.create({
      unitId,
      propertyId: unit.propertyId,
      landlordId: unit.landlordId,
      tenantInfo: {
        ...tenantInfo,
        email: tenantInfo.email.toLowerCase(),
        moveInDate: new Date(tenantInfo.moveInDate),
      },
      employment,
      references: references || [],
      additionalNotes: additionalNotes || '',
      status: 'pending',
      applicationLink,
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });

    // Send confirmation email to applicant
    try {
      await sendEmail(
        tenantInfo.email,
        `Application Received — ${property.name}, Unit ${unit.unitNumber}`,
        `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
            <h2 style="color:#34d399;margin-top:0">Application Submitted ✓</h2>
            <p>Hi <strong>${tenantInfo.name}</strong>,</p>
            <p>We've received your application for:</p>
            <div style="background:#1e293b;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:4px 0;"><strong>Property:</strong> ${property.name}</p>
              <p style="margin:4px 0;"><strong>Unit:</strong> ${unit.unitNumber} (${unit.type})</p>
              <p style="margin:4px 0;"><strong>Rent:</strong> $${unit.rentAmount.toLocaleString()}/mo</p>
            </div>
            <p>The landlord will review your application and be in touch. You can track your application status by logging in.</p>
            <p style="color:#94a3b8;font-size:14px;">Application ID: ${application._id}</p>
          </div>
        `
      );
    } catch (emailErr) {
      console.error('Confirmation email failed:', emailErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        applicationId: application._id,
        message: 'Application submitted successfully! Check your email for confirmation.',
      },
    });
  } catch (error) {
    console.error('POST /api/apply/[unitId] error:', error);
    if (error instanceof Error && error.message.includes('validation')) {
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

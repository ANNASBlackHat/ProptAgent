import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Plan from '@/models/Plan';
import User from '@/models/User';
import { sanitizeObject } from '@/lib/sanitize';
import mongoose from 'mongoose';

type Context = { params: { id: string } };

// GET /api/admin/plans/[id] — get details of a plan including its landlords
async function getPlanDetails(req: AuthenticatedRequest, context: unknown) {
  try {
    await dbConnect();
    const { id } = (context as Context).params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid plan ID' }, { status: 400 });
    }

    const plan = await Plan.findById(id).lean();
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
    }

    // Find landlords currently assigned to this plan
    const landlords = await User.find(
      {
        $or: [{ planId: id }, { planSlug: plan.slug }],
        role: 'landlord',
      },
      'name email companyName subscriptionStatus currentPeriodEnd'
    ).lean();

    return NextResponse.json({
      success: true,
      data: {
        plan,
        landlords,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/plans/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plan details' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/plans/[id] — update a plan
async function updatePlan(req: AuthenticatedRequest, context: unknown) {
  try {
    await dbConnect();
    const { id } = (context as Context).params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid plan ID' }, { status: 400 });
    }

    const rawBody = await req.json();
    const body = sanitizeObject(rawBody);

    const { name, description, price, yearlyPrice, trialDays, isFeatured, isActive, limits } = body;

    const plan = await Plan.findById(id);
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
    }

    if (name !== undefined) plan.name = name;
    if (description !== undefined) plan.description = description;
    if (price !== undefined) plan.price = price;
    if (yearlyPrice !== undefined) plan.yearlyPrice = yearlyPrice;
    if (trialDays !== undefined) plan.trialDays = trialDays;
    if (isFeatured !== undefined) plan.isFeatured = !!isFeatured;
    if (isActive !== undefined) plan.isActive = !!isActive;

    if (limits) {
      if (limits.maxProperties !== undefined) plan.limits.maxProperties = Number(limits.maxProperties);
      if (limits.maxUnitsPerProperty !== undefined) plan.limits.maxUnitsPerProperty = Number(limits.maxUnitsPerProperty);
      if (limits.maxActiveListings !== undefined) plan.limits.maxActiveListings = Number(limits.maxActiveListings);
      if (limits.maxApplicationsPerMonth !== undefined) plan.limits.maxApplicationsPerMonth = Number(limits.maxApplicationsPerMonth);
      if (limits.aiScreeningEnabled !== undefined) plan.limits.aiScreeningEnabled = !!limits.aiScreeningEnabled;
      if (limits.maintenanceModuleEnabled !== undefined) plan.limits.maintenanceModuleEnabled = !!limits.maintenanceModuleEnabled;
      if (limits.customScreeningQuestions !== undefined) plan.limits.customScreeningQuestions = !!limits.customScreeningQuestions;
      if (limits.maxCustomQuestions !== undefined) plan.limits.maxCustomQuestions = Number(limits.maxCustomQuestions);
    }

    await plan.save();

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error: any) {
    console.error('PUT /api/admin/plans/[id] error:', error);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update plan' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/plans/[id] — deactivate plan (soft delete, set isActive: false)
// Cannot deactivate if any landlord is currently assigned to this plan
async function deactivatePlan(req: AuthenticatedRequest, context: unknown) {
  try {
    await dbConnect();
    const { id } = (context as Context).params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid plan ID' }, { status: 400 });
    }

    const plan = await Plan.findById(id);
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
    }

    // Check if any landlord is assigned to this plan
    const assignedCount = await User.countDocuments({
      role: 'landlord',
      $or: [{ planId: id }, { planSlug: plan.slug }],
    });

    if (assignedCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot deactivate plan: ${assignedCount} landlords are currently assigned to it.`,
        },
        { status: 400 }
      );
    }

    plan.isActive = false;
    await plan.save();

    return NextResponse.json({
      success: true,
      data: { message: 'Plan deactivated successfully', plan },
    });
  } catch (error) {
    console.error('DELETE /api/admin/plans/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate plan' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getPlanDetails, ['super_admin']);
export const PUT = withAuth(updatePlan, ['super_admin']);
export const DELETE = withAuth(deactivatePlan, ['super_admin']);

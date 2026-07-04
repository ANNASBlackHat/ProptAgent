import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/auth';
import Plan from '@/models/Plan';

const DEFAULT_PLANS = [
  {
    name: 'Free',
    slug: 'free',
    description: 'Perfect for starting out or managing a single property.',
    price: 0,
    yearlyPrice: 0,
    trialDays: 0,
    isFeatured: false,
    isActive: true,
    limits: {
      maxProperties: 1,
      maxUnitsPerProperty: 5,
      maxActiveListings: 3,
      maxApplicationsPerMonth: 10,
      aiScreeningEnabled: false,
      maintenanceModuleEnabled: false,
      customScreeningQuestions: false,
      maxCustomQuestions: 0,
    },
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'Grow your portfolio and automate screening with AI.',
    price: 2900,
    yearlyPrice: 29000,
    trialDays: 14,
    isFeatured: true,
    isActive: true,
    limits: {
      maxProperties: 5,
      maxUnitsPerProperty: 20,
      maxActiveListings: 15,
      maxApplicationsPerMonth: 50,
      aiScreeningEnabled: true,
      maintenanceModuleEnabled: true,
      customScreeningQuestions: true,
      maxCustomQuestions: 3,
    },
  },
  {
    name: 'Business',
    slug: 'business',
    description: 'For professional property managers and agencies.',
    price: 7900,
    yearlyPrice: 79000,
    trialDays: 14,
    isFeatured: false,
    isActive: true,
    limits: {
      maxProperties: -1,
      maxUnitsPerProperty: -1,
      maxActiveListings: -1,
      maxApplicationsPerMonth: -1,
      aiScreeningEnabled: true,
      maintenanceModuleEnabled: true,
      customScreeningQuestions: true,
      maxCustomQuestions: 10,
    },
  },
];

async function seedDefaults(_req: AuthenticatedRequest) {
  try {
    await dbConnect();

    // Check if plans already exist
    const planCount = await Plan.countDocuments();
    if (planCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Database already has plan records. Seeding skipped.' },
        { status: 400 }
      );
    }

    const createdPlans = await Plan.create(DEFAULT_PLANS);

    return NextResponse.json({
      success: true,
      data: createdPlans,
    });
  } catch (error) {
    console.error('Seed defaults error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(seedDefaults, ['super_admin']);
export const dynamic = 'force-dynamic';

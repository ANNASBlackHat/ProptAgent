import mongoose from 'mongoose';
import User from '../models/User';
import Plan from '../models/Plan';
import Property from '../models/Property';
import Unit from '../models/Unit';
import UsageLog from '../models/UsageLog';

// Fallback limits matching the default Free plan in case plans are not seeded
const FREE_LIMITS = {
  maxProperties: 1,
  maxUnitsPerProperty: 5,
  maxActiveListings: 3,
  maxApplicationsPerMonth: 10,
  aiScreeningEnabled: false,
  maintenanceModuleEnabled: false,
  customScreeningQuestions: false,
  maxCustomQuestions: 0,
};

interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  limit?: string;
}

/**
 * Checks if subscription is active, trialing, or past_due.
 */
export async function isSubscriptionActive(landlordIdOrUser: any): Promise<boolean> {
  let landlord = landlordIdOrUser;
  if (typeof landlordIdOrUser === 'string' || landlordIdOrUser instanceof mongoose.Types.ObjectId) {
    landlord = await User.findById(landlordIdOrUser);
  }
  if (!landlord) return false;
  
  // Super admin has no subscription restriction
  if (landlord.role === 'super_admin') return true;

  const status = landlord.subscriptionStatus;
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

/**
 * Gets active limits for a landlord. Resolves their plan details,
 * or falls back to FREE_LIMITS if no plan is set or inactive.
 */
export async function getLandlordPlanLimits(landlordId: string) {
  const landlord = await User.findById(landlordId);
  if (!landlord) {
    return { landlord: null, limits: FREE_LIMITS, isPastDue: false };
  }

  if (landlord.role === 'super_admin') {
    // Return unlimited limits for super admin
    return {
      landlord,
      limits: {
        maxProperties: -1,
        maxUnitsPerProperty: -1,
        maxActiveListings: -1,
        maxApplicationsPerMonth: -1,
        aiScreeningEnabled: true,
        maintenanceModuleEnabled: true,
        customScreeningQuestions: true,
        maxCustomQuestions: 9999,
      },
      isPastDue: false,
    };
  }

  const status = landlord.subscriptionStatus || 'none';

  // past_due gives LIMITED write access
  if (status === 'past_due') {
    return { landlord, limits: FREE_LIMITS, isPastDue: true };
  }

  const isPremiumActive = status === 'active' || status === 'trialing';

  if (isPremiumActive) {
    if (landlord.planId) {
      const plan = await Plan.findById(landlord.planId);
      if (plan && plan.isActive) {
        return { landlord, limits: plan.limits, isPastDue: false };
      }
    }

    // Fallback to plan slug lookup if planId not populated or missing
    if (landlord.planSlug) {
      const plan = await Plan.findOne({ slug: landlord.planSlug, isActive: true });
      if (plan) {
        return { landlord, limits: plan.limits, isPastDue: false };
      }
    }
  }

  // Fallback to Free limits for cancelled/expired/none
  try {
    const freePlan = await Plan.findOne({ slug: 'free', isActive: true });
    if (freePlan) {
      return { landlord, limits: freePlan.limits, isPastDue: false };
    }
  } catch {
    // Fall back to default constant
  }

  return { landlord, limits: FREE_LIMITS, isPastDue: false };
}

/**
 * checkPropertyLimit
 * Compare active property count vs plan maxProperties limit.
 */
export async function checkPropertyLimit(landlordId: string): Promise<LimitCheckResult> {
  const { landlord, limits, isPastDue } = await getLandlordPlanLimits(landlordId);
  if (!landlord) {
    return { allowed: false, reason: 'Landlord not found', limit: 'maxProperties' };
  }

  if (isPastDue) {
    return {
      allowed: false,
      reason: 'PAYMENT_PAST_DUE: Your subscription payment has failed. Please update your billing details at /billing to continue creating or modifying properties.',
      limit: 'subscriptionStatus',
    };
  }

  if (limits.maxProperties === -1) {
    return { allowed: true };
  }

  const count = await Property.countDocuments({ landlordId, isActive: true });
  if (count >= limits.maxProperties) {
    return {
      allowed: false,
      reason: `You have reached the maximum property limit of ${limits.maxProperties} properties for your plan.`,
      limit: 'maxProperties',
    };
  }

  return { allowed: true };
}

/**
 * checkUnitLimit
 * Compare active units count in a property vs plan maxUnitsPerProperty limit.
 */
export async function checkUnitLimit(landlordId: string, propertyId: string): Promise<LimitCheckResult> {
  const { landlord, limits, isPastDue } = await getLandlordPlanLimits(landlordId);
  if (!landlord) {
    return { allowed: false, reason: 'Landlord not found', limit: 'maxUnitsPerProperty' };
  }

  if (isPastDue) {
    return {
      allowed: false,
      reason: 'PAYMENT_PAST_DUE: Your subscription payment has failed. Please update your billing details at /billing to continue creating or modifying units.',
      limit: 'subscriptionStatus',
    };
  }

  if (limits.maxUnitsPerProperty === -1) {
    return { allowed: true };
  }

  const count = await Unit.countDocuments({ propertyId, isActive: true });
  if (count >= limits.maxUnitsPerProperty) {
    return {
      allowed: false,
      reason: `You have reached the maximum unit limit of ${limits.maxUnitsPerProperty} units per property for your plan.`,
      limit: 'maxUnitsPerProperty',
    };
  }

  return { allowed: true };
}

/**
 * checkListingLimit
 * Compare active/available units vs plan maxActiveListings limit.
 */
export async function checkListingLimit(landlordId: string): Promise<LimitCheckResult> {
  const { landlord, limits, isPastDue } = await getLandlordPlanLimits(landlordId);
  if (!landlord) {
    return { allowed: false, reason: 'Landlord not found', limit: 'maxActiveListings' };
  }

  if (isPastDue) {
    return {
      allowed: false,
      reason: 'PAYMENT_PAST_DUE: Your subscription payment has failed. Please update your billing details at /billing to list units for rent.',
      limit: 'subscriptionStatus',
    };
  }

  if (limits.maxActiveListings === -1) {
    return { allowed: true };
  }

  const count = await Unit.countDocuments({ landlordId, status: 'available', isActive: true });
  if (count >= limits.maxActiveListings) {
    return {
      allowed: false,
      reason: `You have reached the maximum active listing limit of ${limits.maxActiveListings} available units for your plan.`,
      limit: 'maxActiveListings',
    };
  }

  return { allowed: true };
}

/**
 * checkApplicationLimit
 * Compare monthly applications vs plan maxApplicationsPerMonth limit.
 * Resets monthly if now is past usageThisMonth.resetAt.
 */
export async function checkApplicationLimit(landlordId: string): Promise<LimitCheckResult> {
  const { landlord, limits, isPastDue } = await getLandlordPlanLimits(landlordId);
  if (!landlord) {
    return { allowed: false, reason: 'Landlord not found', limit: 'maxApplicationsPerMonth' };
  }

  if (isPastDue) {
    return {
      allowed: false,
      reason: 'PAYMENT_PAST_DUE: This landlord\'s subscription has a payment issue. Applications cannot be submitted at this time.',
      limit: 'subscriptionStatus',
    };
  }

  if (limits.maxApplicationsPerMonth === -1) {
    return { allowed: true };
  }

  // Handle monthly usage reset
  const now = new Date();
  if (!landlord.usageThisMonth.resetAt || landlord.usageThisMonth.resetAt < now) {
    landlord.usageThisMonth.applications = 0;
    // Set resetAt to one month from now
    landlord.usageThisMonth.resetAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await landlord.save();
  }

  if (landlord.usageThisMonth.applications >= limits.maxApplicationsPerMonth) {
    return {
      allowed: false,
      reason: `The landlord has reached the monthly application limit of ${limits.maxApplicationsPerMonth} applications for their plan.`,
      limit: 'maxApplicationsPerMonth',
    };
  }

  return { allowed: true };
}

/**
 * checkAIScreening
 * Verify if AI Screening is enabled for the landlord.
 */
export async function checkAIScreening(landlordId: string): Promise<LimitCheckResult> {
  const { landlord, limits, isPastDue } = await getLandlordPlanLimits(landlordId);
  if (!landlord) {
    return { allowed: false, reason: 'Landlord not found', limit: 'aiScreeningEnabled' };
  }

  if (isPastDue) {
    return {
      allowed: false,
      reason: 'PAYMENT_PAST_DUE: Your subscription payment has failed. Please update your billing details at /billing to initiate AI tenant screening.',
      limit: 'subscriptionStatus',
    };
  }

  if (!limits.aiScreeningEnabled) {
    return {
      allowed: false,
      reason: 'AI tenant screening is not enabled on your current plan. Please upgrade.',
      limit: 'aiScreeningEnabled',
    };
  }

  return { allowed: true };
}

/**
 * checkMaintenanceModule
 * Verify if Maintenance Module is enabled for the landlord.
 */
export async function checkMaintenanceModule(landlordId: string): Promise<LimitCheckResult> {
  const { landlord, limits, isPastDue } = await getLandlordPlanLimits(landlordId);
  if (!landlord) {
    return { allowed: false, reason: 'Landlord not found', limit: 'maintenanceModuleEnabled' };
  }

  if (isPastDue) {
    return {
      allowed: false,
      reason: 'PAYMENT_PAST_DUE: The landlord\'s subscription has a payment issue. Maintenance request submission is temporarily locked.',
      limit: 'subscriptionStatus',
    };
  }

  if (!limits.maintenanceModuleEnabled) {
    return {
      allowed: false,
      reason: 'The maintenance module is not enabled on your plan. Please contact your landlord to upgrade.',
      limit: 'maintenanceModuleEnabled',
    };
  }

  return { allowed: true };
}

/**
 * checkCustomQuestions
 * Verify if custom screening questions are enabled, and if the count is within limits.
 */
export async function checkCustomQuestions(landlordId: string, newCount?: number): Promise<LimitCheckResult> {
  const { landlord, limits, isPastDue } = await getLandlordPlanLimits(landlordId);
  if (!landlord) {
    return { allowed: false, reason: 'Landlord not found', limit: 'customScreeningQuestions' };
  }

  if (isPastDue) {
    return {
      allowed: false,
      reason: 'PAYMENT_PAST_DUE: Your subscription payment has failed. Please update your billing details at /billing to configure custom screening questions.',
      limit: 'subscriptionStatus',
    };
  }

  if (!limits.customScreeningQuestions) {
    return {
      allowed: false,
      reason: 'Custom screening questions are not allowed on your plan. Please upgrade.',
      limit: 'customScreeningQuestions',
    };
  }

  const count = typeof newCount === 'number' ? newCount : (landlord.screeningQuestions?.length || 0);
  if (count > limits.maxCustomQuestions) {
    return {
      allowed: false,
      reason: `You can only have up to ${limits.maxCustomQuestions} custom screening questions on your plan. Current: ${count}.`,
      limit: 'maxCustomQuestions',
    };
  }

  return { allowed: true };
}

/**
 * incrementApplicationUsage
 * Increments the monthly applications usage for the landlord and logs it to UsageLog.
 */
export async function incrementApplicationUsage(landlordId: string): Promise<void> {
  const landlord = await User.findById(landlordId);
  if (!landlord) return;

  const now = new Date();
  
  // Verify reset
  if (!landlord.usageThisMonth.resetAt || landlord.usageThisMonth.resetAt < now) {
    landlord.usageThisMonth.applications = 0;
    landlord.usageThisMonth.resetAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  landlord.usageThisMonth.applications += 1;
  await landlord.save();

  // Log in UsageLog
  const monthStr = now.toISOString().slice(0, 7); // e.g. "2026-07"
  try {
    await UsageLog.findOneAndUpdate(
      { landlordId: new mongoose.Types.ObjectId(landlordId), month: monthStr },
      { $inc: { applicationsCount: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
  } catch (err) {
    console.error('Failed to log monthly usage:', err);
  }
}

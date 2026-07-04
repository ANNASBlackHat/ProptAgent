'use client';

import React, { useEffect, useState } from 'react';

interface PlanLimits {
  maxProperties: number;
  maxUnitsPerProperty: number;
  maxActiveListings: number;
  maxApplicationsPerMonth: number;
  aiScreeningEnabled: boolean;
  maintenanceModuleEnabled: boolean;
  customScreeningQuestions: boolean;
  maxCustomQuestions: number;
}

interface Plan {
  name: string;
  slug: string;
  price: number;
  yearlyPrice: number;
  limits: PlanLimits;
}

interface Subscription {
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  interval: string;
}

interface UsageStat {
  current: number;
  limit: number;
}

interface Usage {
  properties: UsageStat;
  unitsTotal: { current: number };
  activeListings: UsageStat;
  applicationsThisMonth: UsageStat;
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  date: string;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
}

export default function LandlordBillingPage() {
  const [billingData, setBillingData] = useState<{
    plan: Plan;
    subscription: Subscription;
    usage: Usage;
  } | null>(null);

  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Checkout & Portal state
  const [actionLoading, setActionLoading] = useState(false);
  const [isYearly, setIsYearly] = useState(false);

  // Modals / Cancel Confirmation
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const fetchBillingInfo = async () => {
    try {
      const res = await fetch('/api/billing/current');
      const d = await res.json();
      if (d.success) {
        setBillingData(d.data);
      } else {
        setError(d.error || 'Failed to load billing current information');
      }
    } catch {
      setError('Network error fetching current plan details');
    }
  };

  const fetchAllPlans = async () => {
    try {
      const res = await fetch('/api/plans');
      const d = await res.json();
      if (d.success) {
        setAllPlans(d.data);
      }
    } catch (err) {
      console.error('Failed to load plans list', err);
    }
  };

  const fetchInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const res = await fetch('/api/billing/invoices');
      const d = await res.json();
      if (d.success) {
        setInvoices(d.data);
      }
    } catch (err) {
      console.error('Failed to retrieve invoices', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchBillingInfo(), fetchAllPlans(), fetchInvoices()]).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleCreatePortal = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/billing/create-portal', { method: 'POST' });
      const d = await res.json();
      if (d.success && d.data.portalUrl) {
        window.location.href = d.data.portalUrl;
      } else {
        alert(d.error || 'Could not initiate Stripe Billing Portal session.');
      }
    } catch {
      alert('Network error initiating customer portal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setActionLoading(true);
    setShowCancelConfirm(false);
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const d = await res.json();
      if (d.success) {
        await fetchBillingInfo();
        alert('Your subscription will cancel at the end of the current billing cycle.');
      } else {
        alert(d.error || 'Failed to cancel subscription.');
      }
    } catch {
      alert('Network error cancelling subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/billing/reactivate', { method: 'POST' });
      const d = await res.json();
      if (d.success) {
        await fetchBillingInfo();
        alert('Your subscription reactivation has been confirmed.');
      } else {
        alert(d.error || 'Failed to reactivate subscription.');
      }
    } catch {
      alert('Network error reactivating subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpgrade = async (planSlug: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planSlug,
          billingInterval: isYearly ? 'yearly' : 'monthly',
        }),
      });
      const d = await res.json();
      if (d.success && d.data.checkoutUrl) {
        window.location.href = d.data.checkoutUrl;
      } else {
        alert(d.error || 'Failed to create Stripe Checkout session.');
      }
    } catch {
      alert('Network error during checkout redirect initiation.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-24">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (error || !billingData) {
    return (
      <div className="flex-1 p-6">
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error || 'Failed to initialize landlord billing data.'}
        </div>
      </div>
    );
  }

  const { plan, subscription, usage } = billingData;
  const status = subscription.status;

  // Determine status color class
  const getStatusBadgeCls = (subStatus: string) => {
    switch (subStatus) {
      case 'active':
      case 'trialing':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'past_due':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'cancelled':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default:
        return 'bg-slate-700/20 text-slate-400 border-slate-700/30';
    }
  };

  // Usage Bar Fills Color Determination: green < 70%, yellow 70-90%, red > 90%
  const getProgressColor = (current: number, limit: number) => {
    if (limit <= 0) return 'bg-emerald-500';
    const pct = (current / limit) * 100;
    if (pct < 70) return 'bg-emerald-500';
    if (pct <= 90) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  // Determine next plan up
  const getNextPlan = () => {
    if (plan.slug === 'free') {
      return allPlans.find((p) => p.slug === 'pro');
    }
    if (plan.slug === 'pro') {
      return allPlans.find((p) => p.slug === 'business');
    }
    return null;
  };
  const nextPlan = getNextPlan();

  // Days remaining in trial helper
  const getTrialDaysRemaining = () => {
    if (!subscription.trialEndsAt) return 0;
    const diff = new Date(subscription.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };
  const trialDaysRemaining = getTrialDaysRemaining();

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div className="absolute -top-32 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="lg:pl-0 pl-10">
            <h1 className="text-lg font-bold text-slate-100">Subscription & Billing</h1>
            <p className="text-xs text-slate-500">Manage plan limits and SaaS payments</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold uppercase tracking-wider">
            Landlord Console
          </span>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 relative z-10 max-w-4xl">
        {/* ========================================================================= */}
        {/* SECTION A: CURRENT PLAN CARD & BANNERS */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          {/* Trialing Alert */}
          {status === 'trialing' && subscription.trialEndsAt && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="font-bold">✨ Free Trial Active</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {trialDaysRemaining} days remaining.
                </p>
              </div>
              <button
                onClick={handleCreatePortal}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all shrink-0 shadow-lg shadow-amber-500/15"
              >
                Add Payment Method
              </button>
            </div>
          )}

          {/* Past Due Alert */}
          {status === 'past_due' && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse">
              <div>
                <p className="font-bold">⚠️ Payment Failed</p>
                <p className="text-xs text-rose-400/80 mt-0.5">
                  Your latest subscription invoice was declined. Please update your payment method to restore full write-access.
                </p>
              </div>
              <button
                onClick={handleCreatePortal}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition-all shrink-0 shadow-lg shadow-rose-500/15"
              >
                Update Payment Method
              </button>
            </div>
          )}

          {/* Cancelled Alert */}
          {subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
            <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="font-bold">⏳ Subscription Pending Downgrade</p>
                <p className="text-xs text-yellow-400/80 mt-0.5">
                  Your subscription will cancel on {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. You will then be downgraded to the Free tier.
                </p>
              </div>
              <button
                onClick={handleReactivateSubscription}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-yellow-500 hover:bg-yellow-600 text-slate-950 transition-all shrink-0 shadow-lg shadow-yellow-500/15"
              >
                Reactivate Subscription
              </button>
            </div>
          )}

          {/* Core Plan Details Card */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight">{plan.name} Plan</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusBadgeCls(status)}`}>
                    {status === 'none' ? 'No active sub' : status}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  {plan.slug === 'free' ? 'Default limited free properties trial tier' : `Premium subscription plan (${subscription.interval} cycle)`}
                </p>

                <div className="mt-4 space-y-1 text-xs text-slate-500">
                  {subscription.currentPeriodEnd && !subscription.cancelAtPeriodEnd && (
                    <p>
                      Next Invoice Date: <strong className="text-slate-350">{new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
                    </p>
                  )}
                  {subscription.currentPeriodEnd && subscription.cancelAtPeriodEnd && (
                    <p>
                      Subscription Ends: <strong className="text-slate-350">{new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
                    </p>
                  )}
                  {plan.slug !== 'free' && (
                    <p className="text-[15px] font-bold text-slate-300 mt-2">
                      {(isYearly && plan.yearlyPrice > 0 ? plan.yearlyPrice : plan.price) === 0
                        ? 'Free'
                        : `$${((isYearly && plan.yearlyPrice > 0 ? plan.yearlyPrice / 100 / 12 : plan.price / 100)).toFixed(2)}/mo`}
                    </p>
                  )}
                </div>
              </div>

              {plan.slug !== 'free' && (
                <button
                  onClick={handleCreatePortal}
                  disabled={actionLoading}
                  className="px-5 py-3 rounded-2xl text-xs font-extrabold bg-slate-800 border border-slate-700/80 hover:bg-slate-750 text-slate-200 transition-all shrink-0 active:scale-95 shadow-lg"
                >
                  💳 Manage Stripe Billing
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION B: USAGE THIS MONTH */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Usage Quotas & Limits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Properties quota */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Properties Managed</span>
                <span className="font-extrabold text-slate-200">
                  {usage.properties.limit === -1 ? `${usage.properties.current} / Unlimited` : `${usage.properties.current} / ${usage.properties.limit}`}
                </span>
              </div>
              {usage.properties.limit !== -1 ? (
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-550 ${getProgressColor(usage.properties.current, usage.properties.limit)}`}
                    style={{ width: `${Math.min(100, (usage.properties.current / usage.properties.limit) * 100)}%` }}
                  />
                </div>
              ) : (
                <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded w-max">
                  ✓ Unlimited
                </div>
              )}
              <p className="text-[11px] text-slate-500">Active property files created inside landlord portfolio.</p>
            </div>

            {/* Listings quota */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Active Rental Listings</span>
                <span className="font-extrabold text-slate-200">
                  {usage.activeListings.limit === -1 ? `${usage.activeListings.current} / Unlimited` : `${usage.activeListings.current} / ${usage.activeListings.limit}`}
                </span>
              </div>
              {usage.activeListings.limit !== -1 ? (
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-550 ${getProgressColor(usage.activeListings.current, usage.activeListings.limit)}`}
                    style={{ width: `${Math.min(100, (usage.activeListings.current / usage.activeListings.limit) * 100)}%` }}
                  />
                </div>
              ) : (
                <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded w-max">
                  ✓ Unlimited
                </div>
              )}
              <p className="text-[11px] text-slate-500">Units simultaneously set as available for applications.</p>
            </div>

            {/* Applications quota */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Applications Received (Month)</span>
                <span className="font-extrabold text-slate-200">
                  {usage.applicationsThisMonth.limit === -1 ? `${usage.applicationsThisMonth.current} / Unlimited` : `${usage.applicationsThisMonth.current} / ${usage.applicationsThisMonth.limit}`}
                </span>
              </div>
              {usage.applicationsThisMonth.limit !== -1 ? (
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-550 ${getProgressColor(usage.applicationsThisMonth.current, usage.applicationsThisMonth.limit)}`}
                    style={{ width: `${Math.min(100, (usage.applicationsThisMonth.current / usage.applicationsThisMonth.limit) * 100)}%` }}
                  />
                </div>
              ) : (
                <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded w-max">
                  ✓ Unlimited
                </div>
              )}
              <p className="text-[11px] text-slate-500">Monthly inbound tenant screening applications count.</p>
            </div>

            {/* AI Screening Enabled */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider">AI Screening Integration</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                  plan.limits.aiScreeningEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-800 text-slate-500 border-slate-850'
                }`}>
                  {plan.limits.aiScreeningEnabled ? '✓ Enabled' : '✗ Locked'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Automated AI-assisted tenant screening interview calls and compatibility reports.
              </p>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION C: PLAN COMPARISON / UPGRADE */}
        {/* ========================================================================= */}
        {nextPlan && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recommended Plan Upgrade</h3>
                <p className="text-xs text-slate-500 mt-0.5">Scale up your portfolio limits dynamically</p>
              </div>

              {/* Monthly/Yearly toggle */}
              {nextPlan.yearlyPrice > 0 && (
                <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 p-1.5 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setIsYearly(false)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${!isYearly ? 'bg-indigo-500/15 border border-indigo-500/25 text-indigo-300' : 'text-slate-400'}`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsYearly(true)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${isYearly ? 'bg-indigo-500/15 border border-indigo-500/25 text-indigo-300' : 'text-slate-400'}`}
                  >
                    Yearly
                  </button>
                </div>
              )}
            </div>

            {/* Side-by-side grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              {/* Current Plan */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/10 p-6 flex flex-col justify-between relative opacity-85">
                <div>
                  <h4 className="text-sm font-bold text-slate-400">Your Current Tier</h4>
                  <p className="text-xl font-black text-slate-200 mt-1 capitalize">{plan.name}</p>
                  
                  <ul className="mt-6 space-y-3.5 text-xs text-slate-550 border-t border-slate-850 pt-5">
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-400 font-bold">✓</span>
                      <span>Properties limit: {plan.limits.maxProperties === -1 ? 'Unlimited' : plan.limits.maxProperties}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-400 font-bold">✓</span>
                      <span>Active listings: {plan.limits.maxActiveListings === -1 ? 'Unlimited' : plan.limits.maxActiveListings}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-indigo-400 font-bold">✓</span>
                      <span>Applications: {plan.limits.maxApplicationsPerMonth === -1 ? 'Unlimited' : `${plan.limits.maxApplicationsPerMonth}/mo`}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {plan.limits.aiScreeningEnabled ? (
                        <>
                          <span className="text-indigo-400 font-bold">✓</span>
                          <span>AI screening enabled</span>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-700">✗</span>
                          <span className="line-through">AI screening</span>
                        </>
                      )}
                    </li>
                  </ul>
                </div>

                <div className="pt-8 border-t border-slate-850/50 mt-6 text-center text-xs font-bold text-slate-500">
                  Active tier
                </div>
              </div>

              {/* Upgrade Next Tier */}
              <div className="rounded-3xl border-2 border-indigo-500/80 bg-slate-900/60 p-6 flex flex-col justify-between relative shadow-xl shadow-indigo-500/5 hover:scale-[1.01] transition-transform">
                <span className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  Recommended Upgrade
                </span>

                <div>
                  <h4 className="text-sm font-bold text-indigo-400">Next Plan Up</h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-xl font-black text-slate-100 capitalize">{nextPlan.name}</p>
                    {isYearly && nextPlan.yearlyPrice > 0 && (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Save ${((nextPlan.price * 12 - nextPlan.yearlyPrice) / 100).toFixed(0)}/year
                      </span>
                    )}
                  </div>
                  
                  <ul className="mt-6 space-y-3.5 text-xs text-slate-350 border-t border-slate-800 pt-5">
                    <li className="flex items-center gap-2 text-emerald-400 font-bold">
                      <span>✓</span>
                      <span>Properties limit: {nextPlan.limits.maxProperties === -1 ? 'Unlimited' : nextPlan.limits.maxProperties}</span>
                    </li>
                    <li className="flex items-center gap-2 text-emerald-400 font-bold">
                      <span>✓</span>
                      <span>Active listings: {nextPlan.limits.maxActiveListings === -1 ? 'Unlimited' : nextPlan.limits.maxActiveListings}</span>
                    </li>
                    <li className="flex items-center gap-2 text-emerald-400 font-bold">
                      <span>✓</span>
                      <span>Applications: {nextPlan.limits.maxApplicationsPerMonth === -1 ? 'Unlimited' : `${nextPlan.limits.maxApplicationsPerMonth}/mo`}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {nextPlan.limits.aiScreeningEnabled ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-2">
                          <span>✓</span>
                          <span>AI screening enabled</span>
                        </span>
                      ) : (
                        <span className="text-slate-550">✗ AI screening</span>
                      )}
                    </li>
                  </ul>
                </div>

                <div className="pt-6 border-t border-slate-800 mt-6">
                  <button
                    onClick={() => handleUpgrade(nextPlan.slug)}
                    disabled={actionLoading}
                    className="w-full py-3.5 rounded-2xl text-xs font-black bg-indigo-500 hover:bg-indigo-600 text-white transition-all shadow-md shadow-indigo-500/10 active:scale-[0.98] disabled:opacity-50"
                  >
                    {actionLoading ? 'Redirecting to checkout…' : `Upgrade to ${nextPlan.name}`}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION D: INVOICE HISTORY */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Payment Invoices</h3>
          
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 overflow-hidden">
            {invoicesLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading payment history...</div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No payment invoices found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-800/80 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-5 py-3.5">Invoice Date</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Payment Status</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="px-5 py-4">
                          {new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4 font-mono font-semibold">${(inv.amount / 100).toFixed(2)}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                            inv.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {inv.invoicePdf ? (
                            <a
                              href={inv.invoicePdf}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-400 font-bold hover:underline"
                            >
                              Download PDF
                            </a>
                          ) : inv.hostedInvoiceUrl ? (
                            <a
                              href={inv.hostedInvoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-indigo-400 font-bold hover:underline"
                            >
                              View Invoice
                            </a>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {plan.slug !== 'free' && !subscription.cancelAtPeriodEnd && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="text-[11px] text-slate-500 hover:text-slate-350 transition-colors font-bold underline cursor-pointer"
              >
                Cancel Landlord Subscription
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Cancellation Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 rounded-3xl space-y-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-xl mx-auto font-bold">
              !
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-100">Cancel Premium Subscription?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure? You will retain access to Pro features until the end of your billing cycle on{' '}
                <strong className="text-slate-300">
                  {subscription.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'next billing date'}
                </strong>. Thereafter, your portfolio limits will downgrade to the Free tier.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-3 rounded-xl text-xs font-bold bg-slate-850 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-700/40"
              >
                Keep Plan
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md shadow-rose-600/10 active:scale-95"
              >
                {actionLoading ? 'Cancelling…' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

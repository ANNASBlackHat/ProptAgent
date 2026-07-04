'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface AuditTrailItem {
  action: string;
  planSlug?: string;
  reason?: string;
  timestamp: string;
  _id?: string;
}

interface LandlordDetail {
  _id: string;
  name: string;
  email: string;
  company: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionAuditTrail: AuditTrailItem[];
}

interface PlanDetail {
  name: string;
  slug: string;
  price: number;
  yearlyPrice: number;
  limits: {
    maxProperties: number;
    maxUnitsPerProperty: number;
    maxActiveListings: number;
    maxApplicationsPerMonth: number;
    aiScreeningEnabled: boolean;
    maintenanceModuleEnabled: boolean;
  };
}

interface SubscriptionDetail {
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

interface UsageDetail {
  properties: UsageStat;
  unitsTotal: { current: number };
  activeListings: UsageStat;
  applicationsThisMonth: UsageStat;
}

export default function LandlordSubscriptionDetailPage({
  params,
}: {
  params: { landlordId: string };
}) {
  const { landlordId } = params;

  const [detail, setDetail] = useState<{
    landlord: LandlordDetail;
    plan: PlanDetail;
    subscription: SubscriptionDetail;
    usage: UsageDetail;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Overrides / Cancellations Modals
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideSlug, setOverrideSlug] = useState('free');
  const [overrideReason, setOverrideReason] = useState('');

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchDetail = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/subscriptions/${landlordId}`);
      const d = await res.json();
      if (d.success) {
        setDetail(d.data);
      } else {
        setError(d.error || 'Failed to load landlord subscription details.');
      }
    } catch {
      setError('Network error fetching landlord details.');
    } finally {
      setLoading(false);
    }
  }, [landlordId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleOverrideSubmit = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${landlordId}/override-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planSlug: overrideSlug,
          reason: overrideReason,
        }),
      });
      const d = await res.json();
      if (d.success) {
        alert('Plan overridden successfully!');
        setShowOverrideModal(false);
        setOverrideReason('');
        await fetchDetail();
      } else {
        alert(d.error || 'Failed to override plan.');
      }
    } catch {
      alert('Network error overriding plan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${landlordId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason,
        }),
      });
      const d = await res.json();
      if (d.success) {
        alert('Subscription terminated immediately.');
        setShowCancelModal(false);
        setCancelReason('');
        await fetchDetail();
      } else {
        alert(d.error || 'Failed to cancel subscription.');
      }
    } catch {
      alert('Network error force cancelling subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCents = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  };

  const getStatusBadgeCls = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'trialing':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'past_due':
        return 'bg-rose-500/10 text-rose-455 border-rose-500/20 animate-pulse';
      case 'cancelled':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-800 text-slate-500 border-slate-700/60';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-24">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 md:p-10 flex flex-col items-center justify-center">
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error || 'Failed to load details'}
        </div>
        <Link href="/admin/subscriptions" className="mt-6 text-xs text-indigo-400 font-bold hover:underline">
          ← Return to Subscriber List
        </Link>
      </div>
    );
  }

  const { landlord, plan, subscription, usage } = detail;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative">
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div className="absolute -top-32 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6 md:p-8 lg:p-10 space-y-8 max-w-4xl">
        {/* Breadcrumb / Back button */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/subscriptions"
            className="text-xs text-slate-500 hover:text-slate-350 transition-colors font-bold underline"
          >
            ← Back to Directory
          </Link>
        </div>

        {/* Profile Card */}
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-wider">Landlord Subscriber</span>
            <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight mt-1">{landlord.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{landlord.email}</p>
            {landlord.company && (
              <span className="inline-block mt-2 px-2.5 py-1 rounded bg-slate-950 text-slate-400 font-semibold text-[10px]">
                🏢 {landlord.company}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => { setOverrideSlug(plan.slug); setShowOverrideModal(true); }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/60 transition-all cursor-pointer"
            >
              🔄 Override Plan
            </button>
            {plan.slug !== 'free' && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md shadow-rose-600/10 cursor-pointer"
              >
                🚫 Force Cancel
              </button>
            )}
          </div>
        </div>

        {/* Subscription Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Settings */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-5 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">Active Plan Parameters</h3>
            
            <div className="space-y-3.5 text-xs text-slate-350">
              <div className="flex justify-between">
                <span>Plan Name:</span>
                <strong className="text-slate-200 capitalize">{plan.name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Stripe Product Slug:</span>
                <strong className="text-slate-200 font-mono">{plan.slug}</strong>
              </div>
              <div className="flex justify-between">
                <span>Monthly Cost:</span>
                <strong className="text-slate-200">{formatCents(plan.price)}</strong>
              </div>
              {plan.yearlyPrice > 0 && (
                <div className="flex justify-between">
                  <span>Yearly Cost:</span>
                  <strong className="text-slate-200">{formatCents(plan.yearlyPrice)}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Subscription State & Dates */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-5 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">Stripe Status & Period Dates</h3>
            
            <div className="space-y-3.5 text-xs text-slate-350">
              <div className="flex justify-between items-center">
                <span>Status Badge:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getStatusBadgeCls(subscription.status)}`}>
                  {subscription.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Stripe Customer ID:</span>
                <strong className="text-slate-200 font-mono">{landlord.stripeCustomerId || '—'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Stripe Subscription ID:</span>
                <strong className="text-slate-200 font-mono">{landlord.stripeSubscriptionId || '—'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Billing Cycle Interval:</span>
                <strong className="text-slate-200 capitalize">{subscription.interval}</strong>
              </div>
              {subscription.currentPeriodStart && (
                <div className="flex justify-between">
                  <span>Period Started:</span>
                  <strong className="text-slate-200 font-mono">
                    {new Date(subscription.currentPeriodStart).toLocaleDateString()}
                  </strong>
                </div>
              )}
              {subscription.currentPeriodEnd && (
                <div className="flex justify-between">
                  <span>Period Ends:</span>
                  <strong className="text-slate-200 font-mono">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </strong>
                </div>
              )}
              {subscription.trialEndsAt && (
                <div className="flex justify-between">
                  <span>Trial Ends:</span>
                  <strong className="text-slate-200 font-mono">
                    {new Date(subscription.trialEndsAt).toLocaleDateString()}
                  </strong>
                </div>
              )}
              {subscription.cancelAtPeriodEnd && (
                <div className="flex justify-between text-amber-400">
                  <span>Pending Downgrade:</span>
                  <strong className="font-bold">Yes (Cycles end)</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Usage Stats Progress */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Resource Usage Quotas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850/50 space-y-2">
              <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Properties Limit</span>
              <strong className="text-slate-200 block text-sm">
                {usage.properties.current} / {usage.properties.limit === -1 ? 'Unlimited' : usage.properties.limit}
              </strong>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850/50 space-y-2">
              <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Active Listings Limit</span>
              <strong className="text-slate-200 block text-sm">
                {usage.activeListings.current} / {usage.activeListings.limit === -1 ? 'Unlimited' : usage.activeListings.limit}
              </strong>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850/50 space-y-2">
              <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Applications Limit (Month)</span>
              <strong className="text-slate-200 block text-sm">
                {usage.applicationsThisMonth.current} / {usage.applicationsThisMonth.limit === -1 ? 'Unlimited' : usage.applicationsThisMonth.limit}
              </strong>
            </div>
          </div>
        </section>

        {/* Audit Trail list */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Administrative Audit Trail</h3>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/20 overflow-hidden">
            {landlord.subscriptionAuditTrail.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No manual override audits logged for this subscriber.</div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {landlord.subscriptionAuditTrail.map((trail, index) => (
                  <div key={trail._id || index} className="p-4 space-y-1 text-xs">
                    <div className="flex justify-between items-center text-slate-450 font-bold">
                      <span className={`capitalize ${trail.action === 'override-plan' ? 'text-indigo-400' : 'text-rose-455'}`}>
                        {trail.action === 'override-plan' ? 'Manual override plan' : 'Immediate cancellation'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-600">
                        {new Date(trail.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {trail.planSlug && (
                      <p className="text-[11px] text-slate-350">
                        Assigned Tier: <strong className="font-semibold capitalize font-mono">{trail.planSlug}</strong>
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 italic mt-1 leading-relaxed">
                      "Reason: {trail.reason || 'None specified.'}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* OVERRIDE PLAN MODAL */}
      {/* ========================================================================= */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 rounded-3xl space-y-5 text-left shadow-2xl">
            <div>
              <h3 className="text-base font-black text-slate-100">Override Subscription Plan</h3>
              <p className="text-xs text-slate-400 mt-1">Assign plan and bypass Stripe checkouts for {landlord.name}</p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">Select Tier Plan</label>
                <select
                  value={overrideSlug}
                  onChange={(e) => setOverrideSlug(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="business">Business</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">Audit Reason</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Free partner allocation, billing dispute adjustment..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowOverrideModal(false); setOverrideReason(''); }}
                className="flex-1 py-3 bg-slate-850 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOverrideSubmit}
                disabled={actionLoading}
                className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? 'Saving…' : 'Override Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FORCE CANCEL MODAL */}
      {/* ========================================================================= */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 rounded-3xl space-y-5 text-left shadow-2xl">
            <div>
              <h3 className="text-base font-black text-slate-100">Force Cancel Subscription</h3>
              <p className="text-xs text-slate-400 mt-1">Immediately terminate paid Stripe subscription for {landlord.name}</p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 uppercase tracking-wider text-[10px] font-bold mb-1">Cancellation Reason</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Fraud, terms violation, non-payment dispute..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                className="flex-1 py-3 bg-slate-850 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-xs font-bold text-slate-300"
              >
                Keep Plan
              </button>
              <button
                type="button"
                onClick={handleCancelSubmit}
                disabled={actionLoading}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? 'Processing…' : 'Force Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

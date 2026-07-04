'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface LandlordRow {
  _id: string;
  name: string;
  email: string;
  company: string;
  planSlug: string;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
}

interface PlanRevenueContribution {
  planName: string;
  slug: string;
  count: number;
  monthlyRevenue: number;
}

interface RevenueStats {
  mrr: number;
  arr: number;
  activeSubscribers: number;
  trialingSubscribers: number;
  pastDueSubscribers: number;
  cancelledThisMonth: number;
  newThisMonth: number;
  byPlan: PlanRevenueContribution[];
}

export default function SuperAdminSubscriptionsPage() {
  const [landlords, setLandlords] = useState<LandlordRow[]>([]);
  const [revenue, setRevenue] = useState<RevenueStats | null>(null);
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Loading & Action states
  const [loadingList, setLoadingList] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals for quick overrides / cancellations
  const [overrideUser, setOverrideUser] = useState<LandlordRow | null>(null);
  const [overrideSlug, setOverrideSlug] = useState('free');
  const [overrideReason, setOverrideReason] = useState('');

  const [cancelUser, setCancelUser] = useState<LandlordRow | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchRevenue = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/revenue');
      const d = await res.json();
      if (d.success) {
        setRevenue(d.data);
      }
    } catch (err) {
      console.error('Failed to load revenue metrics', err);
    } finally {
      setLoadingRevenue(false);
    }
  }, []);

  const fetchLandlordsList = React.useCallback(async () => {
    setLoadingList(true);
    try {
      const query = new URLSearchParams({
        status: statusFilter,
        search,
        page: page.toString(),
        limit: '10',
      });
      const res = await fetch(`/api/admin/subscriptions?${query}`);
      const d = await res.json();
      if (d.success) {
        setLandlords(d.data.landlords);
        setTotalPages(d.data.pagination.pages);
      }
    } catch (err) {
      console.error('Failed to load landlords list', err);
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  useEffect(() => {
    fetchLandlordsList();
  }, [fetchLandlordsList]);

  const handleOverridePlanSubmit = async () => {
    if (!overrideUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${overrideUser._id}/override-plan`, {
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
        setOverrideUser(null);
        setOverrideReason('');
        await Promise.all([fetchRevenue(), fetchLandlordsList()]);
      } else {
        alert(d.error || 'Failed to override plan.');
      }
    } catch {
      alert('Network error overriding plan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceCancelSubmit = async () => {
    if (!cancelUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${cancelUser._id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason,
        }),
      });
      const d = await res.json();
      if (d.success) {
        alert('Subscription forced cancelled immediately.');
        setCancelUser(null);
        setCancelReason('');
        await Promise.all([fetchRevenue(), fetchLandlordsList()]);
      } else {
        alert(d.error || 'Failed to cancel subscription.');
      }
    } catch {
      alert('Network error cancelling subscription.');
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
        return 'bg-rose-500/10 text-rose-455 border-rose-500/20';
      case 'cancelled':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-800 text-slate-500 border-slate-700/60';
    }
  };

  // Find max monthly revenue to proportion bars
  const maxRevenueContrib = revenue?.byPlan.reduce((acc, curr) => Math.max(acc, curr.monthlyRevenue), 1) || 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative">
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div className="absolute -top-32 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 p-6 md:p-8 lg:p-10 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1 h-6 rounded-full bg-gradient-to-b from-purple-400 to-indigo-500" />
              <h1 className="text-2xl font-black text-slate-100">Subscriber Management</h1>
            </div>
            <p className="text-xs text-slate-500 ml-3">Analyze SaaS recurring revenue and manage landlord accounts</p>
          </div>
          <Link
            href="/admin/settings"
            className="text-xs text-indigo-400 font-bold hover:underline"
          >
            Stripe Config Settings →
          </Link>
        </div>

        {/* ========================================================================= */}
        {/* SECTION A: REVENUE OVERVIEW CARDS */}
        {/* ========================================================================= */}
        {loadingRevenue ? (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-900/60 border border-slate-800/80 rounded-2xl" />
            ))}
          </div>
        ) : (
          revenue && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">MRR</span>
                <strong className="text-2xl font-black text-purple-400 mt-1 block">{formatCents(revenue.mrr)}</strong>
                <span className="text-[9px] text-slate-600 block mt-0.5">Monthly Recurring</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ARR</span>
                <strong className="text-2xl font-black text-slate-200 mt-1 block">{formatCents(revenue.arr)}</strong>
                <span className="text-[9px] text-slate-600 block mt-0.5">Annual Run Rate</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Subs</span>
                <strong className="text-2xl font-black text-emerald-400 mt-1 block">{revenue.activeSubscribers}</strong>
                <span className="text-[9px] text-slate-600 block mt-0.5">Paying landlords</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Trialing</span>
                <strong className="text-2xl font-black text-blue-400 mt-1 block">{revenue.trialingSubscribers}</strong>
                <span className="text-[9px] text-slate-600 block mt-0.5">In trial window</span>
              </div>
              <div className={`p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 ${revenue.pastDueSubscribers > 0 ? 'border-rose-500/20 bg-rose-500/5' : ''}`}>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Past Due</span>
                <strong className={`text-2xl font-black mt-1 block ${revenue.pastDueSubscribers > 0 ? 'text-rose-455' : 'text-slate-350'}`}>{revenue.pastDueSubscribers}</strong>
                <span className="text-[9px] text-slate-600 block mt-0.5">Payment issues</span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Cancelled</span>
                <strong className="text-2xl font-black text-amber-500 mt-1 block">{revenue.cancelledThisMonth}</strong>
                <span className="text-[9px] text-slate-600 block mt-0.5">Churned this month</span>
              </div>
            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* SECTION B: REVENUE BY PLAN */}
        {/* ========================================================================= */}
        {!loadingRevenue && revenue && (
          <section className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Revenue contribution by tier</h3>
            <div className="rounded-2xl bg-slate-900/30 border border-slate-800/80 p-5 space-y-4">
              {revenue.byPlan.map((plan) => {
                const widthPercent = Math.max(10, Math.min(100, (plan.monthlyRevenue / maxRevenueContrib) * 100));
                return (
                  <div key={plan.slug} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold capitalize text-slate-200">{plan.planName}</span>
                        <span className="text-[10px] text-slate-500">({plan.count} subscribers)</span>
                      </div>
                      <span className="font-bold font-mono text-indigo-400">{formatCents(plan.monthlyRevenue)}/mo</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-550"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECTION C: SUBSCRIBER TABLE */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Subscriber Directory</h3>

            {/* Filter Tabs */}
            <div className="flex gap-1 bg-slate-900 p-1.5 rounded-xl text-xs overflow-x-auto w-full sm:w-auto">
              {['all', 'active', 'trialing', 'past_due', 'cancelled'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setStatusFilter(tab); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg capitalize font-bold transition-all whitespace-nowrap cursor-pointer ${statusFilter === tab ? 'bg-indigo-500/15 border border-indigo-500/25 text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {tab === 'past_due' ? 'Past Due' : tab}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search subscribers by name, email, or company..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-250 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/20 overflow-hidden">
            {loadingList ? (
              <div className="p-12 text-center text-xs text-slate-500">Loading subscriber directory...</div>
            ) : landlords.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">No subscribers match the selected filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-800/85 text-slate-450 font-bold uppercase tracking-wider">
                      <th className="px-5 py-4">Landlord Info</th>
                      <th className="px-5 py-4">Tier Plan</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Next Billing Date</th>
                      <th className="px-5 py-4 text-center">Pending Downgrade</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-350">
                    {landlords.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-200">{u.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{u.email}</div>
                          {u.company && (
                            <div className="text-[10px] text-slate-500 font-semibold italic mt-0.5">
                              🏢 {u.company}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 capitalize font-medium text-slate-300">{u.planSlug}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getStatusBadgeCls(u.subscriptionStatus)}`}>
                            {u.subscriptionStatus}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono">
                          {u.currentPeriodEnd
                            ? new Date(u.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {u.cancelAtPeriodEnd ? (
                            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              ⚠️ Yes
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right space-x-3 whitespace-nowrap">
                          <Link
                            href={`/admin/subscriptions/${u._id}`}
                            className="text-xs text-indigo-400 font-bold hover:underline"
                          >
                            View Detail
                          </Link>
                          
                          <button
                            type="button"
                            onClick={() => { setOverrideUser(u); setOverrideSlug(u.planSlug); }}
                            className="text-xs text-slate-400 hover:text-slate-250 font-bold underline cursor-pointer"
                          >
                            Override
                          </button>

                          {u.planSlug !== 'free' && (
                            <button
                              type="button"
                              onClick={() => setCancelUser(u)}
                              className="text-xs text-rose-455 hover:text-rose-400 font-bold underline cursor-pointer"
                            >
                              Force Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-900">
              <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ========================================================================= */}
      {/* QUICK OVERRIDE PLAN MODAL */}
      {/* ========================================================================= */}
      {overrideUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 rounded-3xl space-y-5 text-left shadow-2xl">
            <div>
              <h3 className="text-base font-black text-slate-100">Override Subscription Plan</h3>
              <p className="text-xs text-slate-400 mt-1">Assign plan and bypass Stripe checkouts for {overrideUser.name}</p>
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
                onClick={() => { setOverrideUser(null); setOverrideReason(''); }}
                className="flex-1 py-3 bg-slate-850 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOverridePlanSubmit}
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
      {/* QUICK FORCE CANCEL MODAL */}
      {/* ========================================================================= */}
      {cancelUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 rounded-3xl space-y-5 text-left shadow-2xl">
            <div>
              <h3 className="text-base font-black text-slate-100">Force Cancel Subscription</h3>
              <p className="text-xs text-slate-400 mt-1">Immediately terminate paid Stripe subscription for {cancelUser.name}</p>
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
                onClick={() => { setCancelUser(null); setCancelReason(''); }}
                className="flex-1 py-3 bg-slate-850 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-xs font-bold text-slate-300"
              >
                Keep Plan
              </button>
              <button
                type="button"
                onClick={handleForceCancelSubmit}
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

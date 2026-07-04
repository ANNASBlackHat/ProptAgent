'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

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
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number; // monthly in cents
  yearlyPrice: number; // yearly in cents
  trialDays: number;
  isActive: boolean;
  isFeatured: boolean;
  landlordCount: number;
  limits: PlanLimits;
  createdAt: string;
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        isActive
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
          : 'bg-red-500/15 text-red-400 border border-red-500/25'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0); // monthly in dollars
  const [yearlyPrice, setYearlyPrice] = useState(0); // yearly in dollars
  const [trialDays, setTrialDays] = useState(0);
  const [isFeatured, setIsFeatured] = useState(false);

  // limits state
  const [maxProperties, setMaxProperties] = useState(-1);
  const [maxUnitsPerProperty, setMaxUnitsPerProperty] = useState(-1);
  const [maxActiveListings, setMaxActiveListings] = useState(-1);
  const [maxApplicationsPerMonth, setMaxApplicationsPerMonth] = useState(-1);
  const [aiScreeningEnabled, setAiScreeningEnabled] = useState(false);
  const [maintenanceModuleEnabled, setMaintenanceModuleEnabled] = useState(false);
  const [customScreeningQuestions, setCustomScreeningQuestions] = useState(false);
  const [maxCustomQuestions, setMaxCustomQuestions] = useState(0);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/plans');
      const data = await res.json();
      if (data.success) {
        setPlans(data.data);
      } else {
        setError(data.error || 'Failed to load plans');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleSeedDefaults = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans/seed-defaults', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setToast('Successfully seeded default Free, Pro, and Business plans.');
        setTimeout(() => setToast(''), 3000);
        fetchPlans();
      } else {
        setError(data.error || 'Failed to seed default plans.');
      }
    } catch {
      setError('Network error seeding default plans.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this plan? new users will not be able to choose it.')) return;
    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setToast('Plan deactivated successfully');
        setTimeout(() => setToast(''), 3000);
        fetchPlans();
      } else {
        setError(data.error || 'Failed to deactivate plan');
      }
    } catch {
      setError('Network error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlan(true);
    setError('');
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description,
          price: Math.round(price * 100), // convert to cents
          yearlyPrice: Math.round(yearlyPrice * 100), // convert to cents
          trialDays: Number(trialDays),
          isFeatured,
          limits: {
            maxProperties: Number(maxProperties),
            maxUnitsPerProperty: Number(maxUnitsPerProperty),
            maxActiveListings: Number(maxActiveListings),
            maxApplicationsPerMonth: Number(maxApplicationsPerMonth),
            aiScreeningEnabled,
            maintenanceModuleEnabled,
            customScreeningQuestions,
            maxCustomQuestions: Number(maxCustomQuestions),
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToast('Plan created successfully');
        setTimeout(() => setToast(''), 3000);
        setModalOpen(false);
        // Reset form
        setName('');
        setSlug('');
        setDescription('');
        setPrice(0);
        setYearlyPrice(0);
        setTrialDays(0);
        setIsFeatured(false);
        setMaxProperties(-1);
        setMaxUnitsPerProperty(-1);
        setMaxActiveListings(-1);
        setMaxApplicationsPerMonth(-1);
        setAiScreeningEnabled(false);
        setMaintenanceModuleEnabled(false);
        setCustomScreeningQuestions(false);
        setMaxCustomQuestions(0);
        fetchPlans();
      } else {
        setError(data.error || 'Failed to create plan');
      }
    } catch {
      setError('Network error creating plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 relative">
      <div className="pointer-events-none fixed top-0 right-0 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 p-6 md:p-8 lg:p-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1 h-6 rounded-full bg-gradient-to-b from-purple-400 to-indigo-500" />
              <h1 className="text-2xl font-black text-slate-100">Subscription Plans</h1>
            </div>
            <p className="text-slate-500 text-sm ml-3">
              Define SaaS pricing tiers and landlord limit parameters
            </p>
          </div>

          <div className="flex gap-3">
            {plans.length === 0 && (
              <button
                onClick={handleSeedDefaults}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/25 hover:bg-purple-500/20 transition-all"
              >
                🌱 Seed Defaults
              </button>
            )}
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-md shadow-purple-500/10 active:scale-95"
            >
              ＋ Add Plan
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Plans Table */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/80">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Plan Name
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Pricing (Mo / Yr)
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Landlords
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Featured
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-800/40">
                      <td className="px-5 py-4">
                        <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-20 bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-28 bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-12 bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-16 bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-6 w-16 bg-slate-800 rounded-full animate-pulse" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-8 w-24 bg-slate-800 rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : plans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <p className="text-2xl mb-2">💳</p>
                      <p className="text-slate-400 text-sm font-medium">No plans configured yet</p>
                      <p className="text-slate-600 text-xs mt-1">
                        Click &quot;Seed Defaults&quot; or &quot;Add Plan&quot; to populate.
                      </p>
                    </td>
                  </tr>
                ) : (
                  plans.map((plan, idx) => (
                    <tr
                      key={plan._id}
                      className={`border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors duration-100 ${
                        idx === plans.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{plan.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[250px]">
                            {plan.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-mono text-slate-400">{plan.slug}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-slate-200">
                          {formatPrice(plan.price)}
                        </span>
                        {plan.yearlyPrice > 0 ? (
                          <span className="text-xs text-slate-500 block">
                            {formatPrice(plan.yearlyPrice)} / yr
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600 block">No yearly option</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-slate-200 tabular-nums">
                          {plan.landlordCount}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {plan.isFeatured ? (
                          <span className="bg-purple-500/10 text-purple-400 border border-purple-500/25 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            Yes
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge isActive={plan.isActive} />
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <Link
                          id={`edit-plan-${plan._id}`}
                          href={`/admin/plans/${plan._id}`}
                          className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700/50 hover:border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-all"
                        >
                          Configure
                        </Link>
                        {plan.isActive && (
                          <button
                            id={`deactivate-plan-${plan._id}`}
                            onClick={() => handleDeactivate(plan._id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 transition-all"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Plan Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl p-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-black text-slate-100">Create Subscription Plan</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-xl font-semibold focus:outline-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="plan-name" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Plan Name *
                  </label>
                  <input
                    id="plan-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Starter"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="plan-slug" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Slug *
                  </label>
                  <input
                    id="plan-slug"
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. starter"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="plan-desc" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Description *
                </label>
                <textarea
                  id="plan-desc"
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize target audience and core value prop"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="plan-monthly-price" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Monthly Price ($) *
                  </label>
                  <input
                    id="plan-monthly-price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="plan-yearly-price" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Yearly Price ($)
                  </label>
                  <input
                    id="plan-yearly-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={yearlyPrice}
                    onChange={(e) => setYearlyPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="plan-trial" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Trial Period (Days)
                  </label>
                  <input
                    id="plan-trial"
                    type="number"
                    min="0"
                    value={trialDays}
                    onChange={(e) => setTrialDays(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="plan-isfeatured"
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-purple-500/20"
                />
                <label htmlFor="plan-isfeatured" className="text-xs font-semibold text-slate-300">
                  Featured Plan (highlight on pricing page)
                </label>
              </div>

              {/* limits parameters */}
              <div className="border-t border-slate-800 pt-6">
                <h4 className="text-sm font-bold text-slate-300 mb-4">Limits & Quotas (-1 for Unlimited)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="plan-limit-properties" className="block text-xs font-semibold text-slate-400 mb-1">
                      Max Properties
                    </label>
                    <input
                      id="plan-limit-properties"
                      type="number"
                      required
                      value={maxProperties}
                      onChange={(e) => setMaxProperties(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="plan-limit-units" className="block text-xs font-semibold text-slate-400 mb-1">
                      Max Units per Property
                    </label>
                    <input
                      id="plan-limit-units"
                      type="number"
                      required
                      value={maxUnitsPerProperty}
                      onChange={(e) => setMaxUnitsPerProperty(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="plan-limit-listings" className="block text-xs font-semibold text-slate-400 mb-1">
                      Max Active Listings
                    </label>
                    <input
                      id="plan-limit-listings"
                      type="number"
                      required
                      value={maxActiveListings}
                      onChange={(e) => setMaxActiveListings(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="plan-limit-apps" className="block text-xs font-semibold text-slate-400 mb-1">
                      Max Applications per Month
                    </label>
                    <input
                      id="plan-limit-apps"
                      type="number"
                      required
                      value={maxApplicationsPerMonth}
                      onChange={(e) => setMaxApplicationsPerMonth(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        id="plan-limit-aiscreening"
                        type="checkbox"
                        checked={aiScreeningEnabled}
                        onChange={(e) => setAiScreeningEnabled(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-800 text-purple-600"
                      />
                      <label htmlFor="plan-limit-aiscreening" className="text-xs font-semibold text-slate-400">
                        AI Tenant Screening Interview
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="plan-limit-maint"
                        type="checkbox"
                        checked={maintenanceModuleEnabled}
                        onChange={(e) => setMaintenanceModuleEnabled(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-800 text-purple-600"
                      />
                      <label htmlFor="plan-limit-maint" className="text-xs font-semibold text-slate-400">
                        Tenant Maintenance Requests
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        id="plan-limit-custquestions"
                        type="checkbox"
                        checked={customScreeningQuestions}
                        onChange={(e) => {
                          setCustomScreeningQuestions(e.target.checked);
                          if (!e.target.checked) setMaxCustomQuestions(0);
                        }}
                        className="rounded bg-slate-950 border-slate-800 text-purple-600"
                      />
                      <label htmlFor="plan-limit-custquestions" className="text-xs font-semibold text-slate-400">
                        Custom Screening Questions
                      </label>
                    </div>

                    {customScreeningQuestions && (
                      <div className="pl-6 animate-in slide-in-from-left-2 duration-150">
                        <label htmlFor="plan-limit-maxquestions" className="block text-[11px] text-slate-400 mb-1">
                          Max Custom Questions
                        </label>
                        <input
                          id="plan-limit-maxquestions"
                          type="number"
                          min="0"
                          value={maxCustomQuestions}
                          onChange={(e) => setMaxCustomQuestions(Number(e.target.value))}
                          className="w-24 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-850 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all disabled:opacity-50"
                >
                  {savingPlan ? 'Saving…' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-semibold shadow-xl backdrop-blur-sm animate-in slide-in-from-bottom-2 duration-300">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

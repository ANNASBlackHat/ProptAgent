'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

interface Landlord {
  _id: string;
  name: string;
  email: string;
  companyName?: string;
  subscriptionStatus: string;
  currentPeriodEnd?: string;
}

interface PlanDetails {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number; // in cents
  yearlyPrice: number; // in cents
  trialDays: number;
  isActive: boolean;
  isFeatured: boolean;
  limits: PlanLimits;
}

export default function AdminPlanDetailsPage() {
  const router = useRouter();
  const { id } = useParams();

  const [plan, setPlan] = useState<PlanDetails | null>(null);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0); // in dollars
  const [yearlyPrice, setYearlyPrice] = useState(0); // in dollars
  const [trialDays, setTrialDays] = useState(0);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Limits states
  const [maxProperties, setMaxProperties] = useState(-1);
  const [maxUnitsPerProperty, setMaxUnitsPerProperty] = useState(-1);
  const [maxActiveListings, setMaxActiveListings] = useState(-1);
  const [maxApplicationsPerMonth, setMaxApplicationsPerMonth] = useState(-1);
  const [aiScreeningEnabled, setAiScreeningEnabled] = useState(false);
  const [maintenanceModuleEnabled, setMaintenanceModuleEnabled] = useState(false);
  const [customScreeningQuestions, setCustomScreeningQuestions] = useState(false);
  const [maxCustomQuestions, setMaxCustomQuestions] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/plans/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const p = d.data.plan;
          setPlan(p);
          setLandlords(d.data.landlords);

          // Populate form states
          setName(p.name);
          setDescription(p.description);
          setPrice(p.price / 100);
          setYearlyPrice(p.yearlyPrice / 100);
          setTrialDays(p.trialDays);
          setIsFeatured(p.isFeatured);
          setIsActive(p.isActive);

          // Populate limits states
          setMaxProperties(p.limits.maxProperties);
          setMaxUnitsPerProperty(p.limits.maxUnitsPerProperty);
          setMaxActiveListings(p.limits.maxActiveListings);
          setMaxApplicationsPerMonth(p.limits.maxApplicationsPerMonth);
          setAiScreeningEnabled(p.limits.aiScreeningEnabled);
          setMaintenanceModuleEnabled(p.limits.maintenanceModuleEnabled);
          setCustomScreeningQuestions(p.limits.customScreeningQuestions);
          setMaxCustomQuestions(p.limits.maxCustomQuestions);
        } else {
          setError(d.error || 'Failed to load plan details');
        }
      })
      .catch(() => setError('Failed to retrieve plan information'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          price: Math.round(price * 100),
          yearlyPrice: Math.round(yearlyPrice * 100),
          trialDays: Number(trialDays),
          isFeatured,
          isActive,
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
        setToast('Subscription plan updated successfully');
        setTimeout(() => setToast(''), 3500);
        setPlan(data.data);
      } else {
        setError(data.error || 'Failed to save changes');
      }
    } catch {
      setError('Network error saving changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-center">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl max-w-md mx-auto">
          {error || 'Plan not found.'}
        </div>
        <Link href="/admin/plans" className="inline-block mt-4 text-purple-400 hover:underline">
          ← Back to plans
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 relative">
      <div className="pointer-events-none fixed top-0 right-0 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 p-6 md:p-8 lg:p-10">
        {/* Back Link */}
        <div className="mb-4">
          <Link
            href="/admin/plans"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Back to Plans
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-6 rounded-full bg-gradient-to-b from-purple-400 to-indigo-500" />
            <h1 className="text-2xl font-black text-slate-100">Configure: {plan.name}</h1>
          </div>
          <p className="text-slate-500 text-sm ml-3">
            Slug: <code className="text-purple-400 font-mono">{plan.slug}</code>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Edit Form */}
          <form
            onSubmit={handleSubmit}
            className="xl:col-span-7 rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-sm space-y-6"
          >
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-800">
              Plan Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-name" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Plan Name *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Slug (Read Only)
                </label>
                <input
                  type="text"
                  disabled
                  value={plan.slug}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/50 border border-slate-800/50 text-slate-500 text-sm focus:outline-none font-mono cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label htmlFor="edit-desc" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Description *
              </label>
              <textarea
                id="edit-desc"
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="edit-price" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Monthly Price ($) *
                </label>
                <input
                  id="edit-price"
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
                <label htmlFor="edit-yearly-price" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Yearly Price ($)
                </label>
                <input
                  id="edit-yearly-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={yearlyPrice}
                  onChange={(e) => setYearlyPrice(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>

              <div>
                <label htmlFor="edit-trial" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Trial Period (Days)
                </label>
                <input
                  id="edit-trial"
                  type="number"
                  min="0"
                  value={trialDays}
                  onChange={(e) => setTrialDays(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2">
                <input
                  id="edit-isfeatured"
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-purple-500/20"
                />
                <label htmlFor="edit-isfeatured" className="text-xs font-semibold text-slate-300 select-none">
                  Featured Plan (highlight)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="edit-isactive"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-purple-500/20"
                />
                <label htmlFor="edit-isactive" className="text-xs font-semibold text-slate-300 select-none">
                  Plan is Active (available for signup)
                </label>
              </div>
            </div>

            {/* limits section */}
            <div className="border-t border-slate-800 pt-6">
              <h4 className="text-sm font-bold text-slate-300 mb-4">Limits & Quotas (-1 for Unlimited)</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-limit-properties" className="block text-xs font-semibold text-slate-400 mb-1">
                    Max Properties
                  </label>
                  <input
                    id="edit-limit-properties"
                    type="number"
                    required
                    value={maxProperties}
                    onChange={(e) => setMaxProperties(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit-limit-units" className="block text-xs font-semibold text-slate-400 mb-1">
                    Max Units per Property
                  </label>
                  <input
                    id="edit-limit-units"
                    type="number"
                    required
                    value={maxUnitsPerProperty}
                    onChange={(e) => setMaxUnitsPerProperty(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit-limit-listings" className="block text-xs font-semibold text-slate-400 mb-1">
                    Max Active Listings
                  </label>
                  <input
                    id="edit-limit-listings"
                    type="number"
                    required
                    value={maxActiveListings}
                    onChange={(e) => setMaxActiveListings(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label htmlFor="edit-limit-apps" className="block text-xs font-semibold text-slate-400 mb-1">
                    Max Applications per Month
                  </label>
                  <input
                    id="edit-limit-apps"
                    type="number"
                    required
                    value={maxApplicationsPerMonth}
                    onChange={(e) => setMaxApplicationsPerMonth(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      id="edit-limit-aiscreening"
                      type="checkbox"
                      checked={aiScreeningEnabled}
                      onChange={(e) => setAiScreeningEnabled(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-purple-600"
                    />
                    <label htmlFor="edit-limit-aiscreening" className="text-xs font-semibold text-slate-400 select-none">
                      AI Tenant Screening Interview
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="edit-limit-maint"
                      type="checkbox"
                      checked={maintenanceModuleEnabled}
                      onChange={(e) => setMaintenanceModuleEnabled(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-purple-600"
                    />
                    <label htmlFor="edit-limit-maint" className="text-xs font-semibold text-slate-400 select-none">
                      Tenant Maintenance Requests
                    </label>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      id="edit-limit-custquestions"
                      type="checkbox"
                      checked={customScreeningQuestions}
                      onChange={(e) => {
                        setCustomScreeningQuestions(e.target.checked);
                        if (!e.target.checked) setMaxCustomQuestions(0);
                      }}
                      className="rounded bg-slate-950 border-slate-800 text-purple-600"
                    />
                    <label htmlFor="edit-limit-custquestions" className="text-xs font-semibold text-slate-400 select-none">
                      Custom Screening Questions
                    </label>
                  </div>

                  {customScreeningQuestions && (
                    <div className="pl-6 animate-in slide-in-from-left-2 duration-150">
                      <label htmlFor="edit-limit-maxquestions" className="block text-[11px] text-slate-400 mb-1">
                        Max Custom Questions
                      </label>
                      <input
                        id="edit-limit-maxquestions"
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

            <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push('/admin/plans')}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-md shadow-purple-500/10 active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Saving changes…' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Landlords on this plan */}
          <div className="xl:col-span-5 space-y-6">
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-800">
                Landlords Assigned ({landlords.length})
              </h3>

              {landlords.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-2xl mb-2">👥</p>
                  <p className="text-slate-500 text-sm font-medium">No landlords on this plan</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {landlords.map((landlord) => (
                    <div
                      key={landlord._id}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{landlord.name}</p>
                        <p className="text-xs text-slate-500">{landlord.email}</p>
                        {landlord.companyName && (
                          <p className="text-[10px] text-slate-600 mt-0.5">{landlord.companyName}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded-full select-none capitalize leading-tight border ${
                            landlord.subscriptionStatus === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : landlord.subscriptionStatus === 'trialing'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {landlord.subscriptionStatus}
                        </span>
                        {landlord.currentPeriodEnd && (
                          <p className="text-[10px] text-slate-600 mt-1.5 font-mono">
                            Ends: {new Date(landlord.currentPeriodEnd).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-semibold shadow-xl backdrop-blur-sm animate-in slide-in-from-bottom-2 duration-300">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

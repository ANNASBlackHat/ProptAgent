'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
  price: number;
  yearlyPrice: number;
  trialDays: number;
  isFeatured: boolean;
  limits: PlanLimits;
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

export default function LandlordUpgradePage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isYearly, setIsYearly] = useState(false);
  const [currentPlanSlug, setCurrentPlanSlug] = useState('free');
  const [usage, setUsage] = useState<Usage | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchPlansAndUsage = async () => {
    try {
      // 1. Fetch current billing & usage stats
      const billingRes = await fetch('/api/billing/current');
      const billingData = await billingRes.json();
      if (billingData.success) {
        setCurrentPlanSlug(billingData.data.plan.slug);
        setUsage(billingData.data.usage);
      }

      // 2. Fetch all active plans
      const plansRes = await fetch('/api/plans');
      const plansData = await plansRes.json();
      if (plansData.success) {
        setPlans(plansData.data);
      } else {
        setError(plansData.error || 'Failed to load plans');
      }
    } catch {
      setError('Network error loading pricing plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansAndUsage();
  }, []);

  const handleSelectUpgrade = async (planSlug: string) => {
    if (planSlug === currentPlanSlug) {
      router.push('/billing');
      return;
    }

    setCheckoutLoading(planSlug);
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
        alert(d.error || 'Failed to initiate upgrade checkout session.');
      }
    } catch {
      alert('Network error initiating checkout redirection.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-24">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  // Find next recommended plan
  const getRecommendedUpgradeSlug = () => {
    if (currentPlanSlug === 'free') return 'pro';
    if (currentPlanSlug === 'pro') return 'business';
    return '';
  };
  const recommendedSlug = getRecommendedUpgradeSlug();

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
            <h1 className="text-lg font-bold text-slate-100">Upgrade Subscription Plan</h1>
            <p className="text-xs text-slate-500">Compare tiers and unlock additional limits</p>
          </div>
          <button
            onClick={() => router.push('/billing')}
            className="text-xs text-indigo-400 font-bold hover:underline"
          >
            ← Back to Billing
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 relative z-10 max-w-5xl">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Current Usage Context Banner */}
        {usage && (
          <div className="p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-100">Why upgrade? Compare your active usage context:</h2>
              <p className="text-xs text-slate-400/80 mt-1">Review your current plan limits vs active resources</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/50">
                <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Properties Limit</span>
                <strong className="text-slate-200 mt-1 block">
                  {usage.properties.current} / {usage.properties.limit === -1 ? 'Unlimited' : usage.properties.limit} Used
                </strong>
              </div>
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/50">
                <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Active Listings</span>
                <strong className="text-slate-200 mt-1 block">
                  {usage.activeListings.current} / {usage.activeListings.limit === -1 ? 'Unlimited' : usage.activeListings.limit} Used
                </strong>
              </div>
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/50">
                <span className="text-slate-500 block uppercase tracking-wider text-[10px] font-bold">Applications (Month)</span>
                <strong className="text-slate-200 mt-1 block">
                  {usage.applicationsThisMonth.current} / {usage.applicationsThisMonth.limit === -1 ? 'Unlimited' : usage.applicationsThisMonth.limit} Used
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Toggle billing cycles */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-2 rounded-2xl">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!isYearly ? 'bg-indigo-500/15 border border-indigo-500/25 text-indigo-300' : 'text-slate-400'}`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isYearly ? 'bg-indigo-500/15 border border-indigo-500/25 text-indigo-300' : 'text-slate-400'}`}
            >
              Yearly Billing
            </button>
          </div>
          <p className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
            Save up to 15% with annual subscription packages!
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {plans.map((p) => {
            const isCurrent = p.slug === currentPlanSlug;
            const isRecommended = p.slug === recommendedSlug;
            const hasYearly = p.yearlyPrice > 0;
            const price = isYearly && hasYearly ? p.yearlyPrice / 12 : p.price;
            const periodLabel = isYearly && hasYearly ? '/mo (billed annually)' : '/mo';

            return (
              <div
                key={p._id}
                className={`rounded-3xl p-6 flex flex-col justify-between relative transition-all duration-300 ${
                  isCurrent
                    ? 'border border-slate-800 bg-slate-900/10 opacity-75'
                    : isRecommended
                    ? 'border-2 border-indigo-500 bg-slate-900/60 shadow-xl shadow-indigo-500/5 hover:scale-[1.01]'
                    : 'border border-slate-800/80 bg-slate-900/30 hover:border-slate-700/80'
                }`}
              >
                {isRecommended && (
                  <span className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    Recommended Upgrade
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-slate-800 text-slate-400 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    Current Plan
                  </span>
                )}

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-slate-100 capitalize">{p.name}</h3>
                    {p.trialDays > 0 && !isCurrent && (
                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                        {p.trialDays}-day trial
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed min-h-[36px]">
                    {p.description}
                  </p>

                  <div className="mt-6 flex items-baseline">
                    <span className="text-3xl font-black text-slate-100">{formatPrice(price)}</span>
                    <span className="text-slate-500 text-xs font-semibold ml-2">{p.price === 0 ? '' : periodLabel}</span>
                  </div>

                  <ul className="mt-6 border-t border-slate-800/60 pt-6 space-y-3.5 text-xs text-slate-350">
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>Properties limit: {p.limits.maxProperties === -1 ? 'Unlimited' : p.limits.maxProperties}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>Units per property: {p.limits.maxUnitsPerProperty === -1 ? 'Unlimited' : p.limits.maxUnitsPerProperty}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>Active listings limit: {p.limits.maxActiveListings === -1 ? 'Unlimited' : p.limits.maxActiveListings}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>Applications limit: {p.limits.maxApplicationsPerMonth === -1 ? 'Unlimited' : `${p.limits.maxApplicationsPerMonth}/mo`}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {p.limits.aiScreeningEnabled ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-2">
                          <span>✓</span>
                          <span>AI screening enabled</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 line-through">AI screening</span>
                      )}
                    </li>
                  </ul>
                </div>

                <div className="pt-6 border-t border-slate-800/60 mt-6">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-3.5 rounded-2xl text-xs font-black bg-slate-800 border border-slate-750 text-slate-500 cursor-not-allowed"
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelectUpgrade(p.slug)}
                      disabled={checkoutLoading !== null}
                      className={`w-full py-3.5 rounded-2xl text-xs font-black transition-all active:scale-[0.98] ${
                        isRecommended
                          ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/10'
                          : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/85'
                      } disabled:opacity-50`}
                    >
                      {checkoutLoading === p.slug ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                          Redirecting…
                        </span>
                      ) : (
                        `Upgrade to ${p.name}`
                      )}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

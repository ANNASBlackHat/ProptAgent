'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

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
  price: number; // in cents
  yearlyPrice: number; // in cents
  trialDays: number;
  isFeatured: boolean;
  limits: PlanLimits;
}

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planSlug: string) => {
    if (!user) {
      router.push(`/register?plan=${planSlug}`);
      return;
    }

    if (user.role !== 'landlord') {
      router.push('/dashboard');
      return;
    }

    if (user.planSlug === planSlug) {
      router.push('/billing');
      return;
    }

    setSubmittingPlan(planSlug);
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planSlug,
          billingInterval: isYearly ? 'yearly' : 'monthly',
        }),
      });
      const data = await res.json();
      if (data.success && data.data.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      } else {
        alert(data.error || 'Failed to initialize checkout session');
      }
    } catch {
      alert('Network error initiating checkout session');
    } finally {
      setSubmittingPlan(null);
    }
  };

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPlans(d.data);
        } else {
          setError(d.error || 'Failed to load plans');
        }
      })
      .catch(() => setError('Failed to load pricing plans'))
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (amountInCents: number) => {
    return (amountInCents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="relative min-h-screen bg-neutral-50 text-neutral-900 overflow-x-hidden">
      {/* Glow effects */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header Navigation */}
      <header className="backdrop-blur-md bg-white/80 border-b border-neutral-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-neutral-900 group-hover:text-primary transition-colors">
                PropAgent
              </span>
            </Link>
            <nav className="flex items-center gap-8">
              <Link href="/" className="text-sm font-medium text-neutral-600 hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/login" className="text-sm font-medium text-neutral-600 hover:text-primary transition-colors">
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Hero pricing header */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-neutral-500">
            Choose the plan that fits your portfolio. Scale up as your business grows.
          </p>

          {/* Monthly / Yearly Toggle */}
          <div className="mt-8 flex justify-center items-center gap-4">
            <span className={`text-sm font-semibold ${!isYearly ? 'text-neutral-900' : 'text-neutral-400'}`}>
              Monthly billing
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-12 h-6 rounded-full bg-neutral-200 border border-neutral-300 transition-colors focus:outline-none"
              aria-label="Toggle annual billing"
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-primary shadow-sm transform transition-transform ${
                  isYearly ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-semibold flex items-center gap-1.5 ${isYearly ? 'text-neutral-900' : 'text-neutral-400'}`}>
              Yearly billing
              <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Save ~15%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing plans cards */}
        {loading ? (
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto py-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-neutral-200 rounded-3xl p-8 animate-pulse space-y-4">
                <div className="h-6 w-24 bg-neutral-200 rounded" />
                <div className="h-4 w-48 bg-neutral-200 rounded" />
                <div className="h-10 w-32 bg-neutral-200 rounded" />
                <div className="space-y-2 pt-6">
                  <div className="h-4 w-full bg-neutral-200 rounded" />
                  <div className="h-4 w-5/6 bg-neutral-200 rounded" />
                  <div className="h-4 w-4/5 bg-neutral-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 max-w-md mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-500">No pricing plans found. Please seed default plans.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto py-6 items-stretch">
            {plans.map((plan) => {
              const hasYearly = plan.yearlyPrice > 0;
              const currentPrice = isYearly && hasYearly ? plan.yearlyPrice / 12 : plan.price;
              const periodLabel = isYearly && hasYearly ? '/mo (billed annually)' : '/mo';

              return (
                <div
                  key={plan._id}
                  className={`bg-white rounded-3xl p-8 transition-all duration-300 relative flex flex-col justify-between ${
                    plan.isFeatured
                      ? 'border-2 border-primary shadow-xl shadow-primary/5 hover:scale-[1.02] md:-translate-y-2'
                      : 'border border-neutral-200/80 hover:shadow-lg'
                  }`}
                >
                  {plan.isFeatured && (
                    <span className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-primary text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      Most Popular
                    </span>
                  )}

                  <div>
                    {/* Header info */}
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-neutral-900">{plan.name}</h3>
                      {plan.trialDays > 0 && (
                        <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          {plan.trialDays}-day trial
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500 mb-6 leading-relaxed">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="mb-8 flex items-baseline">
                      <span className="text-4xl font-black tracking-tight text-neutral-900">
                        {formatPrice(currentPrice)}
                      </span>
                      <span className="text-neutral-400 text-xs font-semibold ml-2">
                        {periodLabel}
                      </span>
                    </div>

                    {/* Features list */}
                    <ul className="space-y-4 border-t border-neutral-100 pt-6 mb-8 text-sm">
                      {/* Properties limit */}
                      <li className="flex items-start gap-3">
                        <span className="text-emerald-500 text-base leading-none">✓</span>
                        <span className="text-neutral-600">
                          {plan.limits.maxProperties === -1
                            ? 'Unlimited properties'
                            : `Up to ${plan.limits.maxProperties} active ${
                                plan.limits.maxProperties === 1 ? 'property' : 'properties'
                              }`}
                        </span>
                      </li>

                      {/* Units limit */}
                      <li className="flex items-start gap-3">
                        <span className="text-emerald-500 text-base leading-none">✓</span>
                        <span className="text-neutral-600">
                          {plan.limits.maxUnitsPerProperty === -1
                            ? 'Unlimited units per property'
                            : `Up to ${plan.limits.maxUnitsPerProperty} units per property`}
                        </span>
                      </li>

                      {/* Active listings limit */}
                      <li className="flex items-start gap-3">
                        <span className="text-emerald-500 text-base leading-none">✓</span>
                        <span className="text-neutral-600">
                          {plan.limits.maxActiveListings === -1
                            ? 'Unlimited active listings'
                            : `Up to ${plan.limits.maxActiveListings} active listings`}
                        </span>
                      </li>

                      {/* Applications limit */}
                      <li className="flex items-start gap-3">
                        <span className="text-emerald-500 text-base leading-none">✓</span>
                        <span className="text-neutral-600">
                          {plan.limits.maxApplicationsPerMonth === -1
                            ? 'Unlimited applications'
                            : `Up to ${plan.limits.maxApplicationsPerMonth} monthly applications`}
                        </span>
                      </li>

                      {/* AI Screening */}
                      <li className="flex items-start gap-3">
                        {plan.limits.aiScreeningEnabled ? (
                          <>
                            <span className="text-emerald-500 text-base leading-none">✓</span>
                            <span className="text-neutral-600">AI tenant screening interview</span>
                          </>
                        ) : (
                          <>
                            <span className="text-neutral-300 text-base leading-none">✗</span>
                            <span className="text-neutral-400 line-through">AI tenant screening</span>
                          </>
                        )}
                      </li>

                      {/* Maintenance module */}
                      <li className="flex items-start gap-3">
                        {plan.limits.maintenanceModuleEnabled ? (
                          <>
                            <span className="text-emerald-500 text-base leading-none">✓</span>
                            <span className="text-neutral-600">Tenant maintenance module</span>
                          </>
                        ) : (
                          <>
                            <span className="text-neutral-300 text-base leading-none">✗</span>
                            <span className="text-neutral-400 line-through">Maintenance module</span>
                          </>
                        )}
                      </li>

                      {/* Custom screening questions */}
                      <li className="flex items-start gap-3">
                        {plan.limits.customScreeningQuestions ? (
                          <>
                            <span className="text-emerald-500 text-base leading-none">✓</span>
                            <span className="text-neutral-600">
                              Custom screening questions ({plan.limits.maxCustomQuestions} max)
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-neutral-300 text-base leading-none">✗</span>
                            <span className="text-neutral-400 line-through">Custom questions</span>
                          </>
                        )}
                      </li>
                    </ul>
                  </div>

                  {/* CTA */}
                  {user && user.role === 'landlord' ? (
                    <button
                      onClick={() => handleSelectPlan(plan.slug)}
                      disabled={submittingPlan !== null}
                      className={`w-full text-center py-3.5 rounded-2xl text-sm font-bold transition-all ${
                        user.planSlug === plan.slug
                          ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 cursor-default'
                          : plan.isFeatured
                          ? 'bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/20 active:scale-[0.98]'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-850 active:scale-[0.98]'
                      } disabled:opacity-50`}
                    >
                      {submittingPlan === plan.slug ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
                          Redirecting…
                        </span>
                      ) : user.planSlug === plan.slug ? (
                        'Your Current Plan'
                      ) : (
                        'Select Plan'
                      )}
                    </button>
                  ) : (
                    <Link
                      href={`/register?plan=${plan.slug}`}
                      className={`w-full text-center py-3.5 rounded-2xl text-sm font-bold transition-all ${
                        plan.isFeatured
                          ? 'bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/20 active:scale-[0.98]'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-850 active:scale-[0.98]'
                      }`}
                    >
                      Get Started
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface SuccessData {
  planName: string;
  planSlug: string;
  customerEmail: string;
  paymentStatus: string;
  status: string;
}

const PLAN_LIMIT_MAPPING: Record<string, { properties: string; listings: string; screening: string }> = {
  free: { properties: '1 Property', listings: '3 Listings', screening: 'Locked' },
  pro: { properties: '5 Properties', listings: 'Unlimited Listings', screening: 'Enabled' },
  business: { properties: 'Unlimited Properties', listings: 'Unlimited Listings', screening: 'Enabled' },
};

function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SuccessData | null>(null);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!sessionId) {
      setError('Missing session_id parameters.');
      setLoading(false);
      return;
    }

    fetch(`/api/billing/success?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error || 'Failed to verify checkout session.');
        }
      })
      .catch(() => {
        setError('Network error verifying checkout.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [sessionId]);

  // Countdown auto-redirect logic
  useEffect(() => {
    if (loading || error || !data) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          // Force a full window reload to refresh the auth context state
          setTimeout(() => {
            window.location.reload();
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, error, data, router]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4" />
        <h2 className="text-lg font-bold text-slate-200">Verifying your subscription...</h2>
        <p className="text-xs text-slate-500 mt-1">Please do not refresh or close this page.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-455 flex items-center justify-center text-2xl mb-4 font-bold">
          ✕
        </div>
        <h2 className="text-lg font-bold text-slate-200">Verification Failed</h2>
        <p className="text-sm text-slate-450 mt-2">{error}</p>
        <Link
          href="/billing"
          className="mt-6 px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 transition-all"
        >
          Return to Billing
        </Link>
      </div>
    );
  }

  const slug = data?.planSlug || 'free';
  const limits = PLAN_LIMIT_MAPPING[slug] || PLAN_LIMIT_MAPPING.free;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl shadow-2xl backdrop-blur-md text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-500/10 animate-bounce">
          ✓
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-100">🎉 Welcome to {data?.planName}!</h2>
          <p className="text-sm text-slate-400 mt-2">
            Your new subscription is active and limits have been unlocked immediately.
          </p>
        </div>

        {data && (
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-850/80 text-left space-y-3.5">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-2">Unlocked Plan Limits</h4>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold uppercase tracking-wider">Properties Limit</span>
              <span className="text-slate-200 font-bold">{limits.properties}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold uppercase tracking-wider">Active Listings</span>
              <span className="text-slate-200 font-bold">{limits.listings}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold uppercase tracking-wider">AI screening</span>
              <span className="text-slate-200 font-bold">{limits.screening}</span>
            </div>
          </div>
        )}

        <div className="pt-2 space-y-3">
          <button
            onClick={() => {
              router.push('/dashboard');
              setTimeout(() => {
                window.location.reload();
              }, 100);
            }}
            className="w-full px-5 py-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-md shadow-emerald-500/10 active:scale-95"
          >
            Go to Dashboard
          </button>
          
          <p className="text-xs text-slate-500">
            Auto-redirecting to dashboard in {countdown} seconds…
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4" />
      </div>
    }>
      <BillingSuccessContent />
    </Suspense>
  );
}

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function BillingCancelledPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-slate-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 p-8 rounded-3xl shadow-2xl backdrop-blur-md text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-slate-500/5">
          ℹ
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-100">Checkout Cancelled</h2>
          <p className="text-sm text-slate-400 mt-2">
            No worries — your current plan has not changed.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => router.push('/billing')}
            className="w-full px-5 py-3 rounded-xl text-sm font-bold bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-750 transition-all active:scale-95"
          >
            Back to Billing
          </button>
        </div>
      </div>
    </div>
  );
}

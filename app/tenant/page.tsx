'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TenantNav from '@/components/TenantNav';

interface TenantDashboardData {
  lease: {
    status: string;
    endDate: string;
    monthlyRent: number;
    propertyName: string;
    unitNumber: string;
    daysUntilExpiry: number;
  } | null;
  recentPayments: Array<{
    amount: number;
    method: string;
    paidDate: string;
    notes?: string;
  }>;
  openMaintenanceRequests: number;
  maintenanceRequests: Array<{
    _id: string;
    title: string;
    category: string;
    urgency: string;
    status: string;
    createdAt: string;
  }>;
}

const CATEGORY_ICON: Record<string, string> = {
  plumbing: '🔧',
  electrical: '⚡',
  hvac: '❄️',
  structural: '🏗️',
  appliance: '🍳',
  other: '📋',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  open: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  in_progress: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  resolved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  closed: { bg: 'bg-slate-500/15', text: 'text-slate-400', dot: 'bg-slate-400' },
};

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  online: 'Online',
  other: 'Other',
};

export default function TenantDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<TenantDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'tenant')) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading || !user || user.role !== 'tenant') return;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard/tenant');
        const json = await res.json();
        if (res.ok && json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error('Error fetching tenant dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, authLoading]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'tenant') return null;

  const lease = data?.lease;
  const isExpired = lease?.status === 'expired';
  const isExpiringSoon = !isExpired && lease && lease.daysUntilExpiry <= 30;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/6 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-600/6 rounded-full blur-3xl" />
      </div>

      <TenantNav />

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">
            Welcome back, {user.name.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Here&apos;s a summary of your tenancy.
          </p>
        </div>

        {/* ── Section A: Lease Status Card ──────────────────────────────── */}
        {lease ? (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Your Lease
            </h2>

            {/* Expiry Warning */}
            {isExpired && (
              <div className="mb-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                <span className="text-red-400 text-lg">🚫</span>
                <div>
                  <p className="text-red-400 font-semibold text-sm">Lease Expired</p>
                  <p className="text-red-300/70 text-xs mt-0.5">
                    Your lease expired on {new Date(lease.endDate).toLocaleDateString()}. Contact your landlord to discuss renewal.
                  </p>
                </div>
              </div>
            )}

            {isExpiringSoon && !isExpired && (
              <div className="mb-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
                <span className="text-orange-400 text-lg">⚠️</span>
                <div>
                  <p className="text-orange-400 font-semibold text-sm">
                    Lease Expiring Soon — {lease.daysUntilExpiry} day{lease.daysUntilExpiry !== 1 ? 's' : ''} remaining
                  </p>
                  <p className="text-orange-300/70 text-xs mt-0.5">
                    Your lease ends on {new Date(lease.endDate).toLocaleDateString()}. Reach out to your landlord about renewal.
                  </p>
                </div>
              </div>
            )}

            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Property</p>
                  <p className="text-slate-200 font-semibold text-sm">{lease.propertyName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Unit</p>
                  <p className="text-slate-200 font-semibold text-sm">Unit {lease.unitNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Monthly Rent</p>
                  <p className="text-emerald-400 font-bold text-sm">
                    ${lease.monthlyRent.toLocaleString()}/mo
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Lease Ends</p>
                  <p className={`font-semibold text-sm ${isExpired ? 'text-red-400' : isExpiringSoon ? 'text-orange-400' : 'text-slate-200'}`}>
                    {new Date(lease.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Status pill */}
              <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isExpired ? 'bg-red-400' : isExpiringSoon ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400'}`} />
                  <span className={`text-xs font-semibold ${isExpired ? 'text-red-400' : isExpiringSoon ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
                  </span>
                </div>
                <Link
                  href="/tenant/lease"
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
                >
                  View full lease <span>→</span>
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-slate-400 text-sm">
            You don&apos;t have an active lease yet. Once your landlord creates a lease, it will appear here.
          </div>
        )}

        {/* ── Section B: Quick Actions ───────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/tenant/maintenance/new"
              className="flex items-center gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200 group"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-emerald-500/15 transition-colors">
                🔧
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors text-sm">
                  Submit Maintenance Request
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Report an issue with your unit
                </p>
              </div>
              <svg className="w-4 h-4 text-slate-600 group-hover:text-emerald-500 transition-all ml-auto shrink-0 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/tenant/lease"
              className="flex items-center gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-200 group"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-blue-500/15 transition-colors">
                💳
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors text-sm">
                  View Payment History
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  See your rent ledger and receipts
                </p>
              </div>
              <svg className="w-4 h-4 text-slate-600 group-hover:text-blue-500 transition-all ml-auto shrink-0 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* ── Section C: Recent Maintenance ────────────────────────────────  */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recent Maintenance Requests
            </h2>
            {(data?.openMaintenanceRequests ?? 0) > 0 && (
              <span className="text-xs text-amber-400 font-semibold">
                {data!.openMaintenanceRequests} open
              </span>
            )}
          </div>

          {!data || data.maintenanceRequests.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center">
              <p className="text-slate-500 text-sm">No maintenance requests yet.</p>
              <Link
                href="/tenant/maintenance/new"
                className="inline-block mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                Submit your first request →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.maintenanceRequests.map((req) => {
                const statusStyle = STATUS_STYLES[req.status] || STATUS_STYLES.open;
                return (
                  <Link
                    key={req._id}
                    href="/tenant/maintenance"
                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/30 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center text-lg shrink-0">
                      {CATEGORY_ICON[req.category] || '📋'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-200 text-sm group-hover:text-slate-100 transition-colors truncate">
                        {req.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                      {req.status.replace('_', ' ')}
                    </span>
                  </Link>
                );
              })}

              <div className="text-center pt-1">
                <Link
                  href="/tenant/maintenance"
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  View all maintenance requests →
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Recent Payments */}
        {data && data.recentPayments.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Recent Payments
              </h2>
              <Link href="/tenant/lease" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                View all →
              </Link>
            </div>
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md overflow-hidden">
              <ul className="divide-y divide-slate-800/50">
                {data.recentPayments.map((payment, i) => (
                  <li key={i} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">💰</span>
                      <div>
                        <p className="text-sm font-semibold text-emerald-400">
                          ${payment.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {METHOD_LABEL[payment.method] || payment.method}
                          {payment.notes ? ` · ${payment.notes}` : ''}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(payment.paidDate).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

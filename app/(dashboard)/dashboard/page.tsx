'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface DashboardData {
  summary: {
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    occupancyRate: number;
    pendingApplications: number;
    activeLeases: number;
    expiringSoonLeases: number;
    openMaintenanceRequests: number;
    urgentMaintenanceRequests: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    relatedId: string;
    relatedModel: string;
    timestamp: string;
  }>;
  expiringLeases: Array<{
    leaseId: string;
    tenantName: string;
    propertyName: string;
    unitNumber: string;
    endDate: string;
    daysUntilExpiry: number;
  }>;
  overdueUnits: Array<{
    unitId: string;
    unitNumber: string;
    propertyName: string;
    tenantName: string;
    tenantEmail: string;
    lastPaymentDate: string | null;
  }>;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function activityIcon(type: string): string {
  switch (type) {
    case 'new_application': return '📋';
    case 'status_change': return '🔄';
    case 'payment_logged': return '💰';
    case 'maintenance_submitted': return '🔧';
    case 'lease_created': return '📄';
    case 'lease_expiring': return '⚠️';
    default: return '📌';
  }
}

function activityLink(type: string, id: string): string {
  switch (type) {
    case 'new_application':
    case 'status_change': return `/applications/${id}`;
    case 'payment_logged':
    case 'lease_created':
    case 'lease_expiring': return `/leases/${id}`;
    case 'maintenance_submitted': return `/maintenance/${id}`;
    default: return '#';
  }
}

function expiryTextColor(days: number): string {
  if (days <= 7) return 'text-red-400';
  if (days <= 30) return 'text-orange-400';
  return 'text-yellow-400';
}

function expiryRowClass(days: number): string {
  if (days <= 7) return 'bg-red-500/5 border-l-2 border-red-500/40';
  if (days <= 30) return 'bg-orange-500/5 border-l-2 border-orange-500/30';
  return 'border-l-2 border-yellow-500/20';
}

export default function LandlordDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'landlord') return;
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard/landlord');
        const json = await res.json();
        if (res.ok && json.success) {
          setData(json.data);
        } else {
          setError(json.error || 'Failed to load dashboard data');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm animate-pulse">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-blue-600/6 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-indigo-600/6 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="lg:pl-0 pl-10">
            <h1 className="text-lg font-bold text-slate-100">Dashboard</h1>
            <p className="text-xs text-slate-500">
              Welcome back, <span className="text-slate-400">{user?.name}</span>
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold uppercase tracking-wider">
            Landlord
          </span>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8 relative z-10">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Section A: Summary Cards ──────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Portfolio Overview
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Properties */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md group hover:border-blue-500/20 transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">🏢</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Properties</span>
              </div>
              <p className="text-3xl font-black text-slate-100 tabular-nums">
                {s?.totalProperties ?? '—'}
              </p>
              <p className="text-xs text-blue-400 mt-1">Total active</p>
            </div>

            {/* Units / Occupancy */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">🏠</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Units</span>
              </div>
              <p className="text-3xl font-black text-slate-100 tabular-nums">
                {s?.totalUnits ?? '—'}
              </p>
              <p className="text-xs text-emerald-400 mt-1">
                {s?.occupiedUnits ?? 0} occupied · {s?.occupancyRate ?? 0}%
              </p>
            </div>

            {/* Pending Applications */}
            <a
              href="/applications?status=pending"
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-orange-500/30 hover:bg-orange-500/5 transition-all duration-200 group block"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">📋</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider group-hover:text-orange-400 transition-colors">Applications</span>
              </div>
              <p className="text-3xl font-black text-slate-100 tabular-nums">
                {s?.pendingApplications ?? '—'}
              </p>
              <p className="text-xs text-orange-400 mt-1">Pending review</p>
            </a>

            {/* Active Leases */}
            <a
              href="/leases?status=active"
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200 group block"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">📄</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider group-hover:text-emerald-400 transition-colors">Leases</span>
              </div>
              <p className="text-3xl font-black text-slate-100 tabular-nums">
                {s?.activeLeases ?? '—'}
              </p>
              <p className="text-xs text-emerald-400 mt-1">Active</p>
            </a>

            {/* Expiring Soon */}
            <a
              href="/leases?status=expiring_soon"
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all duration-200 group block"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">⏳</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider group-hover:text-yellow-400 transition-colors">Expiring</span>
              </div>
              <p className="text-3xl font-black text-slate-100 tabular-nums">
                {s?.expiringSoonLeases ?? '—'}
              </p>
              <p className="text-xs text-yellow-400 mt-1">Next 30 days</p>
            </a>

            {/* Open Maintenance */}
            <a
              href="/maintenance?status=open"
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all duration-200 group block"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">🔧</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider group-hover:text-yellow-400 transition-colors">Maintenance</span>
              </div>
              <p className="text-3xl font-black text-slate-100 tabular-nums">
                {s?.openMaintenanceRequests ?? '—'}
              </p>
              <p className="text-xs text-yellow-400 mt-1">Open tickets</p>
            </a>

            {/* Urgent Maintenance */}
            <a
              href="/maintenance?urgency=urgent"
              className={`p-5 rounded-2xl border backdrop-blur-md transition-all duration-200 group block ${
                (s?.urgentMaintenanceRequests ?? 0) > 0
                  ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15 hover:border-red-500/50'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-red-500/20'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xl ${(s?.urgentMaintenanceRequests ?? 0) > 0 ? 'animate-pulse' : ''}`}>
                  🚨
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${(s?.urgentMaintenanceRequests ?? 0) > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  Urgent
                </span>
              </div>
              <p className="text-3xl font-black text-slate-100 tabular-nums">
                {s?.urgentMaintenanceRequests ?? '—'}
              </p>
              <p className="text-xs text-red-400 mt-1">Urgent requests</p>
            </a>

            {/* Occupancy Rate — bar card */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl">📊</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Occupancy</span>
              </div>
              <p className="text-3xl font-black text-slate-100 tabular-nums">
                {s?.occupancyRate ?? 0}%
              </p>
              <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${s?.occupancyRate ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                {s?.occupiedUnits ?? 0} / {s?.totalUnits ?? 0} units
              </p>
            </div>
          </div>
        </section>

        {/* ── Section B: Recent Activity ────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Recent Activity
          </h2>
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md overflow-hidden">
            {!data || data.recentActivity.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-500 text-sm">No recent activity yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800/50">
                {data.recentActivity.map((event, i) => (
                  <li key={i}>
                    <a
                      href={activityLink(event.type, event.relatedId)}
                      className="flex items-start gap-4 px-5 py-4 hover:bg-slate-800/25 transition-colors group"
                    >
                      <span className="text-xl mt-0.5 shrink-0">{activityIcon(event.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors leading-snug">
                          {event.description}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">{timeAgo(event.timestamp)}</p>
                      </div>
                      <svg
                        className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors mt-0.5 shrink-0"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── Section C: Two-column tables ─────────────────────────────────── */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Expiring Leases */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">⏳ Expiring Leases</h3>
              <span className="text-xs text-slate-500">Next 60 days</span>
            </div>
            {!data || data.expiringLeases.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-slate-500 text-sm">No leases expiring in the next 60 days.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800/40">
                      <th className="px-5 py-3 text-left text-xs text-slate-500 font-medium">Tenant</th>
                      <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Property / Unit</th>
                      <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {data.expiringLeases.map((lease) => (
                      <tr
                        key={lease.leaseId}
                        className={`transition-colors hover:bg-slate-800/20 ${expiryRowClass(lease.daysUntilExpiry)}`}
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-200">{lease.tenantName}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-slate-400 text-xs">{lease.propertyName}</p>
                          <p className="text-slate-300 text-xs font-medium">Unit {lease.unitNumber}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`text-xs font-bold tabular-nums ${expiryTextColor(lease.daysUntilExpiry)}`}>
                            {lease.daysUntilExpiry}d
                          </span>
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            {new Date(lease.endDate).toLocaleDateString()}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Overdue Rent */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">💸 Overdue Rent</h3>
              <span className="text-xs text-slate-500">No payment this month</span>
            </div>
            {!data || data.overdueUnits.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-slate-500 text-sm">🎉 All units paid this month.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800/40">
                      <th className="px-5 py-3 text-left text-xs text-slate-500 font-medium">Tenant</th>
                      <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Unit</th>
                      <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Last Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {data.overdueUnits.map((unit) => (
                      <tr
                        key={unit.unitId}
                        className="hover:bg-slate-800/20 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-200">{unit.tenantName}</p>
                          <p className="text-[11px] text-slate-500">{unit.tenantEmail}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-slate-400 text-xs">{unit.propertyName}</p>
                          <p className="text-slate-300 text-xs font-medium">Unit {unit.unitNumber}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {unit.lastPaymentDate ? (
                            <span className="text-xs text-orange-400 font-medium">
                              {new Date(unit.lastPaymentDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-xs text-red-400 font-medium">Never</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';

interface Stats {
  totalLandlords: number;
  totalProperties: number;
  totalUnits: number;
  totalApplications: number;
  totalLeases: number;
  activeLeases: number;
  totalMaintenanceRequests: number;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
  sub?: string;
}

function StatCard({ label, value, icon, accent, sub }: StatCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-sm hover:border-slate-700/80 transition-all duration-200 group`}>
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${accent} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
      <div className="relative">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${accent} bg-opacity-20`}>
          <span className="text-xl">{icon}</span>
        </div>
        <p className="text-3xl font-black text-slate-100 tabular-nums">{value}</p>
        <p className="text-sm font-semibold text-slate-400 mt-1">{label}</p>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-slate-800 mb-4" />
      <div className="h-8 w-16 bg-slate-800 rounded mb-2" />
      <div className="h-4 w-28 bg-slate-800 rounded" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data);
        else setError(d.error || 'Failed to load stats');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats
    ? [
        {
          label: 'Total Landlords',
          value: stats.totalLandlords,
          icon: '🏢',
          accent: 'bg-blue-500',
          sub: 'Registered on platform',
        },
        {
          label: 'Total Properties',
          value: stats.totalProperties,
          icon: '🏠',
          accent: 'bg-indigo-500',
          sub: 'Across all landlords',
        },
        {
          label: 'Total Units',
          value: stats.totalUnits,
          icon: '🚪',
          accent: 'bg-violet-500',
          sub: 'Listed units',
        },
        {
          label: 'Total Applications',
          value: stats.totalApplications,
          icon: '📋',
          accent: 'bg-purple-500',
          sub: 'All time submissions',
        },
        {
          label: 'Active Leases',
          value: stats.activeLeases,
          icon: '📄',
          accent: 'bg-emerald-500',
          sub: `${stats.totalLeases} total leases`,
        },
        {
          label: 'Maintenance Requests',
          value: stats.totalMaintenanceRequests,
          icon: '🔧',
          accent: 'bg-amber-500',
          sub: 'All time requests',
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-950 relative">
      {/* Ambient gradients */}
      <div className="pointer-events-none fixed top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 p-6 md:p-8 lg:p-10">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-6 rounded-full bg-gradient-to-b from-purple-400 to-indigo-500" />
            <h1 className="text-2xl font-black text-slate-100">Admin Dashboard</h1>
          </div>
          <p className="text-slate-500 text-sm ml-3">
            Platform-wide overview — real-time data
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : statCards.map((card) => (
                <StatCard key={card.label} {...card} />
              ))}
        </div>

        {/* Quick links */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="/admin/landlords"
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-950/50 border border-slate-800/50 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all duration-150 group"
            >
              <span className="text-xl">🏢</span>
              <div>
                <p className="text-sm font-semibold text-slate-200 group-hover:text-purple-300 transition-colors">
                  Manage Landlords
                </p>
                <p className="text-xs text-slate-500">Activate, deactivate, search</p>
              </div>
              <svg className="ml-auto text-slate-600 group-hover:text-purple-400 transition-colors" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a
              href="/admin/settings"
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-950/50 border border-slate-800/50 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-150 group"
            >
              <span className="text-xl">⚙️</span>
              <div>
                <p className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                  System Settings
                </p>
                <p className="text-xs text-slate-500">AI, email, templates</p>
              </div>
              <svg className="ml-auto text-slate-600 group-hover:text-indigo-400 transition-colors" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

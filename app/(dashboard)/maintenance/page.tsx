'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CategoryIcon from '@/components/CategoryIcon';
import UrgencyBadge from '@/components/UrgencyBadge';
import { MaintenanceCategory, MaintenanceUrgency, MaintenanceStatus } from '@/models/MaintenanceRequest';

interface MaintenanceRequestRow {
  _id: string;
  title: string;
  category: MaintenanceCategory;
  urgency: MaintenanceUrgency;
  status: MaintenanceStatus;
  createdAt: string;
  tenantId: { _id: string; name: string; email: string };
  propertyId: { _id: string; name: string };
  unitId: { _id: string; unitNumber: string };
}

interface PropertyItem {
  _id: string;
  name: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const STATUS_CONFIG: Record<
  MaintenanceStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  open: {
    label: 'Open',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  resolved: {
    label: 'Resolved',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  closed: {
    label: 'Closed',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
  },
};

function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export default function LandlordMaintenancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Data States
  const [requests, setRequests] = useState<MaintenanceRequestRow[]>([]);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('');
  const [propertyFilter, setPropertyFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  // Summary Metrics
  const [metrics, setMetrics] = useState({
    openCount: 0,
    urgentCount: 0,
    inProgressCount: 0,
  });

  // Auth Guard
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'landlord' && user.role !== 'super_admin'))) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Fetch properties (for filter dropdown)
  useEffect(() => {
    if (authLoading || !user) return;
    const fetchProperties = async () => {
      try {
        const res = await fetch('/api/properties');
        const data = await res.json();
        if (res.ok && data.success) {
          setProperties(data.data || []);
        }
      } catch (err) {
        console.error('Error loading properties:', err);
      }
    };
    fetchProperties();
  }, [user, authLoading]);

  // Fetch maintenance requests
  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });

      if (statusFilter) params.set('status', statusFilter);
      if (urgencyFilter) params.set('urgency', urgencyFilter);
      if (propertyFilter) params.set('propertyId', propertyFilter);
      if (categoryFilter) params.set('category', categoryFilter);

      const res = await fetch(`/api/maintenance?${params}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch maintenance requests');
      }

      setRequests(data.data.requests || []);
      setPagination(data.data.pagination || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading maintenance requests');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, urgencyFilter, propertyFilter, categoryFilter, page]);

  // Fetch summary metrics (specifically for the top row cards)
  const fetchMetrics = useCallback(async () => {
    try {
      // Fetch all requests without pagination to calculate metrics
      const res = await fetch('/api/maintenance?limit=1000');
      const data = await res.json();
      if (res.ok && data.success) {
        const list: MaintenanceRequestRow[] = data.data.requests || [];
        const open = list.filter((r) => r.status === 'open').length;
        const urgent = list.filter((r) => r.status === 'open' && r.urgency === 'urgent').length;
        const inProgress = list.filter((r) => r.status === 'in_progress').length;

        setMetrics({
          openCount: open,
          urgentCount: urgent,
          inProgressCount: inProgress,
        });
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchRequests();
  }, [fetchRequests, authLoading, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchMetrics();
  }, [fetchMetrics, authLoading, user]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, urgencyFilter, propertyFilter, categoryFilter]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!user || (user.role !== 'landlord' && user.role !== 'super_admin')) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl animate-pulse" />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Maintenance Overview
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage and resolve maintenance requests across your properties.
            </p>
          </div>
          <div className="flex gap-2 text-xs font-mono">
            <Link href="/dashboard" className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Open Requests */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-550 uppercase font-semibold tracking-wider">Total Open</span>
              <p className="text-3xl font-black text-slate-100">{metrics.openCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
          </div>

          {/* Urgent Requests */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-550 uppercase font-semibold tracking-wider">Urgent & Open</span>
              <p className={`text-3xl font-black ${metrics.urgentCount > 0 ? 'text-red-400 animate-pulse' : 'text-slate-100'}`}>
                {metrics.urgentCount}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${metrics.urgentCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-800/60 text-slate-500'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" />
              </svg>
            </div>
          </div>

          {/* In Progress Requests */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-550 uppercase font-semibold tracking-wider">In Progress</span>
              <p className="text-3xl font-black text-slate-100">{metrics.inProgressCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-450">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A1.5 1.5 0 1 0 19.38 18.87l-5.83-5.83m-1.02-1.02-5.83-5.83A1.5 1.5 0 0 0 4.62 8.38l5.83 5.83m0 0a3 3 0 1 1-4.24-4.24m4.24 4.24a3 3 0 1 0 4.24-4.24" />
              </svg>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Property Filter */}
          <div className="space-y-1">
            <label className="text-xs text-slate-550 font-semibold uppercase">Filter by Property</label>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="">All Properties</option>
              {properties.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-xs text-slate-550 font-semibold uppercase">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Urgency Filter */}
          <div className="space-y-1">
            <label className="text-xs text-slate-550 font-semibold uppercase">Filter by Urgency</label>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="">All Urgency Levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-xs text-slate-550 font-semibold uppercase">Filter by Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="plumbing">🔧 Plumbing</option>
              <option value="electrical">⚡ Electrical</option>
              <option value="hvac">❄️ HVAC</option>
              <option value="structural">🏗️ Structural</option>
              <option value="appliance">🍳 Appliance</option>
              <option value="other">📋 Other</option>
            </select>
          </div>
        </div>

        {/* Table Card */}
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          {error && (
            <div className="p-6 text-center text-red-400 text-sm">{error}</div>
          )}

          {!error && isLoading && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/20 text-slate-400 font-semibold text-left">
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Unit / Property</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Tenant</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Urgency</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-4 text-right text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <tr key={n} className="animate-pulse">
                      <td className="px-6 py-4 space-y-2">
                        <div className="h-4 w-20 bg-slate-800/60 rounded" />
                        <div className="h-3.5 w-32 bg-slate-900 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-28 bg-slate-800/60 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-5 w-20 bg-slate-800/60 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-40 bg-slate-800/60 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-16 bg-slate-800/60 rounded-full" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 w-20 bg-slate-800/60 rounded-full" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-slate-800/60 rounded" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-block h-8 w-16 bg-slate-800/60 rounded-lg" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!error && !isLoading && requests.length === 0 && (
            <div className="py-20 flex flex-col items-center gap-4 text-center px-4 animate-[fadeIn_0.3s_ease-out]">
              <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-center text-slate-500">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-350 font-semibold text-lg">No maintenance requests. All quiet!</p>
                <p className="text-slate-500 text-sm mt-1 max-w-sm">No maintenance requests match your current filters.</p>
              </div>
            </div>
          )}

          {!error && !isLoading && requests.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/20 text-slate-400 font-semibold text-left">
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Unit / Property</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Tenant</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Urgency</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-4 text-right text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {requests.map((req) => {
                    const isUrgentOpen = req.status === 'open' && req.urgency === 'urgent';
                    return (
                      <tr
                        key={req._id}
                        onClick={() => router.push(`/maintenance/${req._id}`)}
                        className={`group hover:bg-slate-800/25 cursor-pointer transition-colors ${
                          isUrgentOpen ? 'border-l-4 border-red-500 bg-red-500/5 hover:bg-red-500/10' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-200">Unit {req.unitId?.unitNumber}</p>
                          <p className="text-xs text-slate-555 mt-0.5">{req.propertyId?.name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-300">{req.tenantId?.name || '—'}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <CategoryIcon category={req.category} />
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate">
                          <p className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                            {req.title}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <UrgencyBadge urgency={req.urgency} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <MaintenanceStatusBadge status={req.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                          {new Date(req.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/maintenance/${req._id}`}
                            className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700/60 hover:border-slate-600 text-slate-200 text-xs font-semibold transition-all"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-slate-555 text-sm">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-medium border border-slate-700/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
                disabled={page >= pagination.pages}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-sm font-medium border border-slate-700/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

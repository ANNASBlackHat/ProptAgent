'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import ApplicationStatusBadge from '@/components/ApplicationStatusBadge';
import { ApplicationStatus } from '@/models/Application';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ApplicationRow {
  _id: string;
  tenantInfo: { name: string; email: string; moveInDate?: string };
  unitId?: { _id: string; unitNumber: string; type: string; rentAmount: number };
  propertyId?: { _id: string; name: string; address: { city: string } };
  status: ApplicationStatus;
  aiScore?: { overall: number | null };
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PropertyOption {
  _id: string;
  name: string;
}

const TABS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Shortlisted', value: 'shortlisted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Declined', value: 'declined' },
];

// ─── AI Score Chip ─────────────────────────────────────────────────────────────

function AIScoreChip({ score }: { score?: number | null }) {
  if (score === undefined || score === null) {
    return <span className="text-slate-600 text-xs font-medium">—</span>;
  }
  const color =
    score >= 7 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' :
    score >= 4 ? 'text-amber-400 bg-amber-500/10 border-amber-500/25' :
                 'text-red-400 bg-red-500/10 border-red-500/25';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      ★ {score}/10
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [page, setPage] = useState(1);

  // ─── Fetch properties for filter ──────────────────────────────────────────

  useEffect(() => {
    fetch('/api/properties')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProperties(d.data?.properties || []);
      })
      .catch(console.error);
  }, []);

  // ─── Fetch applications ────────────────────────────────────────────────────

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (activeTab) params.set('status', activeTab);
      if (propertyFilter) params.set('propertyId', propertyFilter);
      if (sortBy) params.set('sortBy', sortBy);

      const res = await fetch(`/api/applications?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch');
      setApplications(data.data.applications || []);
      setPagination(data.data.pagination || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading applications');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, propertyFilter, sortBy, page]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  // Reset page on filter/sort change
  useEffect(() => { setPage(1); }, [activeTab, propertyFilter, sortBy]);

  // ─── Auth guard ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Applications</h1>
            <p className="text-slate-400 text-sm mt-1">
              {pagination ? `${pagination.total} total application${pagination.total !== 1 ? 's' : ''}` : 'Loading…'}
            </p>
          </div>

          {/* Filters and Sorting */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              id="property-filter"
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">All Properties</option>
              {properties.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>

            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="createdAt_desc">Newest First</option>
              <option value="score_desc">AI Score: High to Low</option>
              <option value="score_asc">AI Score: Low to High</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              id={`tab-${tab.value || 'all'}`}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                activeTab === tab.value
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          {isLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Applicant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Property / Unit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Move-in</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <tr key={n} className="animate-pulse">
                      <td className="px-4 py-4 space-y-2">
                        <div className="h-4 w-28 bg-slate-800/60 rounded" />
                        <div className="h-3.5 w-40 bg-slate-900 rounded" />
                      </td>
                      <td className="px-4 py-4 space-y-2">
                        <div className="h-4 w-36 bg-slate-800/60 rounded" />
                        <div className="h-3.5 w-48 bg-slate-900 rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-16 bg-slate-800/60 rounded" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-6 w-16 bg-slate-800/60 rounded-full" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-6 w-20 bg-slate-800/60 rounded-full" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-3.5 w-16 bg-slate-800/60 rounded" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : applications.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-4 text-center px-4 animate-[fadeIn_0.3s_ease-out]">
              <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-center text-slate-500">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-300 font-semibold text-base">No applications yet</p>
                <p className="text-slate-500 text-sm mt-1 max-w-sm">Share your unit link to start receiving applications.</p>
              </div>
              <Link
                href="/properties"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/60 hover:border-slate-600 transition-all duration-150 active:scale-95 flex items-center gap-1"
              >
                Go to Properties <span className="text-slate-400">→</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Applicant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Property / Unit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Move-in</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {applications.map((app) => (
                    <tr
                      key={app._id}
                      onClick={() => router.push(`/applications/${app._id}`)}
                      className="group hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-200 group-hover:text-white transition-colors">
                          {app.tenantInfo?.name || '—'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{app.tenantInfo?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {app.propertyId ? (
                          <>
                            <p className="text-slate-300 font-medium">{app.propertyId.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Unit {app.unitId?.unitNumber} · {app.unitId?.type?.toUpperCase()} · ${app.unitId?.rentAmount?.toLocaleString()}/mo
                            </p>
                          </>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-sm">
                        {app.tenantInfo?.moveInDate
                          ? new Date(app.tenantInfo.moveInDate).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <AIScoreChip score={app.aiScore?.overall} />
                      </td>
                      <td className="px-4 py-3">
                        <ApplicationStatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Quick link */}
        <div className="pt-2">
          <Link
            href="/properties"
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            ← Back to Properties
          </Link>
        </div>
      </div>
    </main>
  );
}

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import LeaseStatusBadge from '@/components/LeaseStatusBadge';
import { LeaseStatus } from '@/models/Lease';

interface LeaseRow {
  _id: string;
  tenantId?: { _id: string; name: string; email: string };
  propertyId?: { _id: string; name: string; address: { city: string } };
  unitId?: { _id: string; unitNumber: string; type: string; rentAmount: number };
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: LeaseStatus;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const TABS: { label: string; value: LeaseStatus | '' }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Expiring Soon', value: 'expiring_soon' },
  { label: 'Expired', value: 'expired' },
  { label: 'Terminated', value: 'terminated' },
];

export default function LeasesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [leases, setLeases] = useState<LeaseRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<LeaseStatus | ''>('active');
  const [page, setPage] = useState(1);

  // Fetch leases
  const fetchLeases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (activeTab) params.set('status', activeTab);

      const res = await fetch(`/api/leases?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to fetch');
      setLeases(data.data.leases || []);
      setPagination(data.data.pagination || null);
    } catch (err: any) {
      setError(err.message || 'Error loading leases');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchLeases();
  }, [fetchLeases]);

  // Reset page on tab change
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  // Auth guard
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Lease Agreements
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {pagination ? `${pagination.total} total lease${pagination.total !== 1 ? 's' : ''}` : 'Loading…'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/leases/new"
              id="new-lease-btn"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Lease
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800/80 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              id={`tab-${tab.value}`}
              onClick={() => setActiveTab(tab.value)}
              className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
                activeTab === tab.value
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
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

        {/* Table Container */}
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
            </div>
          ) : leases.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center text-slate-500 mb-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <p className="text-slate-400 font-medium">No leases found</p>
              <p className="text-slate-500 text-xs max-w-xs">
                There are no {activeTab ? activeTab.replace('_', ' ') : ''} leases in this status.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/20 text-slate-400 font-semibold text-left">
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Tenant</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Property / Unit</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Rent</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Lease Dates</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {leases.map((lease) => (
                    <tr
                      key={lease._id}
                      onClick={() => router.push(`/leases/${lease._id}`)}
                      className="group hover:bg-slate-800/20 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-200 group-hover:text-white transition-colors">
                          {lease.tenantId?.name || '—'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{lease.tenantId?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        {lease.propertyId ? (
                          <>
                            <p className="text-slate-300 font-medium">{lease.propertyId.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Unit {lease.unitId?.unitNumber} · {lease.unitId?.type?.toUpperCase()}
                            </p>
                          </>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-emerald-400">${lease.monthlyRent.toLocaleString()}</p>
                        <p className="text-slate-500 text-xs mt-0.5">/month</p>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        <div className="text-sm">
                          {new Date(lease.startDate).toLocaleDateString()} – {new Date(lease.endDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {Math.max(0, Math.ceil((new Date(lease.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days left
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <LeaseStatusBadge status={lease.status} />
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/leases/${lease._id}`}
                          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700/60 hover:border-slate-600 text-slate-200 text-xs font-semibold transition-all"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-sm">
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

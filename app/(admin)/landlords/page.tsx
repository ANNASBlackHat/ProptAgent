'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface Landlord {
  _id: string;
  name: string;
  email: string;
  companyName?: string;
  isActive: boolean;
  propertyCount: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        isActive
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
          : 'bg-red-500/15 text-red-400 border border-red-500/25'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

interface ConfirmDialogProps {
  landlord: Landlord;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function ConfirmDialog({ landlord, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${landlord.isActive ? 'bg-red-500/15' : 'bg-emerald-500/15'}`}>
          <span className="text-2xl">{landlord.isActive ? '⛔' : '✅'}</span>
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-2">
          {landlord.isActive ? `Deactivate ${landlord.name}?` : `Activate ${landlord.name}?`}
        </h3>
        {landlord.isActive ? (
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Deactivating <strong className="text-slate-200">{landlord.name}</strong> will make
            their tenant portal unavailable. Tenants trying to access their properties will see a{' '}
            <span className="text-red-400 font-mono text-xs font-bold">503</span> page. You can
            re-activate at any time.
          </p>
        ) : (
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Activating <strong className="text-slate-200">{landlord.name}</strong> will restore
            access to their tenant portal and all property pages.
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
              landlord.isActive
                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/25'
                : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/25'
            }`}
          >
            {loading ? 'Updating…' : landlord.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLandlordsPage() {
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);
  const [toggleTarget, setToggleTarget] = useState<Landlord | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchLandlords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(filterActive !== '' ? { isActive: filterActive } : {}),
      });
      const res = await fetch(`/api/admin/landlords?${params}`);
      const data = await res.json();
      if (data.success) {
        setLandlords(data.data.landlords);
        setPagination(data.data.pagination);
      } else {
        setError(data.error || 'Failed to load landlords');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterActive]);

  useEffect(() => {
    fetchLandlords();
  }, [fetchLandlords]);

  const handleToggle = async () => {
    if (!toggleTarget) return;
    setToggleLoading(true);
    try {
      const res = await fetch(`/api/admin/landlords/${toggleTarget._id}/toggle`, {
        method: 'PATCH',
      });
      const data = await res.json();
      if (data.success) {
        setLandlords((prev) =>
          prev.map((l) =>
            l._id === toggleTarget._id ? { ...l, isActive: data.data.isActive } : l
          )
        );
        setToast(
          data.data.isActive
            ? `${toggleTarget.name} activated`
            : `${toggleTarget.name} deactivated`
        );
        setTimeout(() => setToast(''), 3500);
      } else {
        setError(data.error || 'Failed to toggle status');
      }
    } catch {
      setError('Network error');
    } finally {
      setToggleLoading(false);
      setToggleTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative">
      <div className="pointer-events-none fixed top-0 right-0 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 p-6 md:p-8 lg:p-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-6 rounded-full bg-gradient-to-b from-purple-400 to-indigo-500" />
            <h1 className="text-2xl font-black text-slate-100">Landlords</h1>
          </div>
          <p className="text-slate-500 text-sm ml-3">
            {pagination ? `${pagination.total} total landlords` : 'Manage all landlord accounts'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
            >
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              id="landlord-search"
              type="text"
              placeholder="Search by name, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
            />
          </div>
          <select
            id="landlord-filter-active"
            value={filterActive}
            onChange={(e) => {
              setFilterActive(e.target.value as '' | 'true' | 'false');
              setPage(1);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-300 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all cursor-pointer"
          >
            <option value="">All statuses</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/80">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Landlord
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                    Company
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Properties
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    Joined
                  </th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-800/40">
                      <td className="px-5 py-4">
                        <div className="space-y-1.5 animate-pulse">
                          <div className="h-4 w-32 bg-slate-800 rounded" />
                          <div className="h-3 w-44 bg-slate-800 rounded" />
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <div className="h-4 w-28 bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="h-4 w-8 bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-6 w-16 bg-slate-800 rounded-full animate-pulse" />
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <div className="h-4 w-24 bg-slate-800 rounded animate-pulse" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-8 w-20 bg-slate-800 rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : landlords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <p className="text-2xl mb-2">🏢</p>
                      <p className="text-slate-400 text-sm font-medium">No landlords found</p>
                      {debouncedSearch && (
                        <p className="text-slate-600 text-xs mt-1">
                          Try adjusting your search
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  landlords.map((landlord, idx) => (
                    <tr
                      key={landlord._id}
                      className={`border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors duration-100 ${
                        idx === landlords.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{landlord.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{landlord.email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className="text-sm text-slate-300">
                          {landlord.companyName || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-sm font-semibold text-slate-200 tabular-nums">
                          {landlord.propertyCount}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge isActive={landlord.isActive} />
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <span className="text-xs text-slate-500">
                          {new Date(landlord.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          id={`toggle-landlord-${landlord._id}`}
                          onClick={() => setToggleTarget(landlord)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                            landlord.isActive
                              ? 'text-red-400 border-red-500/20 bg-red-500/5 hover:bg-red-500/15'
                              : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15'
                          }`}
                        >
                          {landlord.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4">
            <p className="text-xs text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} results)
            </p>
            <div className="flex gap-2">
              <button
                id="landlord-prev-page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <button
                id="landlord-next-page"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      {toggleTarget && (
        <ConfirmDialog
          landlord={toggleTarget}
          onConfirm={handleToggle}
          onCancel={() => setToggleTarget(null)}
          loading={toggleLoading}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-semibold shadow-xl backdrop-blur-sm animate-in slide-in-from-bottom-2 duration-300">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

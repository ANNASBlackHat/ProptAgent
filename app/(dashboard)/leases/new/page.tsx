'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

interface ApplicationDetail {
  _id: string;
  tenantInfo: { name: string; email: string; phone: string };
  unitId?: { _id: string; unitNumber: string; rentAmount: number; depositAmount?: number };
  propertyId?: { _id: string; name: string };
}

function CreateLeaseFormInner() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryAppId = searchParams.get('applicationId');

  // List of approved applications if none specified in query
  const [approvedApps, setApprovedApps] = useState<ApplicationDetail[]>([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedApp, setSelectedApp] = useState<ApplicationDetail | null>(null);

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [specialTerms, setSpecialTerms] = useState('');

  const [isLoadingApp, setIsLoadingApp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default dates: start = today, end = 1 year from today
  useEffect(() => {
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    setStartDate(formattedToday);

    const nextYear = new Date();
    nextYear.setFullYear(today.getFullYear() + 1);
    nextYear.setDate(today.getDate() - 1); // standard lease ends 1 day before anniversary
    const formattedNextYear = nextYear.toISOString().split('T')[0];
    setEndDate(formattedNextYear);
  }, []);

  // Fetch approved applications if no query app ID
  useEffect(() => {
    if (!queryAppId) {
      fetch('/api/applications?status=approved&limit=50')
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setApprovedApps(d.data?.applications || []);
          }
        })
        .catch(console.error);
    }
  }, [queryAppId]);

  // Fetch single application if queryAppId or selectedAppId changes
  const appIdToFetch = queryAppId || selectedAppId;
  useEffect(() => {
    if (!appIdToFetch) {
      setSelectedApp(null);
      return;
    }

    setIsLoadingApp(true);
    setError(null);
    fetch(`/api/applications/${appIdToFetch}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          const app = d.data;
          setSelectedApp(app);
          // Pre-fill rent and deposit from unit details
          if (app.unitId) {
            setMonthlyRent(String(app.unitId.rentAmount));
            setDepositAmount(String(app.unitId.depositAmount || app.unitId.rentAmount));
          }
        } else {
          setError(d.error || 'Failed to fetch application details');
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to fetch application details');
      })
      .finally(() => {
        setIsLoadingApp(false);
      });
  }, [appIdToFetch]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalAppId = queryAppId || selectedAppId;
    if (!finalAppId) {
      setError('Please select an approved application');
      return;
    }

    if (!startDate || !endDate || !monthlyRent || !depositAmount) {
      setError('Please fill out all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: finalAppId,
          startDate,
          endDate,
          monthlyRent: Number(monthlyRent),
          depositAmount: Number(depositAmount),
          specialTerms,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create lease');
      }

      router.push(`/leases/${data.data._id}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the lease');
      setIsSubmitting(false);
    }
  };

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
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        {/* Back link */}
        <div>
          <Link href="/leases" className="text-sm text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1">
            ← Back to Leases
          </Link>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Create Lease Agreement
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Establish a new tenancy lease from an approved applicant.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Application Selection Header */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/85 backdrop-blur-xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-200">Applicant & Unit Info</h2>

            {queryAppId ? (
              // Read-only header from query param
              isLoadingApp ? (
                <div className="animate-pulse flex space-x-4 py-4">
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                  </div>
                </div>
              ) : selectedApp ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
                  <div>
                    <span className="text-slate-500 text-xs uppercase font-semibold">Tenant</span>
                    <p className="font-semibold text-slate-200 mt-1">{selectedApp.tenantInfo.name}</p>
                    <p className="text-xs text-slate-400">{selectedApp.tenantInfo.email} · {selectedApp.tenantInfo.phone}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs uppercase font-semibold">Property & Unit</span>
                    <p className="font-semibold text-slate-200 mt-1">{selectedApp.propertyId?.name}</p>
                    <p className="text-xs text-slate-400">Unit {selectedApp.unitId?.unitNumber}</p>
                  </div>
                </div>
              ) : (
                <p className="text-red-400 text-sm">Could not load application details.</p>
              )
            ) : (
              // Dropdown selection for Approved Applications
              <div className="space-y-2">
                <label htmlFor="application-select" className="block text-sm font-medium text-slate-400">
                  Select Approved Application
                </label>
                <select
                  id="application-select"
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">-- Choose an Approved Application --</option>
                  {approvedApps.map((app) => (
                    <option key={app._id} value={app._id}>
                      {app.tenantInfo.name} — {app.propertyId?.name || 'N/A'}, Unit {app.unitId?.unitNumber || 'N/A'}
                    </option>
                  ))}
                </select>
                {approvedApps.length === 0 && (
                  <p className="text-slate-500 text-xs">
                    No approved applications found. Ensure applications are marked as "Approved" in the Applications tab.
                  </p>
                )}

                {selectedApp && !isLoadingApp && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-950/40 p-4 rounded-xl border border-slate-800/50 mt-4">
                    <div>
                      <span className="text-slate-500 text-xs uppercase font-semibold">Tenant</span>
                      <p className="font-semibold text-slate-200 mt-1">{selectedApp.tenantInfo.name}</p>
                      <p className="text-xs text-slate-400">{selectedApp.tenantInfo.email} · {selectedApp.tenantInfo.phone}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs uppercase font-semibold">Property & Unit</span>
                      <p className="font-semibold text-slate-200 mt-1">{selectedApp.propertyId?.name}</p>
                      <p className="text-xs text-slate-400">Unit {selectedApp.unitId?.unitNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lease Parameters */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/85 backdrop-blur-xl shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-slate-200">Lease Terms</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Start Date */}
              <div className="space-y-2">
                <label htmlFor="start-date" className="block text-sm font-medium text-slate-400">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label htmlFor="end-date" className="block text-sm font-medium text-slate-400">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Monthly Rent */}
              <div className="space-y-2">
                <label htmlFor="monthly-rent" className="block text-sm font-medium text-slate-400">
                  Monthly Rent ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="monthly-rent"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  required
                  min="0"
                  placeholder="e.g. 1500"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Security Deposit */}
              <div className="space-y-2">
                <label htmlFor="deposit-amount" className="block text-sm font-medium text-slate-400">
                  Security Deposit ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="deposit-amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  required
                  min="0"
                  placeholder="e.g. 1500"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            {/* Special Terms */}
            <div className="space-y-2">
              <label htmlFor="special-terms" className="block text-sm font-medium text-slate-400">
                Special Terms (Optional)
              </label>
              <textarea
                id="special-terms"
                value={specialTerms}
                onChange={(e) => setSpecialTerms(e.target.value)}
                rows={4}
                placeholder="Specify any custom rules, pet agreements, utility arrangements, etc."
                className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href="/leases"
              className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-800 hover:text-white transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              id="submit-lease-btn"
              disabled={isSubmitting || isLoadingApp || (!queryAppId && !selectedAppId)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? 'Creating Lease...' : 'Create & Send Lease'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function CreateLeasePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
      </div>
    }>
      <CreateLeaseFormInner />
    </Suspense>
  );
}

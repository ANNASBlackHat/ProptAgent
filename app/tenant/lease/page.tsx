'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LeaseStatusBadge from '@/components/LeaseStatusBadge';
import TenantNav from '@/components/TenantNav';
import { LeaseStatus } from '@/models/Lease';

interface TenantLease {
  _id: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  specialTerms?: string;
  status: LeaseStatus;
  documents: { filename: string; path: string; uploadedAt: string }[];
  paymentLog: {
    paidDate: string;
    amount: number;
    method: string;
    notes?: string;
  }[];
  landlordId: { name: string; email: string; phone?: string; companyName?: string; logo?: string };
  propertyId: { name: string; address: { street: string; city: string; state: string; zip: string }; description?: string; photos: string[] };
  unitId: { unitNumber: string; type: string; sizeSqft?: number };
}

export default function TenantLeasePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [lease, setLease] = useState<TenantLease | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Tenant Lease
  const fetchTenantLease = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tenant/lease');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch lease details');
      }
      setLease(data.data);
    } catch (err: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setError(err.message || 'Failed to load lease');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantLease();
  }, []);

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'tenant')) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Calculate Financial Summary
  const getFinancialSummary = () => {
    if (!lease) return { totalPaid: 0, expectedRent: 0, balance: 0, monthsElapsed: 0 };

    const totalPaid = lease.paymentLog.reduce((sum, entry) => sum + entry.amount, 0);

    const start = new Date(lease.startDate);
    const now = new Date();
    let monthsElapsed = 0;

    if (now >= start && lease.status !== 'terminated') {
      const yearsDiff = now.getFullYear() - start.getFullYear();
      const monthsDiff = now.getMonth() - start.getMonth();
      monthsElapsed = yearsDiff * 12 + monthsDiff + 1;

      if (now.getDate() < start.getDate()) {
        monthsElapsed--;
      }

      if (monthsElapsed < 1) monthsElapsed = 1;
    }

    const expectedRent = monthsElapsed * lease.monthlyRent;
    const balance = totalPaid - expectedRent;

    return { totalPaid, expectedRent, balance, monthsElapsed };
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'tenant') {
    return null;
  }

  const financial = getFinancialSummary();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-600/8 rounded-full blur-3xl pointer-events-none" />

      <TenantNav />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full relative z-10 space-y-6">
        {/* Back Link */}
        <div>
          <Link href="/tenant" className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1">
            ← Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!lease ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl space-y-4 text-center max-w-xl mx-auto py-16">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-250">No Active Lease</h1>
            <p className="text-slate-400 text-sm">
              We couldn&apos;t find an active lease agreement linked to your account. Please contact your landlord to register your lease.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">
                  My Lease Agreement
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  {lease.propertyId.name}, Unit {lease.unitId.unitNumber}
                </p>
              </div>
              <div>
                <LeaseStatusBadge status={lease.status} />
              </div>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left columns: Terms and Payments */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Section A: Lease Terms */}
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-4">
                  <h2 className="text-lg font-bold text-slate-200">Lease Terms</h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
                    <div>
                      <span className="text-slate-500 text-xs uppercase font-semibold">Start Date</span>
                      <p className="font-semibold text-slate-200 mt-0.5">{new Date(lease.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs uppercase font-semibold">End Date</span>
                      <p className="font-semibold text-slate-200 mt-0.5">{new Date(lease.endDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs uppercase font-semibold">Monthly Rent</span>
                      <p className="font-semibold text-emerald-400 mt-0.5">${lease.monthlyRent.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs uppercase font-semibold">Security Deposit</span>
                      <p className="font-semibold text-slate-200 mt-0.5">${lease.depositAmount.toLocaleString()}</p>
                    </div>
                  </div>

                  {lease.specialTerms && (
                    <div className="space-y-1.5">
                      <span className="text-slate-500 text-xs uppercase font-semibold block">Special Terms</span>
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/50 text-slate-300 text-sm whitespace-pre-line leading-relaxed italic">
                        {lease.specialTerms}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section B: Rent Payment History */}
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-4">
                  <h2 className="text-lg font-bold text-slate-200">Payment History</h2>

                  {lease.paymentLog.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-6">No payments have been logged yet.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-800/60 overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                            <th className="px-4 py-3">Payment Date</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Method</th>
                            <th className="px-4 py-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {lease.paymentLog.map((pay, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/10">
                              <td className="px-4 py-3 text-slate-300">
                                {new Date(pay.paidDate).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 font-semibold text-emerald-400">
                                ${pay.amount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-slate-450 capitalize">
                                {pay.method.replace('_', ' ')}
                              </td>
                              <td className="px-4 py-3 text-slate-450">
                                {pay.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              {/* Right column: Landlord contact & Financials */}
              <div className="space-y-6">
                
                {/* Section C: Landlord Contact Card */}
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-4">
                  <h2 className="text-lg font-bold text-slate-200">Landlord Contact</h2>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400">
                        {lease.landlordId.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">{lease.landlordId.name}</p>
                        <p className="text-xs text-slate-550">{lease.landlordId.companyName || 'Property Manager'}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/60 pt-3 space-y-2 text-sm text-slate-300">
                      <p className="flex justify-between">
                        <span className="text-slate-550">Email:</span>
                        <span>{lease.landlordId.email}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-550">Phone:</span>
                        <span>{lease.landlordId.phone || 'N/A'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section D: Ledger Balance */}
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-4">
                  <h2 className="text-lg font-bold text-slate-200">My Ledger Summary</h2>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Expected Rent:</span>
                      <span className="font-semibold text-slate-200">${financial.expectedRent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Total Paid:</span>
                      <span className="font-semibold text-emerald-400">${financial.totalPaid.toLocaleString()}</span>
                    </div>

                    <div className="border-t border-slate-800/60 pt-3 flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-300">My Balance:</span>
                      <span className={`text-base font-extrabold ${financial.balance >= 0 ? 'text-emerald-400' : 'text-red-400 animate-pulse'}`}>
                        {financial.balance >= 0 ? `+$${financial.balance.toLocaleString()}` : `-$${Math.abs(financial.balance).toLocaleString()}`}
                      </span>
                    </div>

                    {financial.balance < 0 ? (
                      <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-[11px] text-red-400 leading-normal">
                        ⚠️ You have an outstanding balance of ${Math.abs(financial.balance).toLocaleString()}. Please submit your rent payment to the landlord.
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[11px] text-emerald-400 leading-normal">
                        ✓ Your account is fully up-to-date! Thank you.
                      </div>
                    )}
                  </div>
                </div>

                {/* Section E: Signed Documents */}
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-4">
                  <h2 className="text-lg font-bold text-slate-200">Signed Documents</h2>

                  {lease.documents.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-2">No documents available.</p>
                  ) : (
                    <div className="space-y-2">
                      {lease.documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-slate-800/50 text-xs">
                          <div className="flex items-center gap-2 max-w-[80%]">
                            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            <span className="truncate text-slate-300 font-medium" title={doc.filename}>{doc.filename}</span>
                          </div>
                          <a
                            href={doc.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-350 transition-colors"
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}
      </main>

    </div>
  );
}

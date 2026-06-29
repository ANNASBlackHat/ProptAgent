'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import LeaseStatusBadge from '@/components/LeaseStatusBadge';
import { LeaseStatus, PaymentMethod } from '@/models/Lease';

interface LeaseDetail {
  _id: string;
  applicationId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  specialTerms?: string;
  status: LeaseStatus;
  terminationReason?: string;
  terminatedAt?: string;
  documents: { filename: string; path: string; uploadedAt: string }[];
  paymentLog: {
    paidDate: string;
    amount: number;
    method: PaymentMethod;
    notes?: string;
    loggedAt: string;
    loggedBy?: { name: string; email: string };
  }[];
  tenantId: { _id: string; name: string; email: string; phone?: string };
  propertyId: { _id: string; name: string; address: { street: string; city: string; state: string; zip: string } };
  unitId: { _id: string; unitNumber: string; type: string };
}

export default function LeaseDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [lease, setLease] = useState<LeaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [activeModal, setActiveModal] = useState<'edit' | 'renew' | 'payment' | 'terminate' | null>(null);

  // Form Inputs
  const [editSpecialTerms, setEditSpecialTerms] = useState('');
  const [renewEndDate, setRenewEndDate] = useState('');
  const [renewRent, setRenewRent] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('bank_transfer');
  const [payNotes, setPayNotes] = useState('');
  const [termReason, setTermReason] = useState('');

  // Document Upload State
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Submitting States
  const [submitting, setSubmitting] = useState(false);

  // Fetch Lease Details
  const fetchLease = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leases/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch lease');
      }
      setLease(data.data);
      // Initialize form values
      if (data.data) {
        setEditSpecialTerms(data.data.specialTerms || '');
        setRenewEndDate(data.data.endDate.split('T')[0]);
        setRenewRent(String(data.data.monthlyRent));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load lease');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLease();
  }, [fetchLease]);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  // Calculate Financial Summary
  const getFinancialSummary = () => {
    if (!lease) return { totalPaid: 0, expectedRent: 0, balance: 0, monthsElapsed: 0 };

    const totalPaid = lease.paymentLog.reduce((sum, entry) => sum + entry.amount, 0);

    const start = new Date(lease.startDate);
    const now = new Date();
    let monthsElapsed = 0;

    if (now >= start && lease.status !== 'terminated') {
      // Standard billing cycles (rent is paid in advance)
      const yearsDiff = now.getFullYear() - start.getFullYear();
      const monthsDiff = now.getMonth() - start.getMonth();
      monthsElapsed = yearsDiff * 12 + monthsDiff + 1;

      // If today is before the day of the month the lease started, that cycle hasn't billed yet
      if (now.getDate() < start.getDate()) {
        monthsElapsed--;
      }

      if (monthsElapsed < 1) monthsElapsed = 1;
    } else if (lease.status === 'terminated' && lease.terminatedAt) {
      // If terminated, expected rent is calculated up to the termination date
      const end = new Date(lease.terminatedAt);
      if (end >= start) {
        const yearsDiff = end.getFullYear() - start.getFullYear();
        const monthsDiff = end.getMonth() - start.getMonth();
        monthsElapsed = yearsDiff * 12 + monthsDiff + 1;
        if (end.getDate() < start.getDate()) {
          monthsElapsed--;
        }
        if (monthsElapsed < 1) monthsElapsed = 1;
      }
    }

    const expectedRent = monthsElapsed * lease.monthlyRent;
    const balance = totalPaid - expectedRent;

    return { totalPaid, expectedRent, balance, monthsElapsed };
  };

  // Handle Edit Special Terms
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialTerms: editSpecialTerms }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update');
      setLease(data.data);
      setActiveModal(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating lease');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Renew Lease
  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endDate: renewEndDate,
          monthlyRent: Number(renewRent),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to renew');
      setLease(data.data);
      setActiveModal(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error renewing lease');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Log Payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payDate || !payAmount) {
      alert('Please fill out all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leases/${id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidDate: payDate,
          amount: Number(payAmount),
          method: payMethod,
          notes: payNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to log payment');
      
      // Refresh lease details to show updated payment log
      await fetchLease();
      setActiveModal(null);
      // Reset payment form
      setPayDate('');
      setPayAmount('');
      setPayMethod('bank_transfer');
      setPayNotes('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error logging payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Terminate Lease
  const handleTerminateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termReason.trim()) {
      alert('Please provide a reason for early termination');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leases/${id}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: termReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to terminate');
      
      await fetchLease();
      setActiveModal(null);
      setTermReason('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error terminating lease');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Document Upload
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be under 10MB.');
      return;
    }

    setUploadError(null);
    setUploadingDoc(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/leases/${id}/documents`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Upload failed');

      // Refresh lease details
      await fetchLease();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Error uploading document');
    } finally {
      setUploadingDoc(false);
      // Clear file input
      e.target.value = '';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !lease) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16 flex flex-col items-center justify-center gap-4">
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error || 'Lease not found.'}
        </div>
        <Link href="/leases" className="text-slate-400 hover:text-slate-200 text-sm underline">
          Back to Leases
        </Link>
      </div>
    );
  }

  const financial = getFinancialSummary();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Breadcrumb */}
        <div>
          <Link href="/leases" className="text-sm text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1">
            ← Back to Leases
          </Link>
        </div>

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">
                Lease Details
              </h1>
              <LeaseStatusBadge status={lease.status} />
            </div>
            <p className="text-slate-400 text-sm">
              {lease.propertyId?.name}, Unit {lease.unitId?.unitNumber} · ID: {lease._id}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {lease.status !== 'terminated' && (
              <>
                <button
                  type="button"
                  id="renew-lease-btn"
                  onClick={() => {
                    setRenewEndDate(lease.endDate.split('T')[0]);
                    setRenewRent(String(lease.monthlyRent));
                    setActiveModal('renew');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold transition-all"
                >
                  Renew Lease
                </button>
                <button
                  type="button"
                  id="log-payment-btn"
                  onClick={() => {
                    setPayDate(new Date().toISOString().split('T')[0]);
                    setPayAmount(String(lease.monthlyRent));
                    setActiveModal('payment');
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Log Payment
                </button>
              </>
            )}
          </div>
        </div>

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Lease details & Payments */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Section A: Lease Summary */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/85 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-200">Lease Summary</h2>
                {lease.status !== 'terminated' && (
                  <button
                    onClick={() => setActiveModal('edit')}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-350 transition-colors"
                  >
                    Edit Terms
                  </button>
                )}
              </div>

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

              {lease.status === 'terminated' && (
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-sm space-y-1.5">
                  <p className="text-red-400 font-bold">Lease Terminated Early</p>
                  <p className="text-slate-400"><span className="font-medium text-slate-300">Date:</span> {lease.terminatedAt ? new Date(lease.terminatedAt).toLocaleDateString() : 'N/A'}</p>
                  <p className="text-slate-400"><span className="font-medium text-slate-300">Reason:</span> {lease.terminationReason}</p>
                </div>
              )}
            </div>

            {/* Section D: Payment Log */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/85 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-200">Payment Log</h2>
                {lease.status !== 'terminated' && (
                  <button
                    onClick={() => {
                      setPayDate(new Date().toISOString().split('T')[0]);
                      setPayAmount(String(lease.monthlyRent));
                      setActiveModal('payment');
                    }}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-350 transition-colors"
                  >
                    + Log Payment
                  </button>
                )}
              </div>

              {lease.paymentLog.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  No payments logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800/60 overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                        <th className="px-4 py-3">Paid Date</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Notes</th>
                        <th className="px-4 py-3">Logged By</th>
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
                          <td className="px-4 py-3 text-slate-400 capitalize">
                            {pay.method.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                            {pay.notes || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {pay.loggedBy?.name || 'Landlord'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Column 3: Tenant card, financial ledger & documents */}
          <div className="space-y-6">
            
            {/* Section B: Tenant Info Card */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/85 backdrop-blur-xl shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-slate-200">Tenant Profile</h2>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400">
                    {lease.tenantId.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-200">{lease.tenantId.name}</p>
                    <p className="text-xs text-slate-500">Active Tenant</p>
                  </div>
                </div>

                <div className="border-t border-slate-800/60 pt-3 space-y-2 text-sm text-slate-300">
                  <p className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span>{lease.tenantId.email}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span>{lease.tenantId.phone || 'N/A'}</span>
                  </p>
                </div>

                <div className="border-t border-slate-800/60 pt-3">
                  <Link
                    href={`/applications/${lease.applicationId}`}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-350 transition-colors inline-flex items-center"
                  >
                    View Original Application →
                  </Link>
                </div>
              </div>
            </div>

            {/* Section E: Financial Calculator Ledger */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/85 backdrop-blur-xl shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-slate-200">Financial Summary</h2>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Months Elapsed:</span>
                  <span className="font-semibold text-slate-200">{financial.monthsElapsed} billing cycles</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Expected Rent:</span>
                  <span className="font-semibold text-slate-200">${financial.expectedRent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Rent Paid:</span>
                  <span className="font-semibold text-emerald-400">${financial.totalPaid.toLocaleString()}</span>
                </div>

                <div className="border-t border-slate-800/60 pt-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-300">Ledger Balance:</span>
                  <span className={`text-base font-extrabold ${financial.balance >= 0 ? 'text-emerald-400' : 'text-red-400 animate-pulse'}`}>
                    {financial.balance >= 0 ? `+$${financial.balance.toLocaleString()}` : `-$${Math.abs(financial.balance).toLocaleString()}`}
                  </span>
                </div>

                {financial.balance < 0 && (
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-[11px] text-red-400 leading-normal">
                    ⚠️ Tenant has an outstanding balance of ${Math.abs(financial.balance).toLocaleString()}.
                  </div>
                )}
              </div>
            </div>

            {/* Section C: Documents Section */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/85 backdrop-blur-xl shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-slate-200">Signed Documents</h2>

              {/* PDF Uploader */}
              {lease.status !== 'terminated' && (
                <div className="space-y-2">
                  <div className="relative border border-dashed border-slate-700 hover:border-slate-500 rounded-xl p-4 text-center transition-colors">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleDocUpload}
                      disabled={uploadingDoc}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <div className="space-y-1">
                      <svg className="w-8 h-8 text-slate-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                      </svg>
                      <p className="text-xs text-slate-400 font-semibold">
                        {uploadingDoc ? 'Uploading...' : 'Upload Signed Lease (PDF)'}
                      </p>
                      <p className="text-[10px] text-slate-500">Max size: 10MB</p>
                    </div>
                  </div>
                  {uploadError && <p className="text-[11px] text-red-400">{uploadError}</p>}
                </div>
              )}

              {/* Documents List */}
              {lease.documents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">No documents uploaded yet.</p>
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

            {/* Section F: Danger Zone (Terminate) */}
            {lease.status !== 'terminated' && (
              <div className="p-6 rounded-2xl bg-red-950/10 border border-red-900/20 shadow-xl space-y-4">
                <h2 className="text-base font-bold text-red-400">Danger Zone</h2>
                <p className="text-xs text-slate-400 leading-normal">
                  Terminating the lease early will immediately update the status to &quot;Terminated&quot; and make the rental unit available for new applicants. This action is permanent.
                </p>
                <button
                  type="button"
                  id="terminate-lease-btn"
                  onClick={() => {
                    setTermReason('');
                    setActiveModal('terminate');
                  }}
                  className="w-full py-2 rounded-xl bg-red-900/30 hover:bg-red-900/40 border border-red-800/40 text-red-200 text-xs font-bold transition-all"
                >
                  Terminate Lease Early
                </button>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* ─── MODALS ────────────────────────────────────────────────────────── */}

      {/* Modal 1: Edit Special Terms */}
      {activeModal === 'edit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-100">Edit Special Terms</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="edit-special-terms" className="block text-sm font-medium text-slate-400">
                  Special Terms
                </label>
                <textarea
                  id="edit-special-terms"
                  value={editSpecialTerms}
                  onChange={(e) => setEditSpecialTerms(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
                  placeholder="Enter any updated terms or rules..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-edit-btn"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Renew Lease */}
      {activeModal === 'renew' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-100">Renew Lease Agreement</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <form onSubmit={handleRenewSubmit} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Extend the lease end date. If the lease was expiring soon or expired, it will automatically reset to &quot;Active&quot;.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="renew-end-date" className="block text-sm font-medium text-slate-400">
                    New End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="renew-end-date"
                    value={renewEndDate}
                    onChange={(e) => setRenewEndDate(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="renew-rent" className="block text-sm font-medium text-slate-400">
                    New Monthly Rent ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="renew-rent"
                    value={renewRent}
                    onChange={(e) => setRenewRent(e.target.value)}
                    required
                    min="0"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-renewal-btn"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all"
                >
                  {submitting ? 'Renewing...' : 'Renew Lease'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Log Payment */}
      {activeModal === 'payment' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-100">Log Rent Payment</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="pay-date" className="block text-sm font-medium text-slate-400">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="pay-date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="pay-amount" className="block text-sm font-medium text-slate-400">
                      Amount ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="pay-amount"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      required
                      min="0"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="pay-method" className="block text-sm font-medium text-slate-400">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="pay-method"
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="online">Online Payment</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="pay-notes" className="block text-sm font-medium text-slate-400">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    id="pay-notes"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="e.g. Rent payment for June 2026"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-payment-btn"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all"
                >
                  {submitting ? 'Logging...' : 'Log Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Terminate Lease */}
      {activeModal === 'terminate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-red-400">Terminate Lease Early</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <form onSubmit={handleTerminateSubmit} className="space-y-4">
              <p className="text-xs text-slate-450 leading-relaxed">
                Are you sure you want to terminate this lease? This will release the tenant and mark the unit as &quot;Available&quot;. This action is irreversible.
              </p>
              <div className="space-y-2">
                <label htmlFor="terminate-reason" className="block text-sm font-medium text-slate-450">
                  Reason for Early Termination <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="terminate-reason"
                  value={termReason}
                  onChange={(e) => setTermReason(e.target.value)}
                  required
                  rows={4}
                  placeholder="Explain the reason for early termination (e.g. mutual agreement, lease break, eviction)"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-y"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-terminate-btn"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-505 text-white text-sm font-semibold transition-all"
                >
                  {submitting ? 'Terminating...' : 'Terminate Lease'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}

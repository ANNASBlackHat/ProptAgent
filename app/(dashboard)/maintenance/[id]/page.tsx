'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CategoryIcon from '@/components/CategoryIcon';
import UrgencyBadge from '@/components/UrgencyBadge';
import { MaintenanceCategory, MaintenanceUrgency, MaintenanceStatus } from '@/models/MaintenanceRequest';

interface Note {
  note: string;
  addedAt: string;
  addedBy?: {
    name: string;
  };
}

interface MaintenanceRequestDetail {
  _id: string;
  title: string;
  category: MaintenanceCategory;
  urgency: MaintenanceUrgency;
  description: string;
  photos: string[];
  status: MaintenanceStatus;
  landlordNotes: Note[];
  resolvedAt?: string;
  createdAt: string;
  tenantId: { name: string; email: string; phone?: string };
  propertyId: { name: string; address: { street: string; city: string; state: string; zip: string } };
  unitId: { unitNumber: string; type: string };
}

export default function LandlordMaintenanceDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Data State
  const [request, setRequest] = useState<MaintenanceRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [status, setStatus] = useState<MaintenanceStatus>('open');
  const [newNote, setNewNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'landlord' && user.role !== 'super_admin'))) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Fetch request details
  const fetchRequestDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/maintenance/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch request details');
      }
      setRequest(data.data);
      setStatus(data.data.status);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchRequestDetails();
  }, [id, authLoading, user, fetchRequestDetails]);

  // Handle status update
  const handleStatusChange = async (newStatus: MaintenanceStatus) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/maintenance/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update status');
      }
      setStatus(newStatus);
      setRequest((prev) => (prev ? { ...prev, status: newStatus, resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : prev.resolvedAt } : null));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle add note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsAddingNote(true);
    try {
      const res = await fetch(`/api/maintenance/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add note');
      }
      setRequest((prev) => (prev ? { ...prev, landlordNotes: data.data } : null));
      setNewNote('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setIsAddingNote(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!user || (user.role !== 'landlord' && user.role !== 'super_admin') || !request) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 font-semibold">{error || 'Request not found'}</p>
        <Link href="/maintenance" className="text-sm text-blue-400 hover:underline">← Back to Overview</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl animate-pulse" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full relative z-10 space-y-6">
        {/* Back Link */}
        <div>
          <Link href="/maintenance" className="text-xs text-slate-450 hover:text-slate-200 transition-colors inline-flex items-center gap-1">
            ← Back to Maintenance Overview
          </Link>
        </div>

        {/* Title Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">
              {request.title}
            </h1>
            <p className="text-slate-450 text-sm">
              Submitted on {new Date(request.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <UrgencyBadge urgency={request.urgency} />
            <div className="relative">
              <select
                value={status}
                disabled={isUpdatingStatus}
                onChange={(e) => handleStatusChange(e.target.value as MaintenanceStatus)}
                className={`bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 outline-none hover:border-slate-500 transition-all cursor-pointer ${
                  isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Columns: Request Details & Photos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-200">Issue Description</h2>
                <CategoryIcon category={request.category} />
              </div>
              <p className="text-slate-300 text-sm whitespace-pre-line leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
                {request.description}
              </p>

              {request.resolvedAt && (
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Issue marked as resolved on {new Date(request.resolvedAt).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Photos Gallery Card */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-slate-200">Attached Photos ({request.photos.length})</h2>
              {request.photos.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8 bg-slate-950/20 rounded-xl border border-slate-850">
                  No photos were attached to this request.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {request.photos.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-video sm:aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800 group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Attachment ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 px-2 py-1 rounded bg-slate-900/80 hover:bg-slate-900 text-[10px] font-semibold text-slate-200 transition-colors"
                      >
                        View Full
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Tenant Contact & Internal Notes */}
          <div className="space-y-6">
            {/* Tenant Info Card */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-slate-200">Tenant Details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-blue-400">
                    {request.tenantId.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-200">{request.tenantId.name}</p>
                    <p className="text-xs text-slate-550">
                      {request.propertyId.name} · Unit {request.unitId.unitNumber}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-800/60 pt-3 space-y-2 text-sm text-slate-300">
                  <p className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-medium select-all">{request.tenantId.email}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-medium select-all">{request.tenantId.phone || 'N/A'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Internal Notes Card */}
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-250">Internal Notes</h2>
                <div className="mt-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-semibold text-amber-450 inline-block uppercase tracking-wider">
                  ⚠️ Not visible to tenant
                </div>
              </div>

              {/* Note Input */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Type a private internal note..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-100 placeholder-slate-600 transition-all outline-none resize-none"
                />
                <button
                  type="submit"
                  disabled={isAddingNote || !newNote.trim()}
                  className="w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isAddingNote ? 'Adding...' : 'Add Note'}
                </button>
              </form>

              {/* Notes List */}
              <div className="space-y-3 max-h-60 overflow-y-auto pt-2">
                {request.landlordNotes.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-4 italic">No internal notes yet.</p>
                ) : (
                  request.landlordNotes.map((note, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/50 text-xs space-y-1">
                      <div className="flex justify-between text-slate-555 font-medium">
                        <span>{note.addedBy?.name || 'Landlord'}</span>
                        <span>{new Date(note.addedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{note.note}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
        PropAgent • Landlord Dashboard Active
      </footer>
    </div>
  );
}

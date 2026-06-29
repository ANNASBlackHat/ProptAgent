'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CategoryIcon from '@/components/CategoryIcon';
import UrgencyBadge from '@/components/UrgencyBadge';
import TenantNav from '@/components/TenantNav';
import { MaintenanceCategory, MaintenanceUrgency, MaintenanceStatus } from '@/models/MaintenanceRequest';

interface MaintenanceRequestItem {
  _id: string;
  title: string;
  category: MaintenanceCategory;
  urgency: MaintenanceUrgency;
  status: MaintenanceStatus;
  createdAt: string;
  propertyId: { name: string; address: { street: string; city: string } };
  unitId: { unitNumber: string };
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

export default function TenantMaintenancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<MaintenanceRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'tenant')) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  // Fetch tenant requests
  useEffect(() => {
    if (authLoading || !user || user.role !== 'tenant') return;

    const fetchRequests = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/tenant/maintenance');
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch maintenance requests');
        }
        setRequests(data.data || []);
            } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading requests');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [user, authLoading]);

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-600/8 rounded-full blur-3xl pointer-events-none" />

      <TenantNav />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full relative z-10 space-y-6">
        {/* Back Link & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <Link href="/tenant" className="text-xs text-slate-400 hover:text-slate-250 transition-colors inline-flex items-center gap-1 mb-2">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl bg-gradient-to-r from-slate-100 to-slate-450 bg-clip-text text-transparent">
              Maintenance Requests
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              View, track, or submit new repair requests for your unit.
            </p>
          </div>

          <div>
            <Link
              href="/tenant/maintenance/new"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Submit New Request
            </Link>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Request List Card */}
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          {requests.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center text-slate-500 mb-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A1.5 1.5 0 1 0 19.38 18.87l-5.83-5.83m-1.02-1.02-5.83-5.83A1.5 1.5 0 0 0 4.62 8.38l5.83 5.83m0 0a3 3 0 1 1-4.24-4.24m4.24 4.24a3 3 0 1 0 4.24-4.24" />
                </svg>
              </div>
              <p className="text-slate-400 font-medium">No maintenance requests yet</p>
              <p className="text-slate-550 text-xs max-w-xs">
                If you have any issues with plumbing, electricity, heating, or appliances, submit a request and your landlord will be notified.
              </p>
              <Link
                href="/tenant/maintenance/new"
                className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-450 border border-slate-700 text-xs font-bold rounded-lg transition-colors"
              >
                Submit Your First Request
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-950/20 text-slate-400 font-semibold text-left">
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Property / Unit</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Urgency</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {requests.map((req) => (
                    <tr
                      key={req._id}
                      className="hover:bg-slate-800/10 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <CategoryIcon category={req.category} />
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-200 leading-snug">
                          {req.title}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                        <p className="text-sm font-medium text-slate-300">{req.propertyId?.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Unit {req.unitId?.unitNumber}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                        {new Date(req.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <UrgencyBadge urgency={req.urgency} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <MaintenanceStatusBadge status={req.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}

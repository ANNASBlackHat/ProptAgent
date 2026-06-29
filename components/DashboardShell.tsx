'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import LandlordSidebar from '@/components/LandlordSidebar';

interface BadgeCounts {
  pendingApplications: number;
  urgentMaintenanceRequests: number;
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [badges, setBadges] = useState<BadgeCounts>({
    pendingApplications: 0,
    urgentMaintenanceRequests: 0,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Fetch badge counts from dashboard endpoint
  useEffect(() => {
    if (!user || user.role !== 'landlord') return;
    fetch('/api/dashboard/landlord')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.summary) {
          setBadges({
            pendingApplications: data.data.summary.pendingApplications || 0,
            urgentMaintenanceRequests: data.data.summary.urgentMaintenanceRequests || 0,
          });
        }
      })
      .catch(() => {}); // silent fail — badges are non-critical
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
          <p className="text-slate-400 text-sm animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <LandlordSidebar
        pendingApplications={badges.pendingApplications}
        urgentMaintenance={badges.urgentMaintenanceRequests}
      />
      <div className="flex-1 min-w-0 overflow-auto">
        {children}
      </div>
    </div>
  );
}

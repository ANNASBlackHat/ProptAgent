'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function SuperAdminDashboard() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'super_admin')) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/30 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black bg-gradient-to-r from-purple-400 via-indigo-200 to-blue-400 bg-clip-text text-transparent">
              PropAgent
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold tracking-wide uppercase">
              Super Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-200">{user?.name}</p>
              <p className="text-xs text-slate-500">System Owner</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700/50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center relative z-10 w-full">
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-100">Super Admin Control Panel</h1>
            <p className="text-slate-400 text-sm">
              Platform administration and system monitoring dashboard.
            </p>
          </div>

          <div className="border-t border-slate-800/80 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-1 p-4 rounded-xl bg-slate-950/40 border border-slate-800/50">
              <span className="text-xs text-purple-400 uppercase font-semibold tracking-wider font-mono">Administrator</span>
              <p className="text-slate-200 font-medium">{user?.name}</p>
            </div>

            <div className="space-y-1 p-4 rounded-xl bg-slate-950/40 border border-slate-800/50">
              <span className="text-xs text-purple-400 uppercase font-semibold tracking-wider font-mono">Control Email</span>
              <p className="text-slate-200 font-medium">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mt-6">
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/50 shadow-lg">
              <h3 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Total Landlords</h3>
              <p className="text-3xl font-black text-slate-100 mt-1">1</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/50 shadow-lg">
              <h3 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Active Screenings</h3>
              <p className="text-3xl font-black text-slate-100 mt-1">0</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/50 shadow-lg">
              <h3 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">System Load</h3>
              <p className="text-3xl font-black text-emerald-400 mt-1 font-mono">Optimal</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
        PropAgent • Super Admin Active
      </footer>
    </div>
  );
}

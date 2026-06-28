'use client';

import React from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function LandlordDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/30 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-200 to-emerald-400 bg-clip-text text-transparent">
              PropAgent
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase">
              Landlord Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-200">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.companyName}</p>
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
            <h1 className="text-3xl font-extrabold text-slate-100">Welcome to your Dashboard</h1>
            <p className="text-slate-400 text-sm">
              Phase 1 (Authentication and Role System) is fully operational. Here is your profile information:
            </p>
          </div>

          <div className="border-t border-slate-800/80 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-1 p-4 rounded-xl bg-slate-950/40 border border-slate-800/50">
              <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Account Owner</span>
              <p className="text-slate-200 font-medium">{user?.name}</p>
            </div>

            <div className="space-y-1 p-4 rounded-xl bg-slate-950/40 border border-slate-800/50">
              <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Email Address</span>
              <p className="text-slate-200 font-medium">{user?.email}</p>
            </div>

            <div className="space-y-1 p-4 rounded-xl bg-slate-950/40 border border-slate-800/50">
              <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Company Name</span>
              <p className="text-slate-200 font-medium">{user?.companyName || 'N/A'}</p>
            </div>

            <div className="space-y-1 p-4 rounded-xl bg-slate-950/40 border border-slate-800/50">
              <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Phone</span>
              <p className="text-slate-200 font-medium">{user?.phone || 'N/A'}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400/90 text-xs leading-relaxed">
            <strong>Next Step (Phase 2):</strong> We will implement the Property & Unit Management module to allow you to create properties, add rental units, and manage their availability status.
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

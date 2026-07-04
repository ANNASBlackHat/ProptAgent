'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M15 13c0-1.93-1.34-3.57-3.17-3.93" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  );
}

function IconPlans() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="11" x2="8" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSubscriptions() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="10" r="1" fill="currentColor" />
      <circle cx="8" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mrr, setMrr] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/revenue')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMrr(data.data.mrr);
        }
      })
      .catch((err) => console.error('Failed to load sidebar MRR:', err));
  }, []);

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin', icon: <IconGrid /> },
    { label: 'Landlords', href: '/admin/landlords', icon: <IconUsers /> },
    { label: 'Subscriptions', href: '/admin/subscriptions', icon: <IconSubscriptions /> },
    { label: 'Plans', href: '/admin/plans', icon: <IconPlans /> },
    { label: 'Settings', href: '/admin/settings', icon: <IconSettings /> },
  ];

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="px-5 py-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="text-white font-black text-sm">SA</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-100 truncate">Super Admin</p>
            <p className="text-[11px] text-purple-400 truncate font-medium">System Control</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className={active ? 'text-purple-400' : 'text-slate-500'}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      <div className="px-4 py-3 border-t border-slate-800/80">
        <p className="text-xs font-semibold text-slate-300 truncate">{user?.name}</p>
        <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
      </div>

      {/* Brand footer */}
      <div className="px-5 py-3 border-t border-slate-800/50">
        <div className="flex justify-between items-center gap-2">
          <div>
            <p className="text-xs font-black bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              PropAgent
             </p>
            <p className="text-[10px] text-slate-650">Admin Console</p>
          </div>
          {mrr !== null && (
            <span className="text-[10px] text-slate-400 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
              MRR: ${(mrr / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150 border border-transparent hover:border-red-500/10"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2H2.5C2.22 2 2 2.22 2 2.5v9c0 .28.22.5.5.5H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M9 4.5L12 7l-3 2.5M12 7H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle admin sidebar"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          {mobileOpen ? (
            <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <>
              <line x1="2" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900/98 border-r border-slate-800/80 backdrop-blur-xl z-40 transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-slate-900/70 border-r border-slate-800/80 backdrop-blur-xl sticky top-0 h-screen">
        <SidebarContent />
      </aside>
    </>
  );
}

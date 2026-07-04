'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  pulseIfBadge?: boolean;
}

interface SidebarProps {
  pendingApplications?: number;
  urgentMaintenance?: number;
}

export default function LandlordSidebar({
  pendingApplications = 0,
  urgentMaintenance = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: '⬛' },
    { label: 'Properties', href: '/properties', icon: '🏢' },
    {
      label: 'Applications',
      href: '/applications',
      icon: '📋',
      badge: pendingApplications > 0 ? pendingApplications : undefined,
    },
    { label: 'Leases', href: '/leases', icon: '📄' },
    {
      label: 'Maintenance',
      href: '/maintenance',
      icon: '🔧',
      badge: urgentMaintenance > 0 ? urgentMaintenance : undefined,
      pulseIfBadge: true,
    },
    { label: 'Billing', href: '/billing', icon: '💳' },
    { label: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / Header */}
      <div className="px-5 py-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          {user?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.logo}
              alt="Logo"
              className="w-9 h-9 rounded-lg object-cover border border-slate-700/50"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm select-none">
              {user?.companyName?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || 'P'}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-bold text-slate-100 truncate max-w-[125px]">
                {user?.companyName || user?.name}
              </p>
              {user?.role === 'landlord' && (
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-full select-none capitalize leading-tight ${
                    user.planSlug === 'pro'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : user.planSlug === 'business'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-slate-700/20 text-slate-400 border border-slate-705/30'
                  }`}
                >
                  {user.planSlug || 'free'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            {user?.role === 'landlord' && (!user.planSlug || user.planSlug === 'free') && (
              <Link
                href="/pricing"
                className="inline-block text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:underline mt-0.5"
              >
                Upgrade Plan →
              </Link>
            )}
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
              className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                active
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-tight ${
                    item.pulseIfBadge
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* PropAgent Brand */}
      <div className="px-5 py-3 border-t border-slate-800/80">
        <p className="text-xs font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          PropAgent
        </p>
        <p className="text-[10px] text-slate-600">Landlord Portal</p>
      </div>

      {/* Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150 border border-transparent hover:border-red-500/10"
        >
          <span>🚪</span>
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
        aria-label="Toggle sidebar"
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
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900/95 border-r border-slate-800/80 backdrop-blur-xl z-40 transition-transform duration-300 lg:hidden ${
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

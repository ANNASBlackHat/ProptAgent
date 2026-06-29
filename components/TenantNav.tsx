'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function TenantNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navLinks = [
    { label: 'Home', href: '/tenant' },
    { label: 'My Lease', href: '/tenant/lease' },
    { label: 'Maintenance', href: '/tenant/maintenance' },
  ];

  const isActive = (href: string) =>
    href === '/tenant' ? pathname === '/tenant' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            PropAgent
          </span>
          <span className="hidden sm:block px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
            Tenant
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive(link.href)
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: user + logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <p className="text-sm font-semibold text-slate-200 leading-none">{user?.name}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Tenant Account</p>
          </div>
          <button
            onClick={() => logout()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-red-400 text-xs font-medium border border-slate-700/50 transition-all duration-150"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}

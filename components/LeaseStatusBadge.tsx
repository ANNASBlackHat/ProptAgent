'use client';

import React from 'react';
import { LeaseStatus } from '@/models/Lease';

interface LeaseStatusBadgeProps {
  status: LeaseStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  LeaseStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  active: {
    label: 'Active',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  expiring_soon: {
    label: 'Expiring Soon',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  expired: {
    label: 'Expired',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
  },
  terminated: {
    label: 'Terminated',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    dot: 'bg-red-400',
  },
};

export default function LeaseStatusBadge({
  status,
  className = '',
}: LeaseStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      {config.label}
    </span>
  );
}

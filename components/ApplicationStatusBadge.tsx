'use client';

import React from 'react';
import { ApplicationStatus } from '@/models/Application';

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
  },
  shortlisted: {
    label: 'Shortlisted',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  under_review: {
    label: 'Under Review',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  approved: {
    label: 'Approved',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  declined: {
    label: 'Declined',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    dot: 'bg-red-400',
  },
};

export default function ApplicationStatusBadge({
  status,
  className = '',
}: ApplicationStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      {config.label}
    </span>
  );
}

'use client';

import React from 'react';
import { UnitStatus } from '@/models/Unit';

interface UnitStatusBadgeProps {
  status: UnitStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  UnitStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  available: {
    label: 'Available',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  occupied: {
    label: 'Occupied',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  maintenance: {
    label: 'Maintenance',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
  },
  reserved: {
    label: 'Reserved',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    dot: 'bg-purple-400',
  },
};

export default function UnitStatusBadge({ status, className = '' }: UnitStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.available;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      {config.label}
    </span>
  );
}

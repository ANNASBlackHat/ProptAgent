import React from 'react';
import { MaintenanceUrgency } from '@/models/MaintenanceRequest';

interface UrgencyBadgeProps {
  urgency: MaintenanceUrgency;
  className?: string;
}

const URGENCY_CONFIG: Record<
  MaintenanceUrgency,
  { label: string; bg: string; text: string; dot: string; animate?: string }
> = {
  low: {
    label: 'Low',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-amber-550/15',
    text: 'text-amber-450',
    dot: 'bg-amber-400',
  },
  urgent: {
    label: 'Urgent',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    dot: 'bg-red-400',
    animate: 'animate-pulse',
  },
};

export default function UrgencyBadge({ urgency, className = '' }: UrgencyBadgeProps) {
  const config = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.low;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${config.animate || ''}`} />
      {config.label}
    </span>
  );
}

import React from 'react';
import { MaintenanceCategory } from '@/models/MaintenanceRequest';

interface CategoryIconProps {
  category: MaintenanceCategory;
  className?: string;
}

const CATEGORY_CONFIG: Record<
  MaintenanceCategory,
  { label: string; emoji: string; bg: string; text: string }
> = {
  plumbing: {
    label: 'Plumbing',
    emoji: '🔧',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
  },
  electrical: {
    label: 'Electrical',
    emoji: '⚡',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-450',
  },
  hvac: {
    label: 'HVAC',
    emoji: '❄️',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
  },
  structural: {
    label: 'Structural',
    emoji: '🏗️',
    bg: 'bg-amber-600/15',
    text: 'text-amber-500',
  },
  appliance: {
    label: 'Appliance',
    emoji: '🍳',
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
  },
  other: {
    label: 'Other',
    emoji: '📋',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
  },
};

export default function CategoryIcon({ category, className = '' }: CategoryIconProps) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${config.bg} ${config.text} ${className}`}
      title={config.label}
    >
      <span className="text-sm">{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}

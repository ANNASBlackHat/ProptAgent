'use client';

import React from 'react';
import Link from 'next/link';

interface PlanLimitBannerProps {
  limit: string;
  planName?: string;
  applicationsUsed?: number;
  applicationsLimit?: number;
  upgradeUrl?: string;
  onClose?: () => void;
}

export default function PlanLimitBanner({
  limit,
  planName = 'Free',
  applicationsUsed = 0,
  applicationsLimit = 0,
  upgradeUrl = '/billing/upgrade',
  onClose,
}: PlanLimitBannerProps) {
  let displayMessage = '';
  let displayTitle = 'Plan Limit Exceeded';
  let icon = '⚠️';

  switch (limit) {
    case 'maxProperties':
      displayMessage = `You've reached your property limit on the ${planName} plan. Upgrade to add more properties.`;
      displayTitle = 'Property Limit Reached';
      icon = '🏢';
      break;
    case 'maxActiveListings':
      displayMessage = "You've reached your active listings limit. Upgrade to list more units simultaneously.";
      displayTitle = 'Listing Limit Reached';
      icon = '🔑';
      break;
    case 'maxApplicationsPerMonth':
      displayMessage = `You've reached your monthly application limit (${applicationsUsed}/${applicationsLimit} used). Upgrade for more applications or wait until next month.`;
      displayTitle = 'Application Limit Reached';
      icon = '📝';
      break;
    case 'aiScreeningEnabled':
      displayMessage = "AI tenant screening is not available on the Free plan. Upgrade to Pro to enable AI screening interviews.";
      displayTitle = 'AI Screening Locked';
      icon = '🤖';
      break;
    case 'maintenanceModuleEnabled':
      displayMessage = "The maintenance module is not available on the Free plan. Upgrade to Pro to enable maintenance requests.";
      displayTitle = 'Maintenance Module Locked';
      icon = '🔧';
      break;
    default:
      displayMessage = "You've reached a quota limit for your current subscription. Please upgrade to continue.";
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-amber-500/10 border border-amber-500/25 p-5 backdrop-blur-md animate-in slide-in-from-top-4 duration-300 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Glow effect */}
      <div className="absolute top-0 left-0 w-24 h-24 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />

      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl shrink-0 mt-0.5">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-300">{displayTitle}</h4>
          <p className="text-xs text-amber-250/90 mt-1 leading-relaxed">{displayMessage}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-500/5 transition-colors border border-transparent"
          >
            Dismiss
          </button>
        )}
        <Link
          href={upgradeUrl}
          className="flex-1 md:flex-initial text-center px-4 py-2.5 rounded-xl text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all shadow-md shadow-amber-500/10"
        >
          Upgrade Now
        </Link>
      </div>
    </div>
  );
}

'use client';

import React from 'react';

interface AIScoreCardProps {
  score?: {
    overall: number | null;
    incomeStability: number | null;
    communicationClarity: number | null;
    rentalHistorySignals: number | null;
    redFlags: string[];
    recommendation: 'shortlist' | 'review_manually' | 'decline';
    scoreSummary?: string;
    scoredAt: string | Date;
  };
  onRescore?: () => void;
  isRescoring?: boolean;
}

export default function AIScoreCard({ score, onRescore, isRescoring = false }: AIScoreCardProps) {
  if (!score) return null;

  const {
    overall,
    incomeStability,
    communicationClarity,
    rentalHistorySignals,
    redFlags,
    recommendation,
    scoreSummary,
    scoredAt,
  } = score;

  // Color config based on overall score
  let scoreColorClass = 'text-slate-500';
  let ringColorClass = 'stroke-slate-700';
  if (overall !== null) {
    if (overall >= 7) {
      scoreColorClass = 'text-emerald-400';
      ringColorClass = 'stroke-emerald-500';
    } else if (overall >= 4) {
      scoreColorClass = 'text-amber-400';
      ringColorClass = 'stroke-amber-500';
    } else {
      scoreColorClass = 'text-red-400';
      ringColorClass = 'stroke-red-500';
    }
  }

  // Recommendation Badge Config
  const recConfig = {
    shortlist: {
      label: 'Shortlist',
      bg: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
      dot: 'bg-emerald-400',
    },
    review_manually: {
      label: 'Review Manually',
      bg: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
      dot: 'bg-amber-400',
    },
    decline: {
      label: 'Decline',
      bg: 'bg-red-500/10 border-red-500/25 text-red-400',
      dot: 'bg-red-400',
    },
  }[recommendation] || {
    label: 'Review Manually',
    bg: 'bg-slate-500/10 border-slate-500/25 text-slate-400',
    dot: 'bg-slate-400',
  };

  // SVG circular ring calculations
  const radius = 36;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const validScore = overall !== null ? Math.min(Math.max(overall, 0), 10) : 0;
  const strokeDashoffset = circumference - (validScore / 10) * circumference;

  const formattedDate = new Date(scoredAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const DimensionRow = ({ label, val }: { label: string; val: number | null }) => {
    const barWidth = val !== null ? `${(val / 10) * 100}%` : '0%';
    const barColor = val !== null && val >= 7 ? 'bg-emerald-500' : val !== null && val >= 4 ? 'bg-amber-500' : 'bg-red-500';
    
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-slate-400">{label}</span>
          <span className="text-slate-300">{val !== null ? `${val}/10` : '--'}</span>
        </div>
        <div className="w-full bg-slate-800/60 rounded-full h-2 overflow-hidden border border-slate-700/30">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`}
            style={{ width: barWidth }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-6 relative overflow-hidden backdrop-blur-md">
      {/* Background radial glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">AI Screening Report</h3>
          <p className="text-xs text-slate-500 mt-1">Scored at {formattedDate}</p>
        </div>
        {onRescore && (
          <button
            type="button"
            onClick={onRescore}
            disabled={isRescoring}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50 active:scale-95"
          >
            {isRescoring ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            )}
            Re-score
          </button>
        )}
      </div>

      {/* Score and Recommendation */}
      <div className="flex items-center gap-6 py-2">
        {/* Ring Chart */}
        <div className="relative flex items-center justify-center w-24 h-24 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-slate-800"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Foreground circle */}
            {overall !== null && (
              <circle
                cx="48"
                cy="48"
                r={radius}
                className={`transition-all duration-1000 ease-out ${ringColorClass}`}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            )}
          </svg>
          {/* Central Text */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className={`text-3xl font-extrabold tracking-tight ${scoreColorClass}`}>
              {overall !== null ? overall : '--'}
            </span>
            {overall !== null && <span className="text-[10px] text-slate-500 font-medium -mt-1">/10</span>}
          </div>
        </div>

        {/* Recommendation & Quick Summary */}
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${recConfig.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${recConfig.dot}`} />
              {recConfig.label}
            </span>
          </div>
          {scoreSummary && (
            <p className="text-slate-300 text-sm leading-relaxed font-normal">
              {scoreSummary}
            </p>
          )}
        </div>
      </div>

      {/* Dimension Scores (Bar Charts) */}
      <div className="space-y-4 border-t border-slate-800/60 pt-5">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Evaluation Dimensions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DimensionRow label="Income Stability" val={incomeStability} />
          <DimensionRow label="Communication" val={communicationClarity} />
          <DimensionRow label="Rental History" val={rentalHistorySignals} />
        </div>
      </div>

      {/* Red Flags */}
      <div className="border-t border-slate-800/60 pt-5">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Identified Red Flags</h4>
        {redFlags.length > 0 ? (
          <ul className="space-y-2.5">
            {redFlags.map((flag, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-red-300/90 bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2">
                <span className="text-red-500 text-base leading-none mt-0.5">⚠</span>
                <span className="leading-relaxed">{flag}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400/90 text-sm">
            <span className="text-emerald-500 text-base leading-none">✓</span>
            <span>No red flags identified</span>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-3.5 flex items-start gap-3">
        <span className="text-slate-400 text-lg leading-none mt-0.5">ℹ</span>
        <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
          <strong className="text-slate-400">AI scoring is advisory only.</strong> Scores are based on stated information and interview responses. The final decision is yours. This tool does not perform credit checks or background verification.
        </p>
      </div>
    </div>
  );
}

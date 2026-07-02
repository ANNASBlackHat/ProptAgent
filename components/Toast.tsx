'use client';

import React from 'react';
import { useToast, ToastMessage } from '@/hooks/useToast';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const { type, message } = toast;

  // Type-specific colors and icons
  let bgClass = 'bg-slate-900 border-slate-800';
  let iconColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  let icon = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 1 1 1.084 1.085l-.042.022a.75.75 0 0 1-1.083-1.085ZM12 18.75m-6.75-6.75A6.75 6.75 0 1 1 12 18.75 6.75 6.75 0 0 1 5.25 12Z" />
    </svg>
  );

  if (type === 'success') {
    bgClass = 'bg-slate-900 border-emerald-500/30';
    iconColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    icon = (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    );
  } else if (type === 'error') {
    bgClass = 'bg-slate-900 border-red-500/30';
    iconColor = 'text-red-400 bg-red-500/10 border-red-500/20';
    icon = (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    );
  } else if (type === 'warning') {
    bgClass = 'bg-slate-900 border-amber-500/30';
    iconColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    icon = (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    );
  }

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl ${bgClass} transition-all duration-300 animate-[slideIn_0.2s_ease-out]`}
      role="alert"
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-xl border ${iconColor}`}>
        {icon}
      </span>
      <div className="flex-1 text-sm font-medium text-slate-200 pr-2 pt-0.5 leading-snug">
        {message}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 text-slate-500 hover:text-slate-350 p-1 hover:bg-slate-800 rounded-lg transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

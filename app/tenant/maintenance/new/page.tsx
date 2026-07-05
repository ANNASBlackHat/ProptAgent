'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PhotoUpload, { StoredFile } from '@/components/PhotoUpload';
import TenantNav from '@/components/TenantNav';
import { MaintenanceCategory, MaintenanceUrgency } from '@/models/MaintenanceRequest';

const CATEGORIES: { value: MaintenanceCategory; label: string; emoji: string }[] = [
  { value: 'plumbing', label: 'Plumbing', emoji: '🔧' },
  { value: 'electrical', label: 'Electrical', emoji: '⚡' },
  { value: 'hvac', label: 'HVAC', emoji: '❄️' },
  { value: 'structural', label: 'Structural', emoji: '🏗️' },
  { value: 'appliance', label: 'Appliance', emoji: '🍳' },
  { value: 'other', label: 'Other', emoji: '📋' },
];

const URGENCY_HINTS: Record<MaintenanceUrgency, { text: string; color: string }> = {
  urgent: {
    text: "🚨 Critical emergency. We will notify your landlord immediately.",
    color: "text-red-400 border-red-500/30 bg-red-500/5",
  },
  medium: {
    text: "⏳ Important issue. Typically addressed within 3–5 business days.",
    color: "text-amber-400 border-amber-500/30 bg-amber-500/5",
  },
  low: {
    text: "📋 Routine request. Scheduled during next routine maintenance visit.",
    color: "text-slate-400 border-slate-700/50 bg-slate-800/25",
  },
};

export default function TenantNewMaintenanceRequestPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory | ''>('');
  const [urgency, setUrgency] = useState<MaintenanceUrgency>('medium');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<StoredFile[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'tenant')) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category || !urgency || !description.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (photos.length > 3) {
      setError('You can upload a maximum of 3 photos.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          urgency,
          description: description.trim(),
          photos,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit maintenance request');
      }

      router.push('/tenant/maintenance');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit request. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'tenant') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-600/8 rounded-full blur-3xl pointer-events-none" />

      <TenantNav />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-8 flex-1 w-full relative z-10 space-y-6">
        {/* Back Link */}
        <div>
          <Link href="/tenant/maintenance" className="text-xs text-slate-400 hover:text-slate-250 transition-colors inline-flex items-center gap-1">
            ← Back to Requests
          </Link>
        </div>

        {/* Form Container */}
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Submit Maintenance Request
            </h1>
            <p className="text-slate-450 text-sm mt-1">
              Provide details and optionally attach up to 3 photos of the issue.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-semibold text-slate-200">
                Request Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Leaking sink in the master bathroom"
                className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 placeholder-slate-600 transition-all outline-none"
              />
              <div className="text-right text-xs text-slate-600">
                {title.length}/100 characters
              </div>
            </div>

            {/* Grid for Category and Urgency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Select */}
              <div className="space-y-2">
                <label htmlFor="category" className="block text-sm font-semibold text-slate-200">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="category"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 transition-all outline-none appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="bg-slate-950">Select a category...</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value} className="bg-slate-950">
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Urgency Radio Buttons */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-200">
                  Urgency Level <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['low', 'medium', 'urgent'] as MaintenanceUrgency[]).map((level) => (
                    <label
                      key={level}
                      className={[
                        'flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer select-none transition-all',
                        urgency === level
                          ? level === 'urgent'
                            ? 'border-red-500 bg-red-500/10 text-red-400 font-bold'
                            : level === 'medium'
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold'
                            : 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                          : 'border-slate-800 bg-slate-950/20 text-slate-400 hover:border-slate-750 hover:bg-slate-900/30',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="urgency"
                        value={level}
                        checked={urgency === level}
                        onChange={() => setUrgency(level)}
                        className="sr-only"
                      />
                      <span className="text-xs uppercase tracking-wider">{level}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Urgency Helper Hint */}
            <div className={`p-3 rounded-xl border text-xs leading-relaxed transition-all duration-300 ${URGENCY_HINTS[urgency].color}`}>
              {URGENCY_HINTS[urgency].text}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-semibold text-slate-200">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                required
                maxLength={1000}
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about the issue. Include where it is located, when it started, and any specific details that will help the repair technician."
                className="w-full px-4 py-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 placeholder-slate-650 transition-all outline-none resize-y"
              />
              <div className="text-right text-xs text-slate-600">
                {description.length}/1000 characters
              </div>
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-200">
                Attach Photos <span className="text-xs text-slate-550">(Max 3)</span>
              </label>
              <PhotoUpload
                onChange={(urls) => setPhotos(urls)}
                maxFiles={3}
                existingPhotos={photos}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-450 hover:to-teal-550 text-white font-bold tracking-wide shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting Request...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </form>
        </div>
      </main>

    </div>
  );
}

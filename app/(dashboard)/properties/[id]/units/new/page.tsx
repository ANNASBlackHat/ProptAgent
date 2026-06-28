'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import PhotoUpload from '@/components/PhotoUpload';

interface UnitFormData {
  unitNumber: string;
  floor: string;
  type: string;
  sizeSqft: string;
  rentAmount: string;
  depositAmount: string;
  description: string;
  photos: string[];
}

const INITIAL: UnitFormData = {
  unitNumber: '',
  floor: '',
  type: 'studio',
  sizeSqft: '',
  rentAmount: '',
  depositAmount: '',
  description: '',
  photos: [],
};

const UNIT_TYPES = [
  { value: 'studio', label: 'Studio' },
  { value: '1BR', label: '1 Bedroom' },
  { value: '2BR', label: '2 Bedrooms' },
  { value: '3BR', label: '3 Bedrooms' },
  { value: 'other', label: 'Other' },
];

export default function NewUnitPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params?.id as string;

  const [form, setForm] = useState<UnitFormData>(INITIAL);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [propertyName, setPropertyName] = useState<string>('');

  useEffect(() => {
    // Fetch property name for breadcrumb
    fetch(`/api/properties/${propertyId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setPropertyName(d.data.name); })
      .catch(() => {});
  }, [propertyId]);

  const setField = (field: keyof UnitFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.unitNumber.trim()) errs.unitNumber = 'Unit number is required';
    if (!form.type) errs.type = 'Unit type is required';
    if (!form.rentAmount || isNaN(Number(form.rentAmount)) || Number(form.rentAmount) < 0)
      errs.rentAmount = 'Valid rent amount is required';
    if (form.sizeSqft && (isNaN(Number(form.sizeSqft)) || Number(form.sizeSqft) < 1))
      errs.sizeSqft = 'Size must be at least 1 sqft';
    if (form.depositAmount && (isNaN(Number(form.depositAmount)) || Number(form.depositAmount) < 0))
      errs.depositAmount = 'Deposit amount cannot be negative';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsSaving(true);
    setServerError(null);

    const payload = {
      unitNumber: form.unitNumber.trim(),
      type: form.type,
      rentAmount: Number(form.rentAmount),
      photos: form.photos,
      description: form.description.trim() || undefined,
      ...(form.floor ? { floor: Number(form.floor) } : {}),
      ...(form.sizeSqft ? { sizeSqft: Number(form.sizeSqft) } : {}),
      ...(form.depositAmount ? { depositAmount: Number(form.depositAmount) } : {}),
    };

    try {
      const res = await fetch(`/api/properties/${propertyId}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create unit');
      router.push(`/properties/${propertyId}`);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to create unit');
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls = (err?: string) =>
    `w-full px-4 py-3 rounded-xl bg-slate-800 border ${
      err ? 'border-red-500/70 focus:border-red-500' : 'border-slate-700 focus:border-blue-500'
    } text-slate-100 placeholder:text-slate-500 outline-none transition-colors duration-200 text-sm`;

  const labelCls = 'block text-sm font-medium text-slate-300 mb-1.5';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/properties" className="hover:text-slate-300 transition-colors">Properties</Link>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <Link href={`/properties/${propertyId}`} className="hover:text-slate-300 transition-colors truncate max-w-[160px]">
            {propertyName || 'Property'}
          </Link>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-slate-300">Add Unit</span>
        </nav>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <h1 className="text-xl font-bold text-slate-100 mb-6">Add New Unit</h1>

          {serverError && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {serverError}
            </div>
          )}

          <form id="new-unit-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Unit number + floor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="unit-number" className={labelCls}>Unit Number *</label>
                <input
                  id="unit-number"
                  type="text"
                  placeholder="e.g. A-101"
                  value={form.unitNumber}
                  onChange={(e) => setField('unitNumber', e.target.value)}
                  className={inputCls(errors.unitNumber)}
                />
                {errors.unitNumber && <p className="mt-1 text-xs text-red-400">{errors.unitNumber}</p>}
              </div>
              <div>
                <label htmlFor="unit-floor" className={labelCls}>Floor</label>
                <input
                  id="unit-floor"
                  type="number"
                  min="0"
                  placeholder="e.g. 3"
                  value={form.floor}
                  onChange={(e) => setField('floor', e.target.value)}
                  className={inputCls(errors.floor)}
                />
                {errors.floor && <p className="mt-1 text-xs text-red-400">{errors.floor}</p>}
              </div>
            </div>

            {/* Type */}
            <div>
              <label htmlFor="unit-type" className={labelCls}>Unit Type *</label>
              <select
                id="unit-type"
                value={form.type}
                onChange={(e) => setField('type', e.target.value)}
                className={`${inputCls(errors.type)} cursor-pointer`}
              >
                {UNIT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {errors.type && <p className="mt-1 text-xs text-red-400">{errors.type}</p>}
            </div>

            {/* Size + Rent */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="unit-size" className={labelCls}>Size (sqft)</label>
                <input
                  id="unit-size"
                  type="number"
                  min="1"
                  placeholder="e.g. 450"
                  value={form.sizeSqft}
                  onChange={(e) => setField('sizeSqft', e.target.value)}
                  className={inputCls(errors.sizeSqft)}
                />
                {errors.sizeSqft && <p className="mt-1 text-xs text-red-400">{errors.sizeSqft}</p>}
              </div>
              <div>
                <label htmlFor="unit-rent" className={labelCls}>Rent Amount *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <input
                    id="unit-rent"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="1500"
                    value={form.rentAmount}
                    onChange={(e) => setField('rentAmount', e.target.value)}
                    className={`${inputCls(errors.rentAmount)} pl-7`}
                  />
                </div>
                {errors.rentAmount && <p className="mt-1 text-xs text-red-400">{errors.rentAmount}</p>}
              </div>
            </div>

            {/* Deposit */}
            <div>
              <label htmlFor="unit-deposit" className={labelCls}>Deposit Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                <input
                  id="unit-deposit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="3000"
                  value={form.depositAmount}
                  onChange={(e) => setField('depositAmount', e.target.value)}
                  className={`${inputCls(errors.depositAmount)} pl-7`}
                />
              </div>
              {errors.depositAmount && <p className="mt-1 text-xs text-red-400">{errors.depositAmount}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="unit-description" className={labelCls}>Description</label>
              <textarea
                id="unit-description"
                rows={3}
                placeholder="Features, furnishings, notes…"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                className={`${inputCls()} resize-none`}
              />
            </div>

            {/* Photos */}
            <div>
              <label className={labelCls}>Photos</label>
              <PhotoUpload
                existingPhotos={form.photos}
                onChange={(urls) => setField('photos', urls)}
                maxFiles={5}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Link
                href={`/properties/${propertyId}`}
                className="flex-1 text-center px-5 py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-500 text-sm font-semibold transition-all duration-200"
              >
                Cancel
              </Link>
              <button
                id="submit-unit-btn"
                type="submit"
                disabled={isSaving}
                className="flex-1 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Create Unit'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

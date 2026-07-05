'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import PhotoUpload, { StoredFile } from '@/components/PhotoUpload';

interface UnitFormData {
  unitNumber: string;
  floor: string;
  type: string;
  sizeSqft: string;
  rentAmount: string;
  depositAmount: string;
  status: string;
  description: string;
  photos: StoredFile[];
}

const UNIT_TYPES = [
  { value: 'studio', label: 'Studio' },
  { value: '1BR', label: '1 Bedroom' },
  { value: '2BR', label: '2 Bedrooms' },
  { value: '3BR', label: '3 Bedrooms' },
  { value: 'other', label: 'Other' },
];

const UNIT_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Under Maintenance' },
  { value: 'reserved', label: 'Reserved' },
];

export default function EditUnitPage() {
  const params = useParams();
  const router = useRouter();
  const unitId = params?.id as string;

  const [form, setForm] = useState<UnitFormData>({
    unitNumber: '',
    floor: '',
    type: 'studio',
    sizeSqft: '',
    rentAmount: '',
    depositAmount: '',
    status: 'available',
    description: '',
    photos: [],
  });

  const [propertyId, setPropertyId] = useState<string>('');
  const [propertyName, setPropertyName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // ─── Load unit ──────────────────────────────────────────────────────────────

  const fetchUnit = useCallback(async () => {
    try {
      const res = await fetch(`/api/units/${unitId}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Unit not found');

      const unit = data.data;
      setForm({
        unitNumber: unit.unitNumber || '',
        floor: unit.floor != null ? String(unit.floor) : '',
        type: unit.type || 'studio',
        sizeSqft: unit.sizeSqft != null ? String(unit.sizeSqft) : '',
        rentAmount: unit.rentAmount != null ? String(unit.rentAmount) : '',
        depositAmount: unit.depositAmount != null ? String(unit.depositAmount) : '',
        status: unit.status || 'available',
        description: unit.description || '',
        photos: unit.photos || [],
      });

      if (unit.propertyId) {
        const pid = typeof unit.propertyId === 'object' ? unit.propertyId._id ?? unit.propertyId : unit.propertyId;
        setPropertyId(String(pid));
      }
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load unit');
    } finally {
      setIsLoading(false);
    }
  }, [unitId]);

  useEffect(() => { fetchUnit(); }, [fetchUnit]);

  // Load property name for breadcrumb
  useEffect(() => {
    if (!propertyId) return;
    fetch(`/api/properties/${propertyId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setPropertyName(d.data.name); })
      .catch(() => {});
  }, [propertyId]);

  // ─── Form helpers ───────────────────────────────────────────────────────────

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
      status: form.status,
      rentAmount: Number(form.rentAmount),
      photos: form.photos,
      description: form.description.trim() || undefined,
      ...(form.floor ? { floor: Number(form.floor) } : {}),
      ...(form.sizeSqft ? { sizeSqft: Number(form.sizeSqft) } : {}),
      ...(form.depositAmount ? { depositAmount: Number(form.depositAmount) } : {}),
    };

    try {
      const res = await fetch(`/api/units/${unitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update unit');
      router.push(propertyId ? `/properties/${propertyId}` : '/properties');
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to update unit');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const inputCls = (err?: string) =>
    `w-full px-4 py-3 rounded-xl bg-slate-800 border ${
      err ? 'border-red-500/70 focus:border-red-500' : 'border-slate-700 focus:border-blue-500'
    } text-slate-100 placeholder:text-slate-500 outline-none transition-colors duration-200 text-sm`;

  const labelCls = 'block text-sm font-medium text-slate-300 mb-1.5';

  // ─── States ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
          <p className="text-slate-400 text-sm animate-pulse">Loading unit…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{loadError}</p>
          <Link href="/properties" className="text-blue-400 hover:text-blue-300 text-sm underline">
            Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/properties" className="hover:text-slate-300 transition-colors">Properties</Link>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          {propertyId ? (
            <Link href={`/properties/${propertyId}`} className="hover:text-slate-300 transition-colors truncate max-w-[160px]">
              {propertyName || 'Property'}
            </Link>
          ) : (
            <span className="text-slate-500">{propertyName || 'Property'}</span>
          )}
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-slate-300">Edit Unit</span>
        </nav>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <h1 className="text-xl font-bold text-slate-100 mb-6">
            Edit Unit
            {form.unitNumber && (
              <span className="ml-2 text-base font-normal text-slate-400">— {form.unitNumber}</span>
            )}
          </h1>

          {serverError && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {serverError}
            </div>
          )}

          <form id="edit-unit-form" onSubmit={handleSubmit} className="space-y-5">
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

            {/* Type + Status */}
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label htmlFor="unit-status" className={labelCls}>Status</label>
                <select
                  id="unit-status"
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                  className={`${inputCls()} cursor-pointer`}
                >
                  {UNIT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
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
                href={propertyId ? `/properties/${propertyId}` : '/properties'}
                className="flex-1 text-center px-5 py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-500 text-sm font-semibold transition-all duration-200"
              >
                Cancel
              </Link>
              <button
                id="save-unit-btn"
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
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

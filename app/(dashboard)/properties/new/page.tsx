'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PhotoUpload, { StoredFile } from '@/components/PhotoUpload';

interface PropertyFormData {
  name: string;
  description: string;
  photos: StoredFile[];
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
}

const INITIAL: PropertyFormData = {
  name: '',
  description: '',
  photos: [],
  address: { street: '', city: '', state: '', country: '', zip: '' },
};

export default function NewPropertyPage() {
  const router = useRouter();
  const [form, setForm] = useState<PropertyFormData>(INITIAL);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const setField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  const setAddressField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
    setErrors((prev) => { const next = { ...prev }; delete next[`address.${field}`]; return next; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Property name is required';
    if (!form.address.street.trim()) errs['address.street'] = 'Street is required';
    if (!form.address.city.trim()) errs['address.city'] = 'City is required';
    if (!form.address.state.trim()) errs['address.state'] = 'State is required';
    if (!form.address.country.trim()) errs['address.country'] = 'Country is required';
    if (!form.address.zip.trim()) errs['address.zip'] = 'ZIP code is required';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsSaving(true);
    setServerError(null);

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create property');
      router.push(`/properties/${data.data._id}`);
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to create property');
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
        {/* Back link */}
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Properties
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <h1 className="text-xl font-bold text-slate-100 mb-6">Add New Property</h1>

          {serverError && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {serverError}
            </div>
          )}

          <form id="new-property-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="property-name" className={labelCls}>Property Name *</label>
              <input
                id="property-name"
                type="text"
                placeholder="e.g. Sunrise Apartments"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className={inputCls(errors.name)}
              />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>

            {/* Address */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-300 mb-3">Address *</legend>
              <div className="space-y-3">
                <div>
                  <label htmlFor="addr-street" className={labelCls}>Street</label>
                  <input
                    id="addr-street"
                    type="text"
                    placeholder="123 Main Street"
                    value={form.address.street}
                    onChange={(e) => setAddressField('street', e.target.value)}
                    className={inputCls(errors['address.street'])}
                  />
                  {errors['address.street'] && <p className="mt-1 text-xs text-red-400">{errors['address.street']}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="addr-city" className={labelCls}>City</label>
                    <input
                      id="addr-city"
                      type="text"
                      placeholder="Jakarta"
                      value={form.address.city}
                      onChange={(e) => setAddressField('city', e.target.value)}
                      className={inputCls(errors['address.city'])}
                    />
                    {errors['address.city'] && <p className="mt-1 text-xs text-red-400">{errors['address.city']}</p>}
                  </div>
                  <div>
                    <label htmlFor="addr-state" className={labelCls}>State / Province</label>
                    <input
                      id="addr-state"
                      type="text"
                      placeholder="DKI Jakarta"
                      value={form.address.state}
                      onChange={(e) => setAddressField('state', e.target.value)}
                      className={inputCls(errors['address.state'])}
                    />
                    {errors['address.state'] && <p className="mt-1 text-xs text-red-400">{errors['address.state']}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="addr-country" className={labelCls}>Country</label>
                    <input
                      id="addr-country"
                      type="text"
                      placeholder="Indonesia"
                      value={form.address.country}
                      onChange={(e) => setAddressField('country', e.target.value)}
                      className={inputCls(errors['address.country'])}
                    />
                    {errors['address.country'] && <p className="mt-1 text-xs text-red-400">{errors['address.country']}</p>}
                  </div>
                  <div>
                    <label htmlFor="addr-zip" className={labelCls}>ZIP / Postal Code</label>
                    <input
                      id="addr-zip"
                      type="text"
                      placeholder="10110"
                      value={form.address.zip}
                      onChange={(e) => setAddressField('zip', e.target.value)}
                      className={inputCls(errors['address.zip'])}
                    />
                    {errors['address.zip'] && <p className="mt-1 text-xs text-red-400">{errors['address.zip']}</p>}
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Description */}
            <div>
              <label htmlFor="property-description" className={labelCls}>Description</label>
              <textarea
                id="property-description"
                rows={4}
                placeholder="Brief description of the property…"
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
                href="/properties"
                className="flex-1 text-center px-5 py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-500 text-sm font-semibold transition-all duration-200"
              >
                Cancel
              </Link>
              <button
                id="submit-property-btn"
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
                  'Create Property'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

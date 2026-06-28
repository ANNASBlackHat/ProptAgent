'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import UnitStatusBadge from '@/components/UnitStatusBadge';
import { UnitStatus } from '@/models/Unit';

interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

interface Property {
  _id: string;
  name: string;
  address: Address;
  description?: string;
  photos: string[];
  isActive: boolean;
  createdAt: string;
}

interface Unit {
  _id: string;
  unitNumber: string;
  floor?: number;
  type: string;
  sizeSqft?: number;
  rentAmount: number;
  depositAmount?: number;
  status: UnitStatus;
  isActive: boolean;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [deletingUnitId, setDeletingUnitId] = useState<string | null>(null);
  const [copiedUnitId, setCopiedUnitId] = useState<string | null>(null);

  const handleCopyLink = (unitId: string) => {
    const url = `${window.location.origin}/apply/${unitId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUnitId(unitId);
      setTimeout(() => setCopiedUnitId(null), 2000);
    });
  };

  const fetchProperty = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Not found');
      setProperty(data.data);
      setUnits(data.data.units || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load property');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProperty(); }, [fetchProperty]);

  const handleDeleteProperty = async () => {
    if (!confirm('Are you sure you want to delete this property? All units will also be deleted.')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Delete failed');
      router.push('/properties');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm('Delete this unit?')) return;
    setDeletingUnitId(unitId);
    try {
      const res = await fetch(`/api/units/${unitId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Delete failed');
      setUnits((prev) => prev.filter((u) => u._id !== unitId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingUnitId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
          <p className="text-slate-400 text-sm animate-pulse">Loading property…</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error || 'Property not found'}</p>
          <Link href="/properties" className="text-blue-400 hover:text-blue-300 text-sm underline">
            Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  const addr = property.address;
  const photos = property.photos ?? [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/properties" className="hover:text-slate-300 transition-colors">Properties</Link>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-slate-300 truncate max-w-xs">{property.name}</span>
        </div>

        {/* Header actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
              {property.name}
              {property.isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-400">Inactive</span>
              )}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {addr.street}, {addr.city}, {addr.state} {addr.zip}, {addr.country}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/properties/${id}/edit`}
              id="edit-property-btn"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 hover:border-slate-500 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
              </svg>
              Edit Property
            </Link>
            <button
              id="delete-property-btn"
              type="button"
              onClick={handleDeleteProperty}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 text-sm font-semibold rounded-xl border border-red-500/30 hover:border-red-500/50 transition-all duration-200 disabled:opacity-50"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              )}
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: info + gallery */}
          <div className="lg:col-span-1 space-y-6">
            {/* Photo gallery */}
            {photos.length > 0 ? (
              <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                <div className="relative aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photos[photoIndex]}
                    alt={`${property.name} photo ${photoIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 flex items-center justify-center text-white transition-colors"
                        aria-label="Previous photo"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 flex items-center justify-center text-white transition-colors"
                        aria-label="Next photo"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </>
                  )}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-xs text-slate-300">
                    {photoIndex + 1} / {photos.length}
                  </div>
                </div>
                {/* Thumbnails */}
                {photos.length > 1 && (
                  <div className="flex gap-1.5 p-3 overflow-x-auto">
                    {photos.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPhotoIndex(i)}
                        className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                          i === photoIndex ? 'border-blue-500' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                        aria-label={`Photo ${i + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 aspect-video flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-12 h-12 text-slate-700 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  <p className="text-slate-600 text-xs mt-2">No photos</p>
                </div>
              </div>
            )}

            {/* Description card */}
            {property.description && (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{property.description}</p>
              </div>
            )}
          </div>

          {/* Right: units table */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <div>
                  <h2 className="font-bold text-slate-100">Units</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{units.length} unit{units.length !== 1 ? 's' : ''}</p>
                </div>
                <Link
                  href={`/properties/${id}/units/new`}
                  id="add-unit-btn"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all duration-200 hover:shadow-md hover:shadow-blue-500/25 active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Unit
                </Link>
              </div>

              {units.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <svg className="w-10 h-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" />
                  </svg>
                  <p className="text-slate-500 text-sm">No units yet</p>
                  <Link
                    href={`/properties/${id}/units/new`}
                    className="text-blue-400 hover:text-blue-300 text-sm underline"
                  >
                    Add the first unit
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Unit #</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Size</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Rent</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Apply Link</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {units.map((unit) => (
                        <tr key={unit._id} className="group hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-200">{unit.unitNumber}</td>
                          <td className="px-4 py-3 text-slate-400 capitalize">{unit.type}</td>
                          <td className="px-4 py-3 text-slate-400">
                            {unit.sizeSqft ? `${unit.sizeSqft} sqft` : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-300 font-medium">
                            ${unit.rentAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <UnitStatusBadge status={unit.status} />
                          </td>
                          <td className="px-4 py-3">
                            {unit.status === 'available' ? (
                              <button
                                type="button"
                                onClick={() => handleCopyLink(unit._id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 transition-all"
                                aria-label="Copy application link"
                              >
                                {copiedUnitId === unit._id ? (
                                  <>
                                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                    <span className="text-emerald-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                                    </svg>
                                    Copy Link
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-slate-600 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/units/${unit._id}/edit`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                                aria-label="Edit unit"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                                </svg>
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDeleteUnit(unit._id)}
                                disabled={deletingUnitId === unit._id}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                                aria-label="Delete unit"
                              >
                                {deletingUnitId === unit._id ? (
                                  <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

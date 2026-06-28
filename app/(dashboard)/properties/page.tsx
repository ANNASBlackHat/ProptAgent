'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

interface PropertyItem {
  _id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
  photos: string[];
  isActive: boolean;
  unitCount: number;
  occupancyRate: number;
  createdAt: string;
}

export default function PropertiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'landlord' && user?.role !== 'super_admin') {
      router.replace('/dashboard');
      return;
    }

    const fetchProperties = async () => {
      try {
        const res = await fetch('/api/properties');
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load properties');
        setProperties(data.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load properties');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
          <p className="text-slate-400 text-sm animate-pulse">Loading properties…</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Properties</h1>
            <p className="text-sm text-slate-400 mt-1">
              {properties.length} propert{properties.length === 1 ? 'y' : 'ies'} total
            </p>
          </div>
          <Link
            href="/properties/new"
            id="add-property-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Property
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!error && properties.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-slate-300 font-semibold text-lg">No properties yet</p>
              <p className="text-slate-500 text-sm mt-1">Add your first property to get started.</p>
            </div>
            <Link
              href="/properties/new"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
            >
              Add Property
            </Link>
          </div>
        )}

        {/* Property grid */}
        {properties.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <PropertyCard key={property._id} property={property} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function PropertyCard({ property }: { property: PropertyItem }) {
  const thumbnail = property.photos?.[0];
  const addr = property.address;
  const addressLine = `${addr.city}, ${addr.state}`;

  return (
    <Link
      href={`/properties/${property._id}`}
      id={`property-card-${property._id}`}
      className="group flex flex-col rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/50 hover:-translate-y-0.5"
    >
      {/* Thumbnail */}
      <div className="relative h-44 bg-slate-800 overflow-hidden">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={`${property.name} thumbnail`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
            </svg>
          </div>
        )}

        {/* Active badge */}
        <div className="absolute top-3 right-3">
          {property.isActive ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 backdrop-blur-sm border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/80 text-slate-400 backdrop-blur-sm">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        <div>
          <h2 className="font-bold text-slate-100 text-base leading-snug line-clamp-1 group-hover:text-blue-400 transition-colors">
            {property.name}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <span className="truncate">{addressLine}</span>
          </p>
        </div>

        <div className="flex items-center gap-4 mt-auto pt-3 border-t border-slate-800">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-100">{property.unitCount}</span>
            <span className="text-xs text-slate-500">Unit{property.unitCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-100">{property.occupancyRate}%</span>
            <span className="text-xs text-slate-500">Occupancy</span>
          </div>
          {/* Occupancy bar */}
          <div className="flex-1 ml-auto">
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-700"
                style={{ width: `${property.occupancyRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

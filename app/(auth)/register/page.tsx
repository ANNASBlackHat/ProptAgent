'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function RegisterPage() {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { name, email, companyName, phone, password, confirmPassword } = formData;

    // Simple validation
    if (!name || !email || !companyName || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name,
        email,
        companyName,
        phone,
        password,
      });
      // AuthProvider layout will handle the redirect automatically
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-emerald-400 bg-clip-text text-transparent">
            PropAgent
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Create your landlord account to start screening tenants with AI
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="name" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                disabled={isSubmitting}
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isSubmitting}
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm"
                placeholder="john@company.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="companyName" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Company Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                disabled={isSubmitting}
                value={formData.companyName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm"
                placeholder="Apex Rentals Ltd."
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="phone" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                disabled={isSubmitting}
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm"
                placeholder="+1 (555) 019-2834"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password <span className="text-rose-400">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                disabled={isSubmitting}
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                disabled={isSubmitting}
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all duration-200 text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none text-sm"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Creating account...
              </>
            ) : (
              'Create Landlord Account'
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800/60 pt-6">
          <p className="text-sm text-slate-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

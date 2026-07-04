"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mockupTab, setMockupTab] = useState<'screening' | 'management'>('screening');

  const features = [
    {
      emoji: '🏘️',
      title: 'Property & Unit Management',
      description: 'Easily track multi-family or single-family properties. Manage unit lists, occupancy statuses, rent rates, and key metrics in one central dashboard.',
    },
    {
      emoji: '🤖',
      title: 'AI Tenant Screening Interview',
      description: 'Automate tenant screening with interactive, conversational AI interviews. Assess applicant reliability, lifestyle preferences, and rental history hands-free.',
    },
    {
      emoji: '📊',
      title: 'Smart Applicant Scoring',
      description: 'Receive instant, comprehensive applicant dossiers containing automated credit-to-income checks, verification status, and an intelligent AI fit score.',
    },
    {
      emoji: '📋',
      title: 'Lease Management',
      description: 'Generate customizable, digital lease agreements. Track lease terms, start/end dates, monthly rent schedules, security deposit holdings, and renewals.',
    },
    {
      emoji: '🔧',
      title: 'Maintenance Requests',
      description: 'Accept structured maintenance tickets directly from tenants. Upload reference photos, assign trusted local vendors, and monitor tasks to completion.',
    },
    {
      emoji: '⚙️',
      title: 'Multi-Provider AI Support',
      description: 'Seamlessly configure your choice of AI models (GPT-4o, Claude, etc.) and tailor system prompts to align with your screening rules and guidelines.',
    },
  ];

  return (
    <div className="relative min-h-screen bg-neutral-50 text-neutral-900 overflow-x-hidden scroll-smooth">
      {/* Background decorative glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-[800px] left-1/4 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* HEADER / NAV */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-neutral-200/60 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-200">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-tight text-neutral-900 group-hover:text-primary transition-colors">
                  PropAgent
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm font-medium text-neutral-600 hover:text-primary transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm font-medium text-neutral-600 hover:text-primary transition-colors">
                How It Works
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-neutral-600 hover:text-primary transition-colors">
                Pricing
              </Link>
              <Link href="#tech-stack" className="text-sm font-medium text-neutral-600 hover:text-primary transition-colors">
                Tech Stack
              </Link>
            </nav>

            {/* CTA Button */}
            <div className="hidden md:flex items-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-primary/10 active:scale-98"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                aria-controls="mobile-menu"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 border-b border-neutral-200/60 backdrop-blur-md animate-slideIn" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-base font-medium text-neutral-600 hover:text-primary hover:bg-neutral-50 transition-all"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-base font-medium text-neutral-600 hover:text-primary hover:bg-neutral-50 transition-all"
              >
                How It Works
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-base font-medium text-neutral-600 hover:text-primary hover:bg-neutral-50 transition-all"
              >
                Pricing
              </Link>
              <Link
                href="#tech-stack"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-base font-medium text-neutral-600 hover:text-primary hover:bg-neutral-50 transition-all"
              >
                Tech Stack
              </Link>
              <div className="pt-4 pb-2 border-t border-neutral-100 px-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center px-4 py-2.5 text-base font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-sm transition-all"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6 tracking-wide uppercase">
            🚀 The Next Generation of Property Management
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl md:text-6xl max-w-4xl mx-auto leading-tight sm:leading-none">
            AI-Powered Tenant Screening &{" "}
            <span className="bg-gradient-to-r from-primary via-indigo-600 to-primary bg-clip-text text-transparent">
              Property Management
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            Screen tenants with AI interviews, manage properties, leases, and maintenance — all in one platform.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5 active:scale-98 active:translate-y-0"
            >
              View Demo
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-neutral-700 bg-white hover:bg-neutral-100 hover:text-neutral-900 rounded-xl border border-neutral-300 transition-all duration-200 hover:shadow-sm"
            >
              Learn More
            </Link>
          </div>

          {/* Landlord Trust Factor */}
          <div className="mt-8 flex items-center justify-center gap-4 text-xs font-medium text-neutral-400">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              No credit card required
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Fully Automated
            </span>
          </div>

          {/* HERO SCREENSHOT / MOCKUP CONTAINER */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="p-2 sm:p-3 bg-neutral-200/70 border border-neutral-300/50 rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-sm">
              <div className="relative bg-slate-900 text-slate-100 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex flex-col min-h-[500px]">
                {/* Mockup Top Window Bar */}
                <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 block" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80 block" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80 block" />
                  </div>
                  <div className="bg-slate-900 border border-slate-800/80 text-[11px] text-slate-400 font-mono px-6 py-0.5 rounded-md max-w-xs truncate">
                    app.propagent.ai/dashboard
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Mockup Tabs */}
                    <button
                      onClick={() => setMockupTab('screening')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        mockupTab === 'screening'
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      AI Screening View
                    </button>
                    <button
                      onClick={() => setMockupTab('management')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        mockupTab === 'management'
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Operations View
                    </button>
                  </div>
                </div>

                {/* Mockup Body Content */}
                <div className="flex-1 flex flex-col md:flex-row text-left font-sans">
                  {/* Left Side: Mockup Sidebar (only visible on md+) */}
                  <div className="hidden md:flex flex-col w-56 bg-slate-950/40 border-r border-slate-800/60 p-4 shrink-0">
                    <div className="flex items-center gap-2 mb-6 px-1">
                      <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-[10px] font-bold text-white">
                        PA
                      </div>
                      <span className="text-xs font-bold text-slate-200">PropAgent Pro</span>
                    </div>
                    <nav className="space-y-1 flex-1">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Management</div>
                      <div className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${mockupTab === 'management' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-slate-200'}`}>
                        🏘️ Properties
                      </div>
                      <div className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${mockupTab === 'screening' ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-slate-200'}`}>
                        🤖 AI Screening
                      </div>
                      <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200">
                        📋 Leases
                      </div>
                      <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200">
                        🔧 Maintenance
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 pt-4 mb-2">Settings</div>
                      <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200">
                        ⚙️ AI Config
                      </div>
                    </nav>
                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 mt-auto">
                      <div className="text-[10px] text-slate-400">Total Properties</div>
                      <div className="text-sm font-bold text-slate-200">12 Properties</div>
                    </div>
                  </div>

                  {/* Main Work Area */}
                  <div className="flex-1 p-4 sm:p-6 bg-slate-900/50 flex flex-col gap-6 overflow-y-auto">
                    {mockupTab === 'screening' ? (
                      /* Tab 1: AI Screening */
                      <div className="grid lg:grid-cols-12 gap-6 flex-1 items-stretch">
                        {/* Applicant Card */}
                        <div className="lg:col-span-5 flex flex-col gap-4">
                          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center font-bold text-white text-sm">
                                SJ
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-100">Sarah Jenkins</h4>
                                <p className="text-[11px] text-slate-400">sarah.j@acme.com</p>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Applying for:</span>
                                <span className="font-semibold text-slate-200">Oakridge Oaks - Apt 4B</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Monthly Rent:</span>
                                <span className="font-semibold text-slate-200">$2,500/mo</span>
                              </div>
                            </div>
                          </div>

                          {/* Verification Metrics */}
                          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex-1 flex flex-col justify-between">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">AI Screening Score</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  96% Match
                                </span>
                              </div>
                              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '96%' }} />
                              </div>
                              
                              <div className="space-y-2 pt-2 text-[11px]">
                                <div className="flex items-center justify-between text-slate-300">
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Credit-to-Income Check
                                  </span>
                                  <span className="font-mono text-emerald-400">PASS (3.4x)</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-300">
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Background Verification
                                  </span>
                                  <span className="font-mono text-emerald-400">PASS (Verified)</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-300">
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Reference Checks
                                  </span>
                                  <span className="font-mono text-emerald-400">COMPLETED</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t border-slate-800/80">
                              <button className="w-full py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg border border-primary/20 transition-all text-center">
                                View Full Application
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* AI Interview Chat Stream */}
                        <div className="lg:col-span-7 flex flex-col bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden">
                          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live Screening Interview
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">ID: scr_98f82a</span>
                          </div>

                          <div className="flex-1 p-3 space-y-3 overflow-y-auto text-xs max-h-[220px]">
                            {/* AI Message */}
                            <div className="flex gap-2 items-start">
                              <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                                AI
                              </div>
                              <div className="p-2.5 bg-slate-900 rounded-r-xl rounded-bl-xl border border-slate-800 text-slate-300 max-w-[85%]">
                                Hello Sarah. Thank you for completing your background info. Can you tell me a little about your work schedule and if you smoke or have pets?
                              </div>
                            </div>

                            {/* User Message */}
                            <div className="flex gap-2 items-start justify-end">
                              <div className="p-2.5 bg-primary/10 text-slate-200 rounded-l-xl rounded-br-xl border border-primary/10 text-slate-300 max-w-[85%]">
                                Sure! I work as a software engineer at Acme. I mostly work from home but go to the office 1 day a week. I don&apos;t smoke and don&apos;t have any pets.
                              </div>
                              <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                                SJ
                              </div>
                            </div>

                            {/* AI Message */}
                            <div className="flex gap-2 items-start">
                              <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                                AI
                              </div>
                              <div className="p-2.5 bg-slate-900 rounded-r-xl rounded-bl-xl border border-slate-800 text-slate-300 max-w-[85%]">
                                Perfect. Also, how do you handle maintenance reports? Have you had any issues in previous rentals with lease terms?
                              </div>
                            </div>
                          </div>

                          {/* Analysis Summary */}
                          <div className="p-3 bg-slate-900 border-t border-slate-800">
                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                              <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">AI Evaluation Summary</div>
                              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                                Applicant represents a highly stable rental profile. Verified employment with Acme Corp. Confirming clean record, quiet lifestyle matching unit guidelines. Recommendation: <strong>Approve Application</strong>.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Tab 2: Operations & Properties */
                      <div className="grid lg:grid-cols-12 gap-6 flex-1 items-stretch">
                        {/* Properties List */}
                        <div className="lg:col-span-6 flex flex-col gap-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Properties</h4>
                          
                          <div className="space-y-3">
                            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                              <div>
                                <h5 className="text-xs font-bold text-slate-200">Oakridge Oaks — Apt 4B</h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">2 beds · 2 baths · 1,100 sqft</p>
                              </div>
                              <div className="text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Occupied</span>
                                <p className="text-xs font-semibold text-slate-300 mt-1">$2,500/mo</p>
                              </div>
                            </div>

                            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                              <div>
                                <h5 className="text-xs font-bold text-slate-200">Oakridge Oaks — Apt 1A</h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">1 bed · 1 bath · 750 sqft</p>
                              </div>
                              <div className="text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending Application</span>
                                <p className="text-xs font-semibold text-slate-300 mt-1">$1,800/mo</p>
                              </div>
                            </div>

                            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                              <div>
                                <h5 className="text-xs font-bold text-slate-200">Sunset Heights — Townhouse 12</h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">3 beds · 2.5 baths · 1,600 sqft</p>
                              </div>
                              <div className="text-right">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">Vacant</span>
                                <p className="text-xs font-semibold text-slate-300 mt-1">$3,200/mo</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Operations / Leases & Maintenance */}
                        <div className="lg:col-span-6 flex flex-col gap-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Maintenance & Actions</h4>

                          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex-1 space-y-4">
                            {/* Maintenance ticket mockup */}
                            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">🔧</span>
                                  <div>
                                    <h5 className="text-xs font-bold text-slate-200">Kitchen Sink Pipe Leaking</h5>
                                    <p className="text-[10px] text-slate-400">Oakridge Oaks - 4B · Sarah Jenkins</p>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">In Progress</span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-2 bg-slate-950 p-2 rounded">
                                Status: Plumber assigned. Scheduled visit: Mon, July 6 at 10:00 AM.
                              </p>
                            </div>

                            {/* Lease ticket mockup */}
                            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">📋</span>
                                  <div>
                                    <h5 className="text-xs font-bold text-slate-200">Active Lease Agreement</h5>
                                    <p className="text-[10px] text-slate-400">Expires July 31, 2027</p>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                              </div>
                              <div className="mt-3 flex items-center justify-between text-[10px]">
                                <span className="text-slate-500">Auto-Rent Collection</span>
                                <span className="text-emerald-400 font-semibold">Enabled (Stripe)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 bg-white border-y border-neutral-200/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Enterprise-Grade Features</h2>
            <h3 className="text-3xl font-extrabold text-neutral-900 sm:text-4xl">
              Everything you need to manage properties smarter
            </h3>
            <p className="mt-4 text-base text-neutral-500">
              Stop chasing paper applications and coordinating phone tags. Let PropAgent orchestrate your workflow automatically.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group relative p-8 bg-neutral-50 rounded-2xl border border-neutral-200/70 hover:border-primary/20 hover:bg-white hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200/60 shadow-sm flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-300 mb-6">
                  {feature.emoji}
                </div>
                <h4 className="text-lg font-bold text-neutral-900 group-hover:text-primary transition-colors duration-200 mb-2">
                  {feature.title}
                </h4>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 relative bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Seamless Process</h2>
            <h3 className="text-3xl font-extrabold text-neutral-900 sm:text-4xl">
              How PropAgent Works
            </h3>
            <p className="mt-4 text-base text-neutral-500">
              Simplify tenant screening and leasing into three quick, fully guided operations.
            </p>
          </div>

          {/* Steps Grid */}
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center px-4 relative group">
              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-neutral-200 shadow-sm flex items-center justify-center font-extrabold text-xl text-neutral-400 group-hover:border-primary group-hover:text-primary transition-colors duration-300 mb-6">
                1
              </div>
              <h4 className="text-lg font-bold text-neutral-900 mb-2">List your property</h4>
              <p className="text-sm text-neutral-500 leading-relaxed max-w-xs">
                Add your properties and units to the dashboard. Generate and share a unique, secure application link with prospects.
              </p>
              {/* Connector Arrow for md+ */}
              <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-neutral-200 group-hover:bg-primary/30 transition-colors duration-300" />
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center px-4 relative group">
              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-neutral-200 shadow-sm flex items-center justify-center font-extrabold text-xl text-neutral-400 group-hover:border-primary group-hover:text-primary transition-colors duration-300 mb-6">
                2
              </div>
              <h4 className="text-lg font-bold text-neutral-900 mb-2">Applicant applies</h4>
              <p className="text-sm text-neutral-500 leading-relaxed max-w-xs">
                Applicants submit basic details online. Our interactive AI agent conducts a customized, conversational interview immediately.
              </p>
              {/* Connector Arrow for md+ */}
              <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-neutral-200 group-hover:bg-primary/30 transition-colors duration-300" />
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center px-4 relative group">
              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-neutral-200 shadow-sm flex items-center justify-center font-extrabold text-xl text-neutral-400 group-hover:border-primary group-hover:text-primary transition-colors duration-300 mb-6">
                3
              </div>
              <h4 className="text-lg font-bold text-neutral-900 mb-2">Review AI score</h4>
              <p className="text-sm text-neutral-500 leading-relaxed max-w-xs">
                Review the candidate dossier, read interview logs, analyze applicant compatibility scores, and click approve to create the lease.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TECH STACK SECTION */}
      <section id="tech-stack" className="py-16 bg-white border-t border-neutral-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-8">Modern SaaS Infrastructure</h2>
          
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-neutral-900 text-white border border-neutral-800 hover:scale-105 transition-transform duration-200">
              Next.js
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-200/60 hover:scale-105 transition-transform duration-200">
              MongoDB
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-violet-500/10 text-violet-700 border border-violet-200/60 hover:scale-105 transition-transform duration-200">
              OpenAI
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-cyan-500/10 text-cyan-700 border border-cyan-200/60 hover:scale-105 transition-transform duration-200">
              Tailwind CSS
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-blue-500/10 text-blue-700 border border-blue-200/60 hover:scale-105 transition-transform duration-200">
              Docker
            </span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-neutral-900 text-neutral-400 py-12 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo Left */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">PropAgent</span>
            </div>

            {/* Copyright Center */}
            <div className="text-xs font-medium">
              PropAgent &copy; 2025. All rights reserved.
            </div>

            {/* Links Right */}
            <nav className="flex items-center gap-6 text-xs font-semibold">
              <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              <a href="#" className="hover:text-white transition-colors">Documentation</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
              <a href="https://codecanyon.net" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                CodeCanyon
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

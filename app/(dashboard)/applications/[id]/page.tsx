'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ApplicationStatusBadge from '@/components/ApplicationStatusBadge';
import { ApplicationStatus } from '@/models/Application';
import AIScoreCard from '@/components/AIScoreCard';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FullApplication {
  _id: string;
  tenantInfo: {
    name: string;
    email: string;
    phone: string;
    currentAddress: string;
    moveInDate: string;
  };
  employment: {
    status: string;
    employer?: string;
    jobTitle?: string;
    monthlyIncome?: number;
    employmentDuration?: string;
  };
  references: Array<{
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }>;
  additionalNotes?: string;
  status: ApplicationStatus;
  interviewStatus?: 'not_started' | 'sent' | 'in_progress' | 'completed';
  applicationLink: string;
  aiScreeningStarted: boolean;
  aiTranscript: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
  aiScore?: {
    overall: number | null;
    incomeStability: number | null;
    communicationClarity: number | null;
    rentalHistorySignals: number | null;
    redFlags: string[];
    recommendation: 'shortlist' | 'review_manually' | 'decline';
    scoreSummary?: string;
    scoredAt: string;
  };
  statusHistory: Array<{
    status: ApplicationStatus;
    changedAt: string;
    changedBy?: { name: string; email: string };
    note?: string;
  }>;
  unitId?: {
    unitNumber: string;
    type: string;
    rentAmount: number;
    depositAmount?: number;
    sizeSqft?: number;
  };
  propertyId?: {
    name: string;
    address: { street: string; city: string; state: string };
  };
  createdAt: string;
}

const VALID_STATUSES: ApplicationStatus[] = [
  'pending', 'shortlisted', 'under_review', 'approved', 'declined',
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-800/50 last:border-0">
      <span className="text-slate-500 text-sm min-w-[140px]">{label}</span>
      <span className="text-slate-200 text-sm">{value}</span>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 7 ? 'bg-emerald-500' : value >= 4 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-semibold">{value}/10</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${(value / 10) * 100}%` }} />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [application, setApplication] = useState<FullApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState<ApplicationStatus>('pending');
  const [statusNote, setStatusNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isStartingAI, setIsStartingAI] = useState(false);

  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<string[]>(['', '', '', '', '']);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);

  const [isRescoring, setIsRescoring] = useState(false);

  // Poll for AI score once the interview is completed and score is not yet available
  useEffect(() => {
    if (!application) return;

    const needsPolling =
      application.interviewStatus === 'completed' &&
      !application.aiScore;

    if (!needsPolling) return;

    let intervalId: NodeJS.Timeout;

    const pollScore = async () => {
      try {
        const res = await fetch(`/api/applications/${id}/score`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.aiScore) {
            setApplication((prev) => {
              if (!prev) return null;
              return { ...prev, aiScore: data.data.aiScore };
            });
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error('Polling score failed:', err);
      }
    };

    // Poll every 3 seconds
    intervalId = setInterval(pollScore, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [application?.interviewStatus, application?.aiScore, id]);

  const handleRescore = async () => {
    if (!application) return;
    setIsRescoring(true);
    try {
      const res = await fetch(`/api/applications/${id}/score`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Re-scoring failed');
      }
      setApplication((prev) => {
        if (!prev) return null;
        return { ...prev, aiScore: data.data.aiScore };
      });
    } catch (err: any) {
      alert(err.message || 'Failed to re-score application');
    } finally {
      setIsRescoring(false);
    }
  };

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchApplication = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${id}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Not found');
      setApplication(data.data);
      setNewStatus(data.data.status);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load application');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchApplication(); }, [fetchApplication]);

  // ─── Status Update ────────────────────────────────────────────────────────

  const handleStatusSave = async () => {
    if (!application) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: statusNote || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Update failed');
      setApplication((prev) =>
        prev ? { ...prev, status: newStatus, statusHistory: data.data.statusHistory } : prev
      );
      setStatusNote('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── AI Screening ─────────────────────────────────────────────────────────

  const handleStartAI = async () => {
    if (!application || application.aiScreeningStarted) return;
    setIsStartingAI(true);
    try {
      const res = await fetch(`/api/applications/${id}/start-screening`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to start AI screening');
      alert('AI Screening started! An email invitation has been sent to the applicant.');
      await fetchApplication();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to start AI screening');
    } finally {
      setIsStartingAI(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/landlord/screening-questions');
      const data = await res.json();
      if (res.ok && data.success) {
        const questions = [...data.data.questions];
        while (questions.length < 5) {
          questions.push('');
        }
        setCustomQuestions(questions);
      }
    } catch (err) {
      console.error('Failed to fetch custom questions:', err);
    }
  };

  const handleSaveQuestions = async () => {
    setIsSavingQuestions(true);
    try {
      const sanitized = customQuestions.filter((q) => q.trim() !== '');
      const res = await fetch('/api/landlord/screening-questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: sanitized }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save questions');
      }
      setShowQuestionsModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save questions');
    } finally {
      setIsSavingQuestions(false);
    }
  };

  // ─── Render: Loading / Error ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-4">{error || 'Application not found'}</p>
          <Link href="/applications" className="text-blue-400 hover:text-blue-300 text-sm underline">
            Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  const ai = application.aiScore;
  const addr = application.propertyId?.address;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/applications" className="hover:text-slate-300 transition-colors">Applications</Link>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-slate-300 truncate max-w-xs">{application.tenantInfo.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{application.tenantInfo.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <ApplicationStatusBadge status={application.status} />
              {application.interviewStatus && application.interviewStatus !== 'not_started' && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  application.interviewStatus === 'sent' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  application.interviewStatus === 'in_progress' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  Interview: {application.interviewStatus === 'in_progress' ? 'In Progress' : application.interviewStatus === 'sent' ? 'Sent' : 'Completed'}
                </span>
              )}
              {application.propertyId && (
                <span className="text-slate-400 text-sm">
                  {application.propertyId.name}
                  {application.unitId && ` · Unit ${application.unitId.unitNumber}`}
                </span>
              )}
              <span className="text-slate-500 text-xs">
                Applied {new Date(application.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* AI Screening Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                fetchQuestions();
                setShowQuestionsModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-sm font-medium transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.992a7.723 7.723 0 0 1 0-.255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Screening Questions
            </button>

            <button
              id="start-ai-screening-btn"
              type="button"
              onClick={handleStartAI}
              disabled={application.aiScreeningStarted || isStartingAI}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 hover:text-purple-300 text-sm font-semibold border border-purple-500/30 hover:border-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStartingAI ? (
                <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              )}
              {application.aiScreeningStarted ? 'AI Screening Started' : 'Start AI Screening'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: Form data ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Personal Info */}
            <SectionCard title="Personal Information">
              <InfoRow label="Full Name" value={application.tenantInfo.name} />
              <InfoRow label="Email" value={application.tenantInfo.email} />
              <InfoRow label="Phone" value={application.tenantInfo.phone} />
              <InfoRow label="Current Address" value={application.tenantInfo.currentAddress} />
              <InfoRow label="Desired Move-in" value={new Date(application.tenantInfo.moveInDate).toLocaleDateString()} />
            </SectionCard>

            {/* Employment */}
            <SectionCard title="Employment">
              <InfoRow label="Status" value={application.employment.status.replace('_', ' ')} />
              {application.employment.employer && <InfoRow label="Employer" value={application.employment.employer} />}
              {application.employment.jobTitle && <InfoRow label="Job Title" value={application.employment.jobTitle} />}
              {application.employment.monthlyIncome !== undefined && (
                <InfoRow label="Monthly Income" value={`$${application.employment.monthlyIncome.toLocaleString()}`} />
              )}
              {application.employment.employmentDuration && (
                <InfoRow label="Duration" value={application.employment.employmentDuration} />
              )}
            </SectionCard>

            {/* References */}
            {application.references.length > 0 && (
              <SectionCard title="References">
                {application.references.map((ref, i) => (
                  <div key={i} className="py-3 border-b border-slate-800/50 last:border-0">
                    <p className="font-semibold text-slate-200 text-sm">{ref.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{ref.relationship} · {ref.phone}{ref.email ? ` · ${ref.email}` : ''}</p>
                  </div>
                ))}
              </SectionCard>
            )}

            {/* Additional Notes */}
            {application.additionalNotes && (
              <SectionCard title="Additional Notes">
                <p className="text-slate-300 text-sm leading-relaxed">{application.additionalNotes}</p>
              </SectionCard>
            )}

            {/* Unit Info */}
            {application.unitId && (
              <SectionCard title="Unit Details">
                <InfoRow label="Unit" value={`${application.unitId.unitNumber} (${application.unitId.type?.toUpperCase()})`} />
                <InfoRow label="Monthly Rent" value={`$${application.unitId.rentAmount.toLocaleString()}`} />
                {application.unitId.depositAmount && (
                  <InfoRow label="Deposit" value={`$${application.unitId.depositAmount.toLocaleString()}`} />
                )}
                {application.unitId.sizeSqft && (
                  <InfoRow label="Size" value={`${application.unitId.sizeSqft.toLocaleString()} sqft`} />
                )}
                {addr && (
                  <InfoRow label="Address" value={`${addr.street}, ${addr.city}, ${addr.state}`} />
                )}
              </SectionCard>
            )}

            {/* AI Transcript */}
            {application.aiTranscript.length > 0 && (
              <SectionCard title="AI Screening Transcript">
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {application.aiTranscript.map((entry, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${entry.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'}`}
                    >
                      <div
                        className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                          entry.role === 'assistant' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {entry.role === 'assistant' ? 'AI' : 'T'}
                      </div>
                      <div
                        className={`max-w-xs px-3 py-2 rounded-xl text-sm ${
                          entry.role === 'assistant'
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-blue-600/20 text-blue-200 border border-blue-500/20'
                        }`}
                      >
                        <p>{entry.content}</p>
                        <p className="text-[10px] text-slate-600 mt-1">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* ── Right: AI Score + Status + History ── */}
          <div className="space-y-4">
            {/* AI Score Card */}
            {ai ? (
              <AIScoreCard
                score={ai as any}
                onRescore={handleRescore}
                isRescoring={isRescoring}
              />
            ) : application.interviewStatus === 'completed' && !ai ? (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center shadow-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">AI scoring in progress…</p>
                <p className="text-slate-500 text-xs mt-1">Analyzing interview transcript...</p>
              </div>
            ) : application.aiScreeningStarted ? (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center shadow-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">AI screening in progress…</p>
                <p className="text-slate-500 text-xs mt-1">Waiting for applicant to complete the interview.</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center shadow-lg">
                <svg className="w-8 h-8 text-slate-700 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
                <p className="text-slate-500 text-sm font-medium">No AI score yet</p>
                <p className="text-slate-600 text-xs mt-1">Click "Start AI Screening" to generate</p>
              </div>
            )}

            {/* Status Update */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Update Status</h3>
              <div className="space-y-3">
                <select
                  id="status-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {VALID_STATUSES.map((s) => (
                    <option key={s} value={s} className="capitalize">
                      {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
                <textarea
                  id="status-note"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Note (optional)…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
                <button
                  id="save-status-btn"
                  type="button"
                  onClick={handleStatusSave}
                  disabled={isSaving}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : saveSuccess ? (
                    <>✓ Saved</>
                  ) : (
                    'Save Status'
                  )}
                </button>
              </div>
            </div>

            {/* Status History Timeline */}
            {application.statusHistory.length > 0 && (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Status History</h3>
                <div className="space-y-0">
                  {[...application.statusHistory].reverse().map((entry, i) => (
                    <div key={i} className="flex gap-3 pb-4 relative">
                      {/* Timeline line */}
                      {i < application.statusHistory.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-800" />
                      )}
                      <div className="w-5 h-5 mt-0.5 flex-shrink-0 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <ApplicationStatusBadge status={entry.status} />
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(entry.changedAt).toLocaleString()}
                        </p>
                        {entry.changedBy && (
                          <p className="text-xs text-slate-600">by {entry.changedBy.name}</p>
                        )}
                        {entry.note && (
                          <p className="text-xs text-slate-400 mt-1 italic">{entry.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Questions Modal */}
      {showQuestionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-100">Custom Screening Questions</h3>
              <button
                onClick={() => setShowQuestionsModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-slate-400 text-xs mb-4">
              Add up to 5 custom follow-up questions. The AI assistant will weave these into the conversation naturally during the screening.
            </p>
            <div className="space-y-3 mb-6">
              {customQuestions.map((q, idx) => (
                <div key={idx} className="flex gap-3 items-center">
                  <span className="text-slate-500 text-sm font-semibold w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => {
                      const newQs = [...customQuestions];
                      newQs[idx] = e.target.value;
                      setCustomQuestions(newQs);
                    }}
                    placeholder={`Question ${idx + 1} (e.g. Do you plan to have roommates?)`}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowQuestionsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuestions}
                disabled={isSavingQuestions}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingQuestions ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Save Questions'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

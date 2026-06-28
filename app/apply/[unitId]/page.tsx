'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UnitInfo {
  _id: string;
  unitNumber: string;
  type: string;
  sizeSqft?: number;
  rentAmount: number;
  depositAmount?: number;
  description?: string;
}

interface PropertyInfo {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
  };
}

interface FormData {
  // Step 1: Personal
  name: string;
  email: string;
  phone: string;
  currentAddress: string;
  moveInDate: string;
  // Step 2: Employment
  employmentStatus: string;
  employer: string;
  jobTitle: string;
  monthlyIncome: string;
  employmentDuration: string;
  // Step 3: References
  ref1Name: string;
  ref1Relationship: string;
  ref1Phone: string;
  ref1Email: string;
  ref2Name: string;
  ref2Relationship: string;
  ref2Phone: string;
  ref2Email: string;
  // Step 4: Notes
  additionalNotes: string;
}

const INITIAL_FORM: FormData = {
  name: '', email: '', phone: '', currentAddress: '', moveInDate: '',
  employmentStatus: '', employer: '', jobTitle: '', monthlyIncome: '', employmentDuration: '',
  ref1Name: '', ref1Relationship: '', ref1Phone: '', ref1Email: '',
  ref2Name: '', ref2Relationship: '', ref2Phone: '', ref2Email: '',
  additionalNotes: '',
};

const STEPS = ['Personal Info', 'Employment', 'References', 'Review & Submit'];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function InputField({
  label, id, type = 'text', value, onChange, required = false, placeholder = '',
}: {
  label: string; id: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-300">
        {label}{required && <span className="text-blue-400 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
      />
    </div>
  );
}

function SelectField({
  label, id, value, onChange, options, required = false,
}: {
  label: string; id: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-300">
        {label}{required && <span className="text-blue-400 ml-0.5">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-2.5 rounded-xl bg-[#1e293b] border border-white/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all appearance-none"
      >
        <option value="" className="text-slate-500">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function ApplyPage() {
  const params = useParams();
  const unitId = params?.unitId as string;

  const [unit, setUnit] = useState<UnitInfo | null>(null);
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [isLoadingUnit, setIsLoadingUnit] = useState(true);
  const [unitError, setUnitError] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const setField = (field: keyof FormData) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const fetchUnit = useCallback(async () => {
    try {
      const res = await fetch(`/api/apply/${unitId}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Unit unavailable');
      setUnit(data.data.unit);
      setProperty(data.data.property);
    } catch (err: unknown) {
      setUnitError(err instanceof Error ? err.message : 'Failed to load unit info');
    } finally {
      setIsLoadingUnit(false);
    }
  }, [unitId]);

  useEffect(() => { fetchUnit(); }, [fetchUnit]);

  // ─── Validation ────────────────────────────────────────────────────────────

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!form.name.trim()) return 'Full name is required';
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return 'Valid email is required';
      if (!form.phone.trim()) return 'Phone number is required';
      if (!form.currentAddress.trim()) return 'Current address is required';
      if (!form.moveInDate) return 'Desired move-in date is required';
    }
    if (step === 1) {
      if (!form.employmentStatus) return 'Employment status is required';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setSubmitError(err); return; }
    setSubmitError(null);
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => {
    setSubmitError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const references = [];
      if (form.ref1Name && form.ref1Relationship && form.ref1Phone) {
        references.push({
          name: form.ref1Name,
          relationship: form.ref1Relationship,
          phone: form.ref1Phone,
          email: form.ref1Email || undefined,
        });
      }
      if (form.ref2Name && form.ref2Relationship && form.ref2Phone) {
        references.push({
          name: form.ref2Name,
          relationship: form.ref2Relationship,
          phone: form.ref2Phone,
          email: form.ref2Email || undefined,
        });
      }

      const body = {
        tenantInfo: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          currentAddress: form.currentAddress,
          moveInDate: form.moveInDate,
        },
        employment: {
          status: form.employmentStatus,
          employer: form.employer || undefined,
          jobTitle: form.jobTitle || undefined,
          monthlyIncome: form.monthlyIncome ? parseFloat(form.monthlyIncome) : undefined,
          employmentDuration: form.employmentDuration || undefined,
        },
        references,
        additionalNotes: form.additionalNotes || undefined,
      };

      const res = await fetch(`/api/apply/${unitId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Submission failed');
      setApplicationId(data.data.applicationId);
      setIsSuccess(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render: Loading / Error ────────────────────────────────────────────────

  if (isLoadingUnit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
          <p className="text-slate-400 text-sm animate-pulse">Loading application form…</p>
        </div>
      </div>
    );
  }

  if (unitError || !unit || !property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-100 mb-2">Unit Unavailable</h1>
          <p className="text-slate-400 text-sm">{unitError || 'This unit is not currently accepting applications.'}</p>
        </div>
      </div>
    );
  }

  // ─── Render: Success ────────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Application Submitted!</h1>
          <p className="text-slate-400 mb-6">
            Thank you, <strong className="text-slate-200">{form.name}</strong>! Your application for{' '}
            <strong className="text-slate-200">{property.name} — Unit {unit.unitNumber}</strong>{' '}
            has been received.
          </p>
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4 text-left mb-6">
            <p className="text-sm text-slate-400">
              📧 A confirmation email has been sent to{' '}
              <strong className="text-slate-300">{form.email}</strong>.
            </p>
            {applicationId && (
              <p className="text-xs text-slate-500 mt-2">Reference: {applicationId}</p>
            )}
          </div>
          <p className="text-slate-500 text-sm">
            The landlord will review your application and contact you. You can log in to track your application status.
          </p>
        </div>
      </div>
    );
  }

  // ─── Render: Form ───────────────────────────────────────────────────────────

  const addr = property.address;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Rental Application</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">{property.name}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {addr.street}, {addr.city}, {addr.state}, {addr.country}
          </p>
        </div>

        {/* Unit Info Card */}
        <div className="rounded-2xl bg-slate-800/40 border border-slate-700/40 p-4 mb-8 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[120px]">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Unit</p>
            <p className="font-semibold text-slate-100">{unit.unitNumber} · {unit.type.toUpperCase()}</p>
          </div>
          {unit.sizeSqft && (
            <div className="flex-1 min-w-[100px]">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Size</p>
              <p className="font-semibold text-slate-100">{unit.sizeSqft.toLocaleString()} sqft</p>
            </div>
          )}
          <div className="flex-1 min-w-[120px]">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Monthly Rent</p>
            <p className="font-semibold text-emerald-400">${unit.rentAmount.toLocaleString()}</p>
          </div>
          {unit.depositAmount && (
            <div className="flex-1 min-w-[120px]">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Deposit</p>
              <p className="font-semibold text-slate-100">${unit.depositAmount.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                    i < step
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : i === step
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}
                >
                  {i < step ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${i === step ? 'text-blue-400' : i < step ? 'text-slate-300' : 'text-slate-600'}`}>
                  {s}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-400 h-1 rounded-full transition-all duration-500"
              style={{ width: `${((step) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-100 mb-6">{STEPS[step]}</h2>

          {/* Error */}
          {submitError && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {submitError}
            </div>
          )}

          {/* ── Step 1: Personal Info ── */}
          {step === 0 && (
            <div className="space-y-4">
              <InputField label="Full Name" id="name" value={form.name} onChange={setField('name')} required placeholder="Jane Smith" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Email Address" id="email" type="email" value={form.email} onChange={setField('email')} required placeholder="jane@example.com" />
                <InputField label="Phone Number" id="phone" type="tel" value={form.phone} onChange={setField('phone')} required placeholder="+1 555 000 0000" />
              </div>
              <InputField label="Current Address" id="currentAddress" value={form.currentAddress} onChange={setField('currentAddress')} required placeholder="123 Main St, City, State" />
              <InputField label="Desired Move-in Date" id="moveInDate" type="date" value={form.moveInDate} onChange={setField('moveInDate')} required />
            </div>
          )}

          {/* ── Step 2: Employment ── */}
          {step === 1 && (
            <div className="space-y-4">
              <SelectField
                label="Employment Status"
                id="employmentStatus"
                value={form.employmentStatus}
                onChange={setField('employmentStatus')}
                required
                options={[
                  { value: 'employed', label: 'Employed' },
                  { value: 'self_employed', label: 'Self-Employed' },
                  { value: 'unemployed', label: 'Unemployed' },
                  { value: 'student', label: 'Student' },
                  { value: 'retired', label: 'Retired' },
                ]}
              />
              {['employed', 'self_employed'].includes(form.employmentStatus) && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Employer / Company" id="employer" value={form.employer} onChange={setField('employer')} placeholder="Acme Corp" />
                    <InputField label="Job Title" id="jobTitle" value={form.jobTitle} onChange={setField('jobTitle')} placeholder="Software Engineer" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Monthly Income (USD)" id="monthlyIncome" type="number" value={form.monthlyIncome} onChange={setField('monthlyIncome')} placeholder="5000" />
                    <InputField label="Employment Duration" id="employmentDuration" value={form.employmentDuration} onChange={setField('employmentDuration')} placeholder="2 years 3 months" />
                  </div>
                </>
              )}
              {['student'].includes(form.employmentStatus) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Institution" id="employer" value={form.employer} onChange={setField('employer')} placeholder="State University" />
                  <InputField label="Monthly Income (if any)" id="monthlyIncome" type="number" value={form.monthlyIncome} onChange={setField('monthlyIncome')} placeholder="0" />
                </div>
              )}
              {['retired'].includes(form.employmentStatus) && (
                <InputField label="Monthly Pension / Income (USD)" id="monthlyIncome" type="number" value={form.monthlyIncome} onChange={setField('monthlyIncome')} placeholder="3000" />
              )}
            </div>
          )}

          {/* ── Step 3: References ── */}
          {step === 2 && (
            <div className="space-y-6">
              <p className="text-slate-400 text-sm">
                Optional — add up to 2 personal or professional references.
              </p>
              {/* Reference 1 */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-300">Reference 1</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField label="Name" id="ref1Name" value={form.ref1Name} onChange={setField('ref1Name')} placeholder="John Doe" />
                  <InputField label="Relationship" id="ref1Relationship" value={form.ref1Relationship} onChange={setField('ref1Relationship')} placeholder="Former Landlord" />
                  <InputField label="Phone" id="ref1Phone" type="tel" value={form.ref1Phone} onChange={setField('ref1Phone')} placeholder="+1 555 000 0000" />
                  <InputField label="Email (optional)" id="ref1Email" type="email" value={form.ref1Email} onChange={setField('ref1Email')} placeholder="john@example.com" />
                </div>
              </div>
              {/* Reference 2 */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-300">Reference 2</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InputField label="Name" id="ref2Name" value={form.ref2Name} onChange={setField('ref2Name')} placeholder="Jane Smith" />
                  <InputField label="Relationship" id="ref2Relationship" value={form.ref2Relationship} onChange={setField('ref2Relationship')} placeholder="Employer" />
                  <InputField label="Phone" id="ref2Phone" type="tel" value={form.ref2Phone} onChange={setField('ref2Phone')} placeholder="+1 555 000 0001" />
                  <InputField label="Email (optional)" id="ref2Email" type="email" value={form.ref2Email} onChange={setField('ref2Email')} placeholder="jane@example.com" />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Review + Notes ── */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="space-y-4">
                {/* Personal */}
                <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Personal Info</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-slate-500">Name</span><span className="text-slate-200">{form.name}</span>
                    <span className="text-slate-500">Email</span><span className="text-slate-200">{form.email}</span>
                    <span className="text-slate-500">Phone</span><span className="text-slate-200">{form.phone}</span>
                    <span className="text-slate-500">Move-in</span><span className="text-slate-200">{form.moveInDate}</span>
                    <span className="text-slate-500 col-span-1">Address</span>
                    <span className="text-slate-200 col-span-1 break-words">{form.currentAddress}</span>
                  </div>
                </div>
                {/* Employment */}
                <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Employment</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-slate-500">Status</span><span className="text-slate-200 capitalize">{form.employmentStatus.replace('_', ' ')}</span>
                    {form.employer && <><span className="text-slate-500">Employer</span><span className="text-slate-200">{form.employer}</span></>}
                    {form.jobTitle && <><span className="text-slate-500">Role</span><span className="text-slate-200">{form.jobTitle}</span></>}
                    {form.monthlyIncome && <><span className="text-slate-500">Monthly Income</span><span className="text-slate-200">${parseFloat(form.monthlyIncome).toLocaleString()}</span></>}
                    {form.employmentDuration && <><span className="text-slate-500">Duration</span><span className="text-slate-200">{form.employmentDuration}</span></>}
                  </div>
                </div>
                {/* References */}
                {(form.ref1Name || form.ref2Name) && (
                  <div className="rounded-xl border border-slate-700/40 bg-slate-800/30 p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">References</p>
                    <div className="space-y-2 text-sm">
                      {form.ref1Name && (
                        <p className="text-slate-200">{form.ref1Name} ({form.ref1Relationship}) — {form.ref1Phone}</p>
                      )}
                      {form.ref2Name && (
                        <p className="text-slate-200">{form.ref2Name} ({form.ref2Relationship}) — {form.ref2Phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* Additional Notes */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="additionalNotes" className="text-sm font-medium text-slate-300">
                  Additional Notes <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <textarea
                  id="additionalNotes"
                  value={form.additionalNotes}
                  onChange={(e) => setField('additionalNotes')(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Anything else you'd like the landlord to know..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
                />
                <p className="text-xs text-slate-600 text-right">{form.additionalNotes.length}/2000</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700/50">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className="px-5 py-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Back
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                id="submit-application-btn"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit Application ✓'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          PropAgent · Secure rental application platform
        </p>
      </div>
    </div>
  );
}

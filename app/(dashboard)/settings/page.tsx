'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import PhotoUpload from '@/components/PhotoUpload';

// --- Toast Component for notification feedback ---
interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export default function SettingsPage() {
  const { user, checkSession } = useAuth();
  
  // Navigation Tabs: 'profile' | 'screening' | 'notifications'
  const [activeTab, setActiveTab] = useState<'profile' | 'screening' | 'notifications'>('profile');
  
  // Toast state
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ==========================================
  // TAB 1: Profile State & Actions
  // ==========================================
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Saving states
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Set initial state from user context
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfilePhone(user.phone || '');
      setCompanyName(user.companyName || '');
      setLogoUrl(user.logo || '');
    }
  }, [user]);

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) {
      showToast('Name and Email are required fields.', 'error');
      return;
    }

    setSavingDetails(true);
    try {
      const res = await fetch('/api/landlord/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          phone: profilePhone,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Personal details updated successfully.', 'success');
        await checkSession();
      } else {
        showToast(data.error || 'Failed to update details.', 'error');
      }
    } catch {
      showToast('A network error occurred while updating details.', 'error');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      const res = await fetch('/api/landlord/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          logo: logoUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Company settings updated successfully.', 'success');
        await checkSession();
      } else {
        showToast(data.error || 'Failed to update company settings.', 'error');
      }
    } catch {
      showToast('A network error occurred while updating company settings.', 'error');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showToast('Please fill out all password fields.', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long.', 'error');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/landlord/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Password updated successfully.', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        showToast(data.error || 'Failed to update password.', 'error');
      }
    } catch {
      showToast('A network error occurred while updating password.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // ==========================================
  // TAB 2: Screening Questions State & Actions
  // ==========================================
  const [questions, setQuestions] = useState<string[]>([]);
  const [newQuestionInput, setNewQuestionInput] = useState('');
  const [questionsLimit, setQuestionsLimit] = useState(0);
  const [questionsAllowed, setQuestionsAllowed] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [updatingQuestions, setUpdatingQuestions] = useState(false);

  const fetchQuestionsAndLimits = async () => {
    setQuestionsLoading(true);
    try {
      // Fetch current questions
      const qRes = await fetch('/api/landlord/screening-questions');
      const qData = await qRes.json();
      if (qRes.ok && qData.success) {
        setQuestions(qData.data.questions || []);
      }

      // Fetch plan limits
      const bRes = await fetch('/api/billing/current');
      const bData = await bRes.json();
      if (bRes.ok && bData.success) {
        const limits = bData.data?.plan?.limits;
        setQuestionsLimit(limits?.maxCustomQuestions || 0);
        setQuestionsAllowed(limits?.customScreeningQuestions || false);
      }
    } catch (err) {
      console.error('Failed to load screening questions/limits', err);
    } finally {
      setQuestionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'screening') {
      fetchQuestionsAndLimits();
    }
  }, [activeTab]);

  const saveQuestions = async (updatedList: string[]) => {
    setUpdatingQuestions(true);
    try {
      const res = await fetch('/api/landlord/screening-questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: updatedList }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setQuestions(data.data.questions || []);
        showToast('Screening questions saved successfully.', 'success');
      } else {
        showToast(data.error || 'Failed to save screening questions.', 'error');
      }
    } catch {
      showToast('Network error saving screening questions.', 'error');
    } finally {
      setUpdatingQuestions(false);
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuestion = newQuestionInput.trim();
    if (!cleanQuestion) return;

    if (questions.length >= questionsLimit) {
      showToast(`Plan limit reached. Up to ${questionsLimit} custom questions allowed.`, 'error');
      return;
    }

    const updatedList = [...questions, cleanQuestion];
    setQuestions(updatedList);
    setNewQuestionInput('');
    saveQuestions(updatedList);
  };

  const handleRemoveQuestion = (indexToRemove: number) => {
    const updatedList = questions.filter((_, idx) => idx !== indexToRemove);
    setQuestions(updatedList);
    saveQuestions(updatedList);
  };

  // ==========================================
  // TAB 3: Notifications State & Actions
  // ==========================================
  const [notifNewApp, setNotifNewApp] = useState(true);
  const [notifLeaseExp, setNotifLeaseExp] = useState(true);
  const [notifMaintSub, setNotifMaintSub] = useState(true);
  const [notifPaymentPastDue, setNotifPaymentPastDue] = useState(true);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);

  const fetchNotifPreferences = async () => {
    setNotifsLoading(true);
    try {
      const res = await fetch('/api/landlord/notification-preferences');
      const data = await res.json();
      if (res.ok && data.success) {
        const prefs = data.data.notificationPreferences;
        if (prefs) {
          setNotifNewApp(prefs.newApplication ?? true);
          setNotifLeaseExp(prefs.leaseExpiring ?? true);
          setNotifMaintSub(prefs.maintenanceSubmitted ?? true);
          setNotifPaymentPastDue(prefs.paymentPastDue ?? true);
        }
      }
    } catch (err) {
      console.error('Failed to load notification preferences', err);
    } finally {
      setNotifsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifPreferences();
    }
  }, [activeTab]);

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNotifs(true);
    try {
      const res = await fetch('/api/landlord/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: {
            newApplication: notifNewApp,
            leaseExpiring: notifLeaseExp,
            maintenanceSubmitted: notifMaintSub,
            paymentPastDue: notifPaymentPastDue,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Notification preferences saved successfully.', 'success');
      } else {
        showToast(data.error || 'Failed to save notifications preferences.', 'error');
      }
    } catch {
      showToast('Network error saving notification preferences.', 'error');
    } finally {
      setSavingNotifs(false);
    }
  };

  // Styles constants
  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-slate-200 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-slate-500";
  const btnClass = "px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const cardClass = "bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl mb-6";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Toast feedback */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl backdrop-blur-sm border animate-in slide-in-from-bottom-2 duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/20 border-red-500/30 text-red-300'
          }`}
        >
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your personal details, company logo, screening questionnaire, and email notifications.
        </p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-800/80 mb-8 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-4 text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 border-b-2 ${
            activeTab === 'profile'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          👤 Profile Settings
        </button>
        <button
          onClick={() => setActiveTab('screening')}
          className={`pb-3 px-4 text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 border-b-2 ${
            activeTab === 'screening'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          🤖 AI Screening Questions
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 px-4 text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 border-b-2 ${
            activeTab === 'notifications'
              ? 'border-blue-500 text-blue-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          🔔 Notifications
        </button>
      </div>

      {/* ==========================================
          TAB 1: Profile Settings Content
          ========================================== */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Section 1: Personal Details */}
          <div className={cardClass}>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-100">Personal Details</h2>
              <p className="text-xs text-slate-500 mt-0.5">Update your basic landlord profile contact details.</p>
            </div>
            <form onSubmit={handleUpdateDetails} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className={inputClass}
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className={btnClass} disabled={savingDetails}>
                  {savingDetails ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Details'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Company Settings */}
          <div className={cardClass}>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-100">Company Settings</h2>
              <p className="text-xs text-slate-500 mt-0.5">Customize your brand details shown to applying tenants.</p>
            </div>
            <form onSubmit={handleUpdateCompany} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Company Logo
                </label>
                <div className="mt-1">
                  <PhotoUpload
                    maxFiles={1}
                    existingPhotos={logoUrl ? [logoUrl] : []}
                    onChange={(urls) => setLogoUrl(urls[0] || '')}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className={btnClass} disabled={savingCompany}>
                  {savingCompany ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Company Profile'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: Security & Password */}
          <div className={cardClass}>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-100">Change Password</h2>
              <p className="text-xs text-slate-500 mt-0.5">Ensure your account security by updating your password.</p>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  className={inputClass}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    className={inputClass}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className={inputClass}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Match new password"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className={btnClass} disabled={savingPassword}>
                  {savingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: AI Screening Questions Content
          ========================================== */}
      {activeTab === 'screening' && (
        <div className="space-y-6">
          {questionsLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-slate-400 text-sm">Loading screening settings...</p>
            </div>
          ) : !questionsAllowed ? (
            /* Upgrade Banner if Custom Questions disabled */
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-8 text-center shadow-lg">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto text-2xl mb-4 border border-amber-500/25">
                🤖
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">Custom AI Screening Questions</h2>
              <p className="text-sm text-slate-400 max-w-lg mx-auto mb-6">
                Tailor the AI screening interview by adding your own custom questions. Upgrade your plan to get access to custom screening rules.
              </p>
              <a
                href="/billing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20"
              >
                Upgrade Plan ⚡
              </a>
            </div>
          ) : (
            <div className={cardClass}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5 mb-5 gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Custom Screening Questions</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Manage custom questions that the AI chatbot will ask prospective tenants.</p>
                </div>
                {/* Limits Indicator */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Plan Quota</p>
                  <p className="text-sm font-black text-slate-200">
                    {questions.length} <span className="text-slate-500 font-normal">of</span> {questionsLimit} <span className="text-xs text-slate-400 font-medium">used</span>
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-950 rounded-full h-1.5 mb-6 overflow-hidden border border-slate-900">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (questions.length / questionsLimit) * 100)}%` }}
                />
              </div>

              {/* Add Question Form */}
              <form onSubmit={handleAddQuestion} className="flex gap-2 mb-6">
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Do you have any pets, and if so, what breed?"
                  value={newQuestionInput}
                  onChange={(e) => setNewQuestionInput(e.target.value)}
                  disabled={questions.length >= questionsLimit || updatingQuestions}
                />
                <button
                  type="submit"
                  className={btnClass}
                  disabled={!newQuestionInput.trim() || questions.length >= questionsLimit || updatingQuestions}
                >
                  Add
                </button>
              </form>

              {/* Questions List */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Active Questions</h3>
                {questions.length === 0 ? (
                  <div className="text-center py-8 bg-slate-950/40 rounded-xl border border-slate-900">
                    <p className="text-slate-500 text-sm">No custom screening questions added yet.</p>
                    <p className="text-[11px] text-slate-600 mt-1">Add your first custom question above.</p>
                  </div>
                ) : (
                  questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-4 px-4 py-3 bg-slate-950/40 hover:bg-slate-950/60 border border-slate-800/80 rounded-xl transition-all group"
                    >
                      <div className="flex gap-3">
                        <span className="text-xs font-bold text-slate-600 mt-0.5">{idx + 1}.</span>
                        <p className="text-sm text-slate-200 font-medium leading-relaxed">{q}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/5 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Remove question"
                        disabled={updatingQuestions}
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 3: Notifications Content
          ========================================== */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className={cardClass}>
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-100">Email Notification Preferences</h2>
              <p className="text-xs text-slate-500 mt-0.5">Toggle what events you wish to receive automated email updates for.</p>
            </div>

            {notifsLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-slate-400 text-sm">Loading notification settings...</p>
              </div>
            ) : (
              <form onSubmit={handleSaveNotifications} className="space-y-6">
                <div className="space-y-3">
                  {/* Option 1: New application */}
                  <label className="flex items-center justify-between p-4 bg-slate-950/20 hover:bg-slate-950/40 border border-slate-800/80 rounded-xl transition-all cursor-pointer">
                    <div className="pr-4">
                      <p className="text-sm font-semibold text-slate-200">New application received</p>
                      <p className="text-xs text-slate-500 mt-0.5">Receive an email immediately when a prospective tenant completes their screening.</p>
                    </div>
                    <div className="relative inline-flex items-center shrink-0">
                      <input
                        type="checkbox"
                        checked={notifNewApp}
                        onChange={(e) => setNotifNewApp(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </label>

                  {/* Option 2: Lease expiry */}
                  <label className="flex items-center justify-between p-4 bg-slate-950/20 hover:bg-slate-950/40 border border-slate-800/80 rounded-xl transition-all cursor-pointer">
                    <div className="pr-4">
                      <p className="text-sm font-semibold text-slate-200">Lease expiring soon</p>
                      <p className="text-xs text-slate-500 mt-0.5">Receive reminders 30 days before a tenant's active lease is scheduled to expire.</p>
                    </div>
                    <div className="relative inline-flex items-center shrink-0">
                      <input
                        type="checkbox"
                        checked={notifLeaseExp}
                        onChange={(e) => setNotifLeaseExp(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </label>

                  {/* Option 3: Maintenance request */}
                  <label className="flex items-center justify-between p-4 bg-slate-950/20 hover:bg-slate-950/40 border border-slate-800/80 rounded-xl transition-all cursor-pointer">
                    <div className="pr-4">
                      <p className="text-sm font-semibold text-slate-200">Maintenance request submitted</p>
                      <p className="text-xs text-slate-500 mt-0.5">Get notified when a tenant submits a new repair or maintenance work order.</p>
                    </div>
                    <div className="relative inline-flex items-center shrink-0">
                      <input
                        type="checkbox"
                        checked={notifMaintSub}
                        onChange={(e) => setNotifMaintSub(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </label>

                  {/* Option 4: Payment past due */}
                  <label className="flex items-center justify-between p-4 bg-slate-950/20 hover:bg-slate-950/40 border border-slate-800/80 rounded-xl transition-all cursor-pointer">
                    <div className="pr-4">
                      <p className="text-sm font-semibold text-slate-200">Payment past due reminder</p>
                      <p className="text-xs text-slate-500 mt-0.5">Get urgent email alerts when subscription payment updates fail or are overdue.</p>
                    </div>
                    <div className="relative inline-flex items-center shrink-0">
                      <input
                        type="checkbox"
                        checked={notifPaymentPastDue}
                        onChange={(e) => setNotifPaymentPastDue(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button type="submit" className={btnClass} disabled={savingNotifs}>
                    {savingNotifs ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving Preferences...
                      </>
                    ) : (
                      'Save Notification Preferences'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

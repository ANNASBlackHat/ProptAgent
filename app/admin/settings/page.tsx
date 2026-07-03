'use client';

import React, { useEffect, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailTemplate {
  subject: string;
  body: string;
}

interface Settings {
  appName: string;
  appLogo: string;
  aiProvider: string;
  aiBaseUrl: string;
  aiApiKey: string;
  aiApiKeyConfigured: boolean;
  aiModel: string;
  openaiApiKey: string;
  openaiApiKeyConfigured: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpPassConfigured: boolean;
  smtpFrom: string;
  emailTemplates: {
    applicationConfirmation: EmailTemplate;
    statusChange: EmailTemplate;
    interviewInvitation: EmailTemplate;
    leaseWelcome: EmailTemplate;
    leaseExpiry: EmailTemplate;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl backdrop-blur-sm border animate-in slide-in-from-bottom-2 duration-300 ${
        type === 'success'
          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
          : 'bg-red-500/20 border-red-500/30 text-red-300'
      }`}
    >
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  );
}

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-bold text-slate-100">{title}</h2>
      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

const inputCls =
  'w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all';

const textareaCls =
  'w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all resize-y font-mono leading-relaxed';

function Chip({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(`{{${label}}}`).catch(() => {})}
      title={`Click to copy {{${label}}}`}
      className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/25 text-purple-300 text-xs font-mono hover:bg-purple-500/25 transition-colors cursor-pointer"
    >
      {`{{${label}}}`}
    </button>
  );
}

const TEMPLATE_VARS = {
  applicationConfirmation: ['tenantName', 'propertyName', 'unitNumber', 'appName'],
  statusChange: ['tenantName', 'propertyName', 'unitNumber', 'newStatus', 'appName'],
  interviewInvitation: ['tenantName', 'propertyName', 'unitNumber', 'interviewLink', 'appName'],
  leaseWelcome: ['tenantName', 'propertyName', 'unitNumber', 'startDate', 'appName'],
  leaseExpiry: ['tenantName', 'propertyName', 'unitNumber', 'endDate', 'appName'],
};

const TEMPLATE_LABELS: Record<string, string> = {
  applicationConfirmation: 'Application Confirmation',
  statusChange: 'Status Change',
  interviewInvitation: 'Interview Invitation',
  leaseWelcome: 'Lease Welcome',
  leaseExpiry: 'Lease Expiry Notice',
};

// ─── Tab components ───────────────────────────────────────────────────────────

function GeneralTab({
  settings,
  onChange,
  onSave,
  saving,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-5">
      <SectionHeader title="General Settings" desc="Customize the look and name of your platform" />
      <Field label="App Name">
        <input
          id="settings-app-name"
          type="text"
          value={settings.appName}
          onChange={(e) => onChange({ appName: e.target.value })}
          className={inputCls}
          placeholder="PropAgent"
        />
      </Field>
      <Field label="App Logo" hint="Provide a URL or upload path to your logo image">
        <input
          id="settings-app-logo"
          type="text"
          value={settings.appLogo}
          onChange={(e) => onChange({ appLogo: e.target.value })}
          className={inputCls}
          placeholder="/uploads/logo.png or https://…"
        />
        {settings.appLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.appLogo}
            alt="Preview"
            className="mt-3 h-12 w-auto rounded-lg border border-slate-800 object-contain bg-slate-900 p-1"
          />
        )}
      </Field>
      <div className="pt-2">
        <SaveButton saving={saving} onSave={onSave} />
      </div>
    </div>
  );
}

function AITab({
  settings,
  onChange,
  onSave,
  saving,
  showToast,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onSave: () => void;
  saving: boolean;
  showToast: (message: string, type: 'success' | 'error') => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    provider?: string;
    model?: string;
    response?: string;
    error?: string;
  } | null>(null);

  const getSuggestedModelPlaceholder = (provider: string) => {
    switch (provider) {
      case 'openrouter':
        return 'anthropic/claude-3-haiku';
      case 'gemini':
        return 'gemini-1.5-flash';
      case 'custom':
        return 'enter model name';
      case 'openai':
      default:
        return 'gpt-4o-mini';
    }
  };

  const handleProviderChange = (provider: string) => {
    let baseUrl = '';
    if (provider === 'openai') {
      baseUrl = '';
    } else if (provider === 'openrouter') {
      baseUrl = 'https://openrouter.ai/api/v1';
    } else if (provider === 'gemini') {
      baseUrl = 'https://generativelanguage.googleapis.com/openai/v1';
    } else if (provider === 'custom') {
      baseUrl = '';
    }

    onChange({
      aiProvider: provider,
      aiBaseUrl: baseUrl,
    });
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/settings/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          provider: data.data.provider,
          model: data.data.model,
          response: data.data.response,
        });
        showToast('Connected! Model responded correctly', 'success');
      } else {
        const errorMsg = data.error || 'Test failed';
        setTestResult({
          success: false,
          error: errorMsg,
        });
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Network error';
      setTestResult({
        success: false,
        error: errMsg,
      });
      showToast('Network error', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="AI Configuration" desc="Configure the AI provider, endpoint, and credentials used for tenant screening" />
      
      <Field label="AI Provider">
        <div className="grid grid-cols-2 gap-3 mt-1 sm:grid-cols-4">
          {[
            { id: 'openai', label: 'OpenAI' },
            { id: 'openrouter', label: 'OpenRouter' },
            { id: 'gemini', label: 'Gemini' },
            { id: 'custom', label: 'Custom' },
          ].map((prov) => (
            <label
              key={prov.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                settings.aiProvider === prov.id
                  ? 'bg-purple-500/10 border-purple-500/40 text-purple-200 shadow-md shadow-purple-500/5'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              <input
                id={`settings-ai-provider-${prov.id}`}
                type="radio"
                name="aiProvider"
                value={prov.id}
                checked={settings.aiProvider === prov.id}
                onChange={() => handleProviderChange(prov.id)}
                className="w-4 h-4 text-purple-600 bg-slate-900 border-slate-700 focus:ring-purple-500 focus:ring-offset-slate-900 focus:ring-2"
              />
              <span className="text-sm font-semibold">{prov.label}</span>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Base URL" hint="Leave empty for OpenAI default">
        <input
          id="settings-ai-base-url"
          type="text"
          value={settings.aiBaseUrl || ''}
          onChange={(e) => onChange({ aiBaseUrl: e.target.value })}
          className={inputCls}
          placeholder="https://..."
        />
      </Field>

      <Field
        label="API Key"
        hint={
          settings.aiApiKeyConfigured
            ? 'A key is currently saved. Enter a new value to replace it.'
            : 'Enter your provider API key — stored AES-256 encrypted.'
        }
      >
        <div className="relative">
          <input
            id="settings-ai-key"
            type={showKey ? 'text' : 'password'}
            value={settings.aiApiKey || ''}
            onChange={(e) => onChange({ aiApiKey: e.target.value })}
            className={`${inputCls} pr-12 font-mono`}
            placeholder={settings.aiApiKeyConfigured ? '••••••••' : 'Enter API Key'}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs font-semibold"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
      </Field>

      <Field label="Model" hint="The dynamic model identifier to call.">
        <input
          id="settings-ai-model"
          type="text"
          value={settings.aiModel || ''}
          onChange={(e) => onChange({ aiModel: e.target.value })}
          className={inputCls}
          placeholder={getSuggestedModelPlaceholder(settings.aiProvider || 'openai')}
        />
      </Field>

      {/* Test result */}
      {testResult && (
        <div
          className={`p-4 rounded-xl text-sm border font-medium ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          {testResult.success ? (
            `✓ Connected · Provider: ${testResult.provider || 'Unknown'} · Model: ${testResult.model || 'Unknown'} · Response: ${testResult.response || 'OK'}`
          ) : (
            testResult.error || 'Connection failed'
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          id="test-ai-connection"
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
              Testing…
            </span>
          ) : (
            '⚡ Test AI Connection'
          )}
        </button>
        <SaveButton saving={saving} onSave={onSave} />
      </div>
    </div>
  );
}

function EmailConfigTab({
  settings,
  onChange,
  onSave,
  saving,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [showPass, setShowPass] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/settings/test-email', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.data.message });
      } else {
        setTestResult({ success: false, message: data.error || 'Test failed' });
      }
    } catch {
      setTestResult({ success: false, message: 'Network error' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Email / SMTP Configuration" desc="Configure SMTP to send emails from the platform" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="SMTP Host">
          <input
            id="settings-smtp-host"
            type="text"
            value={settings.smtpHost}
            onChange={(e) => onChange({ smtpHost: e.target.value })}
            className={inputCls}
            placeholder="smtp.sendgrid.net"
          />
        </Field>
        <Field label="SMTP Port">
          <input
            id="settings-smtp-port"
            type="number"
            value={settings.smtpPort}
            onChange={(e) => onChange({ smtpPort: e.target.value })}
            className={inputCls}
            placeholder="587"
          />
        </Field>
        <Field label="SMTP Username">
          <input
            id="settings-smtp-user"
            type="text"
            value={settings.smtpUser}
            onChange={(e) => onChange({ smtpUser: e.target.value })}
            className={inputCls}
            placeholder="apikey"
            autoComplete="off"
          />
        </Field>
        <Field
          label="SMTP Password"
          hint={
            settings.smtpPassConfigured
              ? 'A password is saved. Enter a new value to replace it.'
              : 'Stored encrypted.'
          }
        >
          <div className="relative">
            <input
              id="settings-smtp-pass"
              type={showPass ? 'text' : 'password'}
              value={settings.smtpPass}
              onChange={(e) => onChange({ smtpPass: e.target.value })}
              className={`${inputCls} pr-12`}
              placeholder={settings.smtpPassConfigured ? '••••••••' : 'Password or API key'}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs font-semibold"
            >
              {showPass ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>
      </div>
      <Field label="From Address">
        <input
          id="settings-smtp-from"
          type="email"
          value={settings.smtpFrom}
          onChange={(e) => onChange({ smtpFrom: e.target.value })}
          className={inputCls}
          placeholder="noreply@propagent.com"
        />
      </Field>

      {testResult && (
        <div
          className={`p-3 rounded-xl text-sm border ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          {testResult.success ? '✅ ' : '❌ '}
          {testResult.message}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          id="test-email-connection"
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
              Sending…
            </span>
          ) : (
            '📧 Send Test Email'
          )}
        </button>
        <SaveButton saving={saving} onSave={onSave} />
      </div>
    </div>
  );
}

function EmailTemplatesTab({
  settings,
  onChange,
  onSave,
  saving,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [activeTemplate, setActiveTemplate] = useState<keyof typeof TEMPLATE_VARS>('applicationConfirmation');

  const updateTemplate = (key: keyof Settings['emailTemplates'], field: keyof EmailTemplate, value: string) => {
    onChange({
      emailTemplates: {
        ...settings.emailTemplates,
        [key]: {
          ...settings.emailTemplates[key],
          [field]: value,
        },
      },
    });
  };

  const tpl = settings.emailTemplates[activeTemplate];
  const vars = TEMPLATE_VARS[activeTemplate];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Email Templates"
        desc="Customize the subject and body for each automated email. Click a variable chip to copy it."
      />

      {/* Template selector */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTemplate(key as keyof typeof TEMPLATE_VARS)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
              activeTemplate === key
                ? 'bg-purple-500/20 border-purple-500/30 text-purple-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Variable chips */}
      <div>
        <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
          Available Variables <span className="text-slate-600 normal-case font-normal">(click to copy)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {vars.map((v) => <Chip key={v} label={v} />)}
        </div>
      </div>

      {/* Template editor */}
      <Field label="Subject">
        <input
          id={`template-subject-${activeTemplate}`}
          type="text"
          value={tpl.subject}
          onChange={(e) => updateTemplate(activeTemplate, 'subject', e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Body">
        <textarea
          id={`template-body-${activeTemplate}`}
          value={tpl.body}
          onChange={(e) => updateTemplate(activeTemplate, 'body', e.target.value)}
          className={textareaCls}
          rows={10}
        />
      </Field>

      <div className="pt-2">
        <SaveButton saving={saving} onSave={onSave} />
      </div>
    </div>
  );
}

function SaveButton({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <button
      type="button"
      id="settings-save"
      onClick={onSave}
      disabled={saving}
      className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20"
    >
      {saving ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
          Saving…
        </span>
      ) : (
        'Save Changes'
      )}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'general', label: 'General', icon: '🎨' },
  { id: 'ai', label: 'AI Config', icon: '🤖' },
  { id: 'email', label: 'Email Config', icon: '📮' },
  { id: 'templates', label: 'Email Templates', icon: '✉️' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const DEFAULT_SETTINGS: Settings = {
  appName: 'PropAgent',
  appLogo: '',
  aiProvider: 'openai',
  aiBaseUrl: '',
  aiApiKey: '',
  aiApiKeyConfigured: false,
  aiModel: 'gpt-4o-mini',
  openaiApiKey: '',
  openaiApiKeyConfigured: false,
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
  smtpPassConfigured: false,
  smtpFrom: 'noreply@propagent.com',
  emailTemplates: {
    applicationConfirmation: { subject: '', body: '' },
    statusChange: { subject: '', body: '' },
    interviewInvitation: { subject: '', body: '' },
    leaseWelcome: { subject: '', body: '' },
    leaseExpiry: { subject: '', body: '' },
  },
};

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [apiKeyEdited, setApiKeyEdited] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success) {
        const fetchedData = { ...data.data };
        if (fetchedData.aiApiKeyConfigured) {
          fetchedData.aiApiKey = '';
        }
        setSettings((prev) => ({ ...prev, ...fetchedData }));
        setApiKeyEdited(false);
      }
    } catch {
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (patch: Partial<Settings>) => {
    if (patch.aiApiKey !== undefined) {
      setApiKeyEdited(true);
    }
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<Settings> = { ...settings };
      if (!apiKeyEdited) {
        delete payload.aiApiKey;
      }
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Settings saved successfully', 'success');
        // Re-fetch to get updated masks
        await fetchSettings();
      } else {
        showToast(data.error || 'Failed to save', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative">
      <div className="pointer-events-none fixed top-0 right-0 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 p-6 md:p-8 lg:p-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-6 rounded-full bg-gradient-to-b from-purple-400 to-indigo-500" />
            <h1 className="text-2xl font-black text-slate-100">System Settings</h1>
          </div>
          <p className="text-slate-500 text-sm ml-3">
            Configure AI, email, and platform-wide settings
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500" />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Tab sidebar */}
            <div className="lg:w-48 shrink-0">
              <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    id={`settings-tab-${tab.id}`}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-150 ${
                      activeTab === tab.id
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab content */}
            <div className="flex-1 min-w-0 rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-sm">
              {activeTab === 'general' && (
                <GeneralTab settings={settings} onChange={handleChange} onSave={handleSave} saving={saving} />
              )}
              {activeTab === 'ai' && (
                <AITab settings={settings} onChange={handleChange} onSave={handleSave} saving={saving} showToast={showToast} />
              )}
              {activeTab === 'email' && (
                <EmailConfigTab settings={settings} onChange={handleChange} onSave={handleSave} saving={saving} />
              )}
              {activeTab === 'templates' && (
                <EmailTemplatesTab settings={settings} onChange={handleChange} onSave={handleSave} saving={saving} />
              )}
            </div>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

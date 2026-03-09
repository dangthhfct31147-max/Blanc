import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Check,
  Clock3,
  Copy,
  Globe,
  Loader2,
  Mail,
  Megaphone,
  Save,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Users,
  Wrench,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateSystemAnnouncement } from '../services/geminiService';
import { settingsService } from '../services/settingsService';
import { Dropdown } from './ui/Dropdown';
import { ConfirmActionModal } from './ui/UserModals';
import {
  AdminPage,
  AdminPageHeader,
  AdminSectionCard,
  AdminSectionTitle,
  AdminStatCard,
} from './ui/AdminPrimitives';

type TabId = 'general' | 'notifications' | 'security' | 'announcements';

type PendingConfirm = {
  title: string;
  message: string;
  confirmLabel: string;
  variant?: 'danger' | 'warning' | 'success' | 'info';
  onConfirm: () => Promise<void>;
};

const inputClassName =
  'w-full rounded-[1.15rem] border border-slate-200/80 bg-white/75 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100';

const panelClassName =
  'rounded-[1.3rem] border border-slate-200/80 bg-white/70 px-4 py-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)]';

const ToggleRow = ({
  title,
  description,
  checked,
  onToggle,
  icon: Icon,
  tone = 'teal',
}: {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  icon?: React.ElementType;
  tone?: 'teal' | 'sky' | 'indigo' | 'amber';
}) => {
  const toneClass =
    tone === 'sky'
      ? 'bg-sky-50 text-sky-700'
      : tone === 'indigo'
        ? 'bg-indigo-50 text-indigo-700'
        : tone === 'amber'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-teal-50 text-teal-700';

  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.35rem] border border-slate-200/80 bg-white/78 px-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass}`}>
            <Icon size={18} />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={checked ? 'text-teal-600' : 'text-slate-300'}
        aria-pressed={checked}
        aria-label={title}
      >
        {checked ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
      </button>
    </div>
  );
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null) {
    const typed = error as { response?: { data?: { error?: string } }; message?: string };
    return typed.response?.data?.error || typed.message || fallback;
  }
  return fallback;
};

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [announceTopic, setAnnounceTopic] = useState('');
  const [announceAudience, setAnnounceAudience] = useState('All Users');
  const [generatedAnnouncement, setGeneratedAnnouncement] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState<'all' | 'students' | 'admins'>('all');
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [settings, setSettings] = useState({
    siteName: 'Blanc',
    supportEmail: 'support@blanc.edu.vn',
    maintenanceMode: false,
    emailNotifs: true,
    pushNotifs: false,
    marketingEmails: true,
    twoFactor: true,
    sessionTimeout: '30',
  });
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsService.getAll();
        setSettings({
          siteName: data.general.siteName,
          supportEmail: data.general.supportEmail,
          maintenanceMode: data.general.maintenanceMode,
          emailNotifs: data.notifications.emailNotifications,
          pushNotifs: data.notifications.pushNotifications,
          marketingEmails: data.notifications.marketingEmails,
          twoFactor: data.security.twoFactorRequired,
          sessionTimeout: String(data.security.sessionTimeout),
        });
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    void loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await settingsService.updateGeneral({
        siteName: settings.siteName,
        supportEmail: settings.supportEmail,
        maintenanceMode: settings.maintenanceMode,
      });
      await settingsService.updateNotifications({
        emailNotifications: settings.emailNotifs,
        pushNotifications: settings.pushNotifs,
        marketingEmails: settings.marketingEmails,
      });
      await settingsService.updateSecurity({
        twoFactorRequired: settings.twoFactor,
        sessionTimeout: parseInt(settings.sessionTimeout, 10),
      });
      setIsSaved(true);
      window.setTimeout(() => setIsSaved(false), 2000);
      toast.success('Settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Không thể lưu cài đặt. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleResetSessions = async () => {
    setPendingConfirm({
      title: 'Reset sessions',
      message: 'Bạn có chắc muốn đăng xuất tất cả các phiên làm việc? Tất cả người dùng sẽ phải đăng nhập lại.',
      confirmLabel: 'Reset',
      variant: 'warning',
      onConfirm: async () => {
        setIsResetting(true);
        try {
          const result = await settingsService.resetAllSessions();
          toast.success(`Đã đăng xuất ${result.sessionsCleared} phiên làm việc thành công.`);
        } catch (error) {
          console.error('Failed to reset sessions:', error);
          toast.error('Không thể reset sessions. Vui lòng thử lại.');
        } finally {
          setIsResetting(false);
        }
      },
    });
  };

  const handleGenerateAI = async () => {
    if (!announceTopic) return;
    setIsGenerating(true);
    try {
      const result = await generateSystemAnnouncement(announceTopic, announceAudience);
      setGeneratedAnnouncement(result);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedAnnouncement);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) return;
    setIsSendingTest(true);
    setEmailResult(null);
    try {
      const result = await settingsService.sendTestEmail(testEmail);
      setEmailResult({ success: true, message: result.message });
    } catch (error) {
      setEmailResult({ success: false, message: getErrorMessage(error, 'Không thể gửi email test') });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastSubject || !broadcastContent) {
      toast.error('Vui lòng nhập tiêu đề và nội dung');
      return;
    }
    setPendingConfirm({
      title: 'Broadcast email',
      message: 'Bạn có chắc muốn gửi email này tới tất cả người dùng?',
      confirmLabel: 'Send',
      variant: 'warning',
      onConfirm: async () => {
        setIsBroadcasting(true);
        setEmailResult(null);
        try {
          const result = await settingsService.broadcastEmail({
            subject: broadcastSubject,
            content: broadcastContent,
            audience: broadcastAudience,
          });
          setEmailResult({ success: true, message: result.message });
          setBroadcastSubject('');
          setBroadcastContent('');
          toast.success('Broadcast sent');
        } catch (error) {
          const message = getErrorMessage(error, 'Không thể gửi broadcast');
          setEmailResult({ success: false, message });
          toast.error(message);
        } finally {
          setIsBroadcasting(false);
        }
      },
    });
  };

  const handleUseAnnouncement = () => {
    if (!generatedAnnouncement) return;
    setBroadcastSubject(announceTopic || 'Thông báo từ Blanc');
    setBroadcastContent(generatedAnnouncement);
    setActiveTab('notifications');
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'general', label: 'General', icon: Globe, description: 'Brand, contact, and maintenance state' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email delivery, tests, and broadcasts' },
    { id: 'security', label: 'Security', icon: Shield, description: '2FA, session lifetime, and resets' },
    { id: 'announcements', label: 'AI Announcements', icon: Megaphone, description: 'Generate broadcast-ready drafts' },
  ];

  if (isLoading) {
    return (
      <AdminPage>
        <AdminSectionCard className="flex min-h-[420px] items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            Loading platform settings
          </div>
        </AdminSectionCard>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <ConfirmActionModal
        isOpen={Boolean(pendingConfirm)}
        onClose={() => {
          if (!isConfirmLoading) setPendingConfirm(null);
        }}
        title={pendingConfirm?.title || ''}
        message={pendingConfirm?.message || ''}
        confirmLabel={pendingConfirm?.confirmLabel || 'Confirm'}
        variant={pendingConfirm?.variant || 'warning'}
        onConfirm={() => {
          if (!pendingConfirm) return;
          setIsConfirmLoading(true);
          pendingConfirm.onConfirm().finally(() => {
            setIsConfirmLoading(false);
            setPendingConfirm(null);
          });
        }}
        isLoading={isConfirmLoading}
      />

      <AdminPageHeader
        eyebrow="Platform control"
        title="System settings, communications, and security defaults"
        description="This workspace now assumes same-site deployment with cookie + CSRF auth. Every `VITE_*` value remains public client config only, so secrets stay on the backend."
        actions={
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_-28px_rgba(13,148,136,0.75)] transition ${
              isSaved ? 'bg-emerald-600' : isSaving ? 'bg-teal-400' : 'bg-[linear-gradient(135deg,#0f766e,#0ea5e9)] hover:brightness-105'
            } disabled:cursor-not-allowed`}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : isSaved ? <Check size={16} /> : <Save size={16} />}
            {isSaving ? 'Đang lưu...' : isSaved ? 'Đã lưu' : 'Lưu thay đổi'}
          </button>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard icon={Wrench} label="Maintenance mode" value={settings.maintenanceMode ? 'On' : 'Off'} detail="Public traffic can be paused without changing admin access." tone={settings.maintenanceMode ? 'amber' : 'teal'} />
        <AdminStatCard icon={Mail} label="Email delivery" value={settings.emailNotifs ? 'Enabled' : 'Disabled'} detail="Admin test mail and broadcasts respect this switch." tone="sky" />
        <AdminStatCard icon={ShieldCheck} label="Privileged 2FA" value={settings.twoFactor ? 'Required' : 'Optional'} detail="Applies to privileged account flows handled by the backend." tone="indigo" />
        <AdminStatCard icon={Clock3} label="Session timeout" value={`${settings.sessionTimeout}m`} detail="Cookie session expiry window configured server-side." tone="slate" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <AdminSectionCard className="p-3">
          <nav className="grid gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-[1.35rem] px-4 py-4 text-left transition ${active ? 'bg-[linear-gradient(135deg,rgba(13,148,136,0.1),rgba(14,165,233,0.12))] text-slate-950 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.35)] ring-1 ring-white/70' : 'text-slate-600 hover:bg-white/75'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85 text-teal-700">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{tab.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{tab.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </AdminSectionCard>

        <AdminSectionCard className="space-y-6">
          {activeTab === 'general' ? (
            <>
              <AdminSectionTitle
                title="General platform settings"
                description="Keep brand-facing values and maintenance behaviour aligned with the refreshed frontend."
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label htmlFor="platform-name" className="mb-2 block text-sm font-semibold text-slate-700">
                    Platform name
                  </label>
                  <input
                    id="platform-name"
                    type="text"
                    value={settings.siteName}
                    onChange={(event) => setSettings({ ...settings, siteName: event.target.value })}
                    placeholder="Enter platform name"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label htmlFor="support-email" className="mb-2 block text-sm font-semibold text-slate-700">
                    Support email
                  </label>
                  <input
                    id="support-email"
                    type="email"
                    value={settings.supportEmail}
                    onChange={(event) => setSettings({ ...settings, supportEmail: event.target.value })}
                    placeholder="support@example.com"
                    className={inputClassName}
                  />
                </div>
              </div>
              <ToggleRow
                title="Maintenance mode"
                description="Pause learner-facing access while keeping the admin workspace available for controlled operations."
                checked={settings.maintenanceMode}
                onToggle={() => handleToggle('maintenanceMode')}
                icon={Wrench}
                tone="amber"
              />
              <div className={panelClassName}>
                <p className="text-sm font-semibold text-slate-950">Client configuration rule</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  `VITE_*` variables are readable in the browser bundle. API keys and secret delivery settings stay on the backend only.
                </p>
              </div>
            </>
          ) : null}

          {activeTab === 'notifications' ? (
            <>
              <AdminSectionTitle
                title="Notification delivery"
                description="Control admin email tooling without storing keys or credentials in browser state."
              />
              <div className="grid gap-4">
                <ToggleRow
                  title="Email notifications"
                  description="Enable system updates and outbound email tooling from the admin backend."
                  checked={settings.emailNotifs}
                  onToggle={() => handleToggle('emailNotifs')}
                  icon={Mail}
                  tone="sky"
                />
                <ToggleRow
                  title="Push notifications"
                  description="Keep browser or device push delivery aligned with the notification service."
                  checked={settings.pushNotifs}
                  onToggle={() => handleToggle('pushNotifs')}
                  icon={Bell}
                  tone="teal"
                />
                <ToggleRow
                  title="Marketing emails"
                  description="Allow promotional campaigns in addition to operational system mail."
                  checked={settings.marketingEmails}
                  onToggle={() => handleToggle('marketingEmails')}
                  icon={Megaphone}
                  tone="indigo"
                />
              </div>

              {emailResult ? (
                <div className={`rounded-[1.3rem] border px-4 py-4 text-sm ${emailResult.success ? 'border-emerald-200 bg-emerald-50/80 text-emerald-800' : 'border-rose-200 bg-rose-50/85 text-rose-800'}`}>
                  <div className="flex items-center gap-3">
                    {emailResult.success ? <Check size={18} /> : <AlertCircle size={18} />}
                    <span>{emailResult.message}</span>
                    <button type="button" onClick={() => setEmailResult(null)} className="ml-auto text-current/70 transition hover:text-current">
                      ×
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-6 xl:grid-cols-2">
                <div className={panelClassName}>
                  <div className="mb-4 flex items-center gap-2">
                    <Mail size={18} className="text-sky-700" />
                    <h3 className="text-sm font-semibold text-slate-950">Gửi email test</h3>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(event) => setTestEmail(event.target.value)}
                      placeholder="Nhập email để test..."
                      className={inputClassName}
                    />
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={!testEmail || isSendingTest || !settings.emailNotifs}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[1.1rem] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isSendingTest ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Gửi test
                    </button>
                    {!settings.emailNotifs ? (
                      <p className="flex items-center gap-1 text-xs text-amber-700">
                        <AlertCircle size={12} />
                        Bật Email Notifications để gửi email.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className={panelClassName}>
                  <div className="mb-4 flex items-center gap-2">
                    <Users size={18} className="text-teal-700" />
                    <h3 className="text-sm font-semibold text-slate-950">Broadcast email</h3>
                  </div>
                  <div className="space-y-3">
                    <Dropdown
                      label="Đối tượng"
                      options={[
                        { value: 'all', label: 'Tất cả người dùng', color: 'bg-blue-500' },
                        { value: 'students', label: 'Chỉ sinh viên', color: 'bg-green-500' },
                        { value: 'admins', label: 'Chỉ admin', color: 'bg-purple-500' },
                      ]}
                      value={broadcastAudience}
                      onChange={(value) => setBroadcastAudience(value as typeof broadcastAudience)}
                      placeholder="Chọn đối tượng"
                    />
                    <input
                      type="text"
                      value={broadcastSubject}
                      onChange={(event) => setBroadcastSubject(event.target.value)}
                      placeholder="Tiêu đề email..."
                      className={inputClassName}
                    />
                    <textarea
                      value={broadcastContent}
                      onChange={(event) => setBroadcastContent(event.target.value)}
                      placeholder="Nội dung email... (Dùng {{name}} để chèn tên người nhận)"
                      rows={5}
                      className={`${inputClassName} min-h-[150px] resize-none`}
                    />
                    <button
                      type="button"
                      onClick={handleBroadcast}
                      disabled={!broadcastSubject || !broadcastContent || isBroadcasting || !settings.emailNotifs}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[1.1rem] bg-[linear-gradient(135deg,#0f766e,#0ea5e9)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isBroadcasting ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
                      {isBroadcasting ? 'Đang gửi...' : 'Gửi broadcast'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === 'security' ? (
            <>
              <AdminSectionTitle
                title="Security defaults"
                description="These controls reinforce the cookie + CSRF model by tightening account protection and session lifetime."
              />
              <div className="grid gap-4">
                <ToggleRow
                  title="Require privileged 2FA"
                  description="Require authenticator-app based 2FA for privileged accounts handled by the backend."
                  checked={settings.twoFactor}
                  onToggle={() => handleToggle('twoFactor')}
                  icon={ShieldCheck}
                  tone="indigo"
                />
                <div className={panelClassName}>
                  <Dropdown
                    label="Session timeout (minutes)"
                    options={[
                      { value: '15', label: '15 Minutes' },
                      { value: '30', label: '30 Minutes' },
                      { value: '60', label: '1 Hour' },
                      { value: '120', label: '2 Hours' },
                    ]}
                    value={settings.sessionTimeout}
                    onChange={(value) => setSettings({ ...settings, sessionTimeout: value })}
                    placeholder="Select timeout"
                  />
                </div>
                <div className="rounded-[1.35rem] border border-rose-200 bg-rose-50/80 px-4 py-4">
                  <p className="text-sm font-semibold text-rose-900">Reset all sessions</p>
                  <p className="mt-1 text-sm leading-6 text-rose-700">
                    Force a fresh login for every active account. Useful after credential incidents or policy changes.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetSessions}
                    disabled={isResetting}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isResetting ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                    {isResetting ? 'Đang reset...' : 'Reset all sessions'}
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === 'announcements' ? (
            <>
              <AdminSectionTitle
                title="AI announcement generator"
                description="Generate polished admin-ready copy, then move it straight into the broadcast composer."
              />
              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                  <div className={panelClassName}>
                    <p className="text-sm leading-6 text-slate-500">
                      Use Gemini to draft maintenance notices, campaign messages, or product updates in the same tone as the refreshed frontend.
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Topic / Key message</label>
                    <textarea
                      value={announceTopic}
                      onChange={(event) => setAnnounceTopic(event.target.value)}
                      placeholder="e.g., Scheduled maintenance on Saturday night from 10 PM to 2 AM..."
                      className={`${inputClassName} min-h-[170px] resize-none`}
                    />
                  </div>
                  <Dropdown
                    label="Target audience"
                    options={[
                      { value: 'All Users', label: 'All Users', color: 'bg-blue-500' },
                      { value: 'Students Only', label: 'Students Only', color: 'bg-green-500' },
                      { value: 'Instructors Only', label: 'Instructors Only', color: 'bg-amber-500' },
                      { value: 'Admins Only', label: 'Admins Only', color: 'bg-purple-500' },
                    ]}
                    value={announceAudience}
                    onChange={(value) => setAnnounceAudience(value)}
                    placeholder="Select audience"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={!announceTopic || isGenerating}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-[linear-gradient(135deg,#0f766e,#0ea5e9)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Drafting...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Generate draft
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/75 p-5 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.35)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Preview</p>
                      <p className="mt-1 text-sm text-slate-500">Review before sending through the live broadcast flow.</p>
                    </div>
                    {generatedAnnouncement ? (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={handleUseAnnouncement} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50">
                          <Send size={13} />
                          Dùng cho broadcast
                        </button>
                        <button type="button" onClick={handleCopy} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-50">
                          {copied ? <Check size={13} /> : <Copy size={13} />}
                          {copied ? 'Copied' : 'Copy text'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="min-h-[320px] rounded-[1.3rem] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-700">
                    {generatedAnnouncement ? <div className="whitespace-pre-wrap">{generatedAnnouncement}</div> : <span className="italic text-slate-400">Your generated announcement will appear here...</span>}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </AdminSectionCard>
      </section>
    </AdminPage>
  );
};

export default Settings;

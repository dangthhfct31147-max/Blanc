import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Clock3,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { dashboardService, type DashboardOverview } from '../services/dashboardService';
import {
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminQuickActionCard,
  AdminSectionCard,
  AdminSectionTitle,
  AdminStatCard,
} from './ui/AdminPrimitives';
import { formatRelativeTime } from '../services/notificationService';

const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadOverview = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const next = await dashboardService.getOverview();
        if (isMounted) {
          setOverview(next);
        }
      } catch (err) {
        console.error('Failed to load dashboard overview:', err);
        if (isMounted) {
          setError('Unable to load dashboard data right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = overview?.summary;
  const notifications = overview?.notifications ?? [];
  const trend = overview?.trend ?? [];

  const quickActions = useMemo(
    () => [
      {
        title: 'Review reports',
        description: 'Jump straight into the mentor/admin review queue without hunting through the nav.',
        icon: LayoutDashboard,
        onClick: () => navigate('/reports'),
      },
      {
        title: 'Curate contests',
        description: 'Keep the contest library aligned with the refreshed public experience.',
        icon: Trophy,
        onClick: () => navigate('/contests'),
      },
      {
        title: 'Manage documents',
        description: 'Edit courses and documents where learners will feel the change most quickly.',
        icon: FolderKanban,
        onClick: () => navigate('/courses'),
      },
      {
        title: 'Security triage',
        description: 'Inspect active threats, account locks, and suspicious login pressure.',
        icon: ShieldAlert,
        onClick: () => navigate('/security'),
      },
    ],
    [navigate]
  );

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Operations overview"
        title="One surface for publishing, moderation, and risk"
        description="This dashboard only shows live operational data. If a metric is not backed by the current API surface, it stays out of view."
      />

      {error ? (
        <AdminSectionCard>
          <AdminEmptyState
            icon={AlertTriangle}
            title="Dashboard data unavailable"
            description={error}
          />
        </AdminSectionCard>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          icon={Users}
          label="Total users"
          value={isLoading ? '...' : summary?.totalUsers ?? 0}
          detail={summary ? `${summary.activeUsers} active accounts` : 'Loading live account totals'}
          tone="teal"
        />
        <AdminStatCard
          icon={Trophy}
          label="Active contests"
          value={isLoading ? '...' : summary?.activeContests ?? 0}
          detail={summary ? `${summary.totalCourses} learning entries published` : 'Reading shared platform stats'}
          tone="sky"
        />
        <AdminStatCard
          icon={Bell}
          label="Unread notifications"
          value={isLoading ? '...' : summary?.unreadNotifications ?? 0}
          detail="Fetched from the admin feed on the current backend"
          tone="indigo"
        />
        <AdminStatCard
          icon={ShieldAlert}
          label="Active threats"
          value={isLoading ? '...' : summary?.activeThreatCount ?? 0}
          detail={summary ? `${summary.lockedAccountsCount} locked accounts, ${summary.failureRate} failed-login rate` : 'Loading security pressure'}
          tone={summary && summary.activeThreatCount > 0 ? 'rose' : 'slate'}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <AdminSectionCard>
          <AdminSectionTitle
            title="Failed sign-ins in the last 24 hours"
            description="Derived from the security analysis feed instead of placeholder revenue or mock engagement charts."
          />
          <div className="mt-6 h-[320px]">
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="failedLoginsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d9488" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    width={30}
                  />
                  <Tooltip
                    cursor={{ stroke: '#0d9488', strokeOpacity: 0.15 }}
                    contentStyle={{
                      borderRadius: '18px',
                      border: '1px solid rgba(226, 232, 240, 0.9)',
                      background: 'rgba(255,255,255,0.94)',
                      boxShadow: '0 20px 45px -30px rgba(15,23,42,0.3)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="failedLogins"
                    stroke="#0d9488"
                    strokeWidth={3}
                    fill="url(#failedLoginsFill)"
                    activeDot={{ r: 5, stroke: '#0d9488', strokeWidth: 2, fill: '#ffffff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmptyState
                icon={ShieldAlert}
                title="No trend data available"
                description="The backend did not return enough failed-login history to draw a reliable trend."
              />
            )}
          </div>
        </AdminSectionCard>

        <div className="grid gap-6">
          <AdminSectionCard>
            <AdminSectionTitle
              title="Control signals"
              description="Operational settings pulled from live admin configuration."
            />
            <div className="mt-5 grid gap-3">
              <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/75 px-4 py-4">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-5 w-5 text-teal-700" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Session timeout</p>
                    <p className="text-sm text-slate-500">{summary?.sessionTimeout ?? 30} minutes</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/75 px-4 py-4">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-sky-700" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Privileged 2FA</p>
                    <p className="text-sm text-slate-500">{summary?.twoFactorRequired ? 'Required for privileged accounts' : 'Not enforced globally'}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/75 px-4 py-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Maintenance mode</p>
                    <p className="text-sm text-slate-500">{summary?.maintenanceMode ? 'Currently enabled' : 'Currently disabled'}</p>
                  </div>
                </div>
              </div>
            </div>
          </AdminSectionCard>

          <AdminSectionCard>
            <AdminSectionTitle
              title="Recent admin notifications"
              description="The same feed shown in the header, surfaced here for quick triage."
            />
            <div className="mt-5 space-y-3">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-[1.4rem] border px-4 py-4 ${notification.read ? 'border-slate-200/80 bg-white/70' : 'border-teal-100 bg-[linear-gradient(135deg,rgba(13,148,136,0.08),rgba(14,165,233,0.08))]'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.read ? 'bg-slate-300' : 'bg-teal-500'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{notification.message}</p>
                        <p className="mt-2 text-xs font-medium text-slate-400">{formatRelativeTime(notification.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <AdminEmptyState
                  icon={Bell}
                  title="No recent admin notifications"
                  description="The live feed is currently quiet, so the dashboard keeps this space empty instead of fabricating activity."
                />
              )}
            </div>
          </AdminSectionCard>
        </div>
      </section>

      <AdminSectionCard>
        <AdminSectionTitle
          title="Quick actions"
          description="Shortcuts to the refreshed parts of the admin workspace that most strongly affect the public experience."
        />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <AdminQuickActionCard
              key={action.title}
              icon={action.icon}
              title={action.title}
              description={action.description}
              onClick={action.onClick}
            />
          ))}
        </div>
      </AdminSectionCard>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <AdminStatCard
          icon={Users}
          label="New users this month"
          value={isLoading ? '...' : summary?.newUsersThisMonth ?? 0}
          detail="Admin user stats endpoint"
          tone="amber"
        />
        <AdminStatCard
          icon={BookOpen}
          label="Learning inventory"
          value={isLoading ? '...' : summary?.totalCourses ?? 0}
          detail="Combined course and document-facing catalog count from shared stats"
          tone="sky"
        />
        <AdminStatCard
          icon={MessageSquare}
          label="Review-first workflow"
          value="Live"
          detail="Mentor/admin report queue remains the primary moderation lane"
          tone="indigo"
        />
      </section>
    </AdminPage>
  );
};

export default DashboardHome;

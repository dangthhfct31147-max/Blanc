import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  ExternalLink,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Newspaper,
  RefreshCw,
  Settings,
  ShieldAlert,
  Sparkles,
  Trophy,
  Users,
  Briefcase,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, avatarPresets } from '../utils/avatar';
import {
  notificationService,
  type AdminNotification,
  formatRelativeTime,
} from '../services/notificationService';
import { ConfirmActionModal } from './ui/UserModals';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/contests', label: 'Contests', icon: Trophy },
  { to: '/courses', label: 'Documents', icon: FolderKanban },
  { to: '/community', label: 'Community', icon: MessageSquare },
  { to: '/recruitments', label: 'Recruitments', icon: Briefcase },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/mentors', label: 'Mentors', icon: Users },
  { to: '/mentor-blogs', label: 'Mentor Blogs', icon: BookOpen },
];

const SYSTEM_NAV: NavItem[] = [
  { to: '/security', label: 'Security', icon: ShieldAlert },
  { to: '/audit', label: 'Audit Log', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const MENTOR_NAV: NavItem[] = [{ to: '/reports', label: 'Reports', icon: FileText }];

const PAGE_COPY: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Operations overview',
    description: 'Monitor the platform, triage urgent activity, and jump into the highest-priority workflows.',
  },
  '/reports': {
    title: 'Review reports',
    description: 'Process submissions, review mentor feedback, and keep the quality loop moving.',
  },
  '/users': {
    title: 'User operations',
    description: 'Manage people, roles, balances, and account states from one control surface.',
  },
  '/contests': {
    title: 'Contest operations',
    description: 'Keep contest listings, schedules, prizes, and registration quality aligned with the public site.',
  },
  '/courses': {
    title: 'Learning library',
    description: 'Curate courses and documents with a structure that mirrors the learner-facing experience.',
  },
  '/community': {
    title: 'Community activity',
    description: 'Moderate collaboration posts and keep community momentum healthy.',
  },
  '/recruitments': {
    title: 'Recruitment board',
    description: 'Publish and maintain trusted opportunities without breaking content quality.',
  },
  '/news': {
    title: 'Newsroom',
    description: 'Ship announcements and updates in the same polished voice as the public platform.',
  },
  '/mentors': {
    title: 'Mentor directory',
    description: 'Review mentor visibility, bios, and discovery quality across the platform.',
  },
  '/mentor-blogs': {
    title: 'Mentor stories',
    description: 'Maintain mentor content and keep editorial presentation consistent.',
  },
  '/security': {
    title: 'Security operations',
    description: 'Inspect threats, rate limits, and lockouts without leaving the admin workspace.',
  },
  '/audit': {
    title: 'Audit trail',
    description: 'Track sensitive actions and system changes with a clearer operational timeline.',
  },
  '/settings': {
    title: 'Platform settings',
    description: 'Tune platform-wide behaviors, notifications, and admin-facing configuration safely.',
  },
};

const SidebarLink = ({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) => {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      end={item.to === '/'}
      className={({ isActive }) =>
        [
          'group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-200',
          isActive
            ? 'bg-[linear-gradient(135deg,rgba(13,148,136,0.12),rgba(14,165,233,0.12))] text-slate-950 shadow-[0_16px_35px_-28px_rgba(15,23,42,0.3)] ring-1 ring-white/70'
            : 'text-slate-600 hover:bg-white/70 hover:text-slate-950',
        ].join(' ')
      }
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-colors group-hover:text-teal-700">
        <Icon size={18} />
      </span>
      <span>{item.label}</span>
    </NavLink>
  );
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isMentor = user?.role === 'mentor';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const pageCopy = PAGE_COPY[location.pathname] ?? PAGE_COPY['/'];
  const visibleNav = isMentor ? MENTOR_NAV : MAIN_NAV;

  const userRoleLabel = useMemo(() => {
    if (user?.role === 'super_admin') return 'Super admin';
    if (user?.role === 'mentor') return 'Mentor reviewer';
    return 'Admin operator';
  }, [user?.role]);

  const refreshUnreadCount = useCallback(async () => {
    if (isMentor || typeof document === 'undefined' || document.hidden) {
      return;
    }

    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [isMentor]);

  const fetchNotifications = useCallback(async () => {
    if (isMentor) return;

    try {
      setIsLoadingNotifications(true);
      const response = await notificationService.getNotifications({ limit: 12 });
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [isMentor]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const sync = () => {
      const isDesktop = mediaQuery.matches;
      setSidebarPinned(isDesktop);
      setSidebarOpen(isDesktop);
    };

    sync();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', sync);
      return () => mediaQuery.removeEventListener('change', sync);
    }

    mediaQuery.addListener(sync);
    return () => mediaQuery.removeListener(sync);
  }, []);

  useEffect(() => {
    if (isMentor) return;

    void refreshUnreadCount();

    const handleVisibility = () => {
      if (!document.hidden) {
        void refreshUnreadCount();
      }
    };

    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void refreshUnreadCount();
      }
    }, 45000);

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isMentor, refreshUnreadCount]);

  useEffect(() => {
    if (!showNotifications || isMentor) return;
    void fetchNotifications();
  }, [fetchNotifications, isMentor, showNotifications]);

  useEffect(() => {
    setShowNotifications(false);
    if (!sidebarPinned) {
      setSidebarOpen(false);
    }
  }, [location.pathname, sidebarPinned]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDeleteNotification = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      await notificationService.deleteNotification(id);
      const deleted = notifications.find((item) => item.id === id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      if (deleted && !deleted.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = async (notification: AdminNotification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    setShowNotifications(false);

    if (!notification.link) return;
    if (notification.link.startsWith('/')) {
      navigate(notification.link);
      return;
    }

    window.open(notification.link, '_blank', 'noopener,noreferrer');
  };

  const handleLogoutConfirm = () => setIsLogoutConfirmOpen(true);

  return (
    <div className="admin-shell flex min-h-screen text-slate-900">
      {!sidebarPinned && sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-sm xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-[292px] flex-col border-r border-white/60 bg-white/60 px-4 py-4 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.32)] backdrop-blur-2xl transition-transform duration-300 xl:sticky xl:top-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0',
        ].join(' ')}
      >
        <div className="admin-surface-card px-4 py-4">
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Blanc Logo" className="h-12 w-12 rounded-2xl object-cover shadow-sm" />
              <div>
                <p className="text-base font-bold text-slate-950">Blanc Admin</p>
                <p className="text-sm text-slate-500">Light-glass control center</p>
              </div>
            </div>
            {!sidebarPinned ? (
              <button
                type="button"
                title="Close menu"
                onClick={() => setSidebarOpen(false)}
                className="rounded-2xl border border-white/70 bg-white/85 p-2 text-slate-500 transition-colors hover:text-slate-950"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
          <div className="mt-5 rounded-[1.35rem] border border-white/70 bg-white/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Current access</p>
            <div className="mt-2 flex items-center gap-3">
              <img
                src={getAvatarUrl(user?.avatar, user?.name, avatarPresets.sidebar)}
                alt={user?.name || 'Admin'}
                className="h-11 w-11 rounded-2xl border border-white/70"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{user?.name || 'Admin user'}</p>
                <p className="truncate text-xs text-slate-500">{userRoleLabel}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pb-4">
          <div className="space-y-6">
            <section className="space-y-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
              <div className="space-y-1.5">
                {visibleNav.map((item) => (
                  <SidebarLink
                    key={item.to}
                    item={item}
                    onNavigate={!sidebarPinned ? () => setSidebarOpen(false) : undefined}
                  />
                ))}
              </div>
            </section>

            {!isMentor ? (
              <section className="space-y-2">
                <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">System</p>
                <div className="space-y-1.5">
                  {SYSTEM_NAV.map((item) => (
                    <SidebarLink
                      key={item.to}
                      item={item}
                      onNavigate={!sidebarPinned ? () => setSidebarOpen(false) : undefined}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <a
            href={String(import.meta.env.VITE_PUBLIC_SITE_URL || '/').replace(/\/+$/, '') || '/'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/78 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950"
          >
            <span className="inline-flex items-center gap-2">
              <ExternalLink size={16} className="text-teal-600" />
              Open public site
            </span>
            <Sparkles size={16} className="text-sky-500" />
          </a>

          <button
            type="button"
            onClick={handleLogoutConfirm}
            className="flex w-full items-center justify-between rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100/80"
          >
            <span className="inline-flex items-center gap-2">
              <LogOut size={16} />
              Sign out
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.16em]">Secure</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/70 bg-white/58 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/75 text-slate-600 shadow-sm transition-colors hover:text-slate-950 xl:hidden"
                title="Toggle menu"
              >
                <Menu size={18} />
              </button>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Admin workspace</p>
                <h1 className="truncate text-lg font-semibold text-slate-950 sm:text-xl">{pageCopy.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isMentor ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNotifications((prev) => !prev)}
                    className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/78 text-slate-600 shadow-sm transition-colors hover:text-slate-950"
                    title="Notifications"
                  >
                    <Bell size={18} />
                    {unreadCount > 0 ? (
                      <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    ) : null}
                  </button>

                  {showNotifications ? (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-20 cursor-default"
                        aria-label="Close notifications"
                        onClick={() => setShowNotifications(false)}
                      />
                      <div className="absolute right-0 z-30 mt-3 w-[380px] overflow-hidden rounded-[1.6rem] border border-white/80 bg-white/88 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">Notifications</p>
                            <p className="text-xs text-slate-500">Loaded on demand to keep the shell lighter.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void fetchNotifications()}
                              title="Refresh notifications"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-500 transition-colors hover:text-slate-950"
                            >
                              <RefreshCw size={15} className={isLoadingNotifications ? 'animate-spin' : ''} />
                            </button>
                            {unreadCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => void handleMarkAllAsRead()}
                                className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-950"
                              >
                                Mark all read
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto p-3">
                          {isLoadingNotifications && notifications.length === 0 ? (
                            <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">
                              <div className="flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/80 px-4 py-3">
                                <RefreshCw size={15} className="animate-spin text-teal-600" />
                                Loading notifications
                              </div>
                            </div>
                          ) : notifications.length === 0 ? (
                            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                                <Bell size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">No notifications</p>
                                <p className="mt-1 text-sm text-slate-500">The feed stays empty until something needs your attention.</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {notifications.map((notification) => (
                                <button
                                  key={notification.id}
                                  type="button"
                                  onClick={() => void handleNotificationClick(notification)}
                                  className={[
                                    'group flex w-full items-start gap-3 rounded-[1.25rem] border px-3 py-3 text-left transition-colors',
                                    notification.read
                                      ? 'border-transparent bg-white/55 hover:bg-white/85'
                                      : 'border-teal-100 bg-[linear-gradient(135deg,rgba(13,148,136,0.08),rgba(14,165,233,0.08))]',
                                  ].join(' ')}
                                >
                                  <div className={`mt-1 h-2.5 w-2.5 rounded-full ${notification.read ? 'bg-slate-200' : 'bg-teal-500/70'}`} />
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="truncate text-sm font-semibold text-slate-950">{notification.title}</p>
                                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{notification.message}</p>
                                      </div>
                                      <button
                                        type="button"
                                        title="Delete notification"
                                        onClick={(event) => void handleDeleteNotification(notification.id, event)}
                                        className="rounded-xl p-1.5 text-slate-400 opacity-0 transition-all hover:bg-white hover:text-rose-500 group-hover:opacity-100"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                    <p className="text-xs font-medium text-slate-400">{formatRelativeTime(notification.createdAt)}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}

              <div className="hidden rounded-full border border-white/70 bg-white/75 px-3 py-2 text-sm font-medium text-slate-500 shadow-sm sm:block">
                {pageCopy.description}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>

      <ConfirmActionModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => {
          if (!isLoggingOut) setIsLogoutConfirmOpen(false);
        }}
        title="Sign out"
        message="End the current admin session and require a fresh cookie-authenticated login."
        confirmLabel="Sign out"
        variant="warning"
        onConfirm={() => {
          setIsLoggingOut(true);
          Promise.resolve()
            .then(() => logout())
            .finally(() => {
              setIsLoggingOut(false);
              setIsLogoutConfirmOpen(false);
            });
        }}
        isLoading={isLoggingOut}
      />
    </div>
  );
};

export default Layout;

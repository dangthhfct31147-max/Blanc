
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './PageTransition';
import { Menu, X, Bell, User as UserIcon, LogOut, ChevronDown, Check, Trophy, Users, Info, BookOpen, Loader2, FileText, Mail, Phone, ShieldCheck, Rocket, Sparkles } from 'lucide-react';
import { Button, cn } from './ui/Common';
import { User, Notification } from '../types';
import { api } from '../lib/api';
import { useI18n } from '../contexts/I18nContext';
import type { AppAuthStatus, AppAuthSyncError } from '../contexts/AppAuthContext';
import StreakBadge from './StreakBadge';
import MentorBlogPrompt from './MentorBlogPrompt';
import AuthSyncNotice from './AuthSyncNotice';
import CommandPalette from './CommandPalette';
import Breadcrumbs from './Breadcrumbs';
import ThemeToggle from './ThemeToggle';
import SkipToContent from './SkipToContent';
import { usePageMeta } from '../hooks/usePageMeta';

interface LayoutProps {
  user: User | null;
  authStatus: AppAuthStatus;
  authSyncError: AppAuthSyncError | null;
  onLogout: () => void;
  onRetryAuthSync: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  user,
  authStatus,
  authSyncError,
  onLogout,
  onRetryAuthSync,
}) => {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'en' ? 'en-US' : 'vi-VN';
  const notificationToggleLabel = locale === 'en' ? 'Open notifications' : 'Mở thông báo';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLearningOpen, setIsLearningOpen] = useState(false);
  const [isLearningMobileOpen, setIsLearningMobileOpen] = useState(false);
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);
  const [isCommunityMobileOpen, setIsCommunityMobileOpen] = useState(false);
  const [isMentorPromptOpen, setIsMentorPromptOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const mobileMenuLabel = isMenuOpen
    ? (locale === 'en' ? 'Close menu' : 'Đóng menu')
    : (locale === 'en' ? 'Open menu' : 'Mở menu');
  const notifRef = useRef<HTMLDivElement>(null);
  const learningRef = useRef<HTMLDivElement>(null);
  const communityRef = useRef<HTMLDivElement>(null);
  const learningHoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const communityHoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Dynamic SEO meta tags per route
  usePageMeta();

  // Hide footer on reports page (for full-screen editor experience)
  const hideFooter = location.pathname.startsWith('/reports');

  const learningItems = [
    { name: t('nav.courses'), path: '/marketplace' },
    { name: t('nav.documents'), path: '/documents' },
    { name: t('nav.hallOfFame'), path: '/hall-of-fame' },
    { name: t('nav.skillTree'), path: '/skill-tree' },
  ];

  const communityItems = [
    { name: t('nav.community'), path: '/community' },
    { name: t('nav.peerReview'), path: '/peer-review' },
    { name: t('nav.news'), path: '/news' },
  ];

  const navItems = [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.contests'), path: '/contests' },
    { name: t('nav.mentors'), path: '/mentors' },
  ];

  const leadingNavItems = navItems.slice(0, 2);
  const trailingNavItems = navItems.slice(2);

  const isLearningActive = location.pathname.startsWith('/marketplace')
    || location.pathname.startsWith('/documents')
    || location.pathname.startsWith('/hall-of-fame')
    || location.pathname.startsWith('/skill-tree');
  const isCommunityActive = location.pathname.startsWith('/community') || location.pathname.startsWith('/news') || location.pathname.startsWith('/peer-review');

  const desktopNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex shrink-0 items-center whitespace-nowrap px-3 py-2 rounded-full text-sm font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white lg:px-4',
      isActive
        ? 'bg-primary-50 text-primary-700 shadow-sm shadow-primary-100/70'
        : 'text-slate- dark:text-slate-300 hover:text-primary-600 hover:bg-slate-50 dark:bg-slate-800/50'
    );

  const desktopNavDropdownButtonClass = (isActive: boolean, isOpen: boolean) =>
    cn(
      'inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-3 py-2 rounded-full text-sm font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white lg:px-4',
      isActive
        ? 'bg-primary-50 text-primary-700 shadow-sm shadow-primary-100/70'
        : isOpen
          ? 'bg-slate-50 dark:bg-slate-800/50 text-primary-600'
          : 'text-slate- dark:text-slate-300 hover:text-primary-600 hover:bg-slate-50 dark:bg-slate-800/50'
    );

  const desktopDropdownLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
      isActive ? 'bg-primary-50 text-primary-700' : 'text-slate- dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50 hover:text-primary-700'
    );

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'block px-4 py-2 rounded-lg text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
      isActive ? 'bg-primary-50 text-primary-700' : 'text-slate- dark:text-slate-300 hover:text-primary-600 hover:bg-slate-50 dark:bg-slate-800/50'
    );

  const mobileNavDropdownButtonClass = (isActive: boolean, isOpen: boolean) =>
    cn(
      'w-full flex items-center justify-between px-4 py-2 rounded-lg text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
      isActive
        ? 'bg-primary-50 text-primary-700'
        : isOpen
          ? 'bg-slate-50 dark:bg-slate-800/50 text-primary-600'
          : 'text-slate- dark:text-slate-300 hover:text-primary-600 hover:bg-slate-50 dark:bg-slate-800/50'
    );

  const mobileNavSubLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'block px-4 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
      isActive ? 'bg-primary-50 text-primary-700' : 'text-slate- dark:text-slate-300 hover:text-primary-600 hover:bg-slate-50 dark:bg-slate-800/50'
    );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (!user || user.role !== 'mentor' || user.mentorBlogCompleted) {
      setIsMentorPromptOpen(false);
      return;
    }

    try {
      const promptKey = `mentor-blog-prompt:${user.id || 'me'}`;
      if (sessionStorage.getItem(promptKey)) return;
      sessionStorage.setItem(promptKey, '1');
    } catch {
      // ignore sessionStorage errors
    }

    setIsMentorPromptOpen(true);
  }, [user?.id, user?.role, user?.mentorBlogCompleted]);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setIsLoadingNotifs(true);
    try {
      const data = await api.get<{ notifications: Notification[] }>('/users/me/notifications-history?limit=10');
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      // Fallback to empty array on error
      setNotifications([]);
    } finally {
      setIsLoadingNotifs(false);
    }
  }, [user]);

  // Fetch notifications when user logs in or component mounts
  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [user, fetchNotifications]);

  // Mark all notifications as read - sync with API
  const markAllAsRead = async () => {
    try {
      await api.patch('/users/me/notifications/mark-all-read', {});
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/users/me/notifications/${notificationId}/read`, {});
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    // TODO: Navigate to relevant page based on notification type
  };

  // View all notifications - go to settings with notifications tab
  const handleViewAllNotifications = () => {
    setIsNotifOpen(false);
    navigate('/profile?tab=settings&settingsTab=notifications');
  };

  // Close notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (learningRef.current && !learningRef.current.contains(event.target as Node)) {
        setIsLearningOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (communityRef.current && !communityRef.current.contains(event.target as Node)) {
        setIsCommunityOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearLearningHoverCloseTimeout = () => {
    if (!learningHoverCloseTimeoutRef.current) return;
    clearTimeout(learningHoverCloseTimeoutRef.current);
    learningHoverCloseTimeoutRef.current = null;
  };

  const clearCommunityHoverCloseTimeout = () => {
    if (!communityHoverCloseTimeoutRef.current) return;
    clearTimeout(communityHoverCloseTimeoutRef.current);
    communityHoverCloseTimeoutRef.current = null;
  };

  const openLearningMenu = () => {
    clearLearningHoverCloseTimeout();
    clearCommunityHoverCloseTimeout();
    setIsCommunityOpen(false);
    setIsLearningOpen(true);
  };

  const scheduleCloseLearningMenu = () => {
    clearLearningHoverCloseTimeout();
    learningHoverCloseTimeoutRef.current = setTimeout(() => {
      setIsLearningOpen(false);
    }, 160);
  };

  const openCommunityMenu = () => {
    clearCommunityHoverCloseTimeout();
    clearLearningHoverCloseTimeout();
    setIsLearningOpen(false);
    setIsCommunityOpen(true);
  };

  const scheduleCloseCommunityMenu = () => {
    clearCommunityHoverCloseTimeout();
    communityHoverCloseTimeoutRef.current = setTimeout(() => {
      setIsCommunityOpen(false);
    }, 160);
  };

  useEffect(() => {
    return () => {
      clearLearningHoverCloseTimeout();
      clearCommunityHoverCloseTimeout();
    };
  }, []);

  useEffect(() => {
    setIsLearningOpen(false);
    setIsLearningMobileOpen(false);
    setIsCommunityOpen(false);
    setIsCommunityMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) {
      setIsLearningMobileOpen(false);
      setIsCommunityMobileOpen(false);
    }
  }, [isMenuOpen]);

  const getIconByType = (type: string) => {
    switch (type) {
      case 'reward': return <Trophy />;
      case 'invite': return <Users />;
      case 'course':
      case 'courseUpdate': return <BookOpen />;
      case 'contestReminder':
      case 'contestRegistration': return <Trophy />;
      case 'announcement': return <Info />;
      case 'welcome': return <Trophy />;
      default: return <Info />;
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('common.time.justNow');
    if (diffMins < 60) return t('common.time.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('common.time.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('common.time.daysAgo', { count: diffDays });
    return date.toLocaleDateString(dateLocale);
  };

  const handleMentorPromptUpdate = () => {
    setIsMentorPromptOpen(false);
    navigate('/profile?tab=mentor-blog');
  };

  return (
    <div >
      <SkipToContent />
      <MentorBlogPrompt
        isOpen={isMentorPromptOpen}
        onClose={() => setIsMentorPromptOpen(false)}
        onUpdate={handleMentorPromptUpdate}
      />
      {/* Sticky Header */}
      <header >
        <div >
          <div >
            {/* Logo */}
            <NavLink to="/" aria-label="Blanc home" >
              <img src="/logo.png" alt="Blanc Logo" />
              <div >
                <span >Beyond Learning</span>
                <span >And New Challenges</span>
              </div>
            </NavLink>

            {/* Desktop Nav */}
            <nav aria-label={t('layout.aria.mainMenu')}>
              {leadingNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={desktopNavLinkClass}
                >
                  {item.name}
                </NavLink>
              ))}

              <div

                ref={learningRef}
                onMouseEnter={openLearningMenu}
                onMouseLeave={scheduleCloseLearningMenu}
              >
                <button
                  type="button"
                  onClick={() => {
                    clearLearningHoverCloseTimeout();
                    clearCommunityHoverCloseTimeout();
                    setIsCommunityOpen(false);
                    setIsLearningOpen(v => !v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsLearningOpen(false);
                  }}
                  className={desktopNavDropdownButtonClass(isLearningActive, isLearningOpen)}
                >
                  <span>{t('nav.learning')}</span>
                </button>

                {isLearningOpen && (
                  <div

                  >
                    {learningItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={desktopDropdownLinkClass}
                        onClick={() => setIsLearningOpen(false)}
                      >
                        {item.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>

              <div

                ref={communityRef}
                onMouseEnter={openCommunityMenu}
                onMouseLeave={scheduleCloseCommunityMenu}
              >
                <button
                  type="button"
                  onClick={() => {
                    clearCommunityHoverCloseTimeout();
                    clearLearningHoverCloseTimeout();
                    setIsLearningOpen(false);
                    setIsCommunityOpen(v => !v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsCommunityOpen(false);
                  }}
                  className={desktopNavDropdownButtonClass(isCommunityActive, isCommunityOpen)}
                >
                  <span>{t('nav.community')}</span>
                </button>

                {isCommunityOpen && (
                  <div

                  >
                    {communityItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={desktopDropdownLinkClass}
                        onClick={() => setIsCommunityOpen(false)}
                      >
                        {item.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>

              {trailingNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={desktopNavLinkClass}
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>

            {/* Auth/Profile Actions */}
            <div >
              <CommandPalette />
              <ThemeToggle />
              {user ? (
                <div >
                  {/* Streak Indicator */}
                  <StreakBadge userId={user.id} />

                  {/* Notification Bell with Dropdown */}
                  <div ref={notifRef}>
                    <button
                      type="button"
                      onClick={() => setIsNotifOpen(!isNotifOpen)}
                      aria-label={notificationToggleLabel}
                      aria-expanded={isNotifOpen}
                      aria-controls="site-notifications-menu"
                      className={`relative p-2 transition-colors rounded-full hover:bg-slate-100 ${isNotifOpen ? 'bg-slate-100 text-slate- dark:text-slate-100' : 'text-slate- dark:text-slate-400'}`}
                    >
                      <Bell />
                      {unreadCount > 0 && (
                        <span ></span>
                      )}
                    </button>

                    {/* Notification Dropdown Panel */}
                    {isNotifOpen && (
                      <div
                        id="site-notifications-menu"

                      >
                        <div >
                          <h3 >{t('layout.notifications.title')}</h3>
                          {unreadCount > 0 && (
                            <button
                              type="button"
                              onClick={markAllAsRead}

                            >
                              <Check /> {t('layout.notifications.markAllRead')}
                            </button>
                          )}
                        </div>

                        <div >
                          {isLoadingNotifs ? (
                            <div >
                              <Loader2 />
                            </div>
                          ) : notifications.length > 0 ? (
                            <div >
                              {notifications.map((notif) => (
                                <div
                                  key={notif.id}
                                  onClick={() => handleNotificationClick(notif)}
                                  className={`px-4 py-3 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors cursor-pointer border-b border-slate-50 last:border-0 ${!notif.isRead ? 'bg-primary-50/30' : ''}`}
                                >
                                  <div >
                                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!notif.isRead ? 'bg-white dark:bg-slate-900/95 shadow-sm' : 'bg-slate-100'}`}>
                                      {getIconByType(notif.type)}
                                    </div>
                                    <div >
                                      <div >
                                        <p className={`text-sm ${!notif.isRead ? 'font-bold text-slate- dark:text-slate-100' : 'font-medium text-slate- dark:text-slate-300'}`}>
                                          {notif.title}
                                        </p>
                                        {!notif.isRead && (
                                          <span ></span>
                                        )}
                                      </div>
                                      <p >
                                        {notif.message}
                                      </p>
                                      <p >
                                        {notif.time || formatTimeAgo(notif.createdAt)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div >
                              <Bell />
                              <p >{t('layout.notifications.empty')}</p>
                            </div>
                          )}
                        </div>

                        <div >
                          <button
                            type="button"
                            onClick={handleViewAllNotifications}

                          >
                            {t('common.viewAll')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div >
                    <button >
                      <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=6366f1&color=fff`}
                        alt="Avatar"

                      />
                      <span >{user.name}</span>
                      <ChevronDown />
                    </button>

                    {/* Dropdown */}
                    <div >
                      <div >
                        <p >{t('layout.userMenu.signedInAs')}</p>
                        <p >{user.email}</p>
                      </div>
                      <NavLink to="/profile" >
                        <UserIcon /> {t('layout.userMenu.profile')}
                      </NavLink>
                      <NavLink to="/my-team-posts" >
                        <FileText /> {t('layout.userMenu.myPosts')}
                      </NavLink>
                      <button onClick={onLogout} >
                        <LogOut /> {t('layout.userMenu.logout')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : authStatus === 'syncing' ? (
                <AuthSyncNotice status="syncing" compact />
              ) : authStatus === 'sync_error' ? (
                <div >
                  <Button variant="secondary" size="sm" onClick={onRetryAuthSync}>
                    Thử đồng bộ lại
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onLogout}>
                    Đăng xuất
                  </Button>
                </div>
              ) : (
                <div >
                  <NavLink to="/login">
                    <Button variant="ghost" size="sm">{t('layout.buttons.login')}</Button>
                  </NavLink>
                  <NavLink to="/register">
                    <Button size="sm">{t('layout.buttons.startLearning')}</Button>
                  </NavLink>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div >
              <CommandPalette />
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={mobileMenuLabel}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-site-menu"

              >
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div id="mobile-site-menu" >
            <div >
              {leadingNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  end={item.path === '/'}
                  className={mobileNavLinkClass}
                >
                  {item.name}
                </NavLink>
              ))}

              <div>
                <button
                  type="button"
                  onClick={() =>
                    setIsLearningMobileOpen(v => {
                      const next = !v;
                      if (next) setIsCommunityMobileOpen(false);
                      return next;
                    })
                  }
                  className={mobileNavDropdownButtonClass(isLearningActive, isLearningMobileOpen)}
                >
                  <span>{t('nav.learning')}</span>
                </button>

                {isLearningMobileOpen && (
                  <div >
                    {learningItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsLearningMobileOpen(false);
                        }}
                        className={mobileNavSubLinkClass}
                      >
                        {item.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    setIsCommunityMobileOpen(v => {
                      const next = !v;
                      if (next) setIsLearningMobileOpen(false);
                      return next;
                    })
                  }
                  className={mobileNavDropdownButtonClass(isCommunityActive, isCommunityMobileOpen)}
                >
                  <span>{t('nav.community')}</span>
                </button>

                {isCommunityMobileOpen && (
                  <div >
                    {communityItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsCommunityMobileOpen(false);
                        }}
                        className={mobileNavSubLinkClass}
                      >
                        {item.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>

              {trailingNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  end={item.path === '/'}
                  className={mobileNavLinkClass}
                >
                  {item.name}
                </NavLink>
              ))}
              {user ? (
                <>
                  <div >
                    {/* Mobile Streak Display */}
                    <div >
                      <div >
                        <img src="/streak/flame-tight.gif" alt="" aria-hidden="true" />
                        <img src="/streak/flame-tight.png" alt="" aria-hidden="true" />
                        <span >{t('profile.overview.streakLabel')}</span>
                      </div>
                      <StreakBadge userId={user.id} />
                    </div>
                  </div>
                  <div >
                    <div >
                      <span >{t('layout.notifications.title')}</span>
                      {unreadCount > 0 && <span >{t('layout.notifications.newCount', { count: unreadCount })}</span>}
                    </div>
                  </div>
                  <NavLink to="/profile" >
                    {t('layout.userMenu.myProfile')}
                  </NavLink>
                  <NavLink to="/my-team-posts" >
                    {t('layout.userMenu.myPosts')}
                  </NavLink>
                  <button onClick={() => { onLogout(); setIsMenuOpen(false); }} >
                    {t('layout.userMenu.logout')}
                  </button>
                </>
              ) : authStatus === 'sync_error' ? (
                <div >
                  <AuthSyncNotice
                    status="error"
                    syncError={authSyncError}
                    onRetry={() => {
                      onRetryAuthSync();
                      setIsMenuOpen(false);
                    }}
                    onSignOut={() => {
                      onLogout();
                      setIsMenuOpen(false);
                    }}
                  />
                </div>
              ) : authStatus === 'syncing' ? (
                <div >
                  <AuthSyncNotice status="syncing" />
                </div>
              ) : (
                <div >
                  <NavLink to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="secondary" >{t('layout.buttons.login')}</Button>
                  </NavLink>
                  <NavLink to="/register" onClick={() => setIsMenuOpen(false)}>
                    <Button >{t('layout.buttons.signUpNow')}</Button>
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {authStatus === 'sync_error' && !user && (
        <div >
          <div >
            <AuthSyncNotice
              status="error"
              syncError={authSyncError}
              onRetry={onRetryAuthSync}
              onSignOut={onLogout}
              compact
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <Breadcrumbs />
      <main id="main-content" role="main" tabIndex={-1} >
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>

      {/* Footer - Hidden on reports page for full-screen editor */}
      {!hideFooter && (
        <footer role="contentinfo" >
          <div >
            <div >
              <div >
                <div >
                  <div aria-hidden="true"></div>
                  <div >
                    <div >
                      <img src="/logo.png" alt="Blanc Logo" />
                      <div >
                        <span >Beyond Learning</span>
                        <span >And New Challenges</span>
                      </div>
                    </div>
                    <p >
                      {t('layout.footer.description')}
                    </p>
                    <div >
                      <div >
                        <ShieldCheck />
                        <span>{t('layout.footer.feature.security')}</span>
                      </div>
                      <div >
                        <Rocket />
                        <span>{t('layout.footer.feature.roadmap')}</span>
                      </div>
                      <div >
                        <Sparkles />
                        <span>{t('layout.footer.feature.community')}</span>
                      </div>
                    </div>
                    <div >
                      <span >Blanc Community</span>
                      <span >{t('layout.footer.tag.learningAndContests')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div >
                <div >
                  <div aria-hidden="true"></div>
                  <div >
                    <div >
                      <div>
                        <h3 >{t('layout.footer.supportTitle')}</h3>
                        <p >{t('layout.footer.supportDescription')}</p>
                      </div>
                      <span >Online</span>
                    </div>
                    <ul >
                      <li><NavLink to="/terms" >{t('layout.footer.terms')}</NavLink></li>
                      <li><NavLink to="/privacy" >{t('layout.footer.privacy')}</NavLink></li>
                      <li><a href="mailto:clbflife2025thptfptcantho@gmail.com?subject=Li%C3%AAn%20h%E1%BB%87%20t%E1%BB%AB%20Blanc&body=Xin%20ch%C3%A0o%2C%0A%0AT%C3%B4i%20mu%E1%BB%91n%20li%C3%AAn%20h%E1%BB%87%20v%E1%BB%81..." >{t('layout.footer.contact')}</a></li>
                    </ul>
                    <div >
                      <Sparkles /> {t('layout.footer.supportBadge')}
                    </div>
                  </div>
                </div>
              </div>

              <div >
                <div >
                  <div aria-hidden="true"></div>
                  <div >
                    <div >
                      <h3 >{t('layout.footer.contactTitle')}</h3>
                      <p >{t('layout.footer.contactDescription')}</p>
                    </div>

                    <div >
                      <div >
                        <div >
                          <div >
                            <Mail />
                          </div>
                          <div>
                            <p >{t('layout.footer.inbox')}</p>
                            <p >CLB Blanc</p>
                          </div>
                        </div>
                        <div >
                          <p >clbflife2025thptfptcantho@gmail.com</p>
                          <div >
                            <Phone />
                            <span>+84 916 007 090</span>
                          </div>
                        </div>
                        <div >
                          <a
                            href="https://www.facebook.com/profile.php?id=61584015058767"
                            target="_blank"
                            rel="noopener noreferrer"

                            title="Facebook"
                          >
                            <span >Facebook</span>
                            <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                            </svg>
                          </a>
                          <a
                            href="https://www.tiktok.com/@blancfpt"
                            target="_blank"
                            rel="noopener noreferrer"

                            title="TikTok"
                          >
                            <span >TikTok</span>
                            <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                            </svg>
                          </a>
                        </div>
                      </div>

                      <div >
                        <div >
                          <div >
                            <Mail />
                          </div>
                          <div>
                            <p >{t('layout.footer.inbox')}</p>
                            <p >Trần Hữu Hải Đăng</p>
                          </div>
                        </div>
                        <div >
                          <p >dangthhfct31147@gmail.com</p>
                          <div >
                            <Phone />
                            <span>+84 339 122 620</span>
                          </div>
                        </div>
                        <div >
                          <a
                            href="https://www.facebook.com/hai.ang.782631/"
                            target="_blank"
                            rel="noopener noreferrer"

                            title="Facebook"
                          >
                            <span >Facebook</span>
                            <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                            </svg>
                          </a>
                          <a
                            href="https://www.tiktok.com/@mrhomeless_12"
                            target="_blank"
                            rel="noopener noreferrer"

                            title="TikTok"
                          >
                            <span >TikTok</span>
                            <svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div >
              <span >Made with ❤️ for Education</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;

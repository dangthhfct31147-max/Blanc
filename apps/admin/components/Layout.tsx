import React, { ReactNode, useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Trophy,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  Bell,
  Search,
  FileText,
  Briefcase,
  Check,
  Info,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldAlert,
  MessageSquare,
  Newspaper,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, avatarPresets } from '../utils/avatar';
import { notificationService, AdminNotification, formatRelativeTime } from '../services/notificationService';
import { ConfirmActionModal } from './ui/UserModals';

interface LayoutProps {
  children: ReactNode;
}

const SidebarItem = ({ to, icon: Icon, label, onNavigate }: { to: string; icon: React.ElementType; label: string; onNavigate?: () => void }) => (
  <NavLink
    to={to}
    onClick={onNavigate}
    className={({ isActive }) =>
      `flex items-center gap-3 rounded-lg px-4 py-3 transition-colors duration-200 ${
        isActive ? 'bg-emerald-50 font-medium text-emerald-600' : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-600'
      }`
    }
  >
    <Icon size={20} />
    <span>{label}</span>
  </NavLink>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout } = useAuth();
  const isMentor = user?.role === 'mentor';

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (isMentor) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      setIsLoadingNotifications(true);
      const response = await notificationService.getNotifications({ limit: 10 });
      // Ensure title and message are strings (handle if API returns objects)
      const sanitizedNotifications = response.notifications.map((n) => ({
        ...n,
        title: typeof n.title === 'object' ? JSON.stringify(n.title) : String(n.title || ''),
        message: typeof n.message === 'object' ? JSON.stringify(n.message) : String(n.message || ''),
      }));
      setNotifications(sanitizedNotifications);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [isMentor]);

  // Initial fetch and polling
  useEffect(() => {
    if (isMentor) return;
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, isMentor]);

  // Default sidebar behavior:
  // - Desktop (lg+): sidebar shown
  // - Mobile/tablet: sidebar hidden until toggled
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const sync = () => setSidebarOpen(mediaQuery.matches);
    sync();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', sync);
      return () => mediaQuery.removeEventListener('change', sync);
    }

    mediaQuery.addListener(sync);
    return () => mediaQuery.removeListener(sync);
  }, []);

  // Mark single notification as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      const deletedNotification = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleLogout = async () => {
    setIsLogoutConfirmOpen(true);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <Check size={16} className="text-green-600" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-orange-600" />;
      case 'error':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Info size={16} className="text-blue-600" />;
    }
  };

  const getNotificationBg = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100';
      case 'warning':
        return 'bg-orange-100';
      case 'error':
        return 'bg-red-100';
      default:
        return 'bg-blue-100';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" aria-hidden="true" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-gray-100">
          <div className="flex cursor-pointer items-center gap-2">
            <img src="/logo.png" alt="Blanc Logo" className="h-10 w-10 rounded-full object-cover" />
            <div className="flex flex-col">
              <span className="text-lg leading-tight font-bold text-emerald-600">Blanc Admin</span>
              <span className="text-xs leading-tight text-gray-500">Beyond Learning</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {!isMentor && <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" onNavigate={() => setSidebarOpen(false)} />}
          <SidebarItem to="/reports" icon={FileText} label="Reports" onNavigate={() => setSidebarOpen(false)} />
          {!isMentor && (
            <>
              <SidebarItem to="/users" icon={Users} label="Students" onNavigate={() => setSidebarOpen(false)} />
              <SidebarItem to="/contests" icon={Trophy} label="Contests" onNavigate={() => setSidebarOpen(false)} />
              <SidebarItem to="/courses" icon={FileText} label="Documents" onNavigate={() => setSidebarOpen(false)} />
              <SidebarItem to="/community" icon={MessageSquare} label="Community" onNavigate={() => setSidebarOpen(false)} />
              <SidebarItem to="/recruitments" icon={Briefcase} label="Recruitments" onNavigate={() => setSidebarOpen(false)} />
              <SidebarItem to="/news" icon={Newspaper} label="News & Tips" onNavigate={() => setSidebarOpen(false)} />
              <SidebarItem to="/mentors" icon={Users} label="Mentor Directory" onNavigate={() => setSidebarOpen(false)} />
              <SidebarItem to="/mentor-blogs" icon={BookOpen} label="Mentor Blogs" onNavigate={() => setSidebarOpen(false)} />

              <div className="pt-8 pb-2">
                <p className="px-4 text-xs font-semibold tracking-wider text-gray-400 uppercase">System</p>
              </div>
              <SidebarItem to="/security" icon={ShieldAlert} label="Security" onNavigate={() => setSidebarOpen(false)} />
              <SidebarItem to="/audit" icon={FileText} label="Audit Log" onNavigate={() => setSidebarOpen(false)} />
              <SidebarItem to="/settings" icon={Settings} label="Settings" onNavigate={() => setSidebarOpen(false)} />
            </>
          )}
        </nav>

        <div className="w-full shrink-0 border-t border-gray-100 bg-white p-4">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 text-gray-600 transition-colors hover:text-red-600">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="relative z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 lg:px-8">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle menu" className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden">
            <Menu size={24} />
          </button>

          <div className="mx-4 hidden w-full max-w-md items-center rounded-lg bg-gray-100 px-3 py-2 sm:flex lg:mx-0">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search anything..."
              className="ml-2 w-full border-none bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
            />
          </div>

          <div className="flex items-center gap-4">
            {!isMentor && (
              <>
                {/* Notification Button & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative rounded-full p-2 text-gray-500 transition-colors outline-none hover:bg-gray-100"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500"></span>}
                  </button>

                  {showNotifications && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                      <div className="animate-fade-in-up absolute right-0 z-50 mt-3 w-80 origin-top-right overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl sm:w-96">
                        <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50/50 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                            <button onClick={fetchNotifications} className="rounded p-1 text-gray-400 hover:text-gray-600" title="Refresh">
                              <RefreshCw size={14} className={isLoadingNotifications ? 'animate-spin' : ''} />
                            </button>
                          </div>
                          {unreadCount > 0 && (
                            <button onClick={handleMarkAllAsRead} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
                              Mark all as read
                            </button>
                          )}
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                          {isLoadingNotifications && notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                              <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-gray-400" />
                              <p className="text-sm text-gray-500">Loading...</p>
                            </div>
                          ) : notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                              <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                              <p className="text-sm text-gray-500">No notifications</p>
                            </div>
                          ) : (
                            notifications.map((notification) => (
                              <div
                                key={notification.id}
                                onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                                className={`group cursor-pointer border-b border-gray-50 px-4 py-3 transition-colors last:border-0 hover:bg-gray-50 ${!notification.read ? 'bg-emerald-50/30' : ''}`}
                              >
                                <div className="flex gap-3">
                                  <div
                                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${getNotificationBg(notification.type)}`}
                                  >
                                    {getNotificationIcon(notification.type)}
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className={`truncate text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                        {notification.title}
                                      </p>
                                      <div className="flex flex-shrink-0 items-center gap-1">
                                        {!notification.read && <span className="h-2 w-2 rounded-full bg-emerald-500"></span>}
                                        <button
                                          onClick={(e) => handleDeleteNotification(notification.id, e)}
                                          className="p-1 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                                          title="Delete"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="line-clamp-2 text-xs text-gray-500">{notification.message}</p>
                                    <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                                      <Clock size={10} />
                                      {formatRelativeTime(notification.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="border-t border-gray-50 bg-gray-50/30 p-2 text-center">
                          <button className="w-full py-1 text-xs font-medium text-gray-500 hover:text-gray-800">View all notifications</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            <div className={`flex items-center gap-3 ${isMentor ? '' : 'border-l border-gray-200 pl-4'}`}>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-gray-500">{user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'mentor' ? 'Mentor' : 'Admin'}</p>
              </div>
              <img
                src={getAvatarUrl(user?.avatar, user?.name, avatarPresets.sidebar)}
                alt="Admin"
                className="h-9 w-9 rounded-full border-2 border-emerald-100"
              />
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>

      <ConfirmActionModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => {
          if (!isLoggingOut) setIsLogoutConfirmOpen(false);
        }}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
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

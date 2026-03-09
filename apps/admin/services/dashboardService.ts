import api from './api';
import type { PlatformSettings } from './settingsService';
import type { SecurityAnalysis } from './securityService';

export interface DashboardSummary {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    activeContests: number;
    totalCourses: number;
    unreadNotifications: number;
    activeThreatCount: number;
    lockedAccountsCount: number;
    failureRate: string;
    sessionTimeout: number;
    maintenanceMode: boolean;
    twoFactorRequired: boolean;
}

export interface DashboardTrendPoint {
    label: string;
    failedLogins: number;
}

export interface DashboardNotificationItem {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    createdAt: string;
    link?: string | null;
}

export interface DashboardOverview {
    summary: DashboardSummary;
    trend: DashboardTrendPoint[];
    notifications: DashboardNotificationItem[];
}

interface StatsResponse {
    users?: number;
    contests?: number;
    courses?: number;
}

interface UserStatsResponse {
    totalUsers?: number;
    activeUsers?: number;
    bannedUsers?: number;
    newUsersThisMonth?: number;
}

interface NotificationsResponse {
    notifications?: DashboardNotificationItem[];
    unreadCount?: number;
}

const defaultOverview: DashboardOverview = {
    summary: {
        totalUsers: 0,
        activeUsers: 0,
        newUsersThisMonth: 0,
        activeContests: 0,
        totalCourses: 0,
        unreadNotifications: 0,
        activeThreatCount: 0,
        lockedAccountsCount: 0,
        failureRate: '0%',
        sessionTimeout: 30,
        maintenanceMode: false,
        twoFactorRequired: false,
    },
    trend: [],
    notifications: [],
};

const buildTrend = (security: SecurityAnalysis | null): DashboardTrendPoint[] => {
    if (!security?.failedOverTime?.length) return [];

    return security.failedOverTime
        .slice(-8)
        .map((item) => ({
            label: String(item._id || '').slice(11, 16) || 'N/A',
            failedLogins: Number(item.count || 0),
        }));
};

export const dashboardService = {
    async getOverview(): Promise<DashboardOverview> {
        const [statsResult, userStatsResult, notificationsResult, settingsResult, securityResult] = await Promise.allSettled([
            api.get<StatsResponse>('/stats'),
            api.get<UserStatsResponse>('/admin/users/stats'),
            api.get<NotificationsResponse>('/admin/notifications', { params: { limit: 5 } }),
            api.get<PlatformSettings>('/admin/settings'),
            api.get<SecurityAnalysis>('/admin/security/analysis'),
        ]);

        const stats = statsResult.status === 'fulfilled' ? statsResult.value.data : null;
        const userStats = userStatsResult.status === 'fulfilled' ? userStatsResult.value.data : null;
        const notifications = notificationsResult.status === 'fulfilled' ? notificationsResult.value.data : null;
        const settings = settingsResult.status === 'fulfilled' ? settingsResult.value.data : null;
        const security = securityResult.status === 'fulfilled' ? securityResult.value.data : null;

        return {
            summary: {
                totalUsers: Number(userStats?.totalUsers ?? stats?.users ?? 0),
                activeUsers: Number(userStats?.activeUsers ?? 0),
                newUsersThisMonth: Number(userStats?.newUsersThisMonth ?? 0),
                activeContests: Number(stats?.contests ?? 0),
                totalCourses: Number(stats?.courses ?? 0),
                unreadNotifications: Number(notifications?.unreadCount ?? 0),
                activeThreatCount: Number(security?.summary?.activeThreatCount ?? 0),
                lockedAccountsCount: Number(security?.summary?.lockedAccountsCount ?? 0),
                failureRate: String(security?.summary?.failureRate ?? '0%'),
                sessionTimeout: Number(settings?.security?.sessionTimeout ?? defaultOverview.summary.sessionTimeout),
                maintenanceMode: Boolean(settings?.general?.maintenanceMode ?? false),
                twoFactorRequired: Boolean(settings?.security?.twoFactorRequired ?? false),
            },
            trend: buildTrend(security),
            notifications: notifications?.notifications ?? [],
        };
    },
};

export default dashboardService;

/**
 * Settings Service
 * API operations for platform settings management
 * Sử dụng API backend /api/admin/settings
 */

import api, { ApiError } from './api';

export interface PlatformSettings {
    general: {
        siteName: string;
        supportEmail: string;
        maintenanceMode: boolean;
        defaultLanguage: string;
        timezone: string;
    };
    notifications: {
        emailNotifications: boolean;
        pushNotifications: boolean;
        marketingEmails: boolean;
        systemAlerts: boolean;
    };
    security: {
        twoFactorRequired: boolean;
        sessionTimeout: number;
        passwordMinLength: number;
        maxLoginAttempts: number;
        ipWhitelist: string[];
    };
    features: {
        contestsEnabled: boolean;
        coursesEnabled: boolean;
        teamsEnabled: boolean;
        paymentsEnabled: boolean;
    };
}

// Default settings (fallback)
const defaultSettings: PlatformSettings = {
    general: {
        siteName: 'Blanc',
        supportEmail: 'support@blanc.com',
        maintenanceMode: false,
        defaultLanguage: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
    },
    notifications: {
        emailNotifications: true,
        pushNotifications: true,
        marketingEmails: false,
        systemAlerts: true,
    },
    security: {
        twoFactorRequired: false,
        sessionTimeout: 30,
        passwordMinLength: 8,
        maxLoginAttempts: 5,
        ipWhitelist: [],
    },
    features: {
        contestsEnabled: true,
        coursesEnabled: true,
        teamsEnabled: true,
        paymentsEnabled: false,
    },
};

export const settingsService = {
    /**
     * Get all platform settings from API
     */
    getAll: async (): Promise<PlatformSettings> => {
        try {
            const response = await api.get<PlatformSettings>('/admin/settings');
            return { ...defaultSettings, ...response.data };
        } catch (error) {
            // Avoid noisy logs for expected 401s (e.g., expired session)
            if (!(error instanceof ApiError) || error.status !== 401) {
                console.error('Failed to fetch settings from API:', error);
            }
            return defaultSettings;
        }
    },

    /**
     * Update general settings
     */
    updateGeneral: async (settings: Partial<PlatformSettings['general']>): Promise<PlatformSettings['general']> => {
        const response = await api.patch<PlatformSettings['general']>('/admin/settings/general', settings);
        return response.data;
    },

    /**
     * Update notification settings
     */
    updateNotifications: async (settings: Partial<PlatformSettings['notifications']>): Promise<PlatformSettings['notifications']> => {
        const response = await api.patch<PlatformSettings['notifications']>('/admin/settings/notifications', settings);
        return response.data;
    },

    /**
     * Update security settings
     */
    updateSecurity: async (settings: Partial<PlatformSettings['security']>): Promise<PlatformSettings['security']> => {
        const response = await api.patch<PlatformSettings['security']>('/admin/settings/security', settings);
        return response.data;
    },

    /**
     * Update feature flags
     */
    updateFeatures: async (settings: Partial<PlatformSettings['features']>): Promise<PlatformSettings['features']> => {
        const response = await api.patch<PlatformSettings['features']>('/admin/settings/features', settings);
        return response.data;
    },

    /**
     * Reset all sessions
     */
    resetAllSessions: async (): Promise<{ sessionsCleared: number }> => {
        const response = await api.post<{ sessionsCleared: number }>('/admin/settings/reset-sessions');
        return response.data;
    },

    /**
     * Test email configuration (real API call)
     */
    testEmailConfig: async (email: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.post<{ success: boolean; message: string }>('/admin/email/test', { email });
        return response.data;
    },

    /**
     * Send test email
     */
    sendTestEmail: async (email: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.post<{ success: boolean; message: string }>('/admin/email/test', { email });
        return response.data;
    },

    /**
     * Broadcast email to users
     */
    broadcastEmail: async (data: {
        subject: string;
        content: string;
        audience: 'all' | 'students' | 'admins';
        ctaText?: string;
        ctaUrl?: string;
    }): Promise<{ success: boolean; message: string; sent: number; failed: number; total: number }> => {
        const response = await api.post<{ success: boolean; message: string; sent: number; failed: number; total: number }>('/admin/email/broadcast', data);
        return response.data;
    },
};

export default settingsService;

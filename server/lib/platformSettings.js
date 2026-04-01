import { connectToDatabase, getCollection } from './db.js';

export const SETTINGS_COLLECTION = 'platform_settings';
export const SETTINGS_DOCUMENT_ID = 'platform_config';

const DEFAULT_SETTINGS_CACHE_TTL_MS = 30_000;

let cachedSettings = null;
let cachedSettingsExpiresAt = 0;
let cachedSettingsInFlight = null;

function readBooleanEnv(...names) {
    for (const name of names) {
        const raw = process.env[name];
        if (raw === undefined) continue;
        const value = String(raw).trim().toLowerCase();
        if (!value) continue;
        if (['1', 'true', 'yes', 'y', 'on'].includes(value)) return true;
        if (['0', 'false', 'no', 'n', 'off'].includes(value)) return false;
    }
    return undefined;
}

function getSettingsCacheTtlMs() {
    const raw = Number.parseInt(process.env.PLATFORM_SETTINGS_CACHE_TTL_MS || '', 10);
    if (Number.isFinite(raw) && raw >= 0) return raw;
    return DEFAULT_SETTINGS_CACHE_TTL_MS;
}

export function invalidatePlatformSettingsCache() {
    cachedSettings = null;
    cachedSettingsExpiresAt = 0;
    cachedSettingsInFlight = null;
}

export function createDefaultPlatformSettings() {
    const paymentsEnabledOverride = readBooleanEnv('PAYMENTS_ENABLED', 'FEATURE_PAYMENTS_ENABLED');
    return {
        _id: SETTINGS_DOCUMENT_ID,
        general: {
            siteName: 'ContestHub',
            supportEmail: 'support@contesthub.com',
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
            tokensInvalidBefore: null,
        },
        features: {
            contestsEnabled: true,
            coursesEnabled: true,
            teamsEnabled: true,
            paymentsEnabled: paymentsEnabledOverride ?? false,
        },
        updatedAt: new Date(),
        updatedBy: null,
    };
}

export async function getPlatformSettings(options = {}) {
    const { forceRefresh = false } = options || {};
    const ttlMs = getSettingsCacheTtlMs();

    if (!forceRefresh && cachedSettings && Date.now() < cachedSettingsExpiresAt) {
        return cachedSettings;
    }

    if (!forceRefresh && cachedSettingsInFlight) {
        return cachedSettingsInFlight;
    }

    cachedSettingsInFlight = (async () => {
        await connectToDatabase();
        const collection = getCollection(SETTINGS_COLLECTION);

        let settings = await collection.findOne({ _id: SETTINGS_DOCUMENT_ID });
        if (!settings) {
            const defaults = createDefaultPlatformSettings();
            await collection.insertOne(defaults);
            settings = defaults;
        }

        const paymentsEnabledOverride = readBooleanEnv('PAYMENTS_ENABLED', 'FEATURE_PAYMENTS_ENABLED');
        if (paymentsEnabledOverride !== undefined) {
            settings.features = settings.features || {};
            settings.features.paymentsEnabled = paymentsEnabledOverride;
        }

        if (ttlMs > 0) {
            cachedSettings = settings;
            cachedSettingsExpiresAt = Date.now() + ttlMs;
        } else {
            cachedSettings = null;
            cachedSettingsExpiresAt = 0;
        }

        return settings;
    })();

    try {
        return await cachedSettingsInFlight;
    } finally {
        cachedSettingsInFlight = null;
    }
}

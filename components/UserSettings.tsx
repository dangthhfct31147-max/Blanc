import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, Card } from './ui/Common';
import { api, API_BASE_URL } from '../lib/api';
import { clientStorage } from '../lib/cache';
import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';
import { AppLocale, DEFAULT_LOCALE, normalizeLocale, TranslationKey } from '../lib/i18n';
import { QrCode } from './QrCode';
import {
    User, Mail, Lock, Bell, Shield, Eye, EyeOff,
    Camera, Loader2, CheckCircle, AlertCircle, Save,
    ChevronDown, Check, X, Search, Crown, Palette
} from 'lucide-react';
import MembershipManager from './MembershipManager';
import ThemeToggle from './ThemeToggle';
import {
    ROLES, ROLE_COLORS, EXPERIENCE_LEVELS, YEARS_EXPERIENCE,
    TIMEZONES, LANGUAGES, SKILLS, TECH_STACK, COMMUNICATION_TOOLS,
    REMOTE_PREFERENCES, AVAILABILITY_OPTIONS, COLLABORATION_STYLES,
    CONTEST_INTERESTS, CONTEST_FORMATS, TEAM_SIZES,
    STRENGTHS, LEARNING_GOALS, LOCATIONS_VN
} from '../constants/profileOptions';

// ============ CUSTOM DROPDOWN COMPONENT ============
interface DropdownOption {
    value: string;
    label: string;
}

interface CustomDropdownProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: DropdownOption[];
    placeholder?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
    label,
    value,
    onChange,
    options,
    placeholder
}) => {
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const resolvedPlaceholder = placeholder ?? t('common.select');

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="w-full">
            {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
            <div className="relative" ref={dropdownRef}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full px-3 py-2.5 bg-white rounded-lg text-sm border outline-none cursor-pointer transition-all flex items-center justify-between gap-2 hover:bg-slate-50 ${isOpen
                        ? 'ring-2 ring-primary-500 border-primary-500'
                        : 'border-slate-300'
                        } ${value ? 'text-slate-900' : 'text-slate-500'}`}
                >
                    <span className="truncate">{selectedOption?.label || resolvedPlaceholder}</span>
                    <div className="flex items-center gap-1">
                        {value && (
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange('');
                                }}
                                className="p-0.5 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                            </span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-70 overflow-y-auto p-2">
                            {/* Placeholder option */}
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('');
                                    setIsOpen(false);
                                }}
                                className={`w-full px-3 py-2.5 rounded-lg text-sm text-left transition-all flex items-center justify-between ${!value
                                    ? 'bg-primary-50 text-primary-700 font-medium'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <span>{resolvedPlaceholder}</span>
                                {!value && <Check className="w-4 h-4 text-primary-600" />}
                            </button>
                            {/* Options */}
                            {options.filter(opt => opt.value).map(option => {
                                const isSelected = value === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full px-3 py-2.5 rounded-lg text-sm text-left transition-all flex items-center justify-between ${isSelected
                                            ? 'bg-primary-50 text-primary-700 font-medium'
                                            : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span>{option.label}</span>
                                        {isSelected && <Check className="w-4 h-4 text-primary-600" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============ MULTI-SELECT TAG COMPONENT ============
interface MultiSelectTagsProps {
    label?: string;
    values: string[];
    onChange: (values: string[]) => void;
    options: readonly string[];
    placeholder?: string;
    maxItems?: number;
    colorMap?: Record<string, string>;
    displayMap?: Record<string, string>;
}

const MultiSelectTags: React.FC<MultiSelectTagsProps> = ({
    label,
    values,
    onChange,
    options,
    placeholder,
    maxItems = 10,
    colorMap,
    displayMap
}) => {
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const resolvedPlaceholder = placeholder ?? t('common.searchAndSelect');
    const getDisplayLabel = useCallback((val: string) => displayMap?.[val] ?? val, [displayMap]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        getDisplayLabel(opt).toLowerCase().includes(searchQuery.toLowerCase()) && !values.includes(opt)
    );

    const toggleValue = (val: string) => {
        if (values.includes(val)) {
            onChange(values.filter(v => v !== val));
        } else if (values.length < maxItems) {
            onChange([...values, val]);
        }
    };

    const removeValue = (val: string) => {
        onChange(values.filter(v => v !== val));
    };

    const getTagColor = (val: string) => {
        if (colorMap && colorMap[val]) {
            return colorMap[val];
        }
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    return (
        <div className="w-full">
            {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
            <div className="relative" ref={dropdownRef}>
                {/* Selected Tags */}
                <div
                    onClick={() => {
                        setIsOpen(true);
                        inputRef.current?.focus();
                    }}
                    className={`min-h-10.5 px-3 py-2 bg-white rounded-lg text-sm border cursor-text transition-all flex flex-wrap gap-1.5 items-center ${isOpen
                        ? 'ring-2 ring-primary-500 border-primary-500'
                        : 'border-slate-300'
                        }`}
                >
                    {values.map(val => (
                        <span
                            key={val}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${getTagColor(val)}`}
                        >
                            {getDisplayLabel(val)}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeValue(val);
                                }}
                                className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                                title={t('common.removeValue', { value: val })}
                                aria-label={t('common.removeValue', { value: val })}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                    {values.length < maxItems && (
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsOpen(true)}
                            placeholder={values.length === 0 ? resolvedPlaceholder : ''}
                            className="flex-1 min-w-25 outline-none bg-transparent text-sm placeholder:text-slate-400"
                        />
                    )}
                </div>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 border-b border-slate-100 flex items-center gap-2 text-slate-400">
                            <Search className="w-4 h-4" />
                            <span className="text-xs">{t('common.selectedCount', { count: values.length, max: maxItems })}</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-2">
                            {filteredOptions.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-3">
                                    {searchQuery ? t('common.noResults') : t('common.allSelected')}
                                </p>
                            ) : (
                                filteredOptions.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => {
                                            toggleValue(opt);
                                            setSearchQuery('');
                                        }}
                                        disabled={values.length >= maxItems}
                                        className="w-full px-3 py-2 rounded-lg text-sm text-left transition-all flex items-center justify-between text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${getTagColor(opt)}`}>
                                            {getDisplayLabel(opt)}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            {values.length >= maxItems && (
                <p className="mt-1 text-xs text-amber-600">{t('common.limitReached', { max: maxItems })}</p>
            )}
        </div>
    );
};

// ============ TYPES ============
interface MatchingProfile {
    primaryRole: string;
    secondaryRoles: string[];
    experienceLevel: string;
    yearsExperience: number | null;
    location: string;
    timeZone: string;
    languages: string[];
    skills: string[];
    techStack: string[];
    remotePreference: string;
    availability: string;
    collaborationStyle: string;
    communicationTools: string[];
    openToNewTeams: boolean;
    openToMentor: boolean;
}

interface ContestPreferences {
    contestInterests: string[];
    preferredContestFormats: string[];
    preferredTeamRole: string;
    preferredTeamSize: string;
    learningGoals: string;
    strengths: string;
    achievements: string;
    portfolioLinks: string[];
}

interface ProfileConsents {
    allowMatching: boolean;
    allowRecommendations: boolean;
    shareExtendedProfile: boolean;
}

interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    locale?: AppLocale;
    phone?: string;
    bio?: string;
    matchingProfile: MatchingProfile;
    contestPreferences: ContestPreferences;
    consents: ProfileConsents;
    notifications: {
        email: boolean;
        push: boolean;
        contestReminders: boolean;
        courseUpdates: boolean;
        marketing: boolean;
    };
    privacy: {
        showProfile: boolean;
        showActivity: boolean;
        showAchievements: boolean;
    };
    createdAt: string;
    updatedAt: string;
}

interface PasswordChangeData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

type SettingsTab = 'profile' | 'security' | 'notifications' | 'privacy' | 'membership';
type MatchingListKeys = 'secondaryRoles' | 'languages' | 'skills' | 'techStack' | 'communicationTools';
type ContestListKeys = 'contestInterests' | 'preferredContestFormats' | 'portfolioLinks';

// Default creators to avoid shared references
const createDefaultMatchingProfile = (): MatchingProfile => ({
    primaryRole: '',
    secondaryRoles: [],
    experienceLevel: '',
    yearsExperience: null,
    location: '',
    timeZone: '',
    languages: [],
    skills: [],
    techStack: [],
    remotePreference: '',
    availability: '',
    collaborationStyle: '',
    communicationTools: [],
    openToNewTeams: true,
    openToMentor: false,
});

const createDefaultContestPreferences = (): ContestPreferences => ({
    contestInterests: [],
    preferredContestFormats: [],
    preferredTeamRole: '',
    preferredTeamSize: '',
    learningGoals: '',
    strengths: '',
    achievements: '',
    portfolioLinks: [],
});

const createDefaultConsents = (): ProfileConsents => ({
    allowMatching: true,
    allowRecommendations: true,
    shareExtendedProfile: false,
});

const DEFAULT_NOTIFICATION_SETTINGS = {
    email: true,
    push: true,
    contestReminders: true,
    courseUpdates: true,
    marketing: false,
};

const DEFAULT_PRIVACY_SETTINGS = {
    showProfile: true,
    showActivity: true,
    showAchievements: true,
};

const parseListInput = (value: string, maxItems = 20) =>
    value.split(',').map(item => item.trim()).filter(Boolean).slice(0, maxItems);

const joinList = (list?: string[]) => list && list.length ? list.join(', ') : '';

// ============ TOAST COMPONENT ============
const Toast: React.FC<{
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
            {type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className="text-sm font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 text-current opacity-70 hover:opacity-100">
                ×
            </button>
        </div>
    );
};

// ============ MAIN SETTINGS COMPONENT ============
const UserSettings: React.FC = () => {
    const { locale: uiLocale, setLocale: setUiLocale, t } = useI18n();
    const { mode, resolved } = useTheme();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const settingsTabFromUrl = searchParams.get('settingsTab') as SettingsTab | null;

    const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
        if (settingsTabFromUrl && ['profile', 'security', 'notifications', 'privacy', 'membership'].includes(settingsTabFromUrl)) {
            return settingsTabFromUrl;
        }
        try {
            const saved = localStorage.getItem(clientStorage.buildKey('ui', 'settingsTab'));
            if (saved && ['profile', 'security', 'notifications', 'privacy', 'membership'].includes(saved)) {
                return saved as SettingsTab;
            }
        } catch {
            // ignore
        }
        return 'profile';
    });
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isTestingNotification, setIsTestingNotification] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isLocaleSaving, setIsLocaleSaving] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const localeRequestIdRef = useRef(0);
    const notificationSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const notificationRequestIdRef = useRef(0);
    const privacySaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const privacyRequestIdRef = useRef(0);

    const isEnglish = uiLocale === 'en';
    const themeLabel = mode === 'system'
        ? `Hệ thống (${resolved === 'dark' ? 'đang tối' : 'đang sáng'})`
        : mode === 'dark'
            ? 'Tối'
            : 'Sáng';
    const experienceOptions = useMemo(() => {
        const labels: Record<string, string> = {
            beginner: 'Beginner',
            intermediate: 'Intermediate',
            advanced: 'Advanced',
            expert: 'Expert',
        };
        return EXPERIENCE_LEVELS.map(level => ({
            value: level.value,
            label: isEnglish ? labels[level.value] ?? level.label : level.label,
        }));
    }, [isEnglish]);

    const yearsExperienceOptions = useMemo(() => {
        const labels: Record<string, string> = {
            '0': 'No experience',
            '1': '< 1 year',
            '2': '1-2 years',
            '3': '2-3 years',
            '5': '3-5 years',
            '10': '5+ years',
        };
        return YEARS_EXPERIENCE.map(item => ({
            value: item.value,
            label: isEnglish ? labels[item.value] ?? item.label : item.label,
        }));
    }, [isEnglish]);

    const remotePreferenceOptions = useMemo(() => {
        const labels: Record<string, string> = {
            remote: 'Remote',
            hybrid: 'Hybrid',
            onsite: 'Onsite',
            flexible: 'Flexible',
        };
        return REMOTE_PREFERENCES.map(item => ({
            value: item.value,
            label: isEnglish ? labels[item.value] ?? item.label : item.label,
        }));
    }, [isEnglish]);

    const timeZoneOptions = useMemo(() => {
        const labels: Record<string, string> = {
            'UTC+7': 'UTC+7 (Vietnam, Thailand)',
            'UTC+8': 'UTC+8 (Singapore, Malaysia)',
            'UTC+9': 'UTC+9 (Japan, Korea)',
            'UTC+0': 'UTC+0 (London, GMT)',
            'UTC-5': 'UTC-5 (New York, EST)',
            'UTC-8': 'UTC-8 (Los Angeles, PST)',
            'UTC+1': 'UTC+1 (Paris, Berlin)',
            'UTC+5:30': 'UTC+5:30 (India)',
        };
        return TIMEZONES.map(item => ({
            value: item.value,
            label: isEnglish ? labels[item.value] ?? item.label : item.label,
        }));
    }, [isEnglish]);

    const teamSizeOptions = useMemo(() => {
        const labels: Record<string, string> = {
            solo: 'Solo (1 person)',
            small: 'Small (2-3 people)',
            medium: 'Medium (4-5 people)',
            large: 'Large (6+ people)',
            any: 'Any size',
        };
        return TEAM_SIZES.map(item => ({
            value: item.value,
            label: isEnglish ? labels[item.value] ?? item.label : item.label,
        }));
    }, [isEnglish]);

    const locationOptions = useMemo(() => {
        const labels: Record<string, string> = {
            'Hà Nội': 'Hanoi',
            'TP. Hồ Chí Minh': 'Ho Chi Minh City',
            'Đà Nẵng': 'Da Nang',
            'Hải Phòng': 'Hai Phong',
            'Cần Thơ': 'Can Tho',
            'Biên Hòa': 'Bien Hoa',
            'Nha Trang': 'Nha Trang',
            'Huế': 'Hue',
            'Buôn Ma Thuột': 'Buon Ma Thuot',
            'Vũng Tàu': 'Vung Tau',
            'Quy Nhơn': 'Quy Nhon',
            'Thái Nguyên': 'Thai Nguyen',
            'Nam Định': 'Nam Dinh',
            'Vinh': 'Vinh',
            'Khác': 'Other',
        };
        return LOCATIONS_VN.map(loc => ({
            value: loc,
            label: isEnglish ? labels[loc] ?? loc : loc,
        }));
    }, [isEnglish]);

    const languageDisplayMap = useMemo<Record<string, string> | undefined>(() => {
        if (!isEnglish) return undefined;
        return {
            'Tiếng Việt': 'Vietnamese',
            'Tiếng Anh': 'English',
            'Tiếng Trung': 'Chinese',
            'Tiếng Nhật': 'Japanese',
            'Tiếng Hàn': 'Korean',
            'Tiếng Pháp': 'French',
            'Tiếng Đức': 'German',
            'Tiếng Tây Ban Nha': 'Spanish',
        };
    }, [isEnglish]);

    const availabilityDisplayMap = useMemo<Record<string, string> | undefined>(() => {
        if (!isEnglish) return undefined;
        return {
            'Full-time - Toàn thời gian': 'Full-time',
            'Part-time - Bán thời gian': 'Part-time',
            'Cuối tuần': 'Weekends',
            'Buổi tối (sau 18h)': 'Evenings (after 6pm)',
            'Buổi sáng (6h-12h)': 'Mornings (6am-12pm)',
            'Buổi chiều (12h-18h)': 'Afternoons (12pm-6pm)',
            'Linh hoạt theo lịch': 'Flexible schedule',
            'Chỉ ngày lễ/nghỉ': 'Holidays only',
        };
    }, [isEnglish]);

    const collaborationDisplayMap = useMemo<Record<string, string> | undefined>(() => {
        if (!isEnglish) return undefined;
        return {
            'Async - Chat, email': 'Async - Chat, email',
            'Sync - Meeting, call thường xuyên': 'Sync - Frequent meetings/calls',
            'Kết hợp async + sync': 'Hybrid async + sync',
            'Daily standup ngắn': 'Short daily standups',
            'Brainstorm trực quan (Figma, Miro)': 'Visual brainstorm (Figma, Miro)',
            'Quy trình rõ ràng (Agile/Scrum)': 'Structured process (Agile/Scrum)',
            'Flexible - Tùy team quyết định': 'Flexible - Team decides',
            'Độc lập, chỉ sync khi cần': 'Independent, sync when needed',
        };
    }, [isEnglish]);

    const strengthsDisplayMap = useMemo<Record<string, string> | undefined>(() => {
        if (!isEnglish) return undefined;
        return {
            'Giải quyết vấn đề nhanh': 'Fast problem solving',
            'Sáng tạo ý tưởng': 'Creative ideation',
            'Làm việc dưới áp lực': 'Work under pressure',
            'Giao tiếp hiệu quả': 'Effective communication',
            'Học hỏi nhanh': 'Fast learner',
            'Tỉ mỉ, chi tiết': 'Detail-oriented',
            'Lãnh đạo team': 'Team leadership',
            'Quản lý thời gian': 'Time management',
            'Phân tích dữ liệu': 'Data analysis',
            'Thiết kế UI/UX': 'UI/UX design',
            'Pitching/Thuyết trình': 'Pitching / presentation',
            'Debug & Troubleshoot': 'Debug & troubleshoot',
            'Code review': 'Code review',
            'Documentation': 'Documentation',
            'Research & Planning': 'Research & planning',
        };
    }, [isEnglish]);

    const learningGoalsDisplayMap = useMemo<Record<string, string> | undefined>(() => {
        if (!isEnglish) return undefined;
        return {
            'Nâng cao kỹ năng lập trình': 'Improve programming skills',
            'Học công nghệ mới': 'Learn new technologies',
            'Kinh nghiệm thực tế': 'Real-world experience',
            'Networking': 'Networking',
            'Giải thưởng & CV': 'Awards & CV',
            'Khởi nghiệp': 'Startup',
            'Tìm việc làm': 'Job search',
            'Vui & Trải nghiệm': 'Fun & experience',
            'Mentoring & Hướng dẫn người khác': 'Mentoring & coaching others',
            'Phát triển soft skills': 'Soft skills development',
        };
    }, [isEnglish]);

    // Update tab when URL changes
    useEffect(() => {
        if (settingsTabFromUrl && ['profile', 'security', 'notifications', 'privacy', 'membership'].includes(settingsTabFromUrl)) {
            setActiveTab(settingsTabFromUrl);
        }
    }, [settingsTabFromUrl]);

    // Persist UI preference (last opened settings tab)
    useEffect(() => {
        try {
            localStorage.setItem(clientStorage.buildKey('ui', 'settingsTab'), activeTab);
        } catch {
            // ignore
        }
    }, [activeTab]);

    // Form states
    const [profileForm, setProfileForm] = useState<{
        name: string;
        phone: string;
        bio: string;
        locale: AppLocale;
        matchingProfile: MatchingProfile;
        contestPreferences: ContestPreferences;
        consents: ProfileConsents;
    }>(() => ({
        name: '',
        phone: '',
        bio: '',
        locale: DEFAULT_LOCALE,
        matchingProfile: createDefaultMatchingProfile(),
        contestPreferences: createDefaultContestPreferences(),
        consents: createDefaultConsents(),
    }));

    const [passwordForm, setPasswordForm] = useState<PasswordChangeData>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [twoFactorInitial, setTwoFactorInitial] = useState(false);
    const [twoFactorPendingSetup, setTwoFactorPendingSetup] = useState(false);
    const [twoFactorSetup, setTwoFactorSetup] = useState<null | {
        otpauthUrl: string;
        secret: string;
        issuer?: string;
        digits?: number;
        period?: number;
        setupTtlMinutes?: number;
    }>(null);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [twoFactorPassword, setTwoFactorPassword] = useState('');
    const [showTwoFactorPassword, setShowTwoFactorPassword] = useState(false);
    const [isTwoFactorLoading, setIsTwoFactorLoading] = useState(true);
    const [isTwoFactorSaving, setIsTwoFactorSaving] = useState(false);

    const twoFactorIsEnabling = twoFactorEnabled && !twoFactorInitial;
    const twoFactorIsDisabling = !twoFactorEnabled && twoFactorInitial;
    const twoFactorNeedsPassword = twoFactorIsDisabling || (twoFactorIsEnabling && !twoFactorSetup);
    const twoFactorNeedsCode = twoFactorIsEnabling && Boolean(twoFactorSetup);
    const twoFactorCodeOk = /^\d{6}$/.test(twoFactorCode.replace(/[^0-9]/g, ''));

    const [notificationSettings, setNotificationSettings] = useState(() => ({ ...DEFAULT_NOTIFICATION_SETTINGS }));
    const [isNotificationSaving, setIsNotificationSaving] = useState(false);
    const notificationPendingRef = useRef(notificationSettings);
    const notificationLastSavedRef = useRef(notificationSettings);

    const [privacySettings, setPrivacySettings] = useState(() => ({ ...DEFAULT_PRIVACY_SETTINGS }));
    const [isPrivacySaving, setIsPrivacySaving] = useState(false);
    const privacyPendingRef = useRef(privacySettings);
    const privacyLastSavedRef = useRef(privacySettings);

    // Fetch user profile
    const fetchProfile = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await api.get<UserProfile>('/users/me/settings');
            let localPreferred: AppLocale | null = null;
            try {
                localPreferred = normalizeLocale(localStorage.getItem('contesthub:locale'));
            } catch {
                // ignore
            }
            const resolvedLocale = localPreferred || normalizeLocale(data.locale) || DEFAULT_LOCALE;
            setUiLocale(resolvedLocale);
            setProfile(data);
            setProfileForm({
                name: data.name || '',
                phone: data.phone || '',
                bio: data.bio || '',
                locale: resolvedLocale,
                matchingProfile: {
                    ...createDefaultMatchingProfile(),
                    ...(data.matchingProfile || {})
                },
                contestPreferences: {
                    ...createDefaultContestPreferences(),
                    ...(data.contestPreferences || {})
                },
                consents: {
                    ...createDefaultConsents(),
                    ...(data.consents || {})
                },
            });
            const resolvedNotificationSettings = {
                ...DEFAULT_NOTIFICATION_SETTINGS,
                ...(data.notifications || {}),
            };
            const resolvedPrivacySettings = {
                ...DEFAULT_PRIVACY_SETTINGS,
                ...(data.privacy || {}),
            };

            setNotificationSettings(resolvedNotificationSettings);
            notificationPendingRef.current = resolvedNotificationSettings;
            notificationLastSavedRef.current = resolvedNotificationSettings;
            setPrivacySettings(resolvedPrivacySettings);
            privacyPendingRef.current = resolvedPrivacySettings;
            privacyLastSavedRef.current = resolvedPrivacySettings;

            // Sync with localStorage to keep sidebar and header in sync
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                let needsUpdate = false;

                if (data.name && user.name !== data.name) {
                    user.name = data.name;
                    needsUpdate = true;
                }
                if (data.avatar && user.avatar !== data.avatar) {
                    user.avatar = data.avatar;
                    needsUpdate = true;
                }
                if (resolvedLocale && user.locale !== resolvedLocale) {
                    user.locale = resolvedLocale;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    localStorage.setItem('user', JSON.stringify(user));
                    window.dispatchEvent(new Event('auth-change'));
                }
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : t('settings.loadFailed'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchTwoFactorStatus = useCallback(async () => {
        try {
            setIsTwoFactorLoading(true);
            const data = await api.get<{ twoFactorEnabled: boolean; twoFactorPendingSetup?: boolean }>('/auth/settings/2fa');
            const enabled = data.twoFactorEnabled === true;
            const pending = data.twoFactorPendingSetup === true;
            setTwoFactorEnabled(enabled);
            setTwoFactorInitial(enabled);
            setTwoFactorPendingSetup(pending);
            if (enabled) {
                setTwoFactorSetup(null);
                setTwoFactorCode('');
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : t('settings.security.twoFactor.loadFailed'), 'error');
        } finally {
            setIsTwoFactorLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        return () => {
            if (notificationSaveTimerRef.current) {
                clearTimeout(notificationSaveTimerRef.current);
            }
            if (privacySaveTimerRef.current) {
                clearTimeout(privacySaveTimerRef.current);
            }
        };
    }, []);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    const updateLocalUserLocale = (nextLocale: AppLocale) => {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const user = JSON.parse(userStr);
            if (user?.locale === nextLocale) return;
            user.locale = nextLocale;
            localStorage.setItem('user', JSON.stringify(user));
            window.dispatchEvent(new Event('auth-change'));
        } catch {
            // ignore
        }
    };

    const handleLocaleChange = async (nextLocale: AppLocale) => {
        const requestId = ++localeRequestIdRef.current;
        const previousLocale = uiLocale;

        setProfileForm(prev => ({ ...prev, locale: nextLocale }));
        setUiLocale(nextLocale);
        updateLocalUserLocale(nextLocale);

        setIsLocaleSaving(true);
        try {
            await api.patch('/users/me/locale', { locale: nextLocale });
            if (requestId !== localeRequestIdRef.current) return;
            showToast(t('settings.profile.languageSaved'), 'success');
        } catch (err) {
            if (requestId !== localeRequestIdRef.current) return;
            setProfileForm(prev => ({ ...prev, locale: previousLocale }));
            setUiLocale(previousLocale);
            updateLocalUserLocale(previousLocale);
            showToast(err instanceof Error ? err.message : t('settings.profile.languageSaveFailed'), 'error');
        } finally {
            if (requestId === localeRequestIdRef.current) {
                setIsLocaleSaving(false);
            }
        }
    };

    const saveNotificationSettings = useCallback(async (nextSettings: typeof notificationSettings, options?: { silent?: boolean }) => {
        if (JSON.stringify(notificationLastSavedRef.current) === JSON.stringify(nextSettings)) {
            return;
        }

        const requestId = ++notificationRequestIdRef.current;
        setIsNotificationSaving(true);
        try {
            await api.patch('/users/me/notifications', nextSettings);
            if (requestId !== notificationRequestIdRef.current) {
                return;
            }
            notificationLastSavedRef.current = nextSettings;
            if (!options?.silent) {
                showToast(t('settings.notifications.updateSuccess'), 'success');
            }
        } catch (err) {
            if (requestId !== notificationRequestIdRef.current) {
                return;
            }
            const fallback = notificationLastSavedRef.current;
            if (fallback) {
                setNotificationSettings(fallback);
                notificationPendingRef.current = fallback;
            }
            showToast(err instanceof Error ? err.message : t('settings.notifications.updateFailed'), 'error');
        } finally {
            if (requestId === notificationRequestIdRef.current) {
                setIsNotificationSaving(false);
            }
        }
    }, [showToast]);

    const scheduleNotificationSave = useCallback((nextSettings: typeof notificationSettings) => {
        notificationPendingRef.current = nextSettings;
        if (notificationSaveTimerRef.current) {
            clearTimeout(notificationSaveTimerRef.current);
        }
        notificationSaveTimerRef.current = setTimeout(() => {
            saveNotificationSettings(notificationPendingRef.current, { silent: true });
        }, 600);
    }, [saveNotificationSettings]);

    const handleNotificationToggle = useCallback((key: keyof typeof notificationSettings, value: boolean) => {
        setNotificationSettings(prev => {
            const nextSettings = { ...prev, [key]: value };
            scheduleNotificationSave(nextSettings);
            return nextSettings;
        });
    }, [scheduleNotificationSave]);

    const savePrivacySettings = useCallback(async (nextSettings: typeof privacySettings, options?: { silent?: boolean }) => {
        if (JSON.stringify(privacyLastSavedRef.current) === JSON.stringify(nextSettings)) {
            return;
        }

        const requestId = ++privacyRequestIdRef.current;
        setIsPrivacySaving(true);
        try {
            await api.patch('/users/me/privacy', nextSettings);
            if (requestId !== privacyRequestIdRef.current) {
                return;
            }
            privacyLastSavedRef.current = nextSettings;
            if (!options?.silent) {
                showToast(t('settings.privacy.updateSuccess'), 'success');
            }
        } catch (err) {
            if (requestId !== privacyRequestIdRef.current) {
                return;
            }
            const fallback = privacyLastSavedRef.current;
            if (fallback) {
                setPrivacySettings(fallback);
                privacyPendingRef.current = fallback;
            }
            showToast(err instanceof Error ? err.message : t('settings.privacy.updateFailed'), 'error');
        } finally {
            if (requestId === privacyRequestIdRef.current) {
                setIsPrivacySaving(false);
            }
        }
    }, [showToast]);

    const schedulePrivacySave = useCallback((nextSettings: typeof privacySettings) => {
        privacyPendingRef.current = nextSettings;
        if (privacySaveTimerRef.current) {
            clearTimeout(privacySaveTimerRef.current);
        }
        privacySaveTimerRef.current = setTimeout(() => {
            savePrivacySettings(privacyPendingRef.current, { silent: true });
        }, 600);
    }, [savePrivacySettings]);

    const handlePrivacyToggle = useCallback((key: keyof typeof privacySettings, value: boolean) => {
        setPrivacySettings(prev => {
            const nextSettings = { ...prev, [key]: value };
            schedulePrivacySave(nextSettings);
            return nextSettings;
        });
    }, [schedulePrivacySave]);

    const updateMatchingProfileList = (key: MatchingListKeys, rawValue: string, maxItems = 20) => {
        const parsedList = parseListInput(rawValue, maxItems);
        setProfileForm(prev => ({
            ...prev,
            matchingProfile: { ...prev.matchingProfile, [key]: parsedList },
        }));
    };

    const updateContestPreferencesList = (key: ContestListKeys, rawValue: string, maxItems = 20) => {
        const parsedList = parseListInput(rawValue, maxItems);
        setProfileForm(prev => ({
            ...prev,
            contestPreferences: { ...prev.contestPreferences, [key]: parsedList },
        }));
    };

    const validateStringList = (list: string[], label: string, maxItems = 20, maxLength = 60, requireUrl = false) => {
        if (list.length > maxItems) {
            showToast(t('settings.validation.maxItems', { label, max: maxItems }), 'error');
            return false;
        }
        const tooLong = list.find(item => item.length > maxLength);
        if (tooLong) {
            showToast(t('settings.validation.maxLength', { label, max: maxLength }), 'error');
            return false;
        }
        if (requireUrl) {
            const urlPattern = /^https?:\/\//i;
            const invalid = list.find(item => !urlPattern.test(item));
            if (invalid) {
                showToast(t('settings.validation.urlRequired', { label }), 'error');
                return false;
            }
        }
        return true;
    };

    const handleYearsExperienceChange = (value: string) => {
        if (value === '') {
            setProfileForm(prev => ({
                ...prev,
                matchingProfile: { ...prev.matchingProfile, yearsExperience: null },
            }));
            return;
        }
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return;
        }
        const clamped = Math.max(0, Math.min(50, numeric));
        setProfileForm(prev => ({
            ...prev,
            matchingProfile: { ...prev.matchingProfile, yearsExperience: clamped },
        }));
    };

    // Upload avatar to backend media storage
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showToast(t('settings.avatar.invalidType'), 'error');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast(t('settings.avatar.fileTooLarge'), 'error');
            return;
        }

        setIsUploadingAvatar(true);
        try {
            // Get presign info from backend
            const presignData = await api.post<{
                uploadUrl: string;
                fileName: string;
                folder: string;
                mimeType: string;
                nonce: string;
                timestamp: number;
                signature: string;
            }>('/media/presign', {
                mimeType: file.type,
                folder: 'avatars'
            });

            // Upload to backend
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileName', presignData.fileName);
            formData.append('folder', presignData.folder);
            formData.append('mimeType', presignData.mimeType);
            formData.append('nonce', presignData.nonce);
            formData.append('timestamp', String(presignData.timestamp));
            formData.append('signature', presignData.signature);

            const uploadResponse = await fetch(presignData.uploadUrl, {
                method: 'POST',
                body: formData,
            });

            const uploadResult = await uploadResponse.json();

            if (uploadResult.status !== 200 || !uploadResult.result) {
                throw new Error(uploadResult.result?.error || 'Upload failed');
            }

            const directImageUrl = uploadResult.result.url;
            if (!directImageUrl) {
                throw new Error('Upload failed');
            }

            // Update avatar URL in database
            await api.patch('/users/me/avatar', { avatarUrl: directImageUrl });

            // Update local state
            setProfile(prev => prev ? { ...prev, avatar: directImageUrl } : null);

            // Update localStorage and trigger auth-change event
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.avatar = directImageUrl;
                localStorage.setItem('user', JSON.stringify(user));
                window.dispatchEvent(new Event('auth-change'));
            }

            showToast(t('settings.avatar.updateSuccess'), 'success');
        } catch (err) {
            console.error('Avatar upload error:', err);
            showToast(err instanceof Error ? err.message : t('settings.avatar.uploadFailed'), 'error');
        } finally {
            setIsUploadingAvatar(false);
            // Reset input
            if (avatarInputRef.current) {
                avatarInputRef.current.value = '';
            }
        }
    };

    // Save profile
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!profileForm.name.trim()) {
            showToast(t('settings.profile.validation.nameRequired'), 'error');
            return;
        }
        if (profileForm.name.length > 100) {
            showToast(t('settings.profile.validation.nameTooLong'), 'error');
            return;
        }
        if (profileForm.bio && profileForm.bio.length > 500) {
            showToast(t('settings.profile.validation.bioTooLong'), 'error');
            return;
        }
        if (profileForm.phone && !/^[0-9+\-\s]{0,20}$/.test(profileForm.phone)) {
            showToast(t('settings.profile.validation.phoneInvalid'), 'error');
            return;
        }
        const { matchingProfile, contestPreferences } = profileForm;

        if (matchingProfile.yearsExperience !== null && (matchingProfile.yearsExperience < 0 || matchingProfile.yearsExperience > 50)) {
            showToast(t('settings.profile.validation.yearsRange'), 'error');
            return;
        }
        if (!validateStringList(matchingProfile.skills, t('settings.profile.validation.skills'), 20, 60)) return;
        if (!validateStringList(matchingProfile.techStack, t('settings.profile.validation.techStack'), 20, 60)) return;
        if (!validateStringList(matchingProfile.languages, t('settings.profile.validation.languages'), 8, 50)) return;
        if (!validateStringList(matchingProfile.secondaryRoles, t('settings.profile.validation.secondaryRoles'), 10, 50)) return;
        if (!validateStringList(matchingProfile.communicationTools, t('settings.profile.validation.communicationTools'), 8, 50)) return;
        if (!validateStringList(contestPreferences.contestInterests, t('settings.profile.validation.contestInterests'), 15, 60)) return;
        if (!validateStringList(contestPreferences.preferredContestFormats, t('settings.profile.validation.contestFormats'), 10, 60)) return;
        if (!validateStringList(contestPreferences.portfolioLinks, t('settings.profile.validation.portfolioLinks'), 5, 300, true)) return;
        if (matchingProfile.availability.length > 200) {
            showToast(t('settings.profile.validation.availabilityTooLong'), 'error');
            return;
        }
        if (matchingProfile.collaborationStyle.length > 200) {
            showToast(t('settings.profile.validation.collaborationTooLong'), 'error');
            return;
        }
        if (contestPreferences.learningGoals.length > 400) {
            showToast(t('settings.profile.validation.learningGoalsTooLong'), 'error');
            return;
        }
        if (contestPreferences.strengths.length > 400) {
            showToast(t('settings.profile.validation.strengthsTooLong'), 'error');
            return;
        }
        if (contestPreferences.achievements.length > 500) {
            showToast(t('settings.profile.validation.achievementsTooLong'), 'error');
            return;
        }

        setIsSaving(true);
        try {
            await api.patch('/users/me/profile', profileForm);

            // Update localStorage user data
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.name = profileForm.name;
                user.locale = profileForm.locale;
                localStorage.setItem('user', JSON.stringify(user));
                window.dispatchEvent(new Event('auth-change'));
            }

            showToast(t('settings.profile.updateSuccess'), 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : t('settings.profile.updateFailed'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Change password
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!passwordForm.currentPassword) {
            showToast(t('settings.security.validation.currentPasswordRequired'), 'error');
            return;
        }
        if (passwordForm.newPassword.length < 8) {
            showToast(t('settings.security.validation.newPasswordMin'), 'error');
            return;
        }
        if (passwordForm.newPassword.length > 128) {
            showToast(t('settings.security.validation.newPasswordMax'), 'error');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showToast(t('settings.security.validation.confirmMismatch'), 'error');
            return;
        }
        if (passwordForm.currentPassword === passwordForm.newPassword) {
            showToast(t('settings.security.validation.newPasswordDifferent'), 'error');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/users/me/change-password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showToast(t('settings.security.passwordChangeSuccess'), 'success');
        } catch (err) {
            const message = err instanceof Error ? err.message : t('settings.security.passwordChangeFailed');
            const errorMessages: Record<string, string> = {
                'Current password is incorrect.': t('settings.security.errors.currentPasswordIncorrect'),
                'Password must be at least 8 characters.': t('settings.security.errors.passwordMin'),
                'Mật khẩu hiện tại không đúng.': t('settings.security.errors.currentPasswordIncorrect'),
                'Mật khẩu phải có ít nhất 8 ký tự.': t('settings.security.errors.passwordMin'),
            };
            showToast(errorMessages[message] || message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveTwoFactor = async () => {
        const isEnabling = twoFactorEnabled === true && twoFactorInitial === false;
        const isDisabling = twoFactorEnabled === false && twoFactorInitial === true;

        if (!isEnabling && !isDisabling) {
            return;
        }

        // Start setup (generate secret + QR) or disable: both require password confirmation
        const needsPassword = isDisabling || (isEnabling && !twoFactorSetup);
        if (needsPassword && !twoFactorPassword) {
            showToast(t('settings.security.twoFactor.passwordRequired'), 'error');
            return;
        }

        if (isEnabling && twoFactorSetup) {
            const code = twoFactorCode.replace(/[^0-9]/g, '');
            if (!/^\d{6}$/.test(code)) {
                showToast(t('settings.security.twoFactor.codeRequired'), 'error');
                return;
            }
        }

        setIsTwoFactorSaving(true);
        try {
            if (isDisabling) {
                const data = await api.patch<{ twoFactorEnabled: boolean; message?: string }>('/auth/settings/2fa', {
                    enabled: false,
                    password: twoFactorPassword,
                });
                const updated = data.twoFactorEnabled === true;
                setTwoFactorEnabled(updated);
                setTwoFactorInitial(updated);
                setTwoFactorPendingSetup(false);
                setTwoFactorSetup(null);
                setTwoFactorCode('');
                setTwoFactorPassword('');
                setShowTwoFactorPassword(false);
                showToast(data.message || t('settings.security.twoFactor.disabled'), 'success');
                return;
            }

            if (!twoFactorSetup) {
                const data = await api.post<{
                    ok: boolean;
                    issuer?: string;
                    otpauthUrl: string;
                    secret: string;
                    digits?: number;
                    period?: number;
                    setupTtlMinutes?: number;
                }>('/auth/settings/2fa/setup', {
                    password: twoFactorPassword,
                });
                setTwoFactorSetup({
                    otpauthUrl: data.otpauthUrl,
                    secret: data.secret,
                    issuer: data.issuer,
                    digits: data.digits,
                    period: data.period,
                    setupTtlMinutes: data.setupTtlMinutes,
                });
                setTwoFactorPendingSetup(true);
                setTwoFactorPassword('');
                setShowTwoFactorPassword(false);
                showToast(t('settings.security.twoFactor.setupInstruction'), 'success');
                return;
            }

            const data = await api.post<{ ok: boolean; twoFactorEnabled: boolean; message?: string }>('/auth/settings/2fa/verify', {
                code: twoFactorCode.replace(/[^0-9]/g, ''),
            });
            const updated = data.twoFactorEnabled === true;
            setTwoFactorEnabled(updated);
            setTwoFactorInitial(updated);
            setTwoFactorPendingSetup(false);
            setTwoFactorSetup(null);
            setTwoFactorCode('');
            showToast(data.message || (updated ? t('settings.security.twoFactor.enabled') : t('settings.security.twoFactor.enableFailed')), updated ? 'success' : 'error');
        } catch (err) {
            const errorCode: string | undefined = (err as any)?.code;

            if (errorCode === 'NO_PENDING_2FA_SETUP' || errorCode === 'TOTP_SETUP_EXPIRED' || errorCode === 'MAX_ATTEMPTS_EXCEEDED') {
                setTwoFactorPendingSetup(false);
                setTwoFactorSetup(null);
                setTwoFactorCode('');
                setTwoFactorPassword('');
                setShowTwoFactorPassword(false);
                showToast(
                    t('settings.security.twoFactor.setupExpired'),
                    'error'
                );
                return;
            }

            if (errorCode === 'INVALID_TOTP') {
                const remainingAttempts = Number((err as any)?.data?.remainingAttempts);
                if (Number.isFinite(remainingAttempts)) {
                    showToast(t('settings.security.twoFactor.invalidCodeRemaining', { count: remainingAttempts }), 'error');
                    return;
                }
            }

            if (errorCode === 'TOTP_NOT_CONFIGURED') {
                showToast(t('settings.security.twoFactor.notConfigured'), 'error');
                return;
            }

            const message = err instanceof Error ? err.message : t('settings.security.twoFactor.updateFailed');
            const errorMessages: Record<string, string> = {
                'Password confirmation required.': t('settings.security.twoFactor.passwordRequired'),
                'Invalid password.': t('settings.security.twoFactor.invalidPassword'),
                'No pending 2FA setup. Start setup first.': t('settings.security.twoFactor.noPendingSetup'),
                '2FA setup expired. Please start again.': t('settings.security.twoFactor.setupExpiredShort'),
                'Too many failed attempts. Please start setup again.': t('settings.security.twoFactor.tooManyAttempts'),
                'Code must be 6 digits.': t('settings.security.twoFactor.codeDigits'),
                'Vui lòng nhập mật khẩu để cập nhật 2FA.': t('settings.security.twoFactor.passwordRequired'),
                'Mật khẩu không đúng.': t('settings.security.twoFactor.invalidPassword'),
                'Chưa có thiết lập 2FA. Vui lòng bắt đầu thiết lập.': t('settings.security.twoFactor.noPendingSetup'),
                'Phiên thiết lập 2FA đã hết hạn. Vui lòng tạo lại QR code.': t('settings.security.twoFactor.setupExpiredShort'),
                'Bạn nhập sai quá nhiều lần. Vui lòng tạo lại QR code.': t('settings.security.twoFactor.tooManyAttempts'),
                'Mã phải gồm 6 chữ số.': t('settings.security.twoFactor.codeDigits'),
            };
            showToast(errorMessages[message] || message, 'error');
        } finally {
            setIsTwoFactorSaving(false);
        }
    };

    // Save notification settings
    const handleSaveNotifications = async () => {
        if (notificationSaveTimerRef.current) {
            clearTimeout(notificationSaveTimerRef.current);
        }
        notificationPendingRef.current = notificationSettings;
        await saveNotificationSettings(notificationSettings);
    };

    // Save privacy settings
    const handleSavePrivacy = async () => {
        if (privacySaveTimerRef.current) {
            clearTimeout(privacySaveTimerRef.current);
        }
        privacyPendingRef.current = privacySettings;
        await savePrivacySettings(privacySettings);
    };

    // Test notification
    const handleTestNotification = async () => {
        setIsTestingNotification(true);
        try {
            await api.post('/notifications/test', { type: 'announcement' });
            showToast(t('settings.notifications.testSuccess'), 'success');
        } catch (err) {
            const message = err instanceof Error ? err.message : t('settings.notifications.testFailed');
            showToast(message, 'error');
        } finally {
            setIsTestingNotification(false);
        }
    };

    // Toggle Switch Component - using checkbox pattern for better accessibility
    const ToggleSwitch: React.FC<{
        checked: boolean;
        onChange: (checked: boolean) => void;
        disabled?: boolean;
        label?: string;
        id?: string;
    }> = ({ checked, onChange, disabled, label, id }) => {
        const switchId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;
        return (
            <label
                htmlFor={switchId}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${checked ? 'bg-primary-600' : 'bg-slate-200'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={label || "Toggle switch"}
            >
                <input
                    type="checkbox"
                    id={switchId}
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                    className="sr-only peer"
                    aria-label={label || "Toggle switch"}
                />
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </label>
        );
    };

    // Render tab content
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            );
        }

        switch (activeTab) {
            case 'membership':
                return <MembershipManager />;
            case 'profile':
                return (
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                            <User className="w-5 h-5 mr-2 text-primary-600" />
                            {t('settings.profile.title')}
                        </h3>

                        <form onSubmit={handleSaveProfile} className="space-y-6">
                            {/* Avatar */}
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden">
                                        {isUploadingAvatar ? (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                                            </div>
                                        ) : (
                                            <img
                                                src={profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileForm.name || 'User')}&background=6366f1&color=fff`}
                                                alt={t('settings.profile.avatarAlt')}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                        onChange={handleAvatarUpload}
                                        className="hidden"
                                        id="avatar-upload"
                                        aria-label={t('settings.profile.avatarSelect')}
                                        title={t('settings.profile.avatarSelect')}
                                    />
                                    <label
                                        htmlFor="avatar-upload"
                                        className={`absolute bottom-0 right-0 p-1.5 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors cursor-pointer ${isUploadingAvatar ? 'opacity-50 pointer-events-none' : ''}`}
                                        title={t('settings.profile.avatarChange')}
                                    >
                                        <Camera className="w-3.5 h-3.5" />
                                    </label>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{profile?.name}</p>
                                    <p className="text-xs text-slate-500">{profile?.email}</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {t('common.joinedAt', {
                                            date: profile?.createdAt
                                                ? new Date(profile.createdAt).toLocaleDateString(uiLocale === 'en' ? 'en-US' : 'vi-VN')
                                                : 'N/A',
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('settings.profile.fullName')} <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    value={profileForm.name}
                                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder={t('settings.profile.fullNamePlaceholder')}
                                    maxLength={100}
                                />
                                <p className="text-xs text-slate-400 mt-1">{profileForm.name.length}/100</p>
                            </div>

                            {/* Language */}
                            <div>
                                <CustomDropdown
                                    label={t('settings.profile.language')}
                                    value={profileForm.locale}
                                    onChange={(value) => {
                                        const next = value === 'en' ? 'en' : 'vi';
                                        void handleLocaleChange(next);
                                    }}
                                    placeholder={t('settings.profile.language')}
                                    options={[
                                        { value: 'vi', label: t('locale.vi') },
                                        { value: 'en', label: t('locale.en') },
                                    ]}
                                />
                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                    <span>{t('settings.profile.languageHint')}</span>
                                    {isLocaleSaving && (
                                        <span className="inline-flex items-center gap-1 text-slate-400">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            <span>{t('common.saving')}</span>
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* Email (read-only) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('settings.profile.email')}
                                </label>
                                <div className="relative">
                                    <Input
                                        value={profile?.email || ''}
                                        disabled
                                        className="bg-slate-50 text-slate-500"
                                    />
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{t('settings.profile.emailReadonly')}</p>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('settings.profile.phone')}
                                </label>
                                <Input
                                    type="tel"
                                    value={profileForm.phone}
                                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder={t('settings.profile.phonePlaceholder')}
                                    maxLength={20}
                                />
                            </div>

                            {/* Bio */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {t('settings.profile.bio')}
                                </label>
                                <textarea
                                    value={profileForm.bio}
                                    onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                                    placeholder={t('settings.profile.bioPlaceholder')}
                                    rows={4}
                                    maxLength={500}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                />
                                <p className="text-xs text-slate-400 mt-1">{profileForm.bio.length}/500</p>
                            </div>

                            {/* Matching profile - roles */}
                            <div className="border-t border-slate-100 pt-4">
                                <h4 className="text-sm font-semibold text-slate-900 mb-3">{t('settings.profile.matching.title')}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <CustomDropdown
                                            label={t('settings.profile.matching.primaryRole')}
                                            value={profileForm.matchingProfile.primaryRole}
                                            onChange={(value) => setProfileForm(prev => ({
                                                ...prev,
                                                matchingProfile: { ...prev.matchingProfile, primaryRole: value }
                                            }))}
                                            placeholder={t('common.select')}
                                            options={[{ value: '', label: t('common.select') }, ...ROLES.map(r => ({ value: r, label: r }))]}
                                        />
                                    </div>
                                    <div>
                                        <CustomDropdown
                                            label={t('settings.profile.matching.preferredTeamRole')}
                                            value={profileForm.contestPreferences.preferredTeamRole}
                                            onChange={(value) => setProfileForm(prev => ({
                                                ...prev,
                                                contestPreferences: { ...prev.contestPreferences, preferredTeamRole: value }
                                            }))}
                                            placeholder={t('common.select')}
                                            options={[{ value: '', label: t('common.select') }, ...ROLES.map(r => ({ value: r, label: r }))]}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <MultiSelectTags
                                            label={t('settings.profile.matching.secondaryRoles')}
                                            values={profileForm.matchingProfile.secondaryRoles}
                                            onChange={(values) => setProfileForm(prev => ({
                                                ...prev,
                                                matchingProfile: { ...prev.matchingProfile, secondaryRoles: values }
                                            }))}
                                            options={ROLES}
                                            maxItems={5}
                                            colorMap={ROLE_COLORS}
                                            placeholder={t('common.searchAndSelect')}
                                        />
                                    </div>
                                    <div>
                                        <CustomDropdown
                                            label={t('settings.profile.matching.experienceLevel')}
                                            value={profileForm.matchingProfile.experienceLevel}
                                            onChange={(value) => setProfileForm(prev => ({
                                                ...prev,
                                                matchingProfile: { ...prev.matchingProfile, experienceLevel: value }
                                            }))}
                                            placeholder={t('common.select')}
                                            options={[{ value: '', label: t('common.select') }, ...experienceOptions]}
                                        />
                                    </div>
                                    <div>
                                        <CustomDropdown
                                            label={t('settings.profile.matching.yearsExperience')}
                                            value={String(profileForm.matchingProfile.yearsExperience ?? '')}
                                            onChange={(value) => setProfileForm(prev => ({
                                                ...prev,
                                                matchingProfile: { ...prev.matchingProfile, yearsExperience: value ? parseInt(value) : null }
                                            }))}
                                            placeholder={t('common.select')}
                                            options={[{ value: '', label: t('common.select') }, ...yearsExperienceOptions]}
                                        />
                                    </div>
                                    <div>
                                        <CustomDropdown
                                            label={t('settings.profile.matching.teamSize')}
                                            value={profileForm.contestPreferences.preferredTeamSize}
                                            onChange={(value) => setProfileForm(prev => ({
                                                ...prev,
                                                contestPreferences: { ...prev.contestPreferences, preferredTeamSize: value }
                                            }))}
                                            placeholder={t('common.select')}
                                            options={[{ value: '', label: t('common.select') }, ...teamSizeOptions]}
                                        />
                                    </div>
                                    <div>
                                        <CustomDropdown
                                            label={t('settings.profile.matching.location')}
                                            value={profileForm.matchingProfile.location}
                                            onChange={(value) => setProfileForm(prev => ({
                                                ...prev,
                                                matchingProfile: { ...prev.matchingProfile, location: value }
                                            }))}
                                            placeholder={t('common.select')}
                                            options={[{ value: '', label: t('common.select') }, ...locationOptions]}
                                        />
                                    </div>
                                    <div>
                                        <CustomDropdown
                                            label={t('settings.profile.matching.timeZone')}
                                            value={profileForm.matchingProfile.timeZone}
                                            onChange={(value) => setProfileForm(prev => ({
                                                ...prev,
                                                matchingProfile: { ...prev.matchingProfile, timeZone: value }
                                            }))}
                                            placeholder={t('common.select')}
                                            options={[{ value: '', label: t('common.select') }, ...timeZoneOptions]}
                                        />
                                    </div>
                                    <div>
                                        <MultiSelectTags
                                            label={t('settings.profile.matching.languages')}
                                            values={profileForm.matchingProfile.languages}
                                            onChange={(values) => setProfileForm(prev => ({
                                                ...prev,
                                                matchingProfile: { ...prev.matchingProfile, languages: values }
                                            }))}
                                            options={LANGUAGES}
                                            displayMap={languageDisplayMap}
                                            maxItems={5}
                                            placeholder={t('common.searchAndSelect')}
                                        />
                                    </div>
                                    <div>
                                        <CustomDropdown
                                            label={t('settings.profile.matching.remotePreference')}
                                            value={profileForm.matchingProfile.remotePreference}
                                            onChange={(value) => setProfileForm(prev => ({
                                                ...prev,
                                                matchingProfile: { ...prev.matchingProfile, remotePreference: value }
                                            }))}
                                            placeholder={t('common.select')}
                                            options={[{ value: '', label: t('common.select') }, ...remotePreferenceOptions]}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Skills & availability */}
                            <div className="border-t border-slate-100 pt-4">
                                <h4 className="text-sm font-semibold text-slate-900 mb-3">{t('settings.profile.skills.title')}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <MultiSelectTags
                                            label={t('settings.profile.skills.primary')}
                                            values={profileForm.matchingProfile.skills}
                                            onChange={(values) => setProfileForm(prev => ({
                                                ...prev,
                                                matchingProfile: { ...prev.matchingProfile, skills: values }
                                            }))}
                                            options={SKILLS}
                                            maxItems={20}
                                            placeholder={t('common.searchAndSelect')}
                                        />
                                    </div>
                                    <div>
                                        <MultiSelectTags
                                            label={t('settings.profile.skills.techStack')}
                                            values={profileForm.matchingProfile.techStack}
                                            onChange={(values) => setProfileForm(prev => ({
                                                ...prev,
                                                matchingProfile: { ...prev.matchingProfile, techStack: values }
                                            }))}
                                            options={TECH_STACK}
                                            maxItems={20}
                                            placeholder={t('common.searchAndSelect')}
                                        />
                                    </div>
                                    <div>
                                        <MultiSelectTags
                                            label={t('settings.profile.skills.communicationTools')}
                                            values={profileForm.matchingProfile.communicationTools}
                                            onChange={(values) => setProfileForm(prev => ({
                                                ...prev,
                                                matchingProfile: { ...prev.matchingProfile, communicationTools: values }
                                            }))}
                                            options={COMMUNICATION_TOOLS}
                                            maxItems={8}
                                            placeholder={t('common.searchAndSelect')}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div className="md:col-span-2">
                                        <MultiSelectTags
                                            label={t('settings.profile.availability.availability')}
                                            values={profileForm.matchingProfile.availability ? profileForm.matchingProfile.availability.split(',').map(s => s.trim()).filter(Boolean) : []}
                                            onChange={(values) => setProfileForm(prev => ({
                                                ...prev,
                                                matchingProfile: { ...prev.matchingProfile, availability: values.join(', ') }
                                            }))}
                                            options={AVAILABILITY_OPTIONS}
                                            displayMap={availabilityDisplayMap}
                                            maxItems={10}
                                            placeholder={t('common.searchAndSelect')}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <MultiSelectTags
                                            label={t('settings.profile.availability.collaboration')}
                                            values={profileForm.matchingProfile.collaborationStyle ? profileForm.matchingProfile.collaborationStyle.split(',').map(s => s.trim()).filter(Boolean) : []}
                                            onChange={(values) => setProfileForm(prev => ({
                                                ...prev,
                                                matchingProfile: { ...prev.matchingProfile, collaborationStyle: values.join(', ') }
                                            }))}
                                            options={COLLABORATION_STYLES}
                                            displayMap={collaborationDisplayMap}
                                            maxItems={10}
                                            placeholder={t('common.searchAndSelect')}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contest preferences */}
                            <div className="border-t border-slate-100 pt-4">
                                <h4 className="text-sm font-semibold text-slate-900 mb-3">{t('settings.profile.contest.title')}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <MultiSelectTags
                                            label={t('settings.profile.contest.interests')}
                                            values={profileForm.contestPreferences.contestInterests}
                                            onChange={(values) => setProfileForm(prev => ({
                                                ...prev,
                                                contestPreferences: { ...prev.contestPreferences, contestInterests: values }
                                            }))}
                                            options={CONTEST_INTERESTS}
                                            maxItems={15}
                                            placeholder={t('common.searchAndSelect')}
                                        />
                                    </div>
                                    <div>
                                        <MultiSelectTags
                                            label={t('settings.profile.contest.formats')}
                                            values={profileForm.contestPreferences.preferredContestFormats}
                                            onChange={(values) => setProfileForm(prev => ({
                                                ...prev,
                                                contestPreferences: { ...prev.contestPreferences, preferredContestFormats: values }
                                            }))}
                                            options={CONTEST_FORMATS.map(f => f.label)}
                                            maxItems={10}
                                            placeholder={t('common.searchAndSelect')}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <MultiSelectTags
                                            label={t('settings.profile.contest.learningGoals')}
                                            values={profileForm.contestPreferences.learningGoals ? profileForm.contestPreferences.learningGoals.split(',').map(s => s.trim()).filter(Boolean) : []}
                                            onChange={(values) => setProfileForm(prev => ({
                                                ...prev,
                                                contestPreferences: { ...prev.contestPreferences, learningGoals: values.join(', ') }
                                            }))}
                                            options={LEARNING_GOALS}
                                            displayMap={learningGoalsDisplayMap}
                                            maxItems={10}
                                            placeholder={t('common.searchAndSelect')}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <MultiSelectTags
                                            label={t('settings.profile.contest.strengths')}
                                            values={profileForm.contestPreferences.strengths ? profileForm.contestPreferences.strengths.split(',').map(s => s.trim()).filter(Boolean) : []}
                                            onChange={(values) => setProfileForm(prev => ({
                                                ...prev,
                                                contestPreferences: { ...prev.contestPreferences, strengths: values.join(', ') }
                                            }))}
                                            options={STRENGTHS}
                                            displayMap={strengthsDisplayMap}
                                            maxItems={10}
                                            placeholder={t('common.searchAndSelect')}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.profile.contest.achievements')}</label>
                                        <textarea
                                            value={profileForm.contestPreferences.achievements}
                                            onChange={(e) => setProfileForm(prev => ({
                                                ...prev,
                                                contestPreferences: { ...prev.contestPreferences, achievements: e.target.value }
                                            }))}
                                            placeholder={t('settings.profile.contest.achievementsPlaceholder')}
                                            rows={4}
                                            maxLength={500}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                        />
                                        <p className="text-xs text-slate-400 mt-1">{profileForm.contestPreferences.achievements.length}/500</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.profile.contest.portfolio')}</label>
                                        <Input
                                            value={joinList(profileForm.contestPreferences.portfolioLinks)}
                                            onChange={(e) => updateContestPreferencesList('portfolioLinks', e.target.value, 5)}
                                            placeholder={t('settings.profile.contest.portfolioPlaceholder')}
                                            maxLength={300}
                                        />
                                        <p className="text-xs text-slate-400 mt-1">{t('settings.profile.contest.portfolioHint')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Consent & privacy */}
                            <div className="border-t border-slate-100 pt-4">
                                <h4 className="text-sm font-semibold text-slate-900 mb-3">{t('settings.profile.consents.title')}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">{t('settings.profile.consents.openToTeams.title')}</p>
                                            <p className="text-xs text-slate-500">{t('settings.profile.consents.openToTeams.desc')}</p>
                                        </div>
                                        <ToggleSwitch
                                            checked={profileForm.matchingProfile.openToNewTeams}
                                            onChange={(checked) => setProfileForm(prev => ({
                                                ...prev,
                                                matchingProfile: { ...prev.matchingProfile, openToNewTeams: checked }
                                            }))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">{t('settings.profile.consents.allowMatching.title')}</p>
                                            <p className="text-xs text-slate-500">{t('settings.profile.consents.allowMatching.desc')}</p>
                                        </div>
                                        <ToggleSwitch
                                            checked={profileForm.consents.allowMatching}
                                            onChange={(checked) => setProfileForm(prev => ({
                                                ...prev,
                                                consents: { ...prev.consents, allowMatching: checked }
                                            }))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">{t('settings.profile.consents.allowRecommendations.title')}</p>
                                            <p className="text-xs text-slate-500">{t('settings.profile.consents.allowRecommendations.desc')}</p>
                                        </div>
                                        <ToggleSwitch
                                            checked={profileForm.consents.allowRecommendations}
                                            onChange={(checked) => setProfileForm(prev => ({
                                                ...prev,
                                                consents: { ...prev.consents, allowRecommendations: checked }
                                            }))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">{t('settings.profile.consents.shareExtended.title')}</p>
                                            <p className="text-xs text-slate-500">{t('settings.profile.consents.shareExtended.desc')}</p>
                                        </div>
                                        <ToggleSwitch
                                            checked={profileForm.consents.shareExtendedProfile}
                                            onChange={(checked) => setProfileForm(prev => ({
                                                ...prev,
                                                consents: { ...prev.consents, shareExtendedProfile: checked }
                                            }))}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    {t('settings.profile.consents.note')}
                                </p>
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    {t('common.saveChanges')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                );



            case 'security':
                return (
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                            <Lock className="w-5 h-5 mr-2 text-primary-600" />
                            {t('settings.security.title')}
                        </h3>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-medium text-slate-900">Clerk-managed security</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Password changes, multi-factor authentication, and sign-in methods are now managed in your Clerk account portal.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => navigate('/account/security')}
                                >
                                    <Shield className="w-4 h-4 mr-2" />
                                    Manage account security
                                </Button>
                            </div>
                        </div>
                    </Card>
                );

            case 'notifications':
                return (
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                            <Bell className="w-5 h-5 mr-2 text-primary-600" />
                            {t('settings.notifications.title')}
                        </h3>

                        {/* Test Notification Section */}
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-blue-900">{t('settings.notifications.testTitle')}</p>
                                    <p className="text-sm text-blue-700">{t('settings.notifications.testDescription')}</p>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleTestNotification}
                                    disabled={isTestingNotification}
                                >
                                    {isTestingNotification ? (
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                        <Bell className="w-4 h-4 mr-1" />
                                    )}
                                    {t('settings.notifications.testButton')}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <div>
                                    <p className="font-medium text-slate-900">{t('settings.notifications.email.title')}</p>
                                    <p className="text-sm text-slate-500">{t('settings.notifications.email.description')}</p>
                                </div>
                                <ToggleSwitch
                                    checked={notificationSettings.email}
                                    onChange={(checked) => handleNotificationToggle('email', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <div>
                                    <p className="font-medium text-slate-900">{t('settings.notifications.push.title')}</p>
                                    <p className="text-sm text-slate-500">{t('settings.notifications.push.description')}</p>
                                </div>
                                <ToggleSwitch
                                    checked={notificationSettings.push}
                                    onChange={(checked) => handleNotificationToggle('push', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <div>
                                    <p className="font-medium text-slate-900">{t('settings.notifications.contestReminders.title')}</p>
                                    <p className="text-sm text-slate-500">{t('settings.notifications.contestReminders.description')}</p>
                                </div>
                                <ToggleSwitch
                                    checked={notificationSettings.contestReminders}
                                    onChange={(checked) => handleNotificationToggle('contestReminders', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <div>
                                    <p className="font-medium text-slate-900">{t('settings.notifications.courseUpdates.title')}</p>
                                    <p className="text-sm text-slate-500">{t('settings.notifications.courseUpdates.description')}</p>
                                </div>
                                <ToggleSwitch
                                    checked={notificationSettings.courseUpdates}
                                    onChange={(checked) => handleNotificationToggle('courseUpdates', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <p className="font-medium text-slate-900">{t('settings.notifications.marketing.title')}</p>
                                    <p className="text-sm text-slate-500">{t('settings.notifications.marketing.description')}</p>
                                </div>
                                <ToggleSwitch
                                    checked={notificationSettings.marketing}
                                    onChange={(checked) => handleNotificationToggle('marketing', checked)}
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSaveNotifications} disabled={isNotificationSaving}>
                                    {isNotificationSaving ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    {t('common.saveSettings')}
                                </Button>
                            </div>
                        </div>
                    </Card>
                );

            case 'privacy':
                return (
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-primary-600" />
                            {t('settings.privacy.title')}
                        </h3>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <div>
                                    <p className="font-medium text-slate-900">{t('settings.privacy.showProfile.title')}</p>
                                    <p className="text-sm text-slate-500">{t('settings.privacy.showProfile.description')}</p>
                                </div>
                                <ToggleSwitch
                                    checked={privacySettings.showProfile}
                                    onChange={(checked) => handlePrivacyToggle('showProfile', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <div>
                                    <p className="font-medium text-slate-900">{t('settings.privacy.showActivity.title')}</p>
                                    <p className="text-sm text-slate-500">{t('settings.privacy.showActivity.description')}</p>
                                </div>
                                <ToggleSwitch
                                    checked={privacySettings.showActivity}
                                    onChange={(checked) => handlePrivacyToggle('showActivity', checked)}
                                />
                            </div>

                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <p className="font-medium text-slate-900">{t('settings.privacy.showAchievements.title')}</p>
                                    <p className="text-sm text-slate-500">{t('settings.privacy.showAchievements.description')}</p>
                                </div>
                                <ToggleSwitch
                                    checked={privacySettings.showAchievements}
                                    onChange={(checked) => handlePrivacyToggle('showAchievements', checked)}
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSavePrivacy} disabled={isPrivacySaving}>
                                    {isPrivacySaving ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    {t('common.saveSettings')}
                                </Button>
                            </div>
                        </div>
                    </Card>
                );
        }
    };

    // Tab navigation items
    const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'membership', label: t('settings.tabs.membership'), icon: <Crown className="w-4 h-4" /> },
        { id: 'profile', label: t('settings.tabs.profile'), icon: <User className="w-4 h-4" /> },
        { id: 'security', label: t('settings.tabs.security'), icon: <Lock className="w-4 h-4" /> },
        { id: 'notifications', label: t('settings.tabs.notifications'), icon: <Bell className="w-4 h-4" /> },
        { id: 'privacy', label: t('settings.tabs.privacy'), icon: <Shield className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-6">
            <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                        <Palette className="h-5 w-5 text-primary-600 dark:text-primary-300" />
                        <span>Giao diện trang web</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Chọn chế độ sáng, tối hoặc theo hệ thống cho toàn bộ trang web.
                    </p>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-center">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{themeLabel}</span>
                    <ThemeToggle />
                </div>
            </Card>

            <Card className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Mail className="w-5 h-5 text-primary-600" />
                        <span>Gửi góp ý tới nhà phát triển</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        Hệ thống sẽ gửi nội dung qua Telegram kèm theo email và SĐT (nếu bạn đã cập nhật).
                    </p>
                </div>
                <Button type="button" variant="secondary" className="shrink-0" onClick={() => navigate('/contact')}>
                    Mở
                </Button>
            </Card>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                            ? 'bg-primary-100 text-primary-700'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {renderContent()}

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

// Helper functions
function calculatePasswordStrength(password: string): number {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
}

function getPasswordStrengthText(t: (key: TranslationKey, params?: Record<string, string | number>) => string, strength: number): string {
    switch (strength) {
        case 0: return t('settings.security.passwordStrength.veryWeak');
        case 1: return t('settings.security.passwordStrength.weak');
        case 2: return t('settings.security.passwordStrength.medium');
        case 3: return t('settings.security.passwordStrength.strong');
        case 4: return t('settings.security.passwordStrength.veryStrong');
        default: return '';
    }
}

export default UserSettings;






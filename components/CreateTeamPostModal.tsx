import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, Users, Calendar, MessageSquare, AlertCircle, Loader2, Check, Plus, Minus, ChevronDown, ChevronUp, UserPlus, Search } from 'lucide-react';
import { Button, Card, Badge, Input, Dropdown, DropdownOption } from './ui/Common';
import { api } from '../lib/api';
import { CACHE_TTL, localDrafts } from '../lib/cache';
import { TeamPostCreate, Contest, RoleSlot, TeamPost } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface InvitedMember {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    role?: string;
}

interface UserSearchResult {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
}

interface CreateTeamPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    editingPost?: TeamPost | null;
}

const ROLES = [
    'Frontend Dev',
    'Backend Dev',
    'Fullstack Dev',
    'Mobile Dev',
    'UI/UX Designer',
    'Graphic Designer',
    'Business Analyst',
    'Product Manager',
    'Data Analyst',
    'DevOps',
    'QA/Tester',
    'Pitching',
    'Content Writer',
    'Marketing',
    'Other'
];

const SKILL_SUGGESTIONS = [
    'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'C++',
    'TypeScript', 'JavaScript', 'HTML/CSS', 'Tailwind', 'Bootstrap',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Firebase', 'AWS', 'Docker',
    'Git', 'Figma', 'Adobe XD', 'Photoshop', 'Illustrator',
    'Machine Learning', 'Data Science', 'AI/ML', 'TensorFlow', 'PyTorch',
    'Flutter', 'React Native', 'Swift', 'Kotlin', 'Unity',
    'Agile/Scrum', 'Leadership', 'Communication', 'Problem Solving'
];

const TEAM_POST_DRAFT_KEY = 'create_team_post';

function buildEmptyFormData(): TeamPostCreate {
    return {
        title: '',
        description: '',
        contestId: '',
        rolesNeeded: [],
        roleSlots: [],
        maxMembers: 4,
        requirements: '',
        skills: [],
        contactMethod: 'both',
        deadline: '',
        invitedMembers: []
    };
}

function isBlankDraft(data: TeamPostCreate): boolean {
    const title = String(data.title || '').trim();
    const description = String(data.description || '').trim();
    const requirements = String(data.requirements || '').trim();
    const contestId = String(data.contestId || '').trim();
    const deadline = String(data.deadline || '').trim();
    const skillsLen = Array.isArray(data.skills) ? data.skills.length : 0;
    const rolesLen = Array.isArray(data.rolesNeeded) ? data.rolesNeeded.length : 0;
    const slotsLen = Array.isArray(data.roleSlots) ? data.roleSlots.length : 0;
    const invitedLen = Array.isArray(data.invitedMembers) ? data.invitedMembers.length : 0;

    return (
        !title &&
        !description &&
        !requirements &&
        !contestId &&
        !deadline &&
        skillsLen === 0 &&
        rolesLen === 0 &&
        slotsLen === 0 &&
        invitedLen === 0
    );
}

const CreateTeamPostModal: React.FC<CreateTeamPostModalProps> = ({ isOpen, onClose, onSuccess, editingPost = null }) => {
    const isEditMode = !!editingPost;
    const { t } = useI18n();

    const contactMethodOptions = useMemo(
        () => [
            { value: 'message', label: t('teamPostForm.contact.message') },
            { value: 'email', label: t('teamPostForm.contact.email') },
            { value: 'both', label: t('teamPostForm.contact.both') }
        ],
        [t]
    );

    const [formData, setFormData] = useState<TeamPostCreate>(() => buildEmptyFormData());
    const [contests, setContests] = useState<Contest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [skillInput, setSkillInput] = useState('');
    const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
    const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

    // User tagging states
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [memberSearchResults, setMemberSearchResults] = useState<UserSearchResult[]>([]);
    const [isSearchingMembers, setIsSearchingMembers] = useState(false);
    const [showMemberSuggestions, setShowMemberSuggestions] = useState(false);
    const memberSearchRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Close member suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (memberSearchRef.current && !memberSearchRef.current.contains(event.target as Node)) {
                setShowMemberSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch contests for dropdown
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            api.get<{ contests: Contest[] }>('/contests?status=OPEN&limit=50')
                .then(data => {
                    setContests(data.contests || []);
                })
                .catch(() => {
                    // Silent fail - contests are optional
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [isOpen]);

    // Reset form when modal closes OR populate with editing data
    useEffect(() => {
        if (!isOpen) {
            setFormData(buildEmptyFormData());
            setError(null);
            setSuccess(false);
            setSkillInput('');
            setExpandedRoles(new Set());
            setMemberSearchQuery('');
            setMemberSearchResults([]);
            setShowMemberSuggestions(false);
        } else if (editingPost) {
            // Populate form with editing post data
            let deadlineValue = '';
            try {
                if (editingPost.deadline) {
                    const date = new Date(editingPost.deadline);
                    if (!isNaN(date.getTime())) {
                        deadlineValue = date.toISOString().split('T')[0];
                    }
                }
            } catch (e) {
                console.error('Error parsing deadline:', e);
            }

            setFormData({
                title: editingPost.title || '',
                description: editingPost.description || '',
                contestId: editingPost.contestId || '',
                rolesNeeded: Array.isArray(editingPost.rolesNeeded) ? editingPost.rolesNeeded : [],
                roleSlots: Array.isArray(editingPost.roleSlots) ? editingPost.roleSlots : [],
                maxMembers: editingPost.maxMembers || 4,
                requirements: editingPost.requirements || '',
                skills: Array.isArray(editingPost.skills) ? editingPost.skills : [],
                contactMethod: (['message', 'email', 'both'].includes(editingPost.contactMethod)
                    ? editingPost.contactMethod
                    : 'both') as 'message' | 'email' | 'both',
                deadline: deadlineValue,
                invitedMembers: []
            });
            setError(null);
            setSuccess(false);
        }
    }, [isOpen, editingPost]);

    // Restore draft when creating a new post
    useEffect(() => {
        if (!isOpen || isEditMode) return;
        const draft = localDrafts.get<TeamPostCreate>(TEAM_POST_DRAFT_KEY);
        if (!draft) return;

        setFormData((prev) => {
            const next: TeamPostCreate = {
                ...buildEmptyFormData(),
                ...draft,
                rolesNeeded: Array.isArray(draft.rolesNeeded) ? draft.rolesNeeded : [],
                roleSlots: Array.isArray(draft.roleSlots) ? draft.roleSlots : [],
                skills: Array.isArray(draft.skills) ? draft.skills : [],
                invitedMembers: Array.isArray(draft.invitedMembers) ? draft.invitedMembers : [],
            };

            // Avoid re-setting state unnecessarily
            return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        });
    }, [isOpen, isEditMode]);

    // Persist draft while creating a new post (debounced)
    useEffect(() => {
        if (!isOpen || isEditMode) return;
        const timer = window.setTimeout(() => {
            if (isBlankDraft(formData)) {
                localDrafts.remove(TEAM_POST_DRAFT_KEY);
                return;
            }
            localDrafts.set(TEAM_POST_DRAFT_KEY, formData, CACHE_TTL.DRAFT);
        }, 400);

        return () => window.clearTimeout(timer);
    }, [formData, isOpen, isEditMode]);

    // Search users for tagging
    const searchUsers = useCallback(async (query: string) => {
        console.log('[CreateTeamPostModal] searchUsers called with:', query);
        if (query.length < 2) {
            setMemberSearchResults([]);
            return;
        }

        setIsSearchingMembers(true);
        try {
            console.log('[CreateTeamPostModal] Calling API:', `/users/search?q=${encodeURIComponent(query)}&limit=8`);
            const data = await api.get<{ users: UserSearchResult[] }>(`/users/search?q=${encodeURIComponent(query)}&limit=8`);
            console.log('[CreateTeamPostModal] API response:', data);
            // Filter out already invited members
            const invitedIds = (formData.invitedMembers || []).map(m => m.id);
            setMemberSearchResults((data.users || []).filter(u => !invitedIds.includes(u.id)));
        } catch (err) {
            console.error('Failed to search users:', err);
            setMemberSearchResults([]);
        } finally {
            setIsSearchingMembers(false);
        }
    }, [formData.invitedMembers]);

    // Debounced search
    const handleMemberSearchChange = useCallback((value: string) => {
        console.log('[CreateTeamPostModal] handleMemberSearchChange:', value);
        setMemberSearchQuery(value);
        setShowMemberSuggestions(true);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            console.log('[CreateTeamPostModal] Debounce timeout fired, calling searchUsers');
            searchUsers(value);
        }, 300);
    }, [searchUsers]);

    // Add invited member
    const addInvitedMember = useCallback((user: UserSearchResult) => {
        setFormData(prev => ({
            ...prev,
            invitedMembers: [...(prev.invitedMembers || []), {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
            }]
        }));
        setMemberSearchQuery('');
        setMemberSearchResults([]);
        setShowMemberSuggestions(false);
    }, []);

    // Remove invited member
    const removeInvitedMember = useCallback((userId: string) => {
        setFormData(prev => ({
            ...prev,
            invitedMembers: (prev.invitedMembers || []).filter(m => m.id !== userId)
        }));
    }, []);

    const handleRoleToggle = useCallback((role: string) => {
        setFormData(prev => {
            const isSelected = prev.rolesNeeded.includes(role);
            let newRolesNeeded: string[];
            let newRoleSlots: RoleSlot[];

            if (isSelected) {
                // Remove role
                newRolesNeeded = prev.rolesNeeded.filter(r => r !== role);
                newRoleSlots = (prev.roleSlots || []).filter(slot => slot.role !== role);
            } else if (prev.rolesNeeded.length < 5) {
                // Add role
                newRolesNeeded = [...prev.rolesNeeded, role];
                newRoleSlots = [...(prev.roleSlots || []), { role, count: 1, description: '', skills: [] }];
            } else {
                return prev;
            }

            return { ...prev, rolesNeeded: newRolesNeeded, roleSlots: newRoleSlots };
        });
    }, []);

    const updateRoleSlot = useCallback((role: string, updates: Partial<RoleSlot>) => {
        setFormData(prev => ({
            ...prev,
            roleSlots: (prev.roleSlots || []).map(slot =>
                slot.role === role ? { ...slot, ...updates } : slot
            )
        }));
    }, []);

    const toggleRoleExpanded = useCallback((role: string) => {
        setExpandedRoles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(role)) {
                newSet.delete(role);
            } else {
                newSet.add(role);
            }
            return newSet;
        });
    }, []);

    const addSkill = useCallback((skill: string) => {
        const trimmedSkill = skill.trim();
        if (trimmedSkill && !(formData.skills || []).includes(trimmedSkill) && (formData.skills || []).length < 10) {
            setFormData(prev => ({
                ...prev,
                skills: [...(prev.skills || []), trimmedSkill]
            }));
        }
        setSkillInput('');
        setShowSkillSuggestions(false);
    }, [formData.skills]);

    const removeSkill = useCallback((skill: string) => {
        setFormData(prev => ({
            ...prev,
            skills: (prev.skills || []).filter(s => s !== skill)
        }));
    }, []);

    const filteredSuggestions = SKILL_SUGGESTIONS.filter(
        skill => skill.toLowerCase().includes(skillInput.toLowerCase()) &&
            !(formData.skills || []).includes(skill)
    ).slice(0, 8);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Client-side validation
        if (formData.title.trim().length < 10) {
            setError(t('teamPostForm.validation.titleMin'));
            return;
        }
        if (formData.description.trim().length < 30) {
            setError(t('teamPostForm.validation.descriptionMin'));
            return;
        }
        if (formData.rolesNeeded.length === 0) {
            setError(t('teamPostForm.validation.rolesMin'));
            return;
        }

        setIsSubmitting(true);

        try {
            const payload: TeamPostCreate = {
                ...formData,
                contestId: formData.contestId || undefined,
                deadline: formData.deadline || undefined,
                skills: formData.skills?.length ? formData.skills : undefined,
                roleSlots: formData.roleSlots?.length ? formData.roleSlots : undefined,
                invitedMembers: formData.invitedMembers?.length ? formData.invitedMembers : undefined
            };

            if (isEditMode && editingPost) {
                // Update existing post using PUT for full update
                await api.put(`/teams/${editingPost.id}`, payload);
            } else {
                // Create new post
                await api.post('/teams', payload);
                localDrafts.remove(TEAM_POST_DRAFT_KEY);
            }
            setSuccess(true);

            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : isEditMode ? t('teamPostForm.error.update') : t('teamPostForm.error.create'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Calculate min date for deadline (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                            <Users className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {isEditMode ? t('teamPostForm.header.editTitle') : t('teamPostForm.header.createTitle')}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {isEditMode ? t('teamPostForm.header.editSubtitle') : t('teamPostForm.header.createSubtitle')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label={t('teamPostForm.actions.close')}
                        title={t('teamPostForm.actions.close')}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Success State */}
                {success ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <Check className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            {isEditMode ? t('teamPostForm.success.editTitle') : t('teamPostForm.success.createTitle')}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400">
                            {isEditMode
                                ? t('teamPostForm.success.editDescription')
                                : t('teamPostForm.success.createDescription')}
                        </p>
                    </div>
                ) : (
                    /* Form */
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Error Alert */}
                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-red-800 dark:text-red-300">{t('teamPostForm.error.title')}</p>
                                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {t('teamPostForm.title.label')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder={t('teamPostForm.title.placeholder')}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                                maxLength={100}
                                required
                            />
                            <p className="mt-1 text-xs text-slate-400">{t('teamPostForm.charCount', { count: formData.title.length, max: 100 })}</p>
                        </div>

                        {/* Contest Selection & Deadline */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Dropdown
                                label={t('teamPostForm.contest.label')}
                                placeholder={t('teamPostForm.contest.placeholder')}
                                headerText={t('teamPostForm.contest.header')}
                                value={formData.contestId || ''}
                                onChange={(value) => setFormData(prev => ({ ...prev, contestId: value }))}
                                disabled={isLoading}
                                options={[
                                    { value: '', label: t('teamPostForm.contest.none') },
                                    ...contests.map(contest => ({
                                        value: contest.id,
                                        label: `${contest.title} - ${contest.organizer}`
                                    }))
                                ]}
                            />

                            <div>
                                <label htmlFor="deadline-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {t('teamPostForm.deadline.label')}
                                    </div>
                                </label>
                                <input
                                    id="deadline-input"
                                    type="date"
                                    value={formData.deadline || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                                    min={minDate}
                                    title={t('teamPostForm.deadline.title')}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {t('teamPostForm.description.label')} <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder={t('teamPostForm.description.placeholder')}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none resize-none"
                                rows={4}
                                maxLength={1000}
                                required
                            />
                            <p className="mt-1 text-xs text-slate-400">{t('teamPostForm.charCount', { count: formData.description.length, max: 1000 })}</p>
                        </div>

                        {/* Roles Needed */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {t('teamPostForm.roles.label')} <span className="text-red-500">*</span>
                                <span className="text-slate-400 font-normal ml-2">{t('teamPostForm.roles.maxHint')}</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {ROLES.map(role => {
                                    const isSelected = formData.rolesNeeded.includes(role);
                                    const isDisabled = !isSelected && formData.rolesNeeded.length >= 5;
                                    return (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => handleRoleToggle(role)}
                                            disabled={isDisabled}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isSelected
                                                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-2 border-primary-300 dark:border-primary-700'
                                                : isDisabled
                                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-transparent'
                                                }`}
                                        >
                                            {role}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Role Details - Expandable section for each selected role */}
                        {formData.rolesNeeded.length > 0 && (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {t('teamPostForm.roles.detailsLabel')}
                                    <span className="text-slate-400 font-normal ml-2">{t('teamPostForm.roles.detailsHint')}</span>
                                </label>
                                <div className="space-y-2">
                                    {formData.rolesNeeded.map(role => {
                                        const slot = formData.roleSlots?.find(s => s.role === role) || { role, count: 1, description: '', skills: [] };
                                        const isExpanded = expandedRoles.has(role);

                                        return (
                                            <div key={role} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                                {/* Role Header */}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleRoleExpanded(role)}
                                                    className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                    aria-label={isExpanded
                                                        ? t('teamPostForm.roles.collapseDetails', { role })
                                                        : t('teamPostForm.roles.expandDetails', { role })}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-medium text-slate-700 dark:text-slate-300">{role}</span>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                                                            {t('teamPostForm.roles.countPeople', { count: slot.count })}
                                                        </span>
                                                    </div>
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-4 h-4 text-slate-400" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </button>

                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <div className="p-4 space-y-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                                                        {/* Number of people needed */}
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                                                                {t('teamPostForm.roles.countLabel')}
                                                            </label>
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateRoleSlot(role, { count: Math.max(1, slot.count - 1) })}
                                                                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                                                                    disabled={slot.count <= 1}
                                                                    aria-label={t('teamPostForm.roles.decreaseCount')}
                                                                >
                                                                    <Minus className="w-4 h-4" />
                                                                </button>
                                                                <span className="w-12 text-center font-medium text-slate-800 dark:text-slate-100">
                                                                    {slot.count}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateRoleSlot(role, { count: Math.min(5, slot.count + 1) })}
                                                                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                                                                    disabled={slot.count >= 5}
                                                                    aria-label={t('teamPostForm.roles.increaseCount')}
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Task Description */}
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                                                                {t('teamPostForm.roles.taskLabel')}
                                                            </label>
                                                            <textarea
                                                                value={slot.description || ''}
                                                                onChange={e => updateRoleSlot(role, { description: e.target.value })}
                                                                placeholder={t('teamPostForm.roles.taskPlaceholder')}
                                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none resize-none"
                                                                rows={2}
                                                                maxLength={300}
                                                            />
                                                            <p className="mt-1 text-xs text-slate-400">{t('teamPostForm.charCount', { count: (slot.description || '').length, max: 300 })}</p>
                                                        </div>

                                                        {/* Role-specific skills */}
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                                                                {t('teamPostForm.roles.skillsLabel')}
                                                            </label>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {(slot.skills || []).map(skill => (
                                                                    <span
                                                                        key={skill}
                                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-md text-xs"
                                                                    >
                                                                        {skill}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updateRoleSlot(role, {
                                                                                skills: (slot.skills || []).filter(s => s !== skill)
                                                                            })}
                                                                            className="hover:text-primary-900"
                                                                            aria-label={t('teamPostForm.skills.removeSkill', { skill })}
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                                {(slot.skills || []).length < 5 && (
                                                                    <select
                                                                        value=""
                                                                        onChange={e => {
                                                                            if (e.target.value) {
                                                                                updateRoleSlot(role, {
                                                                                    skills: [...(slot.skills || []), e.target.value]
                                                                                });
                                                                            }
                                                                        }}
                                                                        className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-600 dark:text-slate-400 outline-none"
                                                                        title={t('teamPostForm.roles.addSkillTitle')}
                                                                    >
                                                                        <option value="">{t('teamPostForm.roles.addSkillOption')}</option>
                                                                        {SKILL_SUGGESTIONS.filter(s => !(slot.skills || []).includes(s)).slice(0, 15).map(skill => (
                                                                            <option key={skill} value={skill}>{skill}</option>
                                                                        ))}
                                                                    </select>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* General Skills */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {t('teamPostForm.skills.label')}
                                <span className="text-slate-400 font-normal ml-2">{t('teamPostForm.skills.maxHint')}</span>
                            </label>
                            <div className="space-y-2">
                                {/* Selected Skills */}
                                {(formData.skills || []).length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {(formData.skills || []).map(skill => (
                                            <span
                                                key={skill}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg text-sm font-medium"
                                            >
                                                {skill}
                                                <button
                                                    type="button"
                                                    onClick={() => removeSkill(skill)}
                                                    className="hover:text-primary-900"
                                                    aria-label={t('teamPostForm.skills.removeSkill', { skill })}
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Skill Input */}
                                {(formData.skills || []).length < 10 && (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={skillInput}
                                            onChange={e => {
                                                setSkillInput(e.target.value);
                                                setShowSkillSuggestions(true);
                                            }}
                                            onFocus={() => setShowSkillSuggestions(true)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addSkill(skillInput);
                                                }
                                            }}
                                            placeholder={t('teamPostForm.skills.placeholder')}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                                        />

                                        {/* Suggestions Dropdown */}
                                        {showSkillSuggestions && skillInput && filteredSuggestions.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                {filteredSuggestions.map(skill => (
                                                    <button
                                                        key={skill}
                                                        type="button"
                                                        onClick={() => addSkill(skill)}
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                                    >
                                                        {skill}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Quick Suggestions */}
                                {(formData.skills || []).length < 10 && !skillInput && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {SKILL_SUGGESTIONS.filter(s => !(formData.skills || []).includes(s)).slice(0, 8).map(skill => (
                                            <button
                                                key={skill}
                                                type="button"
                                                onClick={() => addSkill(skill)}
                                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs transition-colors"
                                            >
                                                + {skill}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Invite Members (Gmail-style tagging) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                <div className="flex items-center gap-2">
                                    <UserPlus className="w-4 h-4" />
                                    {t('teamPostForm.invite.label')}
                                </div>
                                <span className="text-slate-400 font-normal ml-6 text-xs">{t('teamPostForm.invite.hint')}</span>
                            </label>

                            {/* Tagged/Invited Members Display */}
                            {(formData.invitedMembers || []).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {(formData.invitedMembers || []).map(member => (
                                        <div
                                            key={member.id}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-full"
                                        >
                                            {member.avatar ? (
                                                <img
                                                    src={member.avatar}
                                                    alt={member.name}
                                                    className="w-5 h-5 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center">
                                                    <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">{member.name}</span>
                                            {member.email && (
                                                <span className="text-xs text-primary-500 hidden sm:inline">({member.email})</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeInvitedMember(member.id)}
                                                className="ml-1 p-0.5 hover:bg-primary-200 rounded-full transition-colors"
                                                aria-label={t('teamPostForm.invite.removeMember', { name: member.name })}
                                            >
                                                <X className="w-3.5 h-3.5 text-primary-600" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Search Input */}
                            <div className="relative" ref={memberSearchRef}>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={memberSearchQuery}
                                        onChange={e => handleMemberSearchChange(e.target.value)}
                                        onFocus={() => memberSearchQuery.length >= 2 && setShowMemberSuggestions(true)}
                                        placeholder={t('teamPostForm.invite.searchPlaceholder')}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                                    />
                                    {isSearchingMembers && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                                    )}
                                </div>

                                {/* Search Results Dropdown */}
                                {showMemberSuggestions && memberSearchQuery.length >= 2 && (
                                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                        {isSearchingMembers ? (
                                            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                                                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                                {t('teamPostForm.invite.searching')}
                                            </div>
                                        ) : memberSearchResults.length > 0 ? (
                                            memberSearchResults.map(user => (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() => addInvitedMember(user)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                                                >
                                                    {user.avatar && user.avatar.trim() ? (
                                                        <img
                                                            src={user.avatar}
                                                            alt={user.name}
                                                            className="w-9 h-9 rounded-full object-cover shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
                                                            <span className="text-sm font-medium text-white">
                                                                {user.name?.charAt(0)?.toUpperCase() || '?'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                                                    </div>
                                                    <Plus className="w-4 h-4 text-primary-500 shrink-0" />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                                                {t('teamPostForm.invite.noResults')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Max Members & Contact Method */}
                        <div className="grid grid-cols-2 gap-4">
                            <Dropdown
                                label={t('teamPostForm.maxMembers.label')}
                                value={formData.maxMembers.toString()}
                                onChange={(value) => setFormData(prev => ({ ...prev, maxMembers: parseInt(value, 10) }))}
                                options={[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => ({
                                    value: n.toString(),
                                    label: t('teamPostForm.maxMembers.option', { count: n })
                                }))}
                            />

                            <Dropdown
                                label={t('teamPostForm.contact.label')}
                                value={formData.contactMethod}
                                onChange={(value) => setFormData(prev => ({ ...prev, contactMethod: value as 'message' | 'email' | 'both' }))}
                                options={contactMethodOptions}
                            />
                        </div>

                        {/* Requirements */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                {t('teamPostForm.requirements.label')}
                            </label>
                            <textarea
                                value={formData.requirements}
                                onChange={e => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                                placeholder={t('teamPostForm.requirements.placeholder')}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none resize-none"
                                rows={3}
                                maxLength={500}
                            />
                            <p className="mt-1 text-xs text-slate-400">{t('teamPostForm.charCount', { count: formData.requirements?.length || 0, max: 500 })}</p>
                        </div>

                        {/* Submit */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                {t('teamPostForm.actions.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || formData.rolesNeeded.length === 0}
                                className="min-w-35"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        {isEditMode ? t('teamPostForm.actions.savingEdit') : t('teamPostForm.actions.savingCreate')}
                                    </>
                                ) : (
                                    isEditMode ? t('teamPostForm.actions.updatePost') : t('teamPostForm.actions.createPost')
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CreateTeamPostModal;

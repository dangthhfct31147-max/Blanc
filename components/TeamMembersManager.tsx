import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, Users, Edit2, Save, Trash2, AlertCircle, Check, Loader2, UserMinus, Crown } from 'lucide-react';
import { Button, Badge, Dropdown } from './ui/Common';
import { TeamPost } from '../types';
import { api } from '../lib/api';
import { useI18n } from '../contexts/I18nContext';

interface TeamMembersManagerProps {
    isOpen: boolean;
    onClose: () => void;
    post: TeamPost | null;
    onUpdate?: () => void;
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

const ROLE_COLORS: Record<string, string> = {
    'Frontend Dev': 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    'Backend Dev': 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    'Fullstack Dev': 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    'Mobile Dev': 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    'UI/UX Designer': 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    'Graphic Designer': 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
    'Business Analyst': 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    'Product Manager': 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    'Data Analyst': 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    'DevOps': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    'QA/Tester': 'bg-lime-50 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 border-lime-200 dark:border-lime-800',
    'Pitching': 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    'Content Writer': 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    'Marketing': 'bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800',
    'Other': 'bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800'
};

interface MemberEdit {
    id: string;
    role: string;
    task: string;
}

const TeamMembersManager: React.FC<TeamMembersManagerProps> = ({
    isOpen,
    onClose,
    post,
    onUpdate
}) => {
    const { t } = useI18n();
    const [members, setMembers] = useState<MemberEdit[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Initialize members from post
    useEffect(() => {
        if (post?.members) {
            setMembers(post.members.map(m => ({
                id: m.id,
                role: m.role || '',
                task: m.task || ''
            })));
        }
    }, [post]);

    const handleSave = async (memberId: string) => {
        if (!post) return;

        const member = members.find(m => m.id === memberId);
        if (!member) return;

        setIsSaving(true);
        setError(null);

        try {
            await api.patch(`/teams/${post.id}/members/${memberId}`, {
                role: member.role,
                task: member.task
            });

            setSuccess(t('teamMembers.toast.updateSuccess'));
            setEditingId(null);
            onUpdate?.();

            setTimeout(() => setSuccess(null), 2000);
        } catch (err: any) {
            setError(err.message || t('teamMembers.toast.updateFailed'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!post) return;

        const memberName = post.members.find(m => m.id === memberId)?.name || t('teamMembers.memberFallback');
        if (!confirm(t('teamMembers.confirmRemove', { name: memberName }))) return;

        setIsSaving(true);
        setError(null);

        try {
            await api.delete(`/teams/${post.id}/members/${memberId}`);
            setSuccess(t('teamMembers.toast.removedSuccess'));
            onUpdate?.();

            setTimeout(() => setSuccess(null), 2000);
        } catch (err: any) {
            setError(err.message || t('teamMembers.toast.removedFailed'));
        } finally {
            setIsSaving(false);
        }
    };

    const updateMember = (memberId: string, field: 'role' | 'task', value: string) => {
        setMembers(prev => prev.map(m =>
            m.id === memberId ? { ...m, [field]: value } : m
        ));
    };

    const getInitials = (name?: string) => {
        if (!name) return '??';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    if (!isOpen || !post) return null;

    const isOwner = (memberId: string) => memberId === post.createdBy.id;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                                <Users className="w-5 h-5 text-primary-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('teamMembers.title')}</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{t('teamMembers.subtitle')}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            aria-label={t('teamMembers.actions.close')}
                            title={t('teamMembers.actions.close')}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        {/* Alerts */}
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl">
                                <Check className="w-5 h-5 text-green-500" />
                                <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
                            </div>
                        )}

                        {/* Members List */}
                        <div className="space-y-3">
                            {post.members.map((member, index) => {
                                const memberEdit = members.find(m => m.id === member.id);
                                const isEditing = editingId === member.id;
                                const isLeader = isOwner(member.id);

                                return (
                                    <div
                                        key={member.id}
                                        className={`border rounded-xl overflow-hidden transition-all ${isEditing ? 'border-primary-300 dark:border-primary-700 shadow-md' : 'border-slate-200 dark:border-slate-700'
                                            }`}
                                    >
                                        {/* Member Header */}
                                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800">
                                            <Link
                                                to={`/user/${member.id}`}
                                                className="w-12 h-12 rounded-full bg-linear-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold overflow-hidden shrink-0 hover:ring-2 hover:ring-primary-300 transition-all"
                                                title={t('teamMembers.viewProfileTitle', { name: member.name })}
                                            >
                                                {member.avatar ? (
                                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    getInitials(member.name)
                                                )}
                                            </Link>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        to={`/user/${member.id}`}
                                                        className="font-semibold text-slate-900 dark:text-slate-100 truncate hover:text-primary-600 transition-colors"
                                                    >
                                                        {member.name}
                                                    </Link>
                                                    {isLeader && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                                                            <Crown className="w-3 h-3" />
                                                            {t('teamMembers.leader')}
                                                        </span>
                                                    )}
                                                </div>
                                                {memberEdit?.role && !isEditing && (
                                                    <Badge className={`mt-1 ${ROLE_COLORS[memberEdit.role] || ROLE_COLORS['Other']}`}>
                                                        {memberEdit.role}
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSave(member.id)}
                                                            disabled={isSaving}
                                                        >
                                                            {isSaving ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Save className="w-4 h-4 mr-1" />
                                                                    {t('teamMembers.actions.save')}
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setEditingId(null)}
                                                        >
                                                            {t('teamMembers.actions.cancel')}
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => setEditingId(member.id)}
                                                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                                                            title={t('teamMembers.actions.edit')}
                                                            aria-label={t('teamMembers.actions.editMember', { name: member.name })}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        {!isLeader && (
                                                            <button
                                                                onClick={() => handleRemoveMember(member.id)}
                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                                title={t('teamMembers.actions.remove')}
                                                                aria-label={t('teamMembers.actions.removeMember', { name: member.name })}
                                                            >
                                                                <UserMinus className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Edit Form */}
                                        {isEditing && memberEdit && (
                                            <div className="p-4 space-y-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                                {/* Role Selection */}
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                        {t('teamMembers.roleLabel')}
                                                    </label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {ROLES.map(role => (
                                                            <button
                                                                key={role}
                                                                type="button"
                                                                onClick={() => updateMember(member.id, 'role', role)}
                                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${memberEdit.role === role
                                                                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-2 border-primary-300 dark:border-primary-700'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-transparent'
                                                                    }`}
                                                            >
                                                                {role}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Task Assignment */}
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                        {t('teamMembers.taskLabel')}
                                                    </label>
                                                    <textarea
                                                        value={memberEdit.task}
                                                        onChange={e => updateMember(member.id, 'task', e.target.value)}
                                                        placeholder={t('teamMembers.taskPlaceholder')}
                                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none resize-none"
                                                        rows={3}
                                                        maxLength={500}
                                                    />
                                                    <p className="mt-1 text-xs text-slate-400">{t('teamMembers.taskChars', { count: memberEdit.task.length })}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Show task when not editing */}
                                        {!isEditing && memberEdit?.task && (
                                            <div className="px-4 pb-4 bg-slate-50 dark:bg-slate-800">
                                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('teamMembers.taskLabelShort')}</p>
                                                <p className="text-sm text-slate-700 dark:text-slate-300">{memberEdit.task}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <Button variant="secondary" onClick={onClose}>
                            {t('teamMembers.actions.close')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamMembersManager;

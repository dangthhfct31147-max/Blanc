import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    User, MapPin, Briefcase, Code, Award, BookOpen, Trophy,
    Calendar, Lock, ArrowLeft, Loader2, ExternalLink,
    Users, MessageCircle, Globe, Star, CheckCircle, Clock, Target
} from 'lucide-react';
import { Card, Button, Badge } from '../components/ui/Common';
import { api } from '../lib/api';
import { useI18n } from '../contexts/I18nContext';
import RadarChart from '../components/ui/RadarChart';

interface PublicProfile {
    id: string;
    name: string;
    email?: string;
    avatar: string | null;
    bio: string;
    isOwnProfile: boolean;
    isPrivate?: boolean;
    message?: string;
    createdAt: string;
    privacy?: {
        showProfile: boolean;
        showActivity: boolean;
        showAchievements: boolean;
    };
    matchingProfile: {
        primaryRole: string;
        secondaryRoles: string[];
        experienceLevel: string;
        location: string;
        skills: string[];
        techStack: string[];
        languages: string[];
        radarSkills?: {
            code: number;
            design: number;
            presentation: number;
            writing: number;
            management: number;
        };
        openToNewTeams: boolean;
        openToMentor: boolean;
    } | null;
    contestPreferences: {
        contestInterests: string[];
        preferredTeamRole: string;
        preferredTeamSize: string;
    } | null;
    streak: {
        currentStreak: number;
        longestStreak: number;
    } | null;
    activities: Array<{
        type: string;
        title: string;
        date: string;
        status: string;
    }> | null;
    enrollments: Array<{
        title: string;
        progress: number;
        status: string;
        enrolledAt: string;
    }> | null;
    achievements: {
        totalContests: number;
        completedCourses: number;
        contestAchievements: string;
        portfolioLinks: string[];
    } | null;
}

const UserProfile: React.FC = () => {
    const { id: userId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t, locale } = useI18n();
    const [profile, setProfile] = useState<PublicProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const dateLocale = locale === 'en' ? 'en-US' : 'vi-VN';
    const dayLabel = (count: number) => (count === 1 ? t('common.day') : t('common.days'));

    useEffect(() => {
        const fetchProfile = async () => {
            if (!userId) {
                setError(t('userProfile.invalidUserId'));
                setIsLoading(false);
                return;
            }

            // Validate legacy document id format (24 hex characters)
            const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
            if (!isValidObjectId) {
                setError(t('userProfile.invalidUserId'));
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                const data = await api.get<PublicProfile>(`/users/${userId}/profile`);
                setProfile(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : t('userProfile.loadFailed'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [userId]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(dateLocale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getExperienceLevelLabel = (level: string) => {
        const labels: Record<string, string> = {
            beginner: t('userProfile.experience.beginner'),
            intermediate: t('userProfile.experience.intermediate'),
            advanced: t('userProfile.experience.advanced'),
            expert: t('userProfile.experience.expert')
        };
        return labels[level] || level;
    };

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <p className="text-red-500">{error}</p>
                <Button onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('common.back')}
                </Button>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <p className="text-slate-500 dark:text-slate-400">{t('userProfile.notFound')}</p>
                <Button onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('common.back')}
                </Button>
            </div>
        );
    }

    // Private profile view
    if (profile.isPrivate) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                <Button variant="secondary" onClick={() => navigate(-1)} className="mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('common.back')}
                </Button>

                <Card className="p-8 text-center">
                    <div className="w-24 h-24 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                        <Lock className="w-10 h-10 text-slate-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{profile.name}</h2>
                    <p className="text-slate-500 dark:text-slate-400">{profile.message}</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Back button */}
            <Button variant="secondary" onClick={() => navigate(-1)} className="mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
            </Button>

            {/* Profile Header */}
            <Card className="p-6 mb-6">
                <div className="flex flex-col sm:flex-row gap-6">
                    {/* Avatar */}
                    <div className="shrink-0">
                        {profile.avatar ? (
                            <img
                                src={profile.avatar}
                                alt={profile.name}
                                className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-lg"
                            />
                        ) : (
                            <div className="w-28 h-28 rounded-full bg-linear-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                {profile.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{profile.name}</h1>
                                {profile.matchingProfile?.primaryRole && (
                                    <p className="text-primary-600 font-medium mt-1">
                                        {profile.matchingProfile.primaryRole}
                                    </p>
                                )}
                            </div>

                            {/* Streak Badge */}
                            {profile.streak && profile.streak.currentStreak > 0 && (
                                <div className="group relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums bg-linear-to-r from-orange-400 to-red-500 text-white shadow-sm ring-1 ring-white/25 overflow-hidden">
                                    {profile.streak.currentStreak >= 3 && (
                                        <span
                                            className="pointer-events-none absolute inset-y-0 left-0 w-[42%] bg-linear-to-r from-white/0 via-white/45 to-white/0 opacity-30 animate-streak-shine"
                                            aria-hidden="true"
                                        />
                                    )}

                                    <span className="relative grid place-items-center w-7 h-7 overflow-visible" aria-hidden="true">
                                        <img src="/streak/flame-tight.gif" className="streak-motion w-[150%] h-[150%] -translate-y-[18%] object-contain mix-blend-screen brightness-110 saturate-150 contrast-125" alt="" aria-hidden="true" />
                                        <img src="/streak/flame-tight.png" className="streak-reduce-motion w-[150%] h-[150%] -translate-y-[18%] object-contain mix-blend-screen brightness-110 saturate-150 contrast-125" alt="" aria-hidden="true" />
                                    </span>

                                    <span className="relative font-extrabold leading-none">{profile.streak.currentStreak}</span>
                                    <span className="text-sm font-medium opacity-90">{dayLabel(profile.streak.currentStreak)}</span>

                                    {/* star removed */}
                                </div>
                            )}
                        </div>

                        {/* Bio */}
                        {profile.bio && (
                            <p className="text-slate-600 dark:text-slate-400 mt-3">{profile.bio}</p>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mt-4">
                            {profile.matchingProfile?.location && (
                                <span className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {profile.matchingProfile.location}
                                </span>
                            )}
                            {profile.matchingProfile?.experienceLevel && (
                                <span className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    {getExperienceLevelLabel(profile.matchingProfile.experienceLevel)}
                                </span>
                            )}
                            {profile.matchingProfile?.openToNewTeams && (
                                <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
                                    <Users className="w-3.5 h-3.5" />
                                    {t('userProfile.openToTeams')}
                                </span>
                            )}
                            {profile.matchingProfile?.openToMentor && (
                                <span className="inline-flex items-center gap-1 text-sm text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-3 py-1 rounded-full">
                                    <Star className="w-3.5 h-3.5" />
                                    {t('userProfile.openToMentor')}
                                </span>
                            )}
                        </div>

                        {/* Member since */}
                        <p className="text-sm text-slate-400 mt-4">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            {t('userProfile.memberSince', { date: formatDate(profile.createdAt) })}
                        </p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Radar Chart */}
                    {profile.matchingProfile?.radarSkills && (
                        <Card className="p-6">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <Target className="w-5 h-5 text-primary-600" />
                                {locale === 'en' ? 'Core Skills Profiling' : 'Biểu đồ Kỹ năng cốt lõi'}
                            </h3>
                            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex justify-center">
                                <RadarChart data={profile.matchingProfile.radarSkills} size="md" color="#4f46e5" />
                            </div>
                        </Card>
                    )}

                    {/* Skills & Tech Stack */}
                    {profile.matchingProfile && (profile.matchingProfile.skills.length > 0 || profile.matchingProfile.techStack.length > 0) && (
                        <Card className="p-6">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <Code className="w-5 h-5 text-primary-600" />
                                {t('userProfile.skillsAndTech')}
                            </h3>

                            {profile.matchingProfile.skills.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{t('userProfile.skills')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.matchingProfile.skills.map((skill, i) => (
                                            <span key={i} className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {profile.matchingProfile.techStack.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{t('userProfile.techStack')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.matchingProfile.techStack.map((tech, i) => (
                                            <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {profile.matchingProfile.languages.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{t('userProfile.languages')}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.matchingProfile.languages.map((lang, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                                                <Globe className="w-3.5 h-3.5" />
                                                {lang}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Activities */}
                    {profile.activities && profile.activities.length > 0 && (
                        <Card className="p-6">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-primary-600" />
                                {t('userProfile.recentActivities')}
                            </h3>
                            <div className="space-y-3">
                                {profile.activities.map((activity, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                                            <Trophy className="w-5 h-5 text-primary-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-900 dark:text-slate-100">{activity.title}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                <Clock className="w-3 h-3 inline mr-1" />
                                                {formatDate(activity.date)}
                                            </p>
                                        </div>
                                        <Badge status={activity.status === 'registered' ? 'OPEN' : 'CLOSED'}>
                                            {activity.status === 'registered' ? t('userProfile.registeredStatus') : activity.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Course Enrollments */}
                    {profile.enrollments && profile.enrollments.length > 0 && (
                        <Card className="p-6">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary-600" />
                                {t('userProfile.courses')}
                            </h3>
                            <div className="space-y-3">
                                {profile.enrollments.map((enrollment, i) => (
                                    <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-medium text-slate-900 dark:text-slate-100">{enrollment.title}</p>
                                            {enrollment.status === 'completed' ? (
                                                <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-300">
                                                    <CheckCircle className="w-4 h-4" />
                                                    {t('userProfile.completed')}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Achievements */}
                    {profile.achievements && (
                        <Card className="p-6">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <Award className="w-5 h-5 text-primary-600" />
                                {t('userProfile.achievements')}
                            </h3>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="text-center p-3 bg-linear-to-br from-amber-50 dark:from-amber-950/30 to-orange-50 dark:to-orange-950/30 rounded-lg">
                                    <Trophy className="w-6 h-6 mx-auto text-amber-500 mb-1" />
                                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{profile.achievements.totalContests}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('userProfile.contests')}</p>
                                </div>
                                <div className="text-center p-3 bg-linear-to-br from-emerald-50 dark:from-emerald-950/30 to-teal-50 dark:to-teal-950/30 rounded-lg">
                                    <BookOpen className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
                                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{profile.achievements.completedCourses}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('userProfile.completedCourses')}</p>
                                </div>
                            </div>

                            {profile.streak && (
                                <div className="p-3 bg-linear-to-br from-orange-50 dark:from-orange-950/30 to-red-50 dark:to-red-950/30 rounded-lg mb-4">
                                    <div className="flex items-center gap-3">
                                        <img src="/streak/flame-tight.gif" className="streak-motion w-8 h-8 object-contain mix-blend-screen" alt="" aria-hidden="true" />
                                        <img src="/streak/flame-tight.png" className="streak-reduce-motion w-8 h-8 object-contain mix-blend-screen" alt="" aria-hidden="true" />
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-slate-100">{t('userProfile.streakDays', { count: profile.streak.longestStreak, label: dayLabel(profile.streak.longestStreak) })}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{t('userProfile.longestStreak')}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {profile.achievements.contestAchievements && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{t('userProfile.highlightAchievements')}</p>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{profile.achievements.contestAchievements}</p>
                                </div>
                            )}

                            {profile.achievements.portfolioLinks.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Portfolio</p>
                                    <div className="space-y-2">
                                        {profile.achievements.portfolioLinks.map((link, i) => (
                                            <a
                                                key={i}
                                                href={link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 hover:underline"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                {new URL(link).hostname}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Contest Interests */}
                    {profile.contestPreferences && profile.contestPreferences.contestInterests.length > 0 && (
                        <Card className="p-6">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-primary-600" />
                                {t('userProfile.interests')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {profile.contestPreferences.contestInterests.map((interest, i) => (
                                    <span key={i} className="px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm">
                                        {interest}
                                    </span>
                                ))}
                            </div>

                            {profile.contestPreferences.preferredTeamRole && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        <Users className="w-4 h-4 inline mr-1" />
                                        {t('userProfile.preferredRole')}: <span className="text-slate-900 dark:text-slate-100">{profile.contestPreferences.preferredTeamRole}</span>
                                    </p>
                                    {profile.contestPreferences.preferredTeamSize && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            {t('userProfile.teamSize', { size: profile.contestPreferences.preferredTeamSize })}
                                        </p>
                                    )}
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Secondary Roles */}
                    {profile.matchingProfile && profile.matchingProfile.secondaryRoles.length > 0 && (
                        <Card className="p-6">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-primary-600" />
                                {t('userProfile.secondaryRoles')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {profile.matchingProfile.secondaryRoles.map((role, i) => (
                                    <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm">
                                        {role}
                                    </span>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Own profile link */}
            {profile.isOwnProfile && (
                <div className="mt-6 text-center">
                    <Link to="/profile" className="text-primary-600 hover:text-primary-700 hover:underline">
                        {t('userProfile.editProfileLink')}
                    </Link>
                </div>
            )}
        </div>
    );
};

export default UserProfile;

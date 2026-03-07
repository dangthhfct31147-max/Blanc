import React, { useState } from 'react';
import { Search, Filter, Briefcase, Users, BarChart, GraduationCap, FileText, Trophy, BookOpen, ArrowRight } from 'lucide-react';
import { ReportTemplate } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface ReportTemplatesGalleryProps {
    onSelectTemplate: (template: ReportTemplate) => void;
}

export const ReportTemplatesGallery: React.FC<ReportTemplatesGalleryProps> = ({ onSelectTemplate }) => {
    const { t } = useI18n();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'study':
                return t('reports.templates.category.study');
            case 'contest':
                return t('reports.templates.category.contest');
            case 'team':
                return t('reports.templates.category.team');
            case 'course':
                return t('reports.templates.category.course');
            case 'analysis':
                return t('reports.templates.category.analysis');
            default:
                return category;
        }
    };

    const templates: ReportTemplate[] = [
        // Study
        { id: 'weekly-progress', title: t('reports.templates.items.weeklyProgress.title'), description: t('reports.templates.items.weeklyProgress.description'), category: 'study', icon: 'BarChart' },
        { id: 'semester-recap', title: t('reports.templates.items.semesterRecap.title'), description: t('reports.templates.items.semesterRecap.description'), category: 'study', icon: 'GraduationCap' },
        { id: 'study-plan', title: t('reports.templates.items.studyPlan.title'), description: t('reports.templates.items.studyPlan.description'), category: 'study', icon: 'BookOpen' },

        // Contest
        { id: 'contest-recap', title: t('reports.templates.items.contestRecap.title'), description: t('reports.templates.items.contestRecap.description'), category: 'contest', icon: 'Trophy' },
        { id: 'contest-proposal', title: t('reports.templates.items.contestProposal.title'), description: t('reports.templates.items.contestProposal.description'), category: 'contest', icon: 'Trophy' },
        { id: 'competitor-analysis', title: t('reports.templates.items.competitorAnalysis.title'), description: t('reports.templates.items.competitorAnalysis.description'), category: 'contest', icon: 'BarChart' },

        // Team
        { id: 'team-report', title: t('reports.templates.items.teamReport.title'), description: t('reports.templates.items.teamReport.description'), category: 'team', icon: 'Users' },
        { id: 'meeting-minutes', title: t('reports.templates.items.meetingMinutes.title'), description: t('reports.templates.items.meetingMinutes.description'), category: 'team', icon: 'Users' },
        { id: 'member-review', title: t('reports.templates.items.memberReview.title'), description: t('reports.templates.items.memberReview.description'), category: 'team', icon: 'Users' },

        // Course
        { id: 'course-review', title: t('reports.templates.items.courseReview.title'), description: t('reports.templates.items.courseReview.description'), category: 'course', icon: 'GraduationCap' },
        { id: 'lesson-notes', title: t('reports.templates.items.lessonNotes.title'), description: t('reports.templates.items.lessonNotes.description'), category: 'course', icon: 'BookOpen' },
        { id: 'capstone-project', title: t('reports.templates.items.capstoneProject.title'), description: t('reports.templates.items.capstoneProject.description'), category: 'course', icon: 'Briefcase' },
    ];

    const categories = [
        { key: 'all', label: t('reports.templates.category.all') },
        { key: 'study', label: t('reports.templates.category.study') },
        { key: 'contest', label: t('reports.templates.category.contest') },
        { key: 'team', label: t('reports.templates.category.team') },
        { key: 'course', label: t('reports.templates.category.course') },
    ];

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'Briefcase': return <Briefcase className="w-6 h-6 text-blue-600" />;
            case 'Users': return <Users className="w-6 h-6 text-teal-600" />;
            case 'BarChart': return <BarChart className="w-6 h-6 text-purple-600" />;
            case 'GraduationCap': return <GraduationCap className="w-6 h-6 text-orange-600" />;
            case 'Trophy': return <Trophy className="w-6 h-6 text-amber-600" />;
            case 'BookOpen': return <BookOpen className="w-6 h-6 text-emerald-600" />;
            default: return <FileText className="w-6 h-6 text-gray-600" />;
        }
    };

    const filteredTemplates = templates.filter(template => {
        const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
        const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in h-full flex flex-col">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('reports.templates.gallery.title')}</h1>
                <p className="text-slate-500 mt-1">{t('reports.templates.gallery.subtitle')}</p>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                {/* Category Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
                    {categories.map((cat) => (
                        <button
                            key={cat.key}
                            onClick={() => setCategoryFilter(cat.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${categoryFilter === cat.key
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder={t('reports.templates.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTemplates.map((template) => (
                    <div
                        key={template.id}
                        onClick={() => onSelectTemplate(template)}
                        className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-300 cursor-pointer flex flex-col h-full"
                    >
                        <div className="mb-4 p-3 bg-slate-50 rounded-xl w-fit group-hover:bg-blue-50 transition-colors">
                            {getIcon(template.icon)}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {getCategoryLabel(template.category)}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-700 transition-colors">
                                {template.title}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                {template.description}
                            </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">{t('reports.templates.updatedToday')}</span>
                            <button className="flex items-center text-sm font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transform -translate-x-2.5 group-hover:translate-x-0 transition-all duration-300">
                                {t('reports.templates.useTemplate')} <ArrowRight className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredTemplates.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Filter className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">{t('reports.templates.emptyTitle')}</p>
                    <p className="text-sm">{t('reports.templates.emptySubtitle')}</p>
                </div>
            )}
        </div>
    );
};

export default ReportTemplatesGallery;

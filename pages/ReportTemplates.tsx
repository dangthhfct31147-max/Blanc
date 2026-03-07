import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Trophy, Users, BarChart, GraduationCap, FileText, Target, CheckCircle, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { ReportTemplate } from '../types';
import { useI18n } from '../contexts/I18nContext';

const ReportTemplates: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'contest':
                return t('reports.templates.category.contest');
            case 'team':
                return t('reports.templates.category.team');
            case 'study':
                return t('reports.templates.category.study');
            case 'analysis':
                return t('reports.templates.category.analysis');
            default:
                return category;
        }
    };

    const templates: ReportTemplate[] = [
        // Contest
        { id: 'contest-recap', title: t('reports.templates.items.contestRecap.title'), description: t('reports.templates.items.contestRecapFull.description'), category: 'contest', icon: 'Trophy' },
        { id: 'idea-proposal', title: t('reports.templates.items.ideaProposal.title'), description: t('reports.templates.items.ideaProposal.description'), category: 'contest', icon: 'Target' },
        { id: 'project-progress', title: t('reports.templates.items.projectProgress.title'), description: t('reports.templates.items.projectProgress.description'), category: 'contest', icon: 'CheckCircle' },

        // Team
        { id: 'weekly-team-report', title: t('reports.templates.items.weeklyTeamReport.title'), description: t('reports.templates.items.weeklyTeamReport.description'), category: 'team', icon: 'Users' },
        { id: 'member-review', title: t('reports.templates.items.memberReview.title'), description: t('reports.templates.items.memberReviewWork.description'), category: 'team', icon: 'Users' },
        { id: 'meeting-minutes', title: t('reports.templates.items.meetingMinutes.title'), description: t('reports.templates.items.meetingMinutesWork.description'), category: 'team', icon: 'FileText' },

        // Study
        { id: 'study-progress', title: t('reports.templates.items.studyProgress.title'), description: t('reports.templates.items.studyProgress.description'), category: 'study', icon: 'GraduationCap' },
        { id: 'course-review', title: t('reports.templates.items.courseReview.title'), description: t('reports.templates.items.courseReviewDetail.description'), category: 'study', icon: 'GraduationCap' },
        { id: 'study-plan', title: t('reports.templates.items.studyPlan.title'), description: t('reports.templates.items.studyPlanDetail.description'), category: 'study', icon: 'Target' },

        // Analysis
        { id: 'result-analysis', title: t('reports.templates.items.resultAnalysis.title'), description: t('reports.templates.items.resultAnalysis.description'), category: 'analysis', icon: 'BarChart' },
        { id: 'comparison-review', title: t('reports.templates.items.comparisonReview.title'), description: t('reports.templates.items.comparisonReview.description'), category: 'analysis', icon: 'BarChart' },
        { id: 'stats-report', title: t('reports.templates.items.statsReport.title'), description: t('reports.templates.items.statsReport.description'), category: 'analysis', icon: 'BarChart' },
    ];

    const categories = [
        { key: 'all', label: t('reports.templates.category.all') },
        { key: 'contest', label: t('reports.templates.category.contest') },
        { key: 'team', label: t('reports.templates.category.team') },
        { key: 'study', label: t('reports.templates.category.study') },
        { key: 'analysis', label: t('reports.templates.category.analysis') },
    ];

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'Trophy': return <Trophy className="w-6 h-6 text-amber-600" />;
            case 'Users': return <Users className="w-6 h-6 text-teal-600" />;
            case 'BarChart': return <BarChart className="w-6 h-6 text-purple-600" />;
            case 'GraduationCap': return <GraduationCap className="w-6 h-6 text-blue-600" />;
            case 'Target': return <Target className="w-6 h-6 text-red-600" />;
            case 'CheckCircle': return <CheckCircle className="w-6 h-6 text-green-600" />;
            default: return <FileText className="w-6 h-6 text-gray-600" />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'contest': return 'bg-amber-50 text-amber-700';
            case 'team': return 'bg-teal-50 text-teal-700';
            case 'study': return 'bg-blue-50 text-blue-700';
            case 'analysis': return 'bg-purple-50 text-purple-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const filteredTemplates = templates.filter(template => {
        const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
        const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleSelectTemplate = (template: ReportTemplate) => {
        // TODO: Navigate to editor with template
        console.log('Selected template:', template);
        // navigate(`/reports/new?template=${template.id}`);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="p-6 max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <button
                            onClick={() => navigate('/reports')}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-3 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm font-medium">{t('reports.templates.back')}</span>
                        </button>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            <Sparkles className="w-8 h-8 text-primary-600" />
                            {t('reports.templates.page.title')}
                        </h1>
                        <p className="text-slate-500 mt-1">{t('reports.templates.page.subtitle')}</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    {/* Category Tabs */}
                    <div className="flex bg-white p-1.5 rounded-xl border border-slate-200 overflow-x-auto max-w-full shadow-sm">
                        {categories.map((cat) => (
                            <button
                                key={cat.key}
                                onClick={() => setCategoryFilter(cat.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${categoryFilter === cat.key
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder={t('reports.templates.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 text-sm transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredTemplates.map((template) => (
                        <div
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className="group relative bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:border-primary-300 transition-all duration-300 cursor-pointer flex flex-col h-full"
                        >
                            <div className="mb-4 p-3 bg-slate-50 rounded-xl w-fit group-hover:bg-primary-50 transition-colors">
                                {getIcon(template.icon)}
                            </div>

                            <div className="grow">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${getCategoryColor(template.category)}`}>
                                        {getCategoryLabel(template.category)}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-primary-700 transition-colors">
                                    {template.title}
                                </h3>
                                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                                    {template.description}
                                </p>
                            </div>

                            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> {t('reports.templates.aiSupported')}
                                </span>
                                <span className="flex items-center text-sm font-semibold text-primary-600 opacity-0 group-hover:opacity-100 transform -translate-x-2.5 group-hover:translate-x-0 transition-all duration-300">
                                    {t('reports.templates.use')} <ArrowRight className="w-4 h-4 ml-1" />
                                </span>
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
        </div>
    );
};

export default ReportTemplates;

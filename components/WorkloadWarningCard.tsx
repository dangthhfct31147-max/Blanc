import React, { useMemo } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, TrendingUp, BookOpen, Trophy, Calendar, RefreshCw, Loader2, Heart } from 'lucide-react';
import { Card, Button } from './ui/Common';
import { useI18n } from '../contexts/I18nContext';
import { WorkloadAnalysis, WorkloadWarning } from '../types';
import { useWorkloadAnalysis } from '../lib/hooks';

interface WorkloadWarningCardProps {
  className?: string;
  onRefresh?: () => void;
}

// Health Score Ring Component
const HealthScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 120 }) => {
  const { t } = useI18n();
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const getScoreConfig = (score: number) => {
    if (score >= 70) return { stroke: '#10B981', heartClass: 'text-emerald-500', textClass: 'text-emerald-700' };
    if (score >= 40) return { stroke: '#F59E0B', heartClass: 'text-amber-500', textClass: 'text-amber-700' };
    return { stroke: '#EF4444', heartClass: 'text-red-500', textClass: 'text-red-700' };
  };

  const config = getScoreConfig(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={config.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Heart className={`w-4 h-4 mb-1 ${config.heartClass}`} />
        <span className={`text-2xl font-bold ${config.textClass}`}>{score}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('workload.points')}</span>
      </div>
    </div>
  );
};

// Single Warning Item Component
const WarningItem: React.FC<{ warning: WorkloadWarning }> = ({ warning }) => {
  const isCritical = warning.type === 'critical';

  return (
    <div
      className={`p-4 rounded-lg border-l-4 ${isCritical
          ? 'bg-red-50 dark:bg-red-900/30 border-red-500'
          : 'bg-amber-50 dark:bg-amber-900/30 border-amber-500'
        }`}
    >
      <div className="flex items-start gap-3">
        {isCritical ? (
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isCritical ? 'text-red-800' : 'text-amber-800'}`}>
            {warning.message}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {warning.suggestion}
          </p>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  warning: number;
  color: string;
}> = ({ icon, label, value, max, warning, color }) => {
  const percentage = Math.min(100, (value / max) * 100);
  const isWarning = value >= warning;
  const isCritical = value >= max;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${color}`}>
            {icon}
          </div>
          <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
        </div>
        <span className={`font-bold ${isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100'
          }`}>
          {value}/{max}
        </span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          // Dynamic width is required here - cannot use static Tailwind class
          {...{ style: { width: `${percentage}%` } }}
        />
      </div>
    </div>
  );
};

// Main Component
const WorkloadWarningCard: React.FC<WorkloadWarningCardProps> = ({ className = '', onRefresh }) => {
  const { t } = useI18n();
  const { analysis, isLoading, error, refetch } = useWorkloadAnalysis();

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  // Status indicator
  const statusConfig = useMemo(() => {
    if (!analysis) return null;

    switch (analysis.overallStatus) {
      case 'critical':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: t('workload.status.danger'),
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5" />,
          color: 'text-amber-600',
          bgColor: 'bg-amber-100',
          label: t('workload.status.warning'),
        };
      default:
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-100',
          label: t('workload.status.good'),
        };
    }
  }, [analysis, t]);

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-4">
          <p className="text-red-500 text-sm mb-3">{error}</p>
          <Button size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" /> {t('workload.retry')}
          </Button>
        </div>
      </Card>
    );
  }

  if (isLoading || !analysis) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-slate-50 dark:from-slate-800 to-white dark:to-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{t('workload.title')}</h3>
            {statusConfig && (
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={t('workload.refresh')}
          >
            <RefreshCw className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Health Score Section */}
      <div className="p-4 flex items-center gap-6 bg-linear-to-b from-white dark:from-slate-900 to-slate-50 dark:to-slate-800">
        <HealthScoreRing score={analysis.healthScore} />
        <div className="flex-1 space-y-2">
          <StatCard
            icon={<Trophy className="w-4 h-4 text-primary-600" />}
            label={t('workload.metric.contests')}
            value={analysis.workload.activeContests}
            max={analysis.limits.MAX_ACTIVE_CONTESTS}
            warning={analysis.limits.WARNING_THRESHOLD_CONTESTS}
            color="bg-primary-100"
          />
          <StatCard
            icon={<BookOpen className="w-4 h-4 text-emerald-600" />}
            label={t('workload.metric.courses')}
            value={analysis.workload.activeCourses}
            max={analysis.limits.MAX_ACTIVE_COURSES}
            warning={analysis.limits.WARNING_THRESHOLD_COURSES}
            color="bg-emerald-100"
          />
          <StatCard
            icon={<Calendar className="w-4 h-4 text-blue-600" />}
            label={t('workload.metric.weeklyEvents')}
            value={analysis.workload.weeklyEvents}
            max={analysis.limits.MAX_WEEKLY_EVENTS}
            warning={analysis.limits.MAX_WEEKLY_EVENTS - 2}
            color="bg-blue-100"
          />
        </div>
      </div>

      {/* Warnings Section */}
      {analysis.warnings.length > 0 && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            {t('workload.warningsTitle', { count: analysis.warnings.length })}
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {analysis.warnings.map((warning, index) => (
              <WarningItem key={index} warning={warning} />
            ))}
          </div>
        </div>
      )}

      {/* No Warnings - Good State */}
      {analysis.warnings.length === 0 && (
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
          <p className="font-medium text-slate-900 dark:text-slate-100">{t('workload.noWarnings.title')}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('workload.noWarnings.description')}
          </p>
        </div>
      )}

      {/* Upcoming Events Preview */}
      {analysis.workload.upcomingContests.length > 0 && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {t('workload.upcomingIn7Days')}
          </h4>
          <div className="space-y-1">
            {analysis.workload.upcomingContests.slice(0, 3).map(contest => (
              <div key={contest.id} className="flex items-center gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                <span className="text-slate-600 dark:text-slate-400 truncate flex-1">{contest.title}</span>
                <span className="text-xs text-slate-400">
                  {new Date(contest.dateStart).toLocaleDateString('vi-VN')}
                </span>
              </div>
            ))}
            {analysis.workload.upcomingContests.length > 3 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 pl-4">
                {t('workload.moreEvents', { count: analysis.workload.upcomingContests.length - 3 })}
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default WorkloadWarningCard;

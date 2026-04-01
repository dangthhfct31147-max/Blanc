import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleDashed,
  CircleSlash,
  Compass,
  DollarSign,
  Filter,
  Flag,
  GraduationCap,
  Languages,
  Lightbulb,
  Loader2,
  MapPinned,
  Medal,
  Minus,
  Plus,
  Search,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { Badge, Button, EmptyState, Input, Select, cn } from '../ui/Common';
import { defaultProfileId, defaultUniversityFilters, studentProfiles, universityCatalogue } from './data';
import {
  buildGoalTracker,
  buildOpportunityUnlocks,
  buildUniversityMatches,
  compareMatchLabels,
  filterAndSortResults,
  formatCurrency,
} from './engine';
import type {
  GoalOpportunity,
  MatchLabel,
  OpportunityUnlock,
  RequirementChecklistItem,
  RequirementTone,
  ScholarshipStatus,
  ScholarshipType,
  StudentActivity,
  StudentProfile,
  UniversityFitResult,
  UniversityFilterState,
} from './types';

interface SimulationState {
  gpaDelta: number;
  englishDelta: number;
  extraAwards: number;
  extraLeadership: number;
}

const defaultSimulationState: SimulationState = {
  gpaDelta: 0,
  englishDelta: 0,
  extraAwards: 0,
  extraLeadership: 0,
};

const tonePillClasses: Record<RequirementTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  yellow: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/90 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20',
  red: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/90 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
  gray: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
};

const matchBadgeClasses: Record<MatchLabel, string> = {
  'Strong Match': 'bg-emerald-500 text-white',
  'Good Match': 'bg-teal-600 text-white',
  Reach: 'bg-sky-100 text-sky-700 ring-1 ring-sky-200',
  Ambitious: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  'Not Yet Ready': 'bg-slate-200 text-slate-700 ring-1 ring-slate-300',
};

const scholarshipToneClasses: Record<ScholarshipStatus, string> = {
  'Likely eligible': tonePillClasses.green,
  'Potentially eligible': tonePillClasses.yellow,
  'Needs improvement': tonePillClasses.yellow,
  'Not eligible yet': tonePillClasses.red,
};

function requirementIcon(tone: RequirementTone) {
  if (tone === 'green') return <CheckCircle2 className="h-4 w-4" />;
  if (tone === 'yellow') return <Target className="h-4 w-4" />;
  if (tone === 'red') return <CircleAlert className="h-4 w-4" />;
  return <CircleDashed className="h-4 w-4" />;
}

function scoreBarTone(value: number): string {
  if (value >= 80) return 'from-emerald-500 to-teal-500';
  if (value >= 60) return 'from-amber-400 to-orange-400';
  if (value >= 40) return 'from-sky-500 to-cyan-500';
  return 'from-rose-400 to-red-500';
}

function createPlaceholderActivities(prefix: string, count: number): StudentActivity[] {
  return Array.from({ length: count }, (_, index) => ({
    title: `${prefix} ${index + 1}`,
    impact: `Simulated ${prefix.toLowerCase()} for planning purposes.`,
    tier: 'school',
  }));
}

function resizeActivities(existing: StudentActivity[], count: number, prefix: string): StudentActivity[] {
  if (count <= 0) return [];
  if (existing.length >= count) return existing.slice(0, count);
  return [...existing, ...createPlaceholderActivities(prefix, count - existing.length)];
}

function applySimulation(profile: StudentProfile, simulation: SimulationState): StudentProfile {
  const englishNeedsDefault =
    simulation.englishDelta > 0 &&
    (profile.englishProficiency.exam === 'Unknown' || profile.englishProficiency.score === undefined);

  return {
    ...profile,
    gpa10: Math.min(9.9, Number((profile.gpa10 + simulation.gpaDelta).toFixed(1))),
    englishProficiency: englishNeedsDefault
      ? { exam: 'IELTS', score: 6.5 }
      : {
          ...profile.englishProficiency,
          score:
            profile.englishProficiency.score === undefined
              ? undefined
              : Number((profile.englishProficiency.score + simulation.englishDelta).toFixed(profile.englishProficiency.exam === 'IELTS' ? 1 : 0)),
        },
    awards: [...profile.awards, ...createPlaceholderActivities('Simulated award', simulation.extraAwards)],
    leadershipExperience: [
      ...profile.leadershipExperience,
      ...createPlaceholderActivities('Simulated leadership', simulation.extraLeadership),
    ],
  };
}

function isSimulationActive(simulation: SimulationState): boolean {
  return Object.values(simulation).some((value) => value !== 0);
}

function completionPercent(profile: StudentProfile): number {
  let completed = 0;
  const total = 12;

  if (profile.gpa10 > 0) completed += 1;
  if (profile.classRankPercent !== undefined) completed += 1;
  if (Object.keys(profile.standardizedTests).length > 0) completed += 1;
  if (profile.englishProficiency.exam !== 'Unknown' && profile.englishProficiency.score !== undefined) completed += 1;
  if (profile.intendedMajor) completed += 1;
  if (profile.countryPreferences.length > 0) completed += 1;
  if (profile.budgetPerYearUsd > 0) completed += 1;
  if (profile.extracurricularActivities.length > 0) completed += 1;
  if (profile.awards.length > 0) completed += 1;
  if (profile.leadershipExperience.length > 0) completed += 1;
  if (profile.volunteerImpact.length > 0) completed += 1;
  if (profile.preferredScholarshipTypes.length > 0) completed += 1;

  return Math.round((completed / total) * 100);
}

function StatusPill({
  tone,
  children,
}: {
  tone: RequirementTone;
  children: React.ReactNode;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold', tonePillClasses[tone])}>
      {requirementIcon(tone)}
      {children}
    </span>
  );
}

function FitScoreBadge({ result }: { result: UniversityFitResult }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-lg shadow-slate-300/40 dark:bg-white dark:text-slate-950 dark:shadow-slate-950/40">
        {result.overallFitScore}
      </div>
      <div className="space-y-1">
        <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', matchBadgeClasses[result.matchLabel])}>
          {result.matchLabel}
        </span>
        <p className="text-xs text-slate-500 dark:text-slate-400">{result.competitivenessLevel}</p>
      </div>
    </div>
  );
}

function ReadinessBar({
  label,
  value,
  toneLabel,
}: {
  label: string;
  value: number;
  toneLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="text-slate-500 dark:text-slate-400">{toneLabel}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', scoreBarTone(value))}
          style={{ width: `${Math.max(6, value)}%` }}
        />
      </div>
    </div>
  );
}

function DeadlineBadge({ label, daysUntil, tone }: NonNullable<UniversityFitResult['deadlineSignal']>) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', tonePillClasses[tone])}>
      <Flag className="h-3.5 w-3.5" />
      {label}
      <span className="text-[11px] opacity-80">{daysUntil}d</span>
    </span>
  );
}

function RequirementChecklist({
  result,
  onSaveGoal,
  savedGoalIds,
}: {
  result: UniversityFitResult;
  onSaveGoal: (goal: GoalOpportunity) => void;
  savedGoalIds: string[];
}) {
  return (
    <div className="space-y-3">
      {result.checklist.map((item) => {
        const isSaved = item.goal ? savedGoalIds.includes(item.goal.id) : false;

        return (
          <div
            key={item.id}
            className={cn(
              'rounded-2xl border p-4 transition-colors',
              item.tone === 'green'
                ? 'border-emerald-100 bg-emerald-50/60 dark:border-emerald-500/15 dark:bg-emerald-500/5'
                : item.tone === 'yellow'
                  ? 'border-amber-100 bg-amber-50/70 dark:border-amber-500/15 dark:bg-amber-500/5'
                  : item.tone === 'red'
                    ? 'border-rose-100 bg-rose-50/70 dark:border-rose-500/15 dark:bg-rose-500/5'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={item.tone}>
                    {item.status === 'met'
                      ? 'Met'
                      : item.status === 'partial'
                        ? 'Partially met'
                        : item.status === 'recommended'
                          ? 'Optional but recommended'
                          : item.status === 'blocker'
                            ? 'Hard blocker'
                            : 'Future target'}
                  </StatusPill>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{item.explanation}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge className="border-0 bg-white/80 text-slate-600 dark:bg-slate-950 dark:text-slate-300">Now: {item.currentValue}</Badge>
                  <Badge className="border-0 bg-white/80 text-slate-600 dark:bg-slate-950 dark:text-slate-300">Target: {item.targetValue}</Badge>
                </div>
              </div>
              {item.goal && (
                <Button
                  type="button"
                  size="sm"
                  variant={isSaved ? 'secondary' : 'ghost'}
                  onClick={() => onSaveGoal(item.goal!)}
                  className="shrink-0"
                >
                  {isSaved ? 'Saved goal' : 'Save goal'}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScholarshipSection({ result }: { result: UniversityFitResult }) {
  return (
    <div className="space-y-4">
      {result.scholarshipEvaluations.map((entry) => (
        <div key={entry.scholarship.id} className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">{entry.scholarship.name}</h4>
                <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', scholarshipToneClasses[entry.status])}>
                  {entry.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{entry.scholarship.notes}</p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white dark:bg-slate-100 dark:text-slate-950">
              <div className="text-xs uppercase tracking-[0.16em] text-white/70 dark:text-slate-500">Readiness</div>
              <div className="text-xl font-black">{entry.score}</div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Matched now</p>
              {entry.matchedCriteria.length > 0 ? (
                entry.matchedCriteria.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No strong criteria are confirmed yet.</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Still to strengthen</p>
              {entry.missingCriteria.length > 0 ? (
                entry.missingCriteria.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <Target className="mt-0.5 h-4 w-4 text-amber-500" />
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">You already cover the main scholarship signals.</p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{entry.scholarship.coverage}</Badge>
            {entry.benefits.map((benefit) => (
              <Badge key={benefit} className="border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {benefit}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ApplyRoadmap({ title, steps, icon }: { title: string; steps: string[]; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950">
          {icon}
        </div>
        <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
      </div>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {index + 1}
            </div>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TipsPanel({ tips }: { tips: string[] }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">Tips to increase your chances</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">Short, practical moves that can make this application stronger.</p>
        </div>
      </div>
      <div className="space-y-3">
        {tips.map((tip) => (
          <div key={tip} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
            <Sparkles className="mt-0.5 h-4 w-4 text-amber-500" />
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalTracker({
  goals,
  onRemove,
}: {
  goals: GoalOpportunity[];
  onRemove: (goalId: string) => void;
}) {
  if (goals.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-5 dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Target goals</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Save yellow items from the checklist to build your action plan.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => (
        <div key={goal.id} className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-500/15 dark:bg-amber-500/5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="yellow">Future target</StatusPill>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{goal.title}</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{goal.whyItMatters}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge className="border-0 bg-white/80 text-slate-700 dark:bg-slate-950 dark:text-slate-200">{goal.targetMetric}</Badge>
                <Badge className="border-0 bg-white/80 text-slate-700 dark:bg-slate-950 dark:text-slate-200">{goal.estimatedImpact}</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Unlocks or strengthens: {goal.universitiesUnlocked.join(', ')}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(goal.id)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Building your university fit map...</span>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
        ))}
      </div>
    </div>
  );
}

function UniversityCard({
  result,
  onOpen,
  onToggleCompare,
  isCompared,
}: {
  result: UniversityFitResult;
  onOpen: () => void;
  onToggleCompare: () => void;
  isCompared: boolean;
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{result.university.country}</Badge>
              <Badge className="border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{result.university.city}</Badge>
              {result.deadlineSignal && <DeadlineBadge {...result.deadlineSignal} />}
            </div>
            <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{result.university.name}</h3>
            <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">{result.university.reputationLabel}</p>
          </div>
          <FitScoreBadge result={result} />
        </div>
        <div className="min-w-[220px] rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Estimated annual cost</p>
          <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
            {formatCurrency(result.estimatedNetCostUsd.min)}-{formatCurrency(result.estimatedNetCostUsd.max)}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {result.benefitsPreview[0] ?? 'Scholarship and benefit details available inside.'}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <ReadinessBar label="Admission readiness" value={result.admissionReadiness} toneLabel={result.admissionStatus} />
        <ReadinessBar label="Scholarship readiness" value={result.scholarshipReadiness} toneLabel={result.scholarshipStatus} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/15 dark:bg-emerald-500/5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Already working in your favor</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.metRequirements.slice(0, 3).map((item) => (
              <StatusPill key={item.id} tone="green">{item.shortLabel}</StatusPill>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] border border-amber-100 bg-amber-50/70 p-4 dark:border-amber-500/15 dark:bg-amber-500/5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-200">Future targets</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.missingRequirements.slice(0, 3).map((item) => (
              <StatusPill key={item.id} tone={item.tone === 'red' ? 'red' : 'yellow'}>{item.shortLabel}</StatusPill>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Best next move</p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{result.bestNextMove}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onOpen}>
          View fit details
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button type="button" variant={isCompared ? 'secondary' : 'ghost'} onClick={onToggleCompare}>
          {isCompared ? 'Added to compare' : 'Compare'}
        </Button>
      </div>
    </motion.article>
  );
}

function CompareDrawer({
  results,
  isOpen,
  onToggleOpen,
  onRemove,
  onView,
}: {
  results: UniversityFitResult[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onRemove: (universityId: string) => void;
  onView: (universityId: string) => void;
}) {
  if (results.length === 0) return null;

  const rows = [
    {
      label: 'Fit score',
      render: (result: UniversityFitResult) => <span className="text-lg font-black text-slate-950 dark:text-white">{result.overallFitScore}</span>,
    },
    {
      label: 'Admission readiness',
      render: (result: UniversityFitResult) => <span>{result.admissionReadiness} • {result.admissionStatus}</span>,
    },
    {
      label: 'Scholarship readiness',
      render: (result: UniversityFitResult) => <span>{result.scholarshipReadiness} • {result.scholarshipStatus}</span>,
    },
    {
      label: 'Estimated annual cost',
      render: (result: UniversityFitResult) => <span>{formatCurrency(result.estimatedNetCostUsd.min)}-{formatCurrency(result.estimatedNetCostUsd.max)}</span>,
    },
    {
      label: 'Benefits',
      render: (result: UniversityFitResult) => <span>{result.benefitsPreview.slice(0, 2).join(', ')}</span>,
    },
    {
      label: 'Met requirements',
      render: (result: UniversityFitResult) => <span>{result.metRequirements.length}</span>,
    },
    {
      label: 'Missing requirements',
      render: (result: UniversityFitResult) => <span>{result.missingRequirements.length}</span>,
    },
    {
      label: 'Hard blockers',
      render: (result: UniversityFitResult) => (
        <span>{result.hardBlockers.length > 0 ? result.hardBlockers.map((item) => item.shortLabel).join(', ') : 'None'}</span>
      ),
    },
    {
      label: 'Best next action',
      render: (result: UniversityFitResult) => <span>{result.bestNextMove}</span>,
    },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6">
      <motion.div layout className="mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-2xl shadow-slate-300/30 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-slate-950/50">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Compare mode</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Compare {results.length} universities side by side.</p>
          </div>
          <Button type="button" variant="secondary" onClick={onToggleOpen}>
            {isOpen ? (
              <>
                Hide compare
                <ChevronDown className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Open compare
                <ChevronUp className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="overflow-x-auto">
                <div className="min-w-[960px]">
                  <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(220px,1fr))] gap-0">
                    <div className="border-r border-slate-200 p-4 dark:border-slate-800" />
                    {results.map((result) => (
                      <div key={result.university.id} className="border-r border-slate-200 p-4 last:border-r-0 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-950 dark:text-white">{result.university.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{result.university.country}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemove(result.university.id)}
                            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => onView(result.university.id)}>
                          View details
                        </Button>
                      </div>
                    ))}
                  </div>

                  {rows.map((row) => (
                    <div key={row.label} className="grid grid-cols-[200px_repeat(auto-fit,minmax(220px,1fr))] border-t border-slate-200 dark:border-slate-800">
                      <div className="border-r border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                        {row.label}
                      </div>
                      {results.map((result) => (
                        <div key={`${result.university.id}-${row.label}`} className="border-r border-slate-200 px-4 py-3 text-sm text-slate-600 last:border-r-0 dark:border-slate-800 dark:text-slate-300">
                          {row.render(result)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function ProfileSummaryPanel({
  profile,
  activeProfile,
  simulationActive,
  topOpportunity,
}: {
  profile: StudentProfile;
  activeProfile: StudentProfile;
  simulationActive: boolean;
  topOpportunity?: OpportunityUnlock;
}) {
  const baseCompletion = completionPercent(profile);

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Profile summary</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{profile.name}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{profile.headline}</p>
        </div>
        <div className="rounded-[24px] bg-slate-950 px-4 py-3 text-right text-white dark:bg-slate-100 dark:text-slate-950">
          <div className="text-xs uppercase tracking-[0.16em] text-white/70 dark:text-slate-500">Complete</div>
          <div className="text-2xl font-black">{baseCompletion}%</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <GraduationCap className="h-4 w-4 text-slate-500" />
            Academic snapshot
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="border-0 bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200">GPA {activeProfile.gpa10.toFixed(1)}</Badge>
            <Badge className="border-0 bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200">{activeProfile.academicStanding}</Badge>
            {activeProfile.classRankPercent !== undefined && (
              <Badge className="border-0 bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200">Top {activeProfile.classRankPercent}%</Badge>
            )}
          </div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <DollarSign className="h-4 w-4 text-slate-500" />
            Planning focus
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="border-0 bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200">{formatCurrency(activeProfile.budgetPerYearUsd)}/year</Badge>
            <Badge className="border-0 bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200">{activeProfile.intendedMajor}</Badge>
            <Badge className="border-0 bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200">{activeProfile.preferredIntakeTerm}</Badge>
          </div>
        </div>
      </div>

      {simulationActive && (
        <div className="mt-5 rounded-[24px] border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-500/15 dark:bg-sky-500/5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-sky-600 dark:text-sky-300" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Showing simulated improvements</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Results below reflect your current profile plus the scenario you are testing.</p>
            </div>
          </div>
        </div>
      )}

      {topOpportunity && (
        <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-500/15 dark:bg-amber-500/5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-200">Opportunity unlock</p>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{topOpportunity.title}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {topOpportunity.improvement} This currently unlocks {topOpportunity.unlockedScholarships} more likely scholarship outcomes across the list.
          </p>
        </div>
      )}
    </div>
  );
}

function CountField({
  label,
  count,
  onChange,
}: {
  label: string;
  count: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onChange(Math.max(0, count - 1))} className="rounded-full border border-slate-200 p-1 text-slate-500 transition-colors hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-6 text-center text-sm font-semibold text-slate-900 dark:text-slate-100">{count}</span>
          <button type="button" onClick={() => onChange(Math.min(6, count + 1))} className="rounded-full border border-slate-200 p-1 text-slate-500 transition-colors hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function UniversityDetailPanel({
  result,
  onClose,
  onToggleCompare,
  isCompared,
  onSaveGoal,
  savedGoalIds,
}: {
  result: UniversityFitResult | null;
  onClose: () => void;
  onToggleCompare: (universityId: string) => void;
  isCompared: boolean;
  onSaveGoal: (goal: GoalOpportunity) => void;
  savedGoalIds: string[];
}) {
  useEffect(() => {
    if (!result) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [result, onClose]);

  return (
    <AnimatePresence>
      {result && (
        <div className="fixed inset-0 z-50">
          <motion.button
            aria-label="Close fit details"
            type="button"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col overflow-hidden border-l border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="border-b border-slate-200 bg-white px-5 py-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{result.university.country}</Badge>
                    <Badge className="border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{result.university.city}</Badge>
                    {result.deadlineSignal && <DeadlineBadge {...result.deadlineSignal} />}
                  </div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{result.university.name}</h2>
                  <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">{result.university.reputationLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <FitScoreBadge result={result} />
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant={isCompared ? 'secondary' : 'ghost'} onClick={() => onToggleCompare(result.university.id)}>
                    {isCompared ? 'Added to compare' : 'Compare this school'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Admission eligibility</p>
                    <div className="mt-3 space-y-4">
                      <StatusPill tone={result.admissionStatus === 'Can apply now' ? 'green' : result.admissionStatus === 'Can apply but low competitiveness' ? 'yellow' : result.admissionStatus === 'Can target after improving profile' ? 'yellow' : 'red'}>
                        {result.admissionStatus}
                      </StatusPill>
                      <ReadinessBar label="Admission readiness" value={result.admissionReadiness} toneLabel={result.competitivenessLevel} />
                      <p className="text-sm text-slate-600 dark:text-slate-300">{result.explainability[0]}</p>
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Scholarship / benefit eligibility</p>
                    <div className="mt-3 space-y-4">
                      <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', scholarshipToneClasses[result.scholarshipStatus])}>
                        {result.scholarshipStatus}
                      </span>
                      <ReadinessBar label="Scholarship readiness" value={result.scholarshipReadiness} toneLabel={result.scholarshipStatus} />
                      <div className="flex flex-wrap gap-2">
                        {result.benefitsPreview.map((benefit) => (
                          <Badge key={benefit} className="border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {benefit}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Gap analysis</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">What you already have, what is still missing, and what could move the needle most.</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/15 dark:bg-emerald-500/5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Already strong</p>
                      <div className="mt-3 space-y-2">
                        {result.gapAnalysis.strengths.map((item) => (
                          <div key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[22px] border border-amber-100 bg-amber-50/70 p-4 dark:border-amber-500/15 dark:bg-amber-500/5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-200">Still to build</p>
                      <div className="mt-3 space-y-2">
                        {result.gapAnalysis.futureTargets.map((item) => (
                          <div key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                            <Target className="mt-0.5 h-4 w-4 text-amber-500" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[22px] border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-500/15 dark:bg-sky-500/5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Biggest unlock</p>
                      {result.gapAnalysis.biggestUnlock ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{result.gapAnalysis.biggestUnlock.title}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{result.gapAnalysis.biggestUnlock.whyItMatters}</p>
                          <Button type="button" variant={savedGoalIds.includes(result.gapAnalysis.biggestUnlock.id) ? 'secondary' : 'ghost'} size="sm" onClick={() => onSaveGoal(result.gapAnalysis.biggestUnlock!)}>
                            {savedGoalIds.includes(result.gapAnalysis.biggestUnlock.id) ? 'Saved goal' : 'Save this goal'}
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">This school is mostly about execution now rather than a major profile change.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Requirement checklist</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Yellow items are future goals by default unless marked as hard blockers.</p>
                    </div>
                  </div>
                  <RequirementChecklist result={result} onSaveGoal={onSaveGoal} savedGoalIds={savedGoalIds} />
                </div>

                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Scholarship and benefit eligibility</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">See what you already qualify for and what could make the biggest difference.</p>
                    </div>
                  </div>
                  <ScholarshipSection result={result} />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <ApplyRoadmap title="Admission roadmap" steps={result.university.officialApplicationSteps} icon={<BookOpen className="h-5 w-5" />} />
                  <ApplyRoadmap title="Scholarship roadmap" steps={result.university.scholarshipApplicationSteps} icon={<Award className="h-5 w-5" />} />
                </div>

                <TipsPanel tips={result.university.tipsToIncreaseChances} />
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

const scholarshipTypeOptions: ScholarshipType[] = [
  'merit',
  'need-based',
  'full ride',
  'tuition reduction',
  'honors',
  'automatic scholarship',
];

const englishExamOptions = ['Unknown', 'IELTS', 'TOEFL', 'Duolingo'] as const;

const countryOptions = Array.from(new Set(universityCatalogue.map((item) => item.country))).sort();
const majorOptions = Array.from(new Set(universityCatalogue.flatMap((item) => item.availableMajors))).sort();

const badgeSortCopy: Record<UniversityFilterState['sortBy'], string> = {
  'best-fit': 'Best fit first',
  'lowest-cost': 'Lowest estimated cost',
  'highest-scholarship': 'Highest scholarship potential',
  'easiest-entry': 'Easiest entry first',
  'deadline-urgency': 'Most urgent deadline',
};

export default function UniversityFitFeature() {
  const [selectedProfileId, setSelectedProfileId] = useState(defaultProfileId);
  const [profile, setProfile] = useState<StudentProfile>(() => {
    const current = studentProfiles.find((item) => item.id === defaultProfileId);
    return current ? structuredClone(current) : structuredClone(studentProfiles[0]);
  });
  const [simulation, setSimulation] = useState<SimulationState>(defaultSimulationState);
  const [filters, setFilters] = useState<UniversityFilterState>(defaultUniversityFilters);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [savedGoals, setSavedGoals] = useState<GoalOpportunity[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const deferredSearch = useDeferredValue(filters.search);
  const simulationActive = isSimulationActive(simulation);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 480);
    return () => window.clearTimeout(timer);
  }, []);

  const activeProfile = useMemo(() => applySimulation(profile, simulation), [profile, simulation]);
  const allResults = useMemo(() => buildUniversityMatches(activeProfile, universityCatalogue), [activeProfile]);
  const activeFilters = useMemo(() => ({ ...filters, search: deferredSearch }), [deferredSearch, filters]);
  const filteredResults = useMemo(() => filterAndSortResults(allResults, activeFilters), [activeFilters, allResults]);
  const selectedResult = useMemo(
    () => allResults.find((item) => item.university.id === selectedUniversityId) ?? null,
    [allResults, selectedUniversityId],
  );
  const compareResults = useMemo(
    () => compareIds.map((id) => allResults.find((item) => item.university.id === id)).filter((item): item is UniversityFitResult => Boolean(item)),
    [allResults, compareIds],
  );
  const suggestedGoals = useMemo(() => buildGoalTracker(allResults), [allResults]);
  const unlockIndicators = useMemo(() => buildOpportunityUnlocks(profile, universityCatalogue).slice(0, 3), [profile]);
  const topOpportunity = unlockIndicators[0];
  const targetSchools = useMemo(
    () =>
      [...allResults]
        .sort((left, right) => {
          const byLabel = compareMatchLabels(left.matchLabel, right.matchLabel);
          if (byLabel !== 0) return byLabel;
          return right.overallFitScore - left.overallFitScore;
        })
        .slice(0, 3),
    [allResults],
  );

  const noStrongMatches = filteredResults.every((item) => item.matchLabel !== 'Strong Match' && item.matchLabel !== 'Good Match');
  const savedGoalIds = savedGoals.map((goal) => goal.id);

  const updateProfile = (updater: (current: StudentProfile) => StudentProfile) => {
    startTransition(() => {
      setProfile((current) => updater(current));
    });
  };

  const handleProfilePreset = (nextProfileId: string) => {
    const nextProfile = studentProfiles.find((item) => item.id === nextProfileId);
    if (!nextProfile) return;

    startTransition(() => {
      setSelectedProfileId(nextProfileId);
      setProfile(structuredClone(nextProfile));
      setSimulation(defaultSimulationState);
      setSavedGoals([]);
      setSelectedUniversityId(null);
      setCompareIds([]);
      setCompareOpen(false);
    });
  };

  const toggleCountryPreference = (country: string) => {
    updateProfile((current) => ({
      ...current,
      countryPreferences: current.countryPreferences.includes(country)
        ? current.countryPreferences.filter((item) => item !== country)
        : [...current.countryPreferences, country],
    }));
  };

  const toggleScholarshipType = (type: ScholarshipType) => {
    updateProfile((current) => ({
      ...current,
      preferredScholarshipTypes: current.preferredScholarshipTypes.includes(type)
        ? current.preferredScholarshipTypes.filter((item) => item !== type)
        : [...current.preferredScholarshipTypes, type],
    }));
  };

  const updateCountField = (
    key: 'extracurricularActivities' | 'awards' | 'leadershipExperience' | 'volunteerImpact' | 'researchProjects',
    count: number,
    label: string,
  ) => {
    updateProfile((current) => ({
      ...current,
      [key]: resizeActivities(current[key], count, label),
    }));
  };

  const saveGoal = (goal: GoalOpportunity) => {
    setSavedGoals((current) => {
      if (current.some((item) => item.id === goal.id || (item.title === goal.title && item.targetMetric === goal.targetMetric))) {
        return current;
      }
      return [...current, goal];
    });
  };

  const toggleCompare = (universityId: string) => {
    setCompareIds((current) => {
      if (current.includes(universityId)) {
        return current.filter((item) => item !== universityId);
      }
      if (current.length >= 4) {
        return [...current.slice(1), universityId];
      }
      return [...current, universityId];
    });
    setCompareOpen(true);
  };

  const applySimulationToProfile = () => {
    if (!simulationActive) return;
    setProfile(activeProfile);
    setSimulation(defaultSimulationState);
  };

  const updateSimulation = (patch: Partial<SimulationState>) => {
    setSimulation((current) => ({ ...current, ...patch }));
  };

  return (
    <div className="relative min-h-screen bg-slate-50 pb-28 dark:bg-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.16),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.12),_transparent_28%)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-50 to-transparent dark:from-slate-950" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <Compass className="h-3.5 w-3.5" />
                Find My Best-Fit Universities
              </div>
              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  Transparent university fit, scholarship clarity, and future goals in one workspace.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  Explore ranked universities, see whether you can apply now, and turn yellow requirement gaps into motivating next steps instead of vague uncertainty.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge className="border-0 bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">Transparent scoring engine</Badge>
                <Badge className="border-0 bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">Scholarship readiness</Badge>
                <Badge className="border-0 bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">What-if simulator</Badge>
                <Badge className="border-0 bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">Goal tracker</Badge>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-emerald-500" />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Best fit</span>
                </div>
                <p className="mt-4 text-3xl font-black text-slate-950 dark:text-white">{allResults[0]?.overallFitScore ?? '--'}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{allResults[0]?.university.name ?? 'Building fit map'}</p>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <Medal className="h-5 w-5 text-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Likely scholarships</span>
                </div>
                <p className="mt-4 text-3xl font-black text-slate-950 dark:text-white">
                  {allResults.reduce((count, result) => count + result.scholarshipEvaluations.filter((entry) => entry.status === 'Likely eligible').length, 0)}
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Across {universityCatalogue.length} universities</p>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <MapPinned className="h-5 w-5 text-sky-500" />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Countries</span>
                </div>
                <p className="mt-4 text-3xl font-black text-slate-950 dark:text-white">{countryOptions.length}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Search by budget, fit, deadline, or scholarship type</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
            <ProfileSummaryPanel
              profile={profile}
              activeProfile={activeProfile}
              simulationActive={simulationActive}
              topOpportunity={topOpportunity}
            />
            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Profile editor</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Edit the current profile or load another student scenario.</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <Select label="Load example profile" value={selectedProfileId} onChange={(event) => handleProfilePreset(event.target.value)}>
                  {studentProfiles.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </Select>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="GPA / 10" type="number" min="0" max="10" step="0.1" value={profile.gpa10} onChange={(event) => updateProfile((current) => ({ ...current, gpa10: Number(event.target.value) }))} />
                  <Input label="Class rank %" type="number" min="1" max="100" value={profile.classRankPercent ?? ''} onChange={(event) => updateProfile((current) => ({ ...current, classRankPercent: event.target.value ? Number(event.target.value) : undefined }))} />
                  <Select label="Academic standing" value={profile.academicStanding} onChange={(event) => updateProfile((current) => ({ ...current, academicStanding: event.target.value as StudentProfile['academicStanding'] }))}>
                    {['Top 5%', 'Top 10%', 'Top 15%', 'Top 25%', 'Above average', 'Strong upward trend'].map((standing) => (
                      <option key={standing} value={standing}>{standing}</option>
                    ))}
                  </Select>
                  <Select label="Intended major" value={profile.intendedMajor} onChange={(event) => updateProfile((current) => ({ ...current, intendedMajor: event.target.value }))}>
                    {majorOptions.map((major) => (
                      <option key={major} value={major}>{major}</option>
                    ))}
                  </Select>
                  <Select label="English test" value={profile.englishProficiency.exam} onChange={(event) => updateProfile((current) => ({ ...current, englishProficiency: { ...current.englishProficiency, exam: event.target.value as StudentProfile['englishProficiency']['exam'] } }))}>
                    {englishExamOptions.map((exam) => (
                      <option key={exam} value={exam}>{exam}</option>
                    ))}
                  </Select>
                  <Input
                    label={profile.englishProficiency.exam === 'IELTS' ? 'IELTS score' : profile.englishProficiency.exam === 'TOEFL' ? 'TOEFL score' : profile.englishProficiency.exam === 'Duolingo' ? 'Duolingo score' : 'English score'}
                    type="number"
                    step={profile.englishProficiency.exam === 'IELTS' ? '0.5' : '1'}
                    value={profile.englishProficiency.score ?? ''}
                    onChange={(event) => updateProfile((current) => ({ ...current, englishProficiency: { ...current.englishProficiency, score: event.target.value ? Number(event.target.value) : undefined } }))}
                  />
                  <Input label="Budget per year (USD)" type="number" min="0" value={profile.budgetPerYearUsd} onChange={(event) => updateProfile((current) => ({ ...current, budgetPerYearUsd: Number(event.target.value) }))} />
                  <Input label="SAT (optional)" type="number" min="400" max="1600" value={profile.standardizedTests.SAT ?? ''} onChange={(event) => updateProfile((current) => ({ ...current, standardizedTests: { ...current.standardizedTests, SAT: event.target.value ? Number(event.target.value) : undefined } }))} />
                  <Select label="Financial need" value={profile.financialNeed} onChange={(event) => updateProfile((current) => ({ ...current, financialNeed: event.target.value as StudentProfile['financialNeed'] }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>
                  <Input label="Preferred intake" value={profile.preferredIntakeTerm} onChange={(event) => updateProfile((current) => ({ ...current, preferredIntakeTerm: event.target.value }))} />
                  <Input label="Citizenship" value={profile.citizenship} onChange={(event) => updateProfile((current) => ({ ...current, citizenship: event.target.value }))} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <Languages className="h-4 w-4 text-slate-500" />
                    Country preferences
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {countryOptions.map((country) => {
                      const active = profile.countryPreferences.includes(country);
                      return (
                        <button
                          key={country}
                          type="button"
                          onClick={() => toggleCountryPreference(country)}
                          className={cn(
                            'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                            active
                              ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                          )}
                        >
                          {country}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    <Award className="h-4 w-4 text-slate-500" />
                    Preferred scholarship types
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {scholarshipTypeOptions.map((type) => {
                      const active = profile.preferredScholarshipTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleScholarshipType(type)}
                          className={cn(
                            'rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                            active
                              ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                          )}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CountField label="Extracurriculars" count={profile.extracurricularActivities.length} onChange={(count) => updateCountField('extracurricularActivities', count, 'Extracurricular activity')} />
                  <CountField label="Awards" count={profile.awards.length} onChange={(count) => updateCountField('awards', count, 'Award')} />
                  <CountField label="Leadership" count={profile.leadershipExperience.length} onChange={(count) => updateCountField('leadershipExperience', count, 'Leadership role')} />
                  <CountField label="Volunteer impact" count={profile.volunteerImpact.length} onChange={(count) => updateCountField('volunteerImpact', count, 'Volunteer impact')} />
                  <CountField label="Research / portfolio" count={profile.researchProjects.length} onChange={(count) => updateCountField('researchProjects', count, 'Research project')} />
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">What if I improve?</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Test small changes and watch the fit ranking recalculate live.</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Increase GPA</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => updateSimulation({ gpaDelta: Math.max(0, Number((simulation.gpaDelta - 0.1).toFixed(1))) })} className="rounded-full border border-slate-200 p-1 text-slate-500 dark:border-slate-700">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-12 text-center text-sm font-semibold text-slate-900 dark:text-slate-100">+{simulation.gpaDelta.toFixed(1)}</span>
                      <button type="button" onClick={() => updateSimulation({ gpaDelta: Math.min(1.0, Number((simulation.gpaDelta + 0.1).toFixed(1))) })} className="rounded-full border border-slate-200 p-1 text-slate-500 dark:border-slate-700">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {profile.englishProficiency.exam === 'Unknown' ? 'Add English score' : `Improve ${profile.englishProficiency.exam}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => updateSimulation({ englishDelta: Math.max(0, profile.englishProficiency.exam === 'IELTS' ? Number((simulation.englishDelta - 0.5).toFixed(1)) : simulation.englishDelta - 1) })} className="rounded-full border border-slate-200 p-1 text-slate-500 dark:border-slate-700">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-12 text-center text-sm font-semibold text-slate-900 dark:text-slate-100">
                        +{profile.englishProficiency.exam === 'IELTS' ? simulation.englishDelta.toFixed(1) : Math.round(simulation.englishDelta)}
                      </span>
                      <button type="button" onClick={() => updateSimulation({ englishDelta: Math.min(profile.englishProficiency.exam === 'IELTS' ? 1.5 : 30, profile.englishProficiency.exam === 'IELTS' ? Number((simulation.englishDelta + 0.5).toFixed(1)) : simulation.englishDelta + (profile.englishProficiency.exam === 'TOEFL' ? 8 : 10)) })} className="rounded-full border border-slate-200 p-1 text-slate-500 dark:border-slate-700">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CountField label="Add awards" count={simulation.extraAwards} onChange={(count) => updateSimulation({ extraAwards: Math.min(3, count) })} />
                  <CountField label="Add leadership" count={simulation.extraLeadership} onChange={(count) => updateSimulation({ extraLeadership: Math.min(3, count) })} />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="button" onClick={applySimulationToProfile} disabled={!simulationActive}>
                    Apply simulated changes
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setSimulation(defaultSimulationState)} disabled={!simulationActive}>
                    Reset simulation
                  </Button>
                </div>

                <div className="space-y-3">
                  {unlockIndicators.map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-500/15 dark:bg-amber-500/5">
                      <div className="flex items-start gap-3">
                        <Medal className="mt-0.5 h-5 w-5 text-amber-500" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {item.improvement} Admission +{item.admissionGain}, scholarship +{item.scholarshipGain}, unlocks {item.unlockedScholarships} stronger scholarship outcomes.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Goal tracker</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Save yellow checklist items as motivating next goals.</p>
                </div>
              </div>
              <GoalTracker goals={savedGoals} onRemove={(goalId) => setSavedGoals((current) => current.filter((item) => item.id !== goalId))} />

              {savedGoals.length === 0 && suggestedGoals.length > 0 && (
                <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Suggested goals</p>
                  <div className="mt-3 space-y-3">
                    {suggestedGoals.slice(0, 3).map((goal) => (
                      <div key={goal.id} className="flex items-start justify-between gap-3 rounded-[20px] border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{goal.title}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{goal.targetMetric}</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => saveGoal(goal)}>
                          Save
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Search and filters</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">Ranked university matches</h2>
                </div>
                <Button type="button" variant="secondary" onClick={() => setFiltersExpanded((current) => !current)} className="xl:hidden">
                  <Filter className="mr-2 h-4 w-4" />
                  {filtersExpanded ? 'Hide filters' : 'Show filters'}
                </Button>
              </div>

              <div className="mt-5 space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                    placeholder="Search by university name or location"
                    className="w-full rounded-[22px] border border-slate-200 bg-slate-50 px-11 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div className={cn('grid gap-4 xl:grid-cols-4', !filtersExpanded && 'hidden xl:grid')}>
                  <Select label="Country" value={filters.country} onChange={(event) => setFilters((current) => ({ ...current, country: event.target.value }))}>
                    <option value="all">All countries</option>
                    {countryOptions.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </Select>
                  <Select label="Major" value={filters.major} onChange={(event) => setFilters((current) => ({ ...current, major: event.target.value }))}>
                    <option value="all">All majors</option>
                    {majorOptions.map((major) => (
                      <option key={major} value={major}>{major}</option>
                    ))}
                  </Select>
                  <Input label="Budget cap (USD)" type="number" value={filters.budget ?? ''} onChange={(event) => setFilters((current) => ({ ...current, budget: event.target.value ? Number(event.target.value) : null }))} />
                  <Select label="Scholarship type" value={filters.scholarshipType} onChange={(event) => setFilters((current) => ({ ...current, scholarshipType: event.target.value as UniversityFilterState['scholarshipType'] }))}>
                    <option value="all">All types</option>
                    {scholarshipTypeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Select>
                  <Select label="Current eligibility" value={filters.eligibility} onChange={(event) => setFilters((current) => ({ ...current, eligibility: event.target.value as UniversityFilterState['eligibility'] }))}>
                    <option value="all">All statuses</option>
                    {['Can apply now', 'Can apply but low competitiveness', 'Can target after improving profile', 'Not eligible yet'].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </Select>
                  <Select label="Fit level" value={filters.fitLevel} onChange={(event) => setFilters((current) => ({ ...current, fitLevel: event.target.value as UniversityFilterState['fitLevel'] }))}>
                    <option value="all">All fit levels</option>
                    {['Strong Match', 'Good Match', 'Reach', 'Ambitious', 'Not Yet Ready'].map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </Select>
                  <Select label="English requirement" value={filters.englishRequirement} onChange={(event) => setFilters((current) => ({ ...current, englishRequirement: event.target.value as UniversityFilterState['englishRequirement'] }))}>
                    <option value="all">Any test</option>
                    <option value="IELTS">IELTS</option>
                    <option value="TOEFL">TOEFL</option>
                    <option value="Duolingo">Duolingo</option>
                  </Select>
                  <Select label="Sort by" value={filters.sortBy} onChange={(event) => setFilters((current) => ({ ...current, sortBy: event.target.value as UniversityFilterState['sortBy'] }))}>
                    <option value="best-fit">Best fit</option>
                    <option value="lowest-cost">Lowest cost</option>
                    <option value="highest-scholarship">Highest scholarship potential</option>
                    <option value="easiest-entry">Easiest entry</option>
                    <option value="deadline-urgency">Deadline urgency</option>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Result state</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{filteredResults.length} universities ranked</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Sorted by {badgeSortCopy[filters.sortBy]}. Every card includes transparent scoring and a concrete next move.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{activeProfile.intendedMajor}</Badge>
                  <Badge className="border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{formatCurrency(activeProfile.budgetPerYearUsd)}/year</Badge>
                  <Badge className="border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{activeProfile.countryPreferences.length} preferred countries</Badge>
                </div>
              </div>

              {noStrongMatches && !isLoading && filteredResults.length > 0 && (
                <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-500/15 dark:bg-amber-500/5">
                  <div className="flex items-start gap-3">
                    <CircleAlert className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-300" />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">No strong matches yet, but you still have realistic targets.</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        These results lean more toward future-target schools. Focus on the yellow goal cards and simulator suggestions to see what unlocks the biggest jump.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {isLoading ? (
              <LoadingState />
            ) : filteredResults.length === 0 ? (
              <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/40">
                <EmptyState
                  icon={<CircleSlash className="mx-auto h-10 w-10" />}
                  title="No universities match these filters yet"
                  description="Try widening your filters, or review the target-school suggestions below."
                />
                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                  {targetSchools.map((result) => (
                    <div key={result.university.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{result.university.name}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{result.matchLabel} • {result.bestNextMove}</p>
                      <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setSelectedUniversityId(result.university.id)}>
                        View target school
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {filteredResults.map((result) => (
                  <UniversityCard
                    key={result.university.id}
                    result={result}
                    onOpen={() => setSelectedUniversityId(result.university.id)}
                    onToggleCompare={() => toggleCompare(result.university.id)}
                    isCompared={compareIds.includes(result.university.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <UniversityDetailPanel
        result={selectedResult}
        onClose={() => setSelectedUniversityId(null)}
        onToggleCompare={toggleCompare}
        isCompared={selectedResult ? compareIds.includes(selectedResult.university.id) : false}
        onSaveGoal={saveGoal}
        savedGoalIds={savedGoalIds}
      />

      <CompareDrawer
        results={compareResults}
        isOpen={compareOpen}
        onToggleOpen={() => setCompareOpen((current) => !current)}
        onRemove={(universityId) => setCompareIds((current) => current.filter((item) => item !== universityId))}
        onView={(universityId) => setSelectedUniversityId(universityId)}
      />
    </div>
  );
}

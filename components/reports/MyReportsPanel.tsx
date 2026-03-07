import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, FileText, Loader2, MessageSquare, Plus, RefreshCcw, Search, Send, Trash2 } from 'lucide-react';

import { Button, Card, Input, Select } from '../ui/Common';
import { useUserRegistrations } from '../../lib/hooks';
import { useDebounce } from '../../hooks/useDebounce';
import reportService, { ReportFeedbackItem } from '../../services/reportService';
import { Report, ReportActivity, ReportEvidence } from '../../types';
import CreateReportModal, { CreateTemplateKey } from './CreateReportModal';
import FeedbackModal from './FeedbackModal';
import { useI18n } from '../../contexts/I18nContext';
import {
  formatDate,
  formatDateTime,
  normalizeActivitiesForSave,
  normalizeEvidenceForSave,
  readDismissedEvidenceReminders,
  reviewStatusBadgeClass,
  reviewStatusLabel,
  safeUuid,
  toDatetimeLocalInput,
  validateActivities,
  validateEvidence,
  writeDismissedEvidenceReminders,
  isHttpUrl,
  normalizeUrl,
} from './reportUtils';

export interface MyReportsPanelProps {
  isLocked: boolean;
}

const MyReportsPanel: React.FC<MyReportsPanelProps> = ({ isLocked }) => {
  const { t } = useI18n();
  const { registrations } = useUserRegistrations({ limit: 50, autoFetch: true });

  const contests = useMemo(() => {
    const map = new Map<string, string>();
    (registrations || []).forEach((r) => {
      if (r.contest?.id && r.contest?.title) map.set(r.contest.id, r.contest.title);
    });
    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [registrations]);

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState('');
  const [status, setStatus] = useState<Report['status']>('Draft');
  const [content, setContent] = useState('');
  const [relatedType, setRelatedType] = useState<Report['relatedType']>(null);
  const [relatedId, setRelatedId] = useState<Report['relatedId']>(null);
  const [reviewStatus, setReviewStatus] = useState<Report['reviewStatus']>('draft');
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [activities, setActivities] = useState<ReportActivity[]>([]);
  const [evidence, setEvidence] = useState<ReportEvidence[]>([]);

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTemplate, setCreateTemplate] = useState<CreateTemplateKey>('personal');
  const [createTitle, setCreateTitle] = useState('');
  const [createContestId, setCreateContestId] = useState('');

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackItems, setFeedbackItems] = useState<ReportFeedbackItem[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);

  const evidenceAnchorRef = useRef<HTMLDivElement | null>(null);

  const validationError = useMemo(() => {
    return validateActivities(activities) || validateEvidence(evidence);
  }, [activities, evidence]);

  const eligibleEvidenceReminders = useMemo(() => {
    const dismissed = readDismissedEvidenceReminders();
    const now = Date.now();
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
    return contests
      .filter((c) => {
        if (dismissed[c.id]) return false;
        const start = registrations.find((r) => r.contest?.id === c.id)?.contest?.dateStart;
        const startMs = start ? new Date(start).getTime() : NaN;
        if (Number.isNaN(startMs)) return false;
        return now - startMs >= twoWeeksMs;
      })
      .map((contest) => {
        const linkedReport = reports.find((r) => r.relatedType === 'contest' && r.relatedId === contest.id) || null;
        return { contest, linkedReport };
      })
      .slice(0, 5);
  }, [contests, registrations, reports]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await reportService.getAll({ limit: 50 });
      setReports(data.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
      toast.error(err instanceof Error ? err.message : t('reports.toast.loadFailed'));
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: string) => {
    setSelectedLoading(true);
    try {
      const full = await reportService.getById(id);
      setSelectedId(id);
      setTitle(full.title || '');
      setTemplate(full.template || '');
      setStatus(full.status || 'Draft');
      setContent(full.content || '');
      setRelatedType(full.relatedType ?? null);
      setRelatedId(full.relatedId ?? null);
      setReviewStatus(full.reviewStatus || 'draft');
      setSubmittedAt(full.submittedAt || null);
      setReviewedAt(full.reviewedAt || null);
      setActivities(full.activities || []);
      setEvidence(full.evidence || []);
      setIsDirty(false);
      setLastSavedAt(full.updatedAt || null);
    } catch (err) {
      console.error('Failed to load report:', err);
      toast.error(err instanceof Error ? err.message : t('reports.toast.loadDetailFailed'));
    } finally {
      setSelectedLoading(false);
    }
  };

  const syncSummary = (updated: Report) => {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
  };

  const save = async () => {
    if (!selectedId) return;
    if (isLocked) {
      toast.error(t('reports.toast.upgradeRequired'));
      return;
    }
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const normalizedActivities = normalizeActivitiesForSave(activities);
    const normalizedEvidence = normalizeEvidenceForSave(evidence);

    setIsSaving(true);
    try {
      const updated = await reportService.update(selectedId, {
        title: title.trim(),
        content,
        status,
        relatedType,
        relatedId,
        activities: normalizedActivities,
        evidence: normalizedEvidence,
      });

      setReviewStatus(updated.reviewStatus || 'draft');
      setSubmittedAt(updated.submittedAt || null);
      setReviewedAt(updated.reviewedAt || null);
      setActivities(updated.activities || normalizedActivities);
      setEvidence(updated.evidence || normalizedEvidence);
      setIsDirty(false);
      setLastSavedAt(updated.updatedAt || new Date().toISOString());
      syncSummary(updated);
    } catch (err) {
      console.error('Failed to save report:', err);
      toast.error(err instanceof Error ? err.message : t('reports.toast.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced auto-save (2 seconds delay)
  const debouncedSave = useDebounce(save, 2000);

  // Auto-save when content changes
  useEffect(() => {
    if (isDirty && selectedId && !validationError) {
      debouncedSave();
    }
  }, [isDirty, selectedId, validationError, title, content, status, relatedType, relatedId, activities, evidence]);

  const submitForReview = async () => {
    if (!selectedId) return;
    if (isLocked) {
      toast.error(t('reports.toast.upgradeRequired'));
      return;
    }
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const updated = await reportService.submitForReview(selectedId);
      setReviewStatus(updated.reviewStatus || 'submitted');
      setSubmittedAt(updated.submittedAt || null);
      setReviewedAt(updated.reviewedAt || null);
      syncSummary(updated);
      toast.success(t('reports.toast.submitSuccess'));
    } catch (err) {
      console.error('Failed to submit for review:', err);
      toast.error(err instanceof Error ? err.message : t('reports.toast.submitFailed'));
    }
  };

  const deleteReport = async (id: string) => {
    const ok = window.confirm(t('reports.delete.confirm'));
    if (!ok) return;
    try {
      await reportService.delete(id);
      toast.success(t('reports.toast.deleteSuccess'));
      if (selectedId === id) {
        setSelectedId(null);
        setTitle('');
        setTemplate('');
        setStatus('Draft');
        setContent('');
        setRelatedType(null);
        setRelatedId(null);
        setReviewStatus('draft');
        setSubmittedAt(null);
        setReviewedAt(null);
        setActivities([]);
        setEvidence([]);
        setIsDirty(false);
      }
      await fetchReports();
    } catch (err) {
      console.error('Failed to delete report:', err);
      toast.error(err instanceof Error ? err.message : t('reports.toast.deleteFailed'));
    }
  };

  const loadFeedback = async () => {
    if (!selectedId) return;
    setFeedbackLoading(true);
    try {
      const res = await reportService.getFeedback(selectedId);
      setFeedbackItems(res.feedback || []);
    } catch (err) {
      console.error('Failed to load feedback:', err);
      toast.error(err instanceof Error ? err.message : t('reports.toast.feedbackLoadFailed'));
      setFeedbackItems([]);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const sendFeedback = async () => {
    if (!selectedId) return;
    const text = feedbackMessage.trim();
    if (!text) return;

    setFeedbackSending(true);
    try {
      await reportService.addFeedback(selectedId, text);
      setFeedbackMessage('');
      await loadFeedback();
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error(err instanceof Error ? err.message : t('reports.toast.feedbackSendFailed'));
    } finally {
      setFeedbackSending(false);
    }
  };

  const openCreateWithContest = (contestId: string) => {
    setCreateTemplate('contest');
    setCreateContestId(contestId);
    const contest = contests.find((c) => c.id === contestId);
    setCreateTitle(contest ? t('reports.create.contestSummaryPrefix', { title: contest.title }) : '');
    setCreateOpen(true);
  };

  const create = async () => {
    if (isLocked) {
      toast.error(t('reports.toast.upgradeRequired'));
      return;
    }
    const trimmedTitle = createTitle.trim();
    if (!trimmedTitle) {
      toast.error(t('reports.toast.titleRequired'));
      return;
    }

    const relatedTypeValue = createTemplate === 'contest' && createContestId ? 'contest' : null;
    const relatedIdValue = relatedTypeValue ? createContestId : null;

    try {
      const created = await reportService.create({
        title: trimmedTitle,
        template: createTemplate,
        status: 'Draft',
        content: '',
        relatedType: relatedTypeValue,
        relatedId: relatedIdValue,
      });
      toast.success(t('reports.toast.createSuccess'));
      setCreateOpen(false);
      setCreateTitle('');
      setCreateContestId('');
      await fetchReports();
      await loadDetail(created.id);
    } catch (err) {
      console.error('Failed to create report:', err);
      toast.error(err instanceof Error ? err.message : t('reports.toast.createFailed'));
    }
  };

  useEffect(() => {
    void fetchReports();
  }, []);

  // Autosave
  useEffect(() => {
    if (!selectedId) return;
    if (!isDirty) return;
    if (isSaving) return;
    if (isLocked) return;
    if (validationError) return;

    const autosaveTimer = window.setTimeout(() => {
      void save();
    }, 900);
    return () => window.clearTimeout(autosaveTimer);
  }, [selectedId, isDirty, isSaving, isLocked, validationError, title, content, status, relatedType, relatedId, activities, evidence]);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => `${r.title} ${r.template}`.toLowerCase().includes(q));
  }, [reports, search]);

  return (
    <>
      {/* Reminders */}
      {eligibleEvidenceReminders.length > 0 && (
        <Card className="p-4 border-sky-100 bg-sky-50">
          <p className="font-semibold text-slate-900">{t('reports.reminder.title')}</p>
          <p className="text-sm text-slate-600 mt-1">{t('reports.reminder.subtitle')}</p>
          <div className="mt-4 space-y-2">
            {eligibleEvidenceReminders.map(({ contest, linkedReport }) => (
              <div
                key={contest.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-100 rounded-xl p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{contest.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('reports.reminder.dateLabel', { date: formatDate(registrations.find((r) => r.contest?.id === contest.id)?.contest?.dateStart || null) })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {linkedReport ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void loadDetail(linkedReport.id);
                        setTimeout(() => evidenceAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
                      }}
                    >
                      {t('reports.reminder.openReport')}
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => openCreateWithContest(contest.id)} disabled={isLocked}>
                      {t('reports.reminder.createReport')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const dismissed = readDismissedEvidenceReminders();
                      dismissed[contest.id] = new Date().toISOString();
                      writeDismissedEvidenceReminders(dismissed);
                      toast.success(t('reports.reminder.dismissed'));
                    }}
                  >
                    {t('reports.reminder.dismiss')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">{t('reports.list.title')}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => void fetchReports()} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                {t('reports.list.refresh')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setCreateTemplate('personal');
                  setCreateTitle('');
                  setCreateContestId('');
                  setCreateOpen(true);
                }}
                disabled={isLocked}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('reports.list.create')}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('reports.list.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {loading ? (
              <div className="py-10 flex items-center justify-center text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                {t('reports.list.loading')}
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">{t('reports.list.empty')}</div>
            ) : (
              filteredReports.map((r) => (
                <button
                  key={r.id}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${selectedId === r.id ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  onClick={() => void loadDetail(r.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{r.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {t('reports.list.itemMeta', { template: r.template, lastEdited: r.lastEdited })}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${reviewStatusBadgeClass(r.reviewStatus)}`}>
                      {reviewStatusLabel(r.reviewStatus)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="lg:col-span-8 p-4">
          {!selectedId ? (
            <div className="py-16 text-center text-slate-500">
              <FileText className="w-10 h-10 mx-auto opacity-20" />
              <p className="mt-3 font-medium">{t('reports.detail.empty')}</p>
            </div>
          ) : selectedLoading ? (
            <div className="py-16 flex items-center justify-center text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {t('reports.detail.loading')}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{t('reports.detail.reviewStatus')}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full border ${reviewStatusBadgeClass(reviewStatus)}`}>
                      {reviewStatusLabel(reviewStatus)}
                    </span>
                    {submittedAt && <span className="text-xs text-slate-500">{t('reports.detail.submittedAt', { date: formatDateTime(submittedAt) })}</span>}
                    {reviewedAt && <span className="text-xs text-slate-500">{t('reports.detail.reviewedAt', { date: formatDateTime(reviewedAt) })}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void save()}
                    disabled={isLocked || isSaving || !isDirty || Boolean(validationError)}
                    className="gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {t('common.save')}
                  </Button>
                  <Button size="sm" onClick={() => void submitForReview()} disabled={isLocked || reviewStatus === 'submitted' || Boolean(validationError)} className="gap-2">
                    <Send className="w-4 h-4" />
                    {t('reports.detail.submit')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      setFeedbackOpen(true);
                      await loadFeedback();
                    }}
                    className="gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {t('reports.detail.feedback')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void deleteReport(selectedId)} className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {validationError && (
                <Card className="p-3 border-rose-100 bg-rose-50">
                  <p className="text-sm text-rose-800">{validationError}</p>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label={t('reports.detail.title')} value={title} onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }} disabled={isLocked} />
                <Select label={t('reports.detail.status')} value={status} onChange={(e) => { setStatus(e.target.value as Report['status']); setIsDirty(true); }} disabled={isLocked}>
                  <option value="Draft">Draft</option>
                  <option value="Ready">Ready</option>
                  <option value="Sent">Sent</option>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label={t('reports.detail.template')} value={template} disabled />
                <Select
                  label={t('reports.detail.related')}
                  value={relatedType || ''}
                  onChange={(e) => {
                    const v = e.target.value || '';
                    const nextType = v === 'contest' || v === 'course' ? (v as 'contest' | 'course') : null;
                    setRelatedType(nextType);
                    if (!nextType) setRelatedId(null);
                    setIsDirty(true);
                  }}
                  disabled={isLocked}
                >
                  <option value="">{t('reports.detail.relatedNone')}</option>
                  <option value="contest">{t('reports.detail.relatedContest')}</option>
                  <option value="course">{t('reports.detail.relatedCourse')}</option>
                </Select>
              </div>

              {relatedType === 'contest' && (
                <Select label={t('reports.detail.selectContest')} value={relatedId || ''} onChange={(e) => { setRelatedId(e.target.value || null); setIsDirty(true); }} disabled={isLocked}>
                  <option value="">{t('reports.detail.selectPlaceholder')}</option>
                  {contests.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('reports.detail.notes')}</label>
                <textarea
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
                  disabled={isLocked}
                  rows={6}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder={t('reports.detail.notesPlaceholder')}
                />
              </div>

              <Card className="p-4 bg-white border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{t('reports.activities.title')}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t('reports.activities.subtitle')}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isLocked}
                    onClick={() => {
                      const next: ReportActivity[] = [
                        ...activities,
                        { id: safeUuid(), title: t('reports.activities.newItem'), description: null, occurredAt: new Date().toISOString() },
                      ];
                      setActivities(next);
                      setIsDirty(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('common.add')}
                  </Button>
                </div>

                <div className="mt-3 space-y-3">
                  {activities.length === 0 ? (
                    <div className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl">{t('reports.activities.empty')}</div>
                  ) : (
                    activities.map((a, idx) => (
                      <div key={a.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Input label={t('reports.activities.itemTitle', { index: idx + 1 })} value={a.title || ''} onChange={(e) => { setActivities(activities.map((x) => x.id === a.id ? { ...x, title: e.target.value } : x)); setIsDirty(true); }} disabled={isLocked} />
                          <Input label={t('reports.activities.itemTime')} type="datetime-local" value={toDatetimeLocalInput(a.occurredAt || null)} onChange={(e) => { const dt = e.target.value ? new Date(e.target.value).toISOString() : null; setActivities(activities.map((x) => x.id === a.id ? { ...x, occurredAt: dt } : x)); setIsDirty(true); }} disabled={isLocked} />
                        </div>
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('reports.activities.itemDescription')}</label>
                          <textarea
                            value={a.description || ''}
                            onChange={(e) => { setActivities(activities.map((x) => x.id === a.id ? { ...x, description: e.target.value || null } : x)); setIsDirty(true); }}
                            disabled={isLocked}
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                            placeholder={t('reports.activities.itemDescriptionPlaceholder')}
                          />
                        </div>
                        <div className="mt-3 flex items-center justify-end">
                          <Button variant="ghost" size="sm" disabled={isLocked} onClick={() => { setActivities(activities.filter((x) => x.id !== a.id)); setIsDirty(true); }} className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <div ref={evidenceAnchorRef}>
                <Card className="p-4 bg-white border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{t('reports.evidence.title')}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t('reports.evidence.subtitle')}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isLocked}
                      onClick={() => {
                        const next: ReportEvidence[] = [
                          ...evidence,
                          { id: safeUuid(), fileId: '', fileName: '', mimeType: 'link', url: '', uploadedAt: new Date().toISOString() },
                        ];
                        setEvidence(next);
                        setIsDirty(true);
                      }}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {t('common.add')}
                    </Button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {evidence.length === 0 ? (
                      <div className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-xl">{t('reports.evidence.empty')}</div>
                    ) : (
                      evidence.map((ev, idx) => {
                        const rawUrl = String(ev.url || '').trim();
                        const href = rawUrl && isHttpUrl(rawUrl) ? normalizeUrl(rawUrl) : '';
                        return (
                          <div key={ev.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input label={t('reports.evidence.itemName', { index: idx + 1 })} value={ev.fileName || ''} onChange={(e) => { setEvidence(evidence.map((x) => x.id === ev.id ? { ...x, fileName: e.target.value } : x)); setIsDirty(true); }} disabled={isLocked} />
                              <Input label={t('reports.evidence.itemLink')} value={ev.url || ''} onChange={(e) => { setEvidence(evidence.map((x) => x.id === ev.id ? { ...x, url: e.target.value, mimeType: 'link', fileId: '' } : x)); setIsDirty(true); }} disabled={isLocked} />
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <a href={href || '#'} target="_blank" rel="noreferrer" className={`text-sm font-medium ${href ? 'text-primary-700 hover:text-primary-900' : 'text-slate-400 pointer-events-none'}`}>
                                {href ? t('reports.evidence.openLink') : rawUrl ? t('reports.evidence.invalidLink') : t('reports.evidence.noLink')}
                              </a>
                              <Button variant="ghost" size="sm" disabled={isLocked} onClick={() => { setEvidence(evidence.filter((x) => x.id !== ev.id)); setIsDirty(true); }} className="text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </Card>
      </div>

      <CreateReportModal
        isOpen={createOpen}
        isLocked={isLocked}
        template={createTemplate}
        title={createTitle}
        contestId={createContestId}
        contests={contests}
        onChangeTemplate={(value) => {
          setCreateTemplate(value);
          if (value !== 'contest') setCreateContestId('');
        }}
        onChangeTitle={setCreateTitle}
        onChangeContestId={(value) => {
          setCreateContestId(value);
          if (!createTitle.trim()) {
            const contest = contests.find((c) => c.id === value);
            if (contest) setCreateTitle(t('reports.create.contestSummaryPrefix', { title: contest.title }));
          }
        }}
        onClose={() => setCreateOpen(false)}
        onCreate={() => void create()}
      />

      <FeedbackModal
        isOpen={feedbackOpen}
        title="Feedback"
        subtitle={title}
        isLoading={feedbackLoading}
        items={feedbackItems}
        message={feedbackMessage}
        isSending={feedbackSending}
        onChangeMessage={setFeedbackMessage}
        onSend={() => void sendFeedback()}
        onClose={() => setFeedbackOpen(false)}
      />
    </>
  );
};

export default MyReportsPanel;

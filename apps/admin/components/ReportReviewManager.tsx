import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Briefcase, CheckCircle2, Eye, FileText, Loader2, MessageSquare, RefreshCw, Search, X } from 'lucide-react';
import { Dropdown } from './ui/Dropdown';
import { useDebounce } from '../hooks/useApi';
import reportReviewService, { ReviewDetailResponse, ReviewFeedbackItem, ReviewReportSummary, ReviewStatus } from '../services/reportReviewService';

const STATUS_OPTIONS: Array<{ value: ReviewStatus | 'all'; label: string; color: string }> = [
  { value: 'submitted', label: 'Submitted', color: 'bg-indigo-500' },
  { value: 'needs_changes', label: 'Needs changes', color: 'bg-amber-500' },
  { value: 'approved', label: 'Approved', color: 'bg-emerald-600' },
  { value: 'draft', label: 'Draft', color: 'bg-slate-500' },
  { value: 'all', label: 'All', color: 'bg-gray-400' },
];

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('vi-VN');
}

function badgeForStatus(status: ReviewStatus) {
  switch (status) {
    case 'submitted':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'needs_changes':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'draft':
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

const ReportDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  data: ReviewDetailResponse | null;
  isLoading: boolean;
  onAddFeedback: (message: string) => Promise<void>;
  onUpdateStatus: (status: Exclude<ReviewStatus, 'draft'>) => Promise<void>;
  isSaving: boolean;
}> = ({ isOpen, onClose, data, isLoading, onAddFeedback, onUpdateStatus, isSaving }) => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) setMessage('');
  }, [isOpen]);

  if (!isOpen) return null;

  const report = data?.report;
  const feedback = data?.feedback || [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="animate-fade-in-up relative max-h-[92vh] w-[96vw] max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="truncate font-semibold text-gray-900">{report ? report.title : 'Report detail'}</h3>
              {report?.reviewStatus && (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeForStatus(report.reviewStatus)}`}>
                  {report.reviewStatus}
                </span>
              )}
            </div>
            {report?.user?.email && (
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {report.user.name || 'Unknown'} • {report.user.email}
              </p>
            )}
          </div>

          <button onClick={onClose} className="rounded-lg border border-transparent p-2 text-gray-500 hover:border-gray-200 hover:bg-white" title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-3">
          <div className="border-r border-gray-100 p-5 lg:col-span-2">
            {isLoading ? (
              <div className="flex h-[70vh] items-center justify-center text-gray-500">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Loading report...
              </div>
            ) : report ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                  <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
                    Template: <span className="font-medium text-gray-800">{report.template}</span>
                  </span>
                  <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
                    Submitted: <span className="font-medium text-gray-800">{formatDateTime(report.submittedAt)}</span>
                  </span>
                  <span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
                    Updated: <span className="font-medium text-gray-800">{formatDateTime(report.updatedAt)}</span>
                  </span>
                </div>

                {report.activities && report.activities.length > 0 ? (
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Briefcase size={16} className="text-indigo-600" />
                        Activities
                      </div>
                      <span className="text-xs text-gray-500">{report.activities.length}</span>
                    </div>
                    <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                      {report.activities.map((a) => (
                        <div key={a.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="truncate text-sm font-medium text-gray-900">{a.title}</p>
                            <p className="text-xs whitespace-nowrap text-gray-500">{formatDateTime(a.occurredAt)}</p>
                          </div>
                          {a.description ? <p className="mt-2 text-sm whitespace-pre-wrap text-gray-700">{a.description}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {report.evidence && report.evidence.length > 0 ? (
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <FileText size={16} className="text-emerald-600" />
                        Evidence
                      </div>
                      <span className="text-xs text-gray-500">{report.evidence.length}</span>
                    </div>
                    <div className="grid max-h-56 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                      {report.evidence.map((ev) => {
                        const href = ev.url;
                        const isImage = Boolean(ev.mimeType?.startsWith('image/'));
                        const label = ev.mimeType === 'application/pdf' ? 'PDF' : isImage ? 'Image' : 'File';
                        const card = (
                          <>
                            {isImage && href ? (
                              <img src={href} alt={ev.fileName} className="h-16 w-16 rounded-xl border border-gray-200 bg-white object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-gray-500">
                                <FileText size={18} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900">{ev.fileName}</p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {label} - {formatDateTime(ev.uploadedAt)}
                              </p>
                            </div>
                          </>
                        );

                        if (!href) {
                          return (
                            <div key={ev.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                              {card}
                            </div>
                          );
                        }

                        return (
                          <a
                            key={ev.id}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
                          >
                            {card}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <iframe title="report-preview" sandbox="" srcDoc={report.content || ''} className="h-[65vh] w-full bg-white" />
                </div>
              </div>
            ) : (
              <div className="flex h-[70vh] items-center justify-center text-gray-500">No report loaded.</div>
            )}
          </div>

          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <MessageSquare size={18} className="text-emerald-600" />
                Feedback
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateStatus('needs_changes')}
                  disabled={isSaving || isLoading || !report}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                >
                  Needs changes
                </button>
                <button
                  onClick={() => onUpdateStatus('approved')}
                  disabled={isSaving || isLoading || !report}
                  className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  Approve
                </button>
              </div>
            </div>

            <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-gray-200 bg-white">
              {feedback.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No feedback yet.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {feedback.map((f: ReviewFeedbackItem) => (
                    <div key={f.id} className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{f.authorName || f.authorRole || 'User'}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(f.createdAt)}</p>
                        </div>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600">{f.authorRole}</span>
                      </div>
                      <p className="mt-2 text-sm whitespace-pre-wrap text-gray-700">{f.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const trimmed = message.trim();
                if (!trimmed) return;
                await onAddFeedback(trimmed);
                setMessage('');
              }}
              className="space-y-2"
            >
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Write feedback..."
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                disabled={isSaving || isLoading || !report}
              />
              <button
                type="submit"
                disabled={isSaving || isLoading || !report || !message.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                Send feedback
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ReportReviewManager: React.FC = () => {
  const [items, setItems] = useState<ReviewReportSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [status, setStatus] = useState<ReviewStatus | 'all'>('submitted');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<ReviewDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);

  const queryParams = useMemo(
    () => ({
      status,
      search: debouncedSearch || undefined,
      limit,
      skip,
    }),
    [status, debouncedSearch, limit, skip]
  );

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await reportReviewService.list(queryParams);
      setItems((prev) => (queryParams.skip && queryParams.skip > 0 ? [...prev, ...(res.items || [])] : res.items || []));
      setTotal(res.total || 0);
      setHasMore(!!res.hasMore);
      setLimit(res.limit || limit);
      setSkip(res.skip || skip);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load reports';
      setError(message);
      if (!queryParams.skip || queryParams.skip === 0) {
        setItems([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [queryParams, limit, skip]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailId(id);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await reportReviewService.getById(id);
      setDetailData(res);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load report detail';
      setError(message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailId(null);
    setDetailData(null);
    setDetailLoading(false);
    setDetailSaving(false);
  };

  const handleAddFeedback = async (message: string) => {
    if (!detailId) return;
    setDetailSaving(true);
    try {
      await reportReviewService.addFeedback(detailId, message);
      const res = await reportReviewService.getById(detailId);
      setDetailData(res);
    } finally {
      setDetailSaving(false);
    }
  };

  const handleUpdateStatus = async (nextStatus: Exclude<ReviewStatus, 'draft'>) => {
    if (!detailId) return;
    setDetailSaving(true);
    try {
      await reportReviewService.updateStatus(detailId, nextStatus);
      const res = await reportReviewService.getById(detailId);
      setDetailData(res);
      await fetchList();
    } finally {
      setDetailSaving(false);
    }
  };

  const handleLoadMore = () => {
    if (!hasMore) return;
    setSkip((prev) => prev + limit);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports Review</h1>
          <p className="text-sm text-gray-500">Review submitted reports and leave feedback.</p>
        </div>
        <button
          onClick={fetchList}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" size={18} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSkip(0);
            }}
            placeholder="Search by title/content or user..."
            className="w-full rounded-xl border border-gray-200 py-2.5 pr-3 pl-10 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="w-full md:w-56">
          <Dropdown
            label="Status"
            options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label, color: o.color }))}
            value={status}
            onChange={(val) => {
              setStatus(val as ReviewStatus | 'all');
              setSkip(0);
            }}
            placeholder="Select status"
            size="sm"
          />
        </div>
        <div className="w-full md:w-40">
          <Dropdown
            label="Page size"
            options={[10, 20, 50, 100].map((n) => ({ value: String(n), label: String(n) }))}
            value={String(limit)}
            onChange={(val) => {
              setLimit(Math.min(100, Math.max(1, parseInt(val, 10) || 20)));
              setSkip(0);
            }}
            size="sm"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <AlertCircle className="text-yellow-600" size={18} />
          <p className="text-sm text-yellow-800">{error}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-900 uppercase">
              <tr>
                <th className="px-6 py-4">Report</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Review</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No reports found.
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{r.title}</p>
                        <p className="truncate text-xs text-gray-500">{r.template}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{r.user?.name || 'Unknown'}</p>
                        <p className="truncate text-xs text-gray-500">{r.user?.email || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeForStatus(r.reviewStatus)}`}>
                        {r.reviewStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{formatDateTime(r.submittedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openDetail(r.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        title="View"
                      >
                        <Eye size={16} className="text-gray-500" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Total: <span className="font-medium text-gray-800">{total}</span>
          </p>
          <button
            onClick={handleLoadMore}
            disabled={!hasMore || isLoading}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Load more
          </button>
        </div>
      </div>

      <ReportDetailModal
        isOpen={detailOpen}
        onClose={closeDetail}
        data={detailData}
        isLoading={detailLoading}
        isSaving={detailSaving}
        onAddFeedback={handleAddFeedback}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};

export default ReportReviewManager;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, RefreshCw, Edit2, Trash2, Eye, X, Loader2, Tag, Calendar, CheckCircle2, FileText, Pin } from 'lucide-react';
import { NewsArticle, NewsAudience, NewsType } from '../types';
import { newsService } from '../services/newsService';
import { useDebounce } from '../hooks/useApi';
import { Dropdown } from './ui/Dropdown';
import { ConfirmActionModal } from './ui/UserModals';

const NEWS_TYPE_OPTIONS: Array<{ value: NewsType; label: string; color: string }> = [
  { value: 'announcement', label: 'Announcement', color: 'bg-indigo-500' },
  { value: 'minigame', label: 'Mini game', color: 'bg-amber-500' },
  { value: 'update', label: 'Update', color: 'bg-emerald-500' },
  { value: 'event', label: 'Event', color: 'bg-sky-500' },
  { value: 'tip', label: 'Study tip', color: 'bg-teal-500' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All', color: 'bg-gray-400' },
  { value: 'draft', label: 'Draft', color: 'bg-slate-500' },
  { value: 'published', label: 'Published', color: 'bg-emerald-600' },
];

const RELEASE_AUDIENCE_OPTIONS: Array<{ value: NewsAudience; label: string; color: string }> = [
  { value: 'all', label: 'All users', color: 'bg-gray-400' },
  { value: 'students', label: 'Students', color: 'bg-sky-500' },
  { value: 'mentors', label: 'Mentors', color: 'bg-violet-500' },
  { value: 'admins', label: 'Admins', color: 'bg-slate-600' },
];

const NEWS_TYPE_LABELS = NEWS_TYPE_OPTIONS.reduce<Record<NewsType, string>>(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {
    announcement: 'Announcement',
    minigame: 'Mini game',
    update: 'Update',
    event: 'Event',
    tip: 'Study tip',
  }
);

const getTypeLabel = (value?: NewsType) => NEWS_TYPE_LABELS[value || 'announcement'] || 'Announcement';

const toDatetimeLocal = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const safeArray = <T,>(value: unknown, fallback: T[] = []): T[] => (Array.isArray(value) ? (value as T[]) : fallback);

const joinReleaseChanges = (value: unknown) => safeArray<string>(value).join('\n');

const NewsManager: React.FC = () => {
  const [items, setItems] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | NewsType>('all');

  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<NewsArticle | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<NewsArticle | null>(null);
  const [isDeleteConfirmLoading, setIsDeleteConfirmLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    summary: '',
    body: '',
    tags: '',
    coverImage: '',
    type: 'announcement' as NewsType,
    highlight: false,
    actionLabel: '',
    actionLink: '',
    status: 'draft' as 'draft' | 'published',
    publishAt: '',
    releaseVersion: '',
    releaseHeadline: '',
    releaseChanges: '',
    releaseAudience: 'all' as NewsAudience,
    notifySubscribers: false,
  });

  const filteredItems = useMemo(() => {
    if (typeFilter === 'all') return items;
    return items.filter((i) => (i.type || 'announcement') === typeFilter);
  }, [items, typeFilter]);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await newsService.listAdmin({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch || undefined,
        status: statusFilter,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
      setItems(res.items || []);
      setPagination((prev) => ({
        ...prev,
        page: res.page,
        limit: res.limit,
        total: res.total,
        totalPages: res.totalPages,
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load news';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, pagination.limit, pagination.page, statusFilter]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const openCreate = () => {
    setActiveItem(null);
    setForm({
      title: '',
      summary: '',
      body: '',
      tags: '',
      coverImage: '',
      type: 'announcement',
      highlight: false,
      actionLabel: '',
      actionLink: '',
      status: 'draft',
      publishAt: '',
      releaseVersion: '',
      releaseHeadline: '',
      releaseChanges: '',
      releaseAudience: 'all',
      notifySubscribers: false,
    });
    setIsModalOpen(true);
  };

  const openEdit = async (item: NewsArticle) => {
    setIsSaving(true);
    setError(null);
    try {
      const full = await newsService.getAdmin(item.id || item.slug);
      setActiveItem(full);
      setForm({
        title: full.title || '',
        summary: full.summary || '',
        body: full.body || '',
        tags: safeArray<string>(full.tags).join(', '),
        coverImage: full.coverImage || '',
        type: (full.type || 'announcement') as NewsType,
        highlight: !!full.highlight,
        actionLabel: full.actionLabel || '',
        actionLink: full.actionLink && full.actionLink.startsWith('#') ? '' : full.actionLink || '',
        status: full.status || 'draft',
        publishAt: toDatetimeLocal(full.publishAt),
        releaseVersion: full.release?.version || '',
        releaseHeadline: full.release?.headline || '',
        releaseChanges: joinReleaseChanges(full.release?.changes),
        releaseAudience: full.release?.audience || 'all',
        notifySubscribers: !!full.release?.notifySubscribers,
      });
      setIsModalOpen(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load item';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const openView = async (item: NewsArticle) => {
    setIsSaving(true);
    setError(null);
    try {
      const full = await newsService.getAdmin(item.id || item.slug);
      setActiveItem(full);
      setIsViewOpen(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load item';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: NewsArticle) => {
    const id = item.id || item.slug;
    if (!id) return;
    setPendingDelete(item);
  };

  const handleToggleStatus = async (item: NewsArticle) => {
    const id = item.id || item.slug;
    if (!id) return;
    const next = item.status === 'published' ? 'draft' : 'published';
    setIsSaving(true);
    setError(null);
    try {
      await newsService.setStatus(id, next);
      await fetchNews();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Update status failed';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const releaseChanges = form.releaseChanges
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      let release: NewsArticle['release'] | null | undefined = undefined;
      if (form.type === 'update') {
        const hasReleaseContent =
          !!form.releaseVersion.trim() || !!form.releaseHeadline.trim() || releaseChanges.length > 0 || form.notifySubscribers || !!activeItem?.release;

        if (hasReleaseContent) {
          release = {
            version: form.releaseVersion.trim(),
            headline: form.releaseHeadline.trim(),
            changes: releaseChanges,
            audience: form.releaseAudience,
            notifySubscribers: form.notifySubscribers,
            lastNotification: activeItem?.release?.lastNotification || null,
          };
        }
      } else if (activeItem?.release) {
        release = null;
      }

      const payload = {
        title: form.title,
        summary: form.summary,
        body: form.body,
        tags: form.tags,
        coverImage: form.coverImage,
        type: form.type,
        highlight: form.highlight,
        actionLabel: form.actionLabel,
        actionLink: form.actionLink,
        status: form.status,
        publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : undefined,
        release,
      };

      if (activeItem?.id || activeItem?.slug) {
        await newsService.update(activeItem.id || activeItem.slug, payload);
      } else {
        await newsService.create(payload as any);
      }

      setIsModalOpen(false);
      setActiveItem(null);
      await fetchNews();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Save failed';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const Modal = useMemo(() => {
    if (!isModalOpen) return null;
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)} aria-hidden="true" />
        <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <FileText className="text-emerald-600" size={18} />
              <h3 className="text-lg font-semibold text-gray-900">{activeItem ? 'Edit News' : 'Create News'}</h3>
            </div>
            <button
              type="button"
              onClick={() => !isSaving && setIsModalOpen(false)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSave} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="News title"
                  required
                  disabled={isSaving}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Summary</label>
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="Short summary"
                  disabled={isSaving}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Body *</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                  rows={8}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="Full content (plain text)"
                  required
                  disabled={isSaving}
                />
              </div>

              <div>
                <Dropdown
                  label="Type"
                  value={form.type}
                  onChange={(v) => setForm((p) => ({ ...p, type: v as NewsType }))}
                  options={NEWS_TYPE_OPTIONS}
                  headerText="News type"
                />
              </div>

              <div>
                <Dropdown
                  label="Status"
                  value={form.status}
                  onChange={(v) => setForm((p) => ({ ...p, status: v as 'draft' | 'published' }))}
                  options={[
                    { value: 'draft', label: 'Draft', color: 'bg-slate-500' },
                    { value: 'published', label: 'Published', color: 'bg-emerald-600' },
                  ]}
                />
              </div>

              <div className="md:col-span-2">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Publish at</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                      <input
                        type="datetime-local"
                        value={form.publishAt}
                        onChange={(e) => setForm((p) => ({ ...p, publishAt: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-10 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 block text-sm font-medium text-gray-700">Highlight</p>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 transition-colors hover:border-gray-300 hover:bg-white">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            form.highlight ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                          }`}
                          aria-hidden="true"
                        >
                          <Pin size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{form.highlight ? 'Pinned to highlights' : 'Pin to highlights'}</p>
                          <p className="truncate text-xs text-gray-500">Show in highlighted section</p>
                        </div>
                      </div>

                      <span
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          form.highlight ? 'bg-emerald-600' : 'bg-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.highlight}
                          onChange={(e) => setForm((p) => ({ ...p, highlight: e.target.checked }))}
                          className="sr-only"
                          disabled={isSaving}
                        />
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                            form.highlight ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </span>
                    </label>
                  </div>
                </div>

                <p className="mt-1 text-xs text-gray-500">Leave empty to publish immediately (when published)</p>
              </div>

              {form.type === 'update' && (
                <div className="space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 md:col-span-2">
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-900">Release update</h4>
                    <p className="mt-1 text-xs text-emerald-700">
                      Publish one changelog-style update with version name, what&apos;s new, and optional email broadcast.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Version name</label>
                      <input
                        value={form.releaseVersion}
                        onChange={(e) => setForm((p) => ({ ...p, releaseVersion: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g. Blanc v1.8.0"
                        disabled={isSaving}
                      />
                    </div>

                    <div>
                      <Dropdown
                        label="Email audience"
                        value={form.releaseAudience}
                        onChange={(v) => setForm((p) => ({ ...p, releaseAudience: v as NewsAudience }))}
                        options={RELEASE_AUDIENCE_OPTIONS}
                        headerText="Recipients"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Release headline</label>
                    <input
                      value={form.releaseHeadline}
                      onChange={(e) => setForm((p) => ({ ...p, releaseHeadline: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      placeholder="One short line to introduce this version"
                      disabled={isSaving}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">What&apos;s new</label>
                    <textarea
                      value={form.releaseChanges}
                      onChange={(e) => setForm((p) => ({ ...p, releaseChanges: e.target.value }))}
                      rows={5}
                      className="w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                      placeholder={'One bullet per line\nImproved mentor matching performance\nAdded Hall of Fame library\nFixed preview deployment issues'}
                      disabled={isSaving}
                    />
                    <p className="mt-1 text-xs text-gray-500">Each line becomes one changelog item in the email and news detail.</p>
                  </div>

                  <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900">Send release email when this update is published</p>
                      <p className="text-xs text-gray-500">
                        Works like a Railway-style changelog push: publish once, post to news, and email the selected audience.
                      </p>
                    </div>
                    <span
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.notifySubscribers ? 'bg-emerald-600' : 'bg-gray-300'}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.notifySubscribers}
                        onChange={(e) => setForm((p) => ({ ...p, notifySubscribers: e.target.checked }))}
                        className="sr-only"
                        disabled={isSaving}
                      />
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${form.notifySubscribers ? 'translate-x-5' : 'translate-x-1'}`}
                      />
                    </span>
                  </label>

                  {activeItem?.release?.lastNotification && (
                    <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 text-xs text-gray-600">
                      Last send:{' '}
                      {activeItem.release.lastNotification.notifiedAt ? new Date(activeItem.release.lastNotification.notifiedAt).toLocaleString() : '—'}
                      {' · '}
                      Sent {activeItem.release.lastNotification.sent}/{activeItem.release.lastNotification.total}
                      {activeItem.release.lastNotification.failed > 0 ? ` · Failed ${activeItem.release.lastNotification.failed}` : ''}
                    </div>
                  )}
                </div>
              )}

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Tags</label>
                <div className="relative">
                  <Tag size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                  <input
                    value={form.tags}
                    onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-10 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="tag1, tag2, tag3"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Cover image URL</label>
                  <input
                    value={form.coverImage}
                    onChange={(e) => setForm((p) => ({ ...p, coverImage: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://..."
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Action label</label>
                  <input
                    value={form.actionLabel}
                    onChange={(e) => setForm((p) => ({ ...p, actionLabel: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Learn more"
                    disabled={isSaving}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Action link (URL or /path)</label>
                  <input
                    value={form.actionLink}
                    onChange={(e) => setForm((p) => ({ ...p, actionLink: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="/community or https://..."
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Save
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  }, [activeItem, form, handleSave, isModalOpen, isSaving]);

  const ViewModal = useMemo(() => {
    if (!isViewOpen || !activeItem) return null;
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isSaving && setIsViewOpen(false)} aria-hidden="true" />
        <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Eye className="text-emerald-600" size={18} />
              <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
            </div>
            <button
              type="button"
              onClick={() => !isSaving && setIsViewOpen(false)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${activeItem.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}
              >
                {activeItem.status}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                {getTypeLabel(activeItem.type || 'announcement')}
              </span>
              {activeItem.highlight && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">highlighted</span>}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{activeItem.title}</h2>
            {activeItem.summary && <p className="text-gray-600">{activeItem.summary}</p>}
            {activeItem.release && (
              <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {activeItem.release.version && (
                    <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">{activeItem.release.version}</span>
                  )}
                  <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    audience: {activeItem.release.audience}
                  </span>
                  {activeItem.release.notifySubscribers && (
                    <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700">email on publish</span>
                  )}
                </div>
                {activeItem.release.headline && <p className="text-sm text-gray-700">{activeItem.release.headline}</p>}
                {safeArray<string>(activeItem.release.changes).length > 0 && (
                  <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                    {safeArray<string>(activeItem.release.changes).map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {activeItem.body && (
              <pre className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm whitespace-pre-wrap text-gray-800">{activeItem.body}</pre>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  }, [activeItem, isSaving, isViewOpen]);

  return (
    <div className="space-y-6">
      <ConfirmActionModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => {
          if (!isDeleteConfirmLoading) setPendingDelete(null);
        }}
        title="Delete news"
        message={pendingDelete ? `Delete news "${pendingDelete.title}"?` : ''}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (!pendingDelete) return;
          const id = pendingDelete.id || pendingDelete.slug;
          if (!id) return;
          setIsDeleteConfirmLoading(true);
          setError(null);
          Promise.resolve()
            .then(() => newsService.remove(id))
            .then(() => fetchNews())
            .catch((e) => {
              const message = e instanceof Error ? e.message : 'Delete failed';
              setError(message);
            })
            .finally(() => {
              setIsDeleteConfirmLoading(false);
              setPendingDelete(null);
            });
        }}
        isLoading={isDeleteConfirmLoading}
      />
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">News & Tips</h2>
          <p className="mt-1 text-gray-500">Manage announcements, updates, events, and study tips shown to users</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchNews}
            className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus size={18} />
            Create
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Search</label>
          <div className="relative">
            <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              placeholder="Search by title or summary..."
            />
          </div>
        </div>

        <div className="w-full lg:w-56">
          <Dropdown
            label="Status"
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v as any);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            options={STATUS_OPTIONS}
          />
        </div>

        <div className="w-full lg:w-56">
          <Dropdown
            label="Type"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as any)}
            options={[{ value: 'all', label: 'All', color: 'bg-gray-400' }, ...NEWS_TYPE_OPTIONS]}
          />
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-900 uppercase">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Publish At</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No news or tips found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="line-clamp-1 font-medium text-gray-900">{item.title}</span>
                        {item.highlight && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">pin</span>}
                      </div>
                      {item.release?.version && <p className="mt-1 text-[11px] font-semibold text-emerald-700">{item.release.version}</p>}
                      {item.summary && <p className="mt-1 line-clamp-1 text-xs text-gray-500">{item.summary}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {getTypeLabel(item.type || 'announcement')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">{item.publishAt ? new Date(item.publishAt).toLocaleString() : '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {safeArray<string>(item.tags)
                          .slice(0, 3)
                          .map((t) => (
                            <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                              {t}
                            </span>
                          ))}
                        {safeArray<string>(item.tags).length > 3 && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">+{safeArray<string>(item.tags).length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openView(item)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          title="Preview"
                          disabled={isSaving}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
                          title="Edit"
                          disabled={isSaving}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                          disabled={isSaving}
                          title="Toggle status"
                        >
                          {item.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                          disabled={isSaving}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 text-sm text-gray-600">
          <span>
            {pagination.total > 0
              ? `Showing ${(pagination.page - 1) * pagination.limit + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`
              : '—'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1 || isLoading}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent"
            >
              Prev
            </button>
            <span className="text-sm text-gray-500">
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {Modal}
      {ViewModal}
    </div>
  );
};

export default NewsManager;

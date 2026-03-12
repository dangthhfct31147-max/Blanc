import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Loader2, MessageSquare, RefreshCw, RotateCcw, Search, Trash2, Users, X } from 'lucide-react';
import { TeamPost } from '../types';
import { communityService } from '../services/communityService';
import { useDebounce } from '../hooks/useApi';
import { Dropdown } from './ui/Dropdown';
import { ConfirmActionModal } from './ui/UserModals';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All', color: 'bg-gray-400' },
  { value: 'open', label: 'Open', color: 'bg-emerald-600' },
  { value: 'closed', label: 'Closed', color: 'bg-slate-500' },
  { value: 'full', label: 'Full', color: 'bg-amber-500' },
];

const safeArray = <T,>(value: unknown, fallback: T[] = []): T[] => (Array.isArray(value) ? (value as T[]) : fallback);

const CommunityManager: React.FC = () => {
  const [items, setItems] = useState<TeamPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'full'>('all');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [includeExpired, setIncludeExpired] = useState(false);

  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<TeamPost | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const [pendingAction, setPendingAction] = useState<null | { type: 'delete' | 'restore'; item: TeamPost }>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await communityService.listTeamPosts({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch || undefined,
        status: statusFilter,
        includeDeleted,
        includeExpired,
        sortBy: 'createdAt',
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
      const message = e instanceof Error ? e.message : 'Failed to load posts';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, includeDeleted, includeExpired, pagination.limit, pagination.page, statusFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const openView = (item: TeamPost) => {
    setActiveItem(item);
    setIsViewOpen(true);
  };

  const handleDelete = async (item: TeamPost) => {
    setPendingAction({ type: 'delete', item });
  };

  const handleRestore = async (item: TeamPost) => {
    setPendingAction({ type: 'restore', item });
  };

  const ViewModal = useMemo(() => {
    if (!isViewOpen || !activeItem) return null;
    const isExpired = Boolean(activeItem.expiresAt && new Date(activeItem.expiresAt).getTime() <= Date.now());
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isMutating && setIsViewOpen(false)} aria-hidden="true" />
        <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Eye className="text-emerald-600" size={18} />
              <h3 className="text-lg font-semibold text-gray-900">Post details</h3>
            </div>
            <button
              type="button"
              onClick={() => !isMutating && setIsViewOpen(false)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-gray-900">{activeItem.title}</h2>
              <p className="text-sm text-gray-500">{activeItem.contestTitle ? `Contest: ${activeItem.contestTitle}` : 'Contest: —'}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  activeItem.status === 'open'
                    ? 'bg-emerald-100 text-emerald-700'
                    : activeItem.status === 'full'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                }`}
              >
                {activeItem.status}
              </span>
              {activeItem.deletedAt && <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">deleted</span>}
              {isExpired && <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">expired</span>}
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                {activeItem.currentMembers}/{activeItem.maxMembers} members
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">By {activeItem.createdBy?.name || 'Unknown'}</span>
              {activeItem.expiresAt && (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                  Expires: {new Date(activeItem.expiresAt).toLocaleString()}
                </span>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Description</h4>
              <pre className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm whitespace-pre-wrap text-gray-800">{activeItem.description || '—'}</pre>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Roles needed</h4>
              <div className="flex flex-wrap gap-2">
                {safeArray<string>(activeItem.rolesNeeded).length === 0 ? (
                  <span className="text-sm text-gray-500">—</span>
                ) : (
                  safeArray<string>(activeItem.rolesNeeded).map((role) => (
                    <span key={role} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                      {role}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Members</h4>
              <div className="space-y-2">
                {safeArray<any>(activeItem.members).length === 0 ? (
                  <span className="text-sm text-gray-500">—</span>
                ) : (
                  safeArray<any>(activeItem.members)
                    .slice(0, 12)
                    .map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                            {(m.name || '?').slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{m.name || 'Unknown'}</p>
                            {m.role && <p className="text-xs text-gray-500">{m.role}</p>}
                          </div>
                        </div>
                        {m.joinedAt && <span className="text-xs text-gray-400">{new Date(m.joinedAt).toLocaleDateString()}</span>}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }, [activeItem, isMutating, isViewOpen]);

  return (
    <div className="space-y-6">
      <ConfirmActionModal
        isOpen={Boolean(pendingAction)}
        onClose={() => {
          if (!isConfirmLoading) setPendingAction(null);
        }}
        title={pendingAction?.type === 'restore' ? 'Restore post' : 'Delete post'}
        message={
          pendingAction
            ? pendingAction.type === 'restore'
              ? `Restore community post "${pendingAction.item.title}"?`
              : `Soft delete community post "${pendingAction.item.title}"?`
            : ''
        }
        confirmLabel={pendingAction?.type === 'restore' ? 'Restore' : 'Delete'}
        variant={pendingAction?.type === 'restore' ? 'success' : 'danger'}
        showReasonInput={pendingAction?.type === 'delete'}
        reasonRequired={false}
        onConfirm={(reason) => {
          if (!pendingAction) return;
          setIsConfirmLoading(true);
          setIsMutating(true);
          setError(null);
          const action = pendingAction;
          Promise.resolve()
            .then(() => {
              if (action.type === 'restore') {
                return communityService.restoreTeamPost(action.item.id);
              }
              return communityService.deleteTeamPost(action.item.id, reason?.trim() || undefined);
            })
            .then(() => fetchPosts())
            .catch((e) => {
              const message = e instanceof Error ? e.message : action.type === 'restore' ? 'Restore failed' : 'Delete failed';
              setError(message);
            })
            .finally(() => {
              setIsMutating(false);
              setIsConfirmLoading(false);
              setPendingAction(null);
            });
        }}
        isLoading={isConfirmLoading}
      />
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Community</h2>
          <p className="mt-1 text-gray-500">Moderate team posts created by users</p>
        </div>
        <button
          onClick={fetchPosts}
          className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          disabled={isLoading}
          title="Refresh"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
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
              placeholder="Search by title, description..."
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

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              checked={includeDeleted}
              onChange={(e) => {
                setIncludeDeleted(e.target.checked);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            />
            Include deleted
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              checked={includeExpired}
              onChange={(e) => {
                setIncludeExpired(e.target.checked);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            />
            Include expired
          </label>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-900 uppercase">
              <tr>
                <th className="px-6 py-4">Post</th>
                <th className="px-6 py-4">Roles</th>
                <th className="px-6 py-4">Members</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
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
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No community posts found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={16} className="text-emerald-600" />
                        <span className="line-clamp-1 font-medium text-gray-900">{item.title}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                        {item.contestTitle || '-'} - by {item.createdBy?.name || 'Unknown'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {safeArray<string>(item.rolesNeeded)
                          .slice(0, 2)
                          .map((role) => (
                            <span key={role} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                              {role}
                            </span>
                          ))}
                        {safeArray<string>(item.rolesNeeded).length > 2 && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                            +{safeArray<string>(item.rolesNeeded).length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        <Users size={14} />
                        {item.currentMembers}/{item.maxMembers}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.status === 'open'
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.status === 'full'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.deletedAt && <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">deleted</span>}
                        {item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now() && (
                          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-800">expired</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openView(item)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                          title="View"
                          disabled={isMutating}
                        >
                          <Eye size={16} />
                        </button>
                        {item.deletedAt ? (
                          <button
                            onClick={() => handleRestore(item)}
                            className="rounded-lg p-2 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700"
                            title="Restore"
                            disabled={isMutating}
                          >
                            <RotateCcw size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(item)}
                            className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                            disabled={isMutating}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
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

      {ViewModal}
    </div>
  );
};

export default CommunityManager;

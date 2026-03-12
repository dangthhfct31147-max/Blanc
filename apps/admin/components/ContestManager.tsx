import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Users,
  Sparkles,
  MoreHorizontal,
  Eye,
  RefreshCw,
  AlertCircle,
  Search,
  Filter,
  MapPin,
  Trophy,
  Clock,
  Target,
  FileText,
  Building2,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Star,
  MessageSquare,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { Contest, ContestPrize, ContestScheduleItem, OrganizerDetails } from '../types';
import { MOCK_CONTESTS } from '../constants';
import { generateContestDescription } from '../services/geminiService';
import { contestService, ContestFilters } from '../services/contestService';
import { useDebounce } from '../hooks/useApi';
import { Dropdown } from './ui/Dropdown';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../services/api';
import { ConfirmActionModal } from './ui/UserModals';
import toast from 'react-hot-toast';
import { convertGoogleDriveImageUrl } from '../utils/googleDrive';

const safeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
};

// Category options for contests (grouped + expanded)
const CONTEST_CATEGORIES = [
  { value: '', label: 'Select category', color: 'bg-gray-400' },
  { value: 'it', label: 'IT & Tech (Hackathon, Coding, AI/ML)', color: 'bg-blue-600' },
  { value: 'data', label: 'Data & Analytics', color: 'bg-cyan-500' },
  { value: 'cyber', label: 'Cybersecurity', color: 'bg-slate-600' },
  { value: 'robotics', label: 'Robotics & IoT', color: 'bg-purple-500' },
  { value: 'design', label: 'Design / UI-UX', color: 'bg-pink-500' },
  { value: 'business', label: 'Business & Strategy', color: 'bg-amber-500' },
  { value: 'startup', label: 'Startup & Innovation', color: 'bg-emerald-600' },
  { value: 'marketing', label: 'Marketing & Growth', color: 'bg-rose-500' },
  { value: 'finance', label: 'Finance & Fintech', color: 'bg-indigo-500' },
  { value: 'health', label: 'Health & Biotech', color: 'bg-teal-600' },
  { value: 'education', label: 'Education & EdTech', color: 'bg-orange-400' },
  { value: 'sustainability', label: 'Sustainability & Environment', color: 'bg-lime-600' },
  { value: 'gaming', label: 'Gaming & Esports', color: 'bg-yellow-500' },
  { value: 'research', label: 'Research & Science', color: 'bg-sky-500' },
  { value: 'other', label: 'Other', color: 'bg-gray-500' },
];

// Location type options
const LOCATION_TYPES = [
  { value: 'online', label: 'Online', color: 'bg-blue-500' },
  { value: 'offline', label: 'Offline', color: 'bg-green-500' },
  { value: 'hybrid', label: 'Hybrid', color: 'bg-purple-500' },
];

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, icon, children, defaultOpen = true, badge }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100"
      >
        <div className="flex items-center gap-2 font-medium text-gray-700">
          {icon}
          <span>{title}</span>
          {badge && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{badge}</span>}
        </div>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {isOpen && <div className="space-y-4 p-4">{children}</div>}
    </div>
  );
};

const ContestManager: React.FC = () => {
  const { user } = useAuth();
  const canManageContests = user?.role === 'admin' || user?.role === 'super_admin';

  // State
  const [contests, setContests] = useState<Contest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [editingContest, setEditingContest] = useState<Contest | null>(null);
  const [viewingContest, setViewingContest] = useState<Contest | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [confirmModal, setConfirmModal] = useState<null | {
    title: string;
    message: string;
    confirmLabel: string;
    variant?: 'danger' | 'warning' | 'success' | 'info';
    onConfirm: () => Promise<void>;
  }>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'OPEN' | 'FULL' | 'CLOSED'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Basic Form State
  const [newTitle, setNewTitle] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newOrganizer, setNewOrganizer] = useState('');
  const [newFee, setNewFee] = useState(0);
  const [newDateStart, setNewDateStart] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [generatedDesc, setGeneratedDesc] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newLocationType, setNewLocationType] = useState<'online' | 'offline' | 'hybrid'>('online');
  const [newMaxParticipants, setNewMaxParticipants] = useState<number>(0);

  // Content Form State
  const [newRules, setNewRules] = useState('');
  const [newObjectives, setNewObjectives] = useState('');
  const [newEligibility, setNewEligibility] = useState('');

  // Prizes Form State
  const [prizes, setPrizes] = useState<ContestPrize[]>([]);

  // Schedule Form State
  const [schedule, setSchedule] = useState<ContestScheduleItem[]>([]);

  // Organizer Details Form State
  const [organizerDetails, setOrganizerDetails] = useState<OrganizerDetails>({
    name: '',
    school: '',
    logo: '',
    description: '',
    contact: '',
    website: '',
  });

  // Debounce search
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch contests
  const fetchContests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: ContestFilters = {
        search: debouncedSearch || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        page: pagination.page,
        limit: pagination.limit,
      };

      const response = await contestService.getAll(filters);
      setContests(response.items);
      setPagination((prev) => ({
        ...prev,
        total: response.total,
        totalPages: response.totalPages,
      }));
    } catch (err) {
      console.error('Failed to fetch contests:', err);
      setError('Failed to load contests. Using cached data.');
      setContests(MOCK_CONTESTS);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filterStatus, pagination.page, pagination.limit]);

  // Initial fetch
  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  // Reset to first page on filter/search changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch, filterStatus]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.action-dropdown')) return;
      setOpenActionId(null);
      setActionMenuPos(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const actionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [actionMenuPos, setActionMenuPos] = useState<{ right: number; top?: number; bottom?: number } | null>(null);

  useEffect(() => {
    const root = document.documentElement;

    if (!actionMenuPos) {
      root.style.removeProperty('--admin-action-menu-right');
      root.style.removeProperty('--admin-action-menu-top');
      root.style.removeProperty('--admin-action-menu-bottom');
      return;
    }

    root.style.setProperty('--admin-action-menu-right', `${actionMenuPos.right}px`);
    root.style.setProperty('--admin-action-menu-top', actionMenuPos.top != null ? `${actionMenuPos.top}px` : 'auto');
    root.style.setProperty('--admin-action-menu-bottom', actionMenuPos.bottom != null ? `${actionMenuPos.bottom}px` : 'auto');
  }, [actionMenuPos]);

  const openActionMenu = (contestId: string | number) => {
    const key = String(contestId);
    const buttonEl = actionButtonRefs.current[key];

    if (openActionId === key) {
      setOpenActionId(null);
      setActionMenuPos(null);
      return;
    }

    setOpenActionId(key);

    if (!buttonEl) {
      setActionMenuPos(null);
      return;
    }

    const rect = buttonEl.getBoundingClientRect();
    const right = Math.max(8, window.innerWidth - rect.right);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Heuristic: if we likely can't fit below, open upwards.
    const shouldOpenUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    if (shouldOpenUp) {
      setActionMenuPos({ right, bottom: Math.max(8, window.innerHeight - rect.top + 8) });
    } else {
      setActionMenuPos({ right, top: Math.max(8, rect.bottom + 8) });
    }
  };

  const handleGenerateAI = async () => {
    if (!newTitle) return;
    setIsGenerating(true);
    const tagsArray = newTags.split(',').map((t) => t.trim());
    const description = await generateContestDescription(newTitle, tagsArray);
    setGeneratedDesc(description);
    setIsGenerating(false);
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => {
      const maxPage = Math.max(prev.totalPages || 1, 1);
      const nextPage = Math.min(Math.max(newPage, 1), maxPage);
      return { ...prev, page: nextPage };
    });
  };

  const handleDeleteAllContests = async () => {
    if (!canManageContests) {
      toast.error('Admin access required');
      return;
    }

    setConfirmModal({
      title: 'Delete all contests',
      message: 'Are you sure you want to delete ALL contests? This action cannot be undone.',
      confirmLabel: 'Delete all',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmLoading(true);
        setIsBulkDeleting(true);
        setError(null);
        try {
          await contestService.deleteAll();

          const filters: ContestFilters = {
            search: debouncedSearch || undefined,
            status: filterStatus !== 'all' ? filterStatus : undefined,
            page: 1,
            limit: pagination.limit,
          };
          const response = await contestService.getAll(filters);
          setContests(response.items);
          setPagination((prev) => ({
            ...prev,
            page: 1,
            total: response.total,
            totalPages: response.totalPages,
          }));
          toast.success('Deleted all contests');
          setConfirmModal(null);
        } catch (err) {
          console.error('Failed to delete all contests:', err);
          const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to delete all contests. Please try again.';
          toast.error(message);
        } finally {
          setIsBulkDeleting(false);
          setConfirmLoading(false);
        }
      },
    });
  };

  const resetForm = () => {
    setNewTitle('');
    setNewTags('');
    setNewOrganizer('');
    setNewFee(0);
    setNewDateStart('');
    setNewEndDate('');
    setNewDeadline('');
    setGeneratedDesc('');
    setNewImage('');
    setNewCategory('');
    setNewLocation('');
    setNewLocationType('online');
    setNewMaxParticipants(0);
    setNewRules('');
    setNewObjectives('');
    setNewEligibility('');
    setPrizes([]);
    setSchedule([]);
    setOrganizerDetails({
      name: '',
      school: '',
      logo: '',
      description: '',
      contact: '',
      website: '',
    });
    setEditingContest(null);
  };

  const handleSaveContest = async () => {
    if (!newTitle || !newOrganizer) return;

    setIsSaving(true);
    try {
      // Sync organizerDetails.name with newOrganizer
      const syncedOrganizerDetails = {
        ...organizerDetails,
        name: organizerDetails.name || newOrganizer,
      };

      const normalizedContestImage = newImage ? convertGoogleDriveImageUrl(newImage) : '';
      const normalizedOrganizerLogo = syncedOrganizerDetails.logo ? convertGoogleDriveImageUrl(syncedOrganizerDetails.logo) : '';

      const contestData = {
        title: newTitle,
        organizer: newOrganizer,
        fee: newFee,
        // Backend field mapping
        dateStart: newDateStart,
        endDate: newEndDate || undefined,
        deadline: newDeadline,
        tags: newTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        description: generatedDesc,
        image: normalizedContestImage || newImage || undefined,
        category: newCategory || undefined,
        location: newLocation || undefined,
        locationType: newLocationType,
        maxParticipants: newMaxParticipants || undefined,
        rules: newRules || undefined,
        objectives: newObjectives || undefined,
        eligibility: newEligibility || undefined,
        prizes: prizes.length > 0 ? prizes : undefined,
        schedule: schedule.length > 0 ? schedule : undefined,
        organizerDetails: syncedOrganizerDetails.name ? { ...syncedOrganizerDetails, logo: normalizedOrganizerLogo || syncedOrganizerDetails.logo } : undefined,
      };

      if (editingContest) {
        const updated = await contestService.update(editingContest.id, contestData);
        const normalizedUpdated: Contest = {
          ...(updated as Contest),
          tags: safeStringArray((updated as any).tags),
        };
        setContests(contests.map((c) => (c.id === editingContest.id ? normalizedUpdated : c)));
      } else {
        const created = await contestService.create(contestData);
        const normalizedCreated: Contest = {
          ...(created as Contest),
          tags: safeStringArray((created as any).tags),
        };
        setContests([normalizedCreated, ...contests]);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save contest:', err);
      toast.error('Failed to save contest. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: Contest['status']) => {
    switch (status) {
      case 'OPEN':
        return 'bg-emerald-100 text-emerald-800';
      case 'FULL':
        return 'bg-yellow-100 text-yellow-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAction = async (action: string, contest: Contest) => {
    setOpenActionId(null);
    setActionMenuPos(null);

    try {
      switch (action) {
        case 'delete':
          if (!canManageContests) {
            throw new ApiError('Admin access required', 403);
          }
          setConfirmModal({
            title: 'Delete contest',
            message: `Are you sure you want to delete "${contest.title}"? This action cannot be undone.`,
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
              setConfirmLoading(true);
              try {
                await contestService.delete(contest.id);
                setContests(contests.filter((c) => c.id !== contest.id));
                toast.success('Contest deleted');
                setConfirmModal(null);
              } catch (err) {
                console.error('Failed to delete contest:', err);
                const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to delete contest. Please try again.';
                toast.error(message);
              } finally {
                setConfirmLoading(false);
              }
            },
          });
          break;
        case 'edit':
          if (!canManageContests) {
            throw new ApiError('Admin access required', 403);
          }
          setEditingContest(contest);
          setNewTitle(contest.title);
          setNewTags(safeStringArray((contest as any).tags).join(', '));
          setNewOrganizer(contest.organizer);
          setNewFee(contest.fee);
          setNewDateStart(contest.dateStart?.split('T')[0] || '');
          // Handle endDate - fallback to deadline if not present
          setNewEndDate((contest as any).endDate?.split('T')[0] || '');
          setNewDeadline(contest.deadline?.split('T')[0] || '');
          setGeneratedDesc(contest.description || '');
          setNewImage(contest.image || '');
          setNewCategory(contest.category || '');
          setNewLocation(contest.location || '');
          setNewLocationType(contest.locationType || 'online');
          setNewMaxParticipants(contest.maxParticipants || 0);
          setNewRules(contest.rules || '');
          setNewObjectives(contest.objectives || '');
          setNewEligibility(contest.eligibility || '');
          setPrizes(contest.prizes || []);
          setSchedule(contest.schedule || []);
          // Sync organizerDetails.name with contest.organizer if empty
          setOrganizerDetails(
            contest.organizerDetails
              ? {
                  ...contest.organizerDetails,
                  name: contest.organizerDetails.name || contest.organizer,
                }
              : {
                  name: contest.organizer,
                  school: '',
                  logo: '',
                  description: '',
                  contact: '',
                  website: '',
                }
          );
          setIsModalOpen(true);
          break;
        case 'view':
          setViewingContest(contest);
          setIsViewModalOpen(true);
          break;
      }
    } catch (err) {
      console.error(`Failed to ${action} contest:`, err);
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : `Failed to ${action} contest. Please try again.`;
      toast.error(message);
    }
  };

  // Prize handlers
  const addPrize = () => {
    setPrizes([...prizes, { rank: prizes.length + 1, title: '', value: '', description: '' }]);
  };

  const updatePrize = (index: number, field: keyof ContestPrize, value: string | number) => {
    const updated = [...prizes];
    updated[index] = { ...updated[index], [field]: value };
    setPrizes(updated);
  };

  const removePrize = (index: number) => {
    setPrizes(prizes.filter((_, i) => i !== index));
  };

  // Schedule handlers
  const addScheduleItem = () => {
    setSchedule([...schedule, { date: '', title: '', description: '' }]);
  };

  const updateScheduleItem = (index: number, field: keyof ContestScheduleItem, value: string) => {
    const updated = [...schedule];
    updated[index] = { ...updated[index], [field]: value };
    setSchedule(updated);
  };

  const removeScheduleItem = (index: number) => {
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contests</h2>
          <p className="mt-1 text-gray-500">Manage competitions and events</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search contests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            title="Toggle filters"
            className={`rounded-lg border p-2 transition-colors ${showFilters ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter size={18} />
          </button>
          <button
            onClick={() => fetchContests()}
            disabled={isLoading}
            title="Refresh"
            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleDeleteAllContests}
            disabled={!canManageContests || isLoading || isBulkDeleting}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white shadow-sm transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Delete all contests"
          >
            <Trash2 size={18} />
            {isBulkDeleting ? 'Deleting...' : 'Delete All'}
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            disabled={!canManageContests}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-sm transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} />
            Create Contest
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="animate-fade-in-up flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="min-w-40">
            <Dropdown
              label="Status"
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'OPEN', label: 'Open', color: 'bg-emerald-500' },
                { value: 'FULL', label: 'Full', color: 'bg-yellow-500' },
                { value: 'CLOSED', label: 'Closed', color: 'bg-gray-500' },
              ]}
              value={filterStatus}
              onChange={(val) => setFilterStatus(val as typeof filterStatus)}
              placeholder="Select status"
              size="sm"
            />
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <AlertCircle className="text-yellow-500" size={20} />
          <span className="text-sm text-yellow-700">{error}</span>
        </div>
      )}

      <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Keep table layer above footer so dropdowns can overlap pagination */}
        <div className="relative z-10 overflow-visible overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-900 uppercase">
              <tr>
                <th className="px-6 py-4">Contest</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Participants</th>
                <th className="px-6 py-4">Deadline</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
                    <p className="text-gray-500">Loading contests...</p>
                  </td>
                </tr>
              ) : contests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No contests found matching your criteria.
                  </td>
                </tr>
              ) : (
                contests.map((contest, index) => (
                  <tr key={contest.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img src={contest.image || 'https://via.placeholder.com/64x40'} alt="" className="h-10 w-16 rounded-md object-cover" />
                        <div>
                          <p className="font-semibold text-gray-900">{contest.title}</p>
                          <div className="mt-1 flex gap-2">
                            {safeStringArray((contest as any).tags)
                              .slice(0, 3)
                              .map((tag) => (
                                <span key={tag} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                  {tag}
                                </span>
                              ))}
                            {safeStringArray((contest as any).tags).length > 3 && (
                              <span className="text-xs text-gray-400">+{safeStringArray((contest as any).tags).length - 3}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(contest.status)}`}>
                        {contest.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 capitalize">{contest.category || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Users size={16} className="text-gray-400" />
                        <span>{contest.registrationCount ?? contest.participants ?? 0}</span>
                        {contest.maxParticipants && contest.maxParticipants > 0 && <span className="text-gray-400">/ {contest.maxParticipants}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={16} className="text-gray-400" />
                        <span>{new Date(contest.deadline).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="action-dropdown relative inline-block text-left">
                        <button
                          ref={(el) => {
                            actionButtonRefs.current[String(contest.id)] = el;
                          }}
                          onClick={() => openActionMenu(contest.id)}
                          title="Contest actions"
                          className={`rounded-lg border p-2 transition-all duration-200 ${
                            openActionId === String(contest.id)
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="relative z-0 flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
          <span className="text-sm text-gray-500">
            {pagination.total === 0
              ? 'Showing 0 to 0 of 0 contests'
              : `Showing ${(pagination.page - 1) * pagination.limit + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} contests`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
              className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.totalPages || pagination.page >= pagination.totalPages || isLoading}
              className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Action dropdown menu rendered in a portal to avoid being clipped by scroll/overflow containers */}
      {openActionId != null &&
        actionMenuPos &&
        (() => {
          const openContest = contests.find((c) => String(c.id) === openActionId);
          if (!openContest) return null;

          return createPortal(
            <div
              className="action-menu-portal animate-fade-in-up z-50 w-52 rounded-xl border border-gray-200 bg-white shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                <button
                  onClick={() => handleAction('view', openContest)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Eye size={16} className="text-gray-400" />
                  <span>View Details</span>
                </button>
                {canManageContests && (
                  <>
                    <button
                      onClick={() => handleAction('edit', openContest)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <Edit2 size={16} className="text-gray-400" />
                      <span>Edit Contest</span>
                    </button>
                    <div className="my-1 border-t border-gray-50"></div>
                    <button
                      onClick={() => handleAction('delete', openContest)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      <span>Delete Contest</span>
                    </button>
                  </>
                )}
              </div>
            </div>,
            document.body
          );
        })()}

      {/* Create/Edit Modal */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <div className="animate-fade-in-up relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-900">{editingContest ? 'Edit Contest' : 'Create New Contest'}</h3>
                <button onClick={() => setIsModalOpen(false)} title="Close modal" className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                {/* Basic Information */}
                <CollapsibleSection title="Basic Information" icon={<FileText size={18} />} defaultOpen={true}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g., Summer Hackathon 2024"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <Dropdown
                        label="Category"
                        options={CONTEST_CATEGORIES}
                        value={newCategory}
                        onChange={setNewCategory}
                        placeholder="Select category"
                        headerText="Contest Category"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Tags (comma separated)</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g., AI, Web, Mobile"
                        value={newTags}
                        onChange={(e) => setNewTags(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        <ImageIcon size={14} className="mr-1 inline" />
                        Image URL
                      </label>
                      <input
                        type="url"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="https://example.com/image.jpg"
                        value={newImage}
                        onChange={(e) => setNewImage(e.target.value)}
                        onBlur={() => {
                          if (!newImage) return;
                          const converted = convertGoogleDriveImageUrl(newImage);
                          if (converted !== newImage) {
                            setNewImage(converted);
                            toast.success('Converted Google Drive link');
                          }
                        }}
                      />
                      {newImage && (
                        <div className="mt-2">
                          <img
                            src={newImage}
                            alt="Preview"
                            className="h-24 w-auto rounded-lg object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Date & Location */}
                <CollapsibleSection title="Date & Location" icon={<MapPin size={18} />} defaultOpen={true}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                      <input
                        type="date"
                        title="Contest start date"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        value={newDateStart}
                        onChange={(e) => setNewDateStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">End Date</label>
                      <input
                        type="date"
                        title="Contest end date"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Registration Deadline</label>
                      <input
                        type="date"
                        title="Registration deadline"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        value={newDeadline}
                        onChange={(e) => setNewDeadline(e.target.value)}
                      />
                    </div>
                    <div>
                      <Dropdown
                        label="Location Type"
                        options={LOCATION_TYPES}
                        value={newLocationType}
                        onChange={(val) => setNewLocationType(val as 'online' | 'offline' | 'hybrid')}
                        placeholder="Select location type"
                        headerText="Location Type"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Location Details</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder={newLocationType === 'online' ? 'e.g., Zoom, Google Meet' : 'e.g., 268 Lý Thường Kiệt, Q.10'}
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Registration Fee (VND)</label>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="0 = Free"
                        value={newFee}
                        onChange={(e) => setNewFee(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Max Participants</label>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="0 = Unlimited"
                        value={newMaxParticipants}
                        onChange={(e) => setNewMaxParticipants(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Organizer */}
                <CollapsibleSection title="Organizer Details" icon={<Building2 size={18} />} defaultOpen={true}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Organizer Name *</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g., TechGen Z Club"
                        value={newOrganizer}
                        onChange={(e) => setNewOrganizer(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">School/University</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="e.g., Học viện Bưu chính Viễn thông"
                        value={organizerDetails.school}
                        onChange={(e) => setOrganizerDetails({ ...organizerDetails, school: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Logo URL</label>
                      <input
                        type="url"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="https://example.com/logo.png"
                        value={organizerDetails.logo}
                        onChange={(e) => setOrganizerDetails({ ...organizerDetails, logo: e.target.value })}
                        onBlur={() => {
                          const currentLogo = organizerDetails.logo;
                          if (!currentLogo) return;
                          const converted = convertGoogleDriveImageUrl(currentLogo);
                          if (converted !== currentLogo) {
                            setOrganizerDetails((prev) => ({ ...prev, logo: converted }));
                            toast.success('Converted Google Drive link');
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Website</label>
                      <input
                        type="url"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="https://techgenz.com"
                        value={organizerDetails.website}
                        onChange={(e) => setOrganizerDetails({ ...organizerDetails, website: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Contact</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        placeholder="email@example.com or phone"
                        value={organizerDetails.contact}
                        onChange={(e) => setOrganizerDetails({ ...organizerDetails, contact: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700">Organizer Description</label>
                      <textarea
                        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        rows={2}
                        placeholder="Brief description about the organizer..."
                        value={organizerDetails.description}
                        onChange={(e) => setOrganizerDetails({ ...organizerDetails, description: e.target.value })}
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Content - Description, Objectives, Eligibility, Rules */}
                <CollapsibleSection title="Content" icon={<Target size={18} />} defaultOpen={false}>
                  <div className="space-y-4">
                    {/* AI Description Generator */}
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <label className="block text-sm font-semibold text-emerald-800">AI Description Generator</label>
                        <Sparkles size={16} className="text-emerald-600" />
                      </div>
                      <p className="mb-3 text-xs text-emerald-700">
                        Enter a title and tags above, then click generate to have Gemini AI write your contest description.
                      </p>
                      <button
                        onClick={handleGenerateAI}
                        disabled={isGenerating || !newTitle}
                        className={`flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                          isGenerating || !newTitle
                            ? 'cursor-not-allowed bg-emerald-200 text-emerald-500'
                            : 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                        }`}
                      >
                        {isGenerating ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            Generate with Gemini
                          </>
                        )}
                      </button>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        rows={4}
                        placeholder="Contest description..."
                        value={generatedDesc}
                        onChange={(e) => setGeneratedDesc(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Objectives (Mục tiêu)</label>
                      <textarea
                        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        rows={3}
                        placeholder="Khơi dậy niềm đam mê sáng tạo và cung cấp sân chơi chuyên nghiệp cho các bạn trẻ..."
                        value={newObjectives}
                        onChange={(e) => setNewObjectives(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Eligibility (Đối tượng tham gia)</label>
                      <textarea
                        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        rows={3}
                        placeholder="• Sinh viên các trường đại học, cao đẳng.&#10;• Yêu thích thiết kế giao diện và trải nghiệm người dùng.&#10;• Có thể tham gia cá nhân hoặc đội nhóm (tối đa 3 người)."
                        value={newEligibility}
                        onChange={(e) => setNewEligibility(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Rules (Thể lệ)</label>
                      <textarea
                        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        rows={5}
                        placeholder="1. Mỗi đội chỉ được nộp tối đa 1 bài dự thi.&#10;2. Bài thi phải là sản phẩm mới, chưa được công bố trước đây.&#10;3. Nghiêm cấm sao chép từ nguồn khác..."
                        value={newRules}
                        onChange={(e) => setNewRules(e.target.value)}
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Prizes */}
                <CollapsibleSection
                  title="Prizes (Giải thưởng)"
                  icon={<Trophy size={18} />}
                  defaultOpen={false}
                  badge={prizes.length > 0 ? `${prizes.length}` : undefined}
                >
                  <div className="space-y-3">
                    {prizes.map((prize, index) => (
                      <div key={index} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                        <div className="w-16">
                          <label className="mb-1 block text-xs font-medium text-gray-500">Rank</label>
                          <input
                            type="number"
                            min="1"
                            title="Prize rank"
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                            value={prize.rank}
                            onChange={(e) => updatePrize(index, 'rank', Number(e.target.value))}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
                          <input
                            type="text"
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                            placeholder="e.g., Giải Nhất"
                            value={prize.title}
                            onChange={(e) => updatePrize(index, 'title', e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-500">Value</label>
                          <input
                            type="text"
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                            placeholder="e.g., 10,000,000 VND"
                            value={prize.value}
                            onChange={(e) => updatePrize(index, 'value', e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
                          <input
                            type="text"
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                            placeholder="Optional"
                            value={prize.description || ''}
                            onChange={(e) => updatePrize(index, 'description', e.target.value)}
                          />
                        </div>
                        <button
                          onClick={() => removePrize(index)}
                          className="mt-5 rounded p-1.5 text-red-500 transition-colors hover:bg-red-50"
                          title="Remove prize"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addPrize}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-2 text-gray-500 transition-colors hover:border-emerald-400 hover:text-emerald-600"
                    >
                      <Plus size={16} />
                      Add Prize
                    </button>
                  </div>
                </CollapsibleSection>

                {/* Schedule */}
                <CollapsibleSection
                  title="Schedule (Lịch trình)"
                  icon={<Clock size={18} />}
                  defaultOpen={false}
                  badge={schedule.length > 0 ? `${schedule.length}` : undefined}
                >
                  <div className="space-y-3">
                    {schedule.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                        <div className="w-36">
                          <label className="mb-1 block text-xs font-medium text-gray-500">Date</label>
                          <input
                            type="date"
                            title="Schedule item date"
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                            value={item.date?.split('T')[0] || ''}
                            onChange={(e) => updateScheduleItem(index, 'date', e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
                          <input
                            type="text"
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                            placeholder="e.g., Mở đăng ký"
                            value={item.title}
                            onChange={(e) => updateScheduleItem(index, 'title', e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
                          <input
                            type="text"
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                            placeholder="Optional"
                            value={item.description || ''}
                            onChange={(e) => updateScheduleItem(index, 'description', e.target.value)}
                          />
                        </div>
                        <button
                          onClick={() => removeScheduleItem(index)}
                          className="mt-5 rounded p-1.5 text-red-500 transition-colors hover:bg-red-50"
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addScheduleItem}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-2 text-gray-500 transition-colors hover:border-emerald-400 hover:text-emerald-600"
                    >
                      <Plus size={16} />
                      Add Schedule Item
                    </button>
                  </div>
                </CollapsibleSection>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveContest}
                  disabled={isSaving || !newTitle || !newOrganizer}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : editingContest ? (
                    'Update Contest'
                  ) : (
                    'Create Contest'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* View Contest Details Modal */}
      {isViewModalOpen &&
        viewingContest &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)} />
            <div className="animate-fade-in-up relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              {/* Header with Image */}
              <div className="relative h-48 bg-gradient-to-r from-emerald-600 to-teal-600">
                {viewingContest.image && (
                  <img src={viewingContest.image} alt={viewingContest.title} className="absolute inset-0 h-full w-full object-cover opacity-30" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  title="Close modal"
                  className="absolute top-4 right-4 rounded-lg bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                >
                  <X size={20} />
                </button>
                <div className="absolute right-6 bottom-4 left-6">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(viewingContest.status)}`}>
                      {viewingContest.status}
                    </span>
                    {viewingContest.category && (
                      <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 capitalize">{viewingContest.category}</span>
                    )}
                    {viewingContest.fee === 0 ? (
                      <span className="rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-medium text-white">Free</span>
                    ) : (
                      <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-medium text-white">₫{viewingContest.fee.toLocaleString()}</span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-white">{viewingContest.title}</h2>
                  <p className="mt-1 text-white/80">by {viewingContest.organizer}</p>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <Users size={24} className="mx-auto mb-2 text-emerald-600" />
                    <p className="text-2xl font-bold text-gray-900">{viewingContest.registrationCount ?? viewingContest.participants ?? 0}</p>
                    <p className="text-xs text-gray-500">
                      Participants{viewingContest.maxParticipants && viewingContest.maxParticipants > 0 ? ` / ${viewingContest.maxParticipants}` : ''}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <Calendar size={24} className="mx-auto mb-2 text-blue-600" />
                    <p className="text-lg font-bold text-gray-900">
                      {viewingContest.deadline ? new Date(viewingContest.deadline).toLocaleDateString('vi-VN') : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">Deadline</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <MapPin size={24} className="mx-auto mb-2 text-purple-600" />
                    <p className="text-lg font-bold text-gray-900 capitalize">{viewingContest.locationType || 'Online'}</p>
                    <p className="text-xs text-gray-500">Location Type</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <Trophy size={24} className="mx-auto mb-2 text-yellow-500" />
                    <p className="text-lg font-bold text-gray-900">{viewingContest.prizes?.length || 0}</p>
                    <p className="text-xs text-gray-500">Prizes</p>
                  </div>
                </div>

                {/* Tags */}
                {viewingContest.tags && viewingContest.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {viewingContest.tags.map((tag, index) => (
                      <span key={index} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Organizer Info */}
                {viewingContest.organizerDetails && (
                  <div className="rounded-lg bg-emerald-50 p-4">
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-emerald-900">
                      <Building2 size={18} />
                      Organizer Details
                    </h4>
                    <div className="flex items-start gap-4">
                      {viewingContest.organizerDetails.logo && (
                        <img
                          src={viewingContest.organizerDetails.logo}
                          alt={viewingContest.organizerDetails.name}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 space-y-2 text-sm">
                        <p>
                          <span className="font-medium text-emerald-800">Name:</span> {viewingContest.organizerDetails.name}
                        </p>
                        {viewingContest.organizerDetails.school && (
                          <p>
                            <span className="font-medium text-emerald-800">School:</span> {viewingContest.organizerDetails.school}
                          </p>
                        )}
                        {viewingContest.organizerDetails.contact && (
                          <p>
                            <span className="font-medium text-emerald-800">Contact:</span> {viewingContest.organizerDetails.contact}
                          </p>
                        )}
                        {viewingContest.organizerDetails.website && (
                          <a
                            href={viewingContest.organizerDetails.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-700 hover:underline"
                          >
                            <Globe size={14} />
                            {viewingContest.organizerDetails.website}
                            <ExternalLink size={12} />
                          </a>
                        )}
                        {viewingContest.organizerDetails.description && <p className="text-gray-600">{viewingContest.organizerDetails.description}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Schedule */}
                {viewingContest.dateStart && (
                  <div className="rounded-lg bg-blue-50 p-4">
                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-blue-900">
                      <Calendar size={18} />
                      Schedule
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                      {viewingContest.dateStart && (
                        <div>
                          <span className="text-blue-700">Start Date:</span>
                          <span className="ml-2 font-medium text-blue-900">{new Date(viewingContest.dateStart).toLocaleDateString('vi-VN')}</span>
                        </div>
                      )}
                      {(viewingContest as any).endDate && (
                        <div>
                          <span className="text-blue-700">End Date:</span>
                          <span className="ml-2 font-medium text-blue-900">{new Date((viewingContest as any).endDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                      )}
                      {viewingContest.deadline && (
                        <div>
                          <span className="text-blue-700">Deadline:</span>
                          <span className="ml-2 font-medium text-blue-900">{new Date(viewingContest.deadline).toLocaleDateString('vi-VN')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Location */}
                {viewingContest.location && (
                  <div className="rounded-lg bg-purple-50 p-4">
                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-purple-900">
                      <MapPin size={18} />
                      Location
                    </h4>
                    <p className="text-purple-800">{viewingContest.location}</p>
                  </div>
                )}

                {/* Description */}
                {viewingContest.description && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
                      <FileText size={18} className="text-gray-600" />
                      Description
                    </h4>
                    <div className="rounded-lg bg-gray-50 p-4 text-sm whitespace-pre-wrap text-gray-700">{viewingContest.description}</div>
                  </div>
                )}

                {/* Objectives */}
                {viewingContest.objectives && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
                      <Target size={18} className="text-emerald-600" />
                      Objectives
                    </h4>
                    <div className="rounded-lg bg-gray-50 p-4 text-sm whitespace-pre-wrap text-gray-700">{viewingContest.objectives}</div>
                  </div>
                )}

                {/* Eligibility */}
                {viewingContest.eligibility && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
                      <Users size={18} className="text-blue-600" />
                      Eligibility
                    </h4>
                    <div className="rounded-lg bg-gray-50 p-4 text-sm whitespace-pre-wrap text-gray-700">{viewingContest.eligibility}</div>
                  </div>
                )}

                {/* Rules */}
                {viewingContest.rules && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 font-semibold text-gray-900">
                      <FileText size={18} className="text-orange-600" />
                      Rules
                    </h4>
                    <div className="rounded-lg bg-gray-50 p-4 text-sm whitespace-pre-wrap text-gray-700">{viewingContest.rules}</div>
                  </div>
                )}

                {/* Prizes */}
                {viewingContest.prizes && viewingContest.prizes.length > 0 && (
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                      <Trophy size={18} className="text-yellow-500" />
                      Prizes ({viewingContest.prizes.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {viewingContest.prizes.map((prize, index) => (
                        <div key={index} className="rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
                              {prize.rank}
                            </span>
                            <span className="font-semibold text-gray-900">{prize.title}</span>
                          </div>
                          <p className="text-lg font-bold text-amber-600">{prize.value}</p>
                          {prize.description && <p className="mt-1 text-sm text-gray-600">{prize.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Schedule Items */}
                {viewingContest.schedule && viewingContest.schedule.length > 0 && (
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                      <Clock size={18} className="text-blue-600" />
                      Timeline ({viewingContest.schedule.length} events)
                    </h4>
                    <div className="space-y-2">
                      {viewingContest.schedule.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                          <div className="w-24 flex-shrink-0">
                            <p className="text-sm font-medium text-blue-600">{item.date ? new Date(item.date).toLocaleDateString('vi-VN') : 'TBD'}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.title}</p>
                            {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments/Reviews */}
                {viewingContest.comments && viewingContest.comments.length > 0 && (
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                      <MessageSquare size={18} className="text-purple-600" />
                      Comments ({viewingContest.comments.length})
                    </h4>
                    <div className="max-h-64 space-y-3 overflow-y-auto">
                      {viewingContest.comments.map((comment) => (
                        <div key={comment.id} className="rounded-lg bg-gray-50 p-4">
                          <div className="flex items-start gap-3">
                            {comment.userAvatar ? (
                              <img src={comment.userAvatar} alt={comment.userName} className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                                <span className="text-sm font-medium text-purple-600">{comment.userName.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-900">{comment.userName}</p>
                                <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleDateString('vi-VN')}</span>
                              </div>
                              {comment.rating && (
                                <div className="mt-1 flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} size={12} className={star <= comment.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
                                  ))}
                                </div>
                              )}
                              <p className="mt-2 text-sm text-gray-600">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Comments State */}
                {(!viewingContest.comments || viewingContest.comments.length === 0) && (
                  <div className="rounded-lg bg-gray-50 p-6 text-center">
                    <MessageSquare size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No comments yet</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-4 text-xs text-gray-400">
                  {viewingContest.createdAt && <span>Created: {new Date(viewingContest.createdAt).toLocaleDateString('vi-VN')}</span>}
                  {viewingContest.updatedAt && <span>Updated: {new Date(viewingContest.updatedAt).toLocaleDateString('vi-VN')}</span>}
                  <span>ID: {viewingContest.id}</span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Close
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleAction('edit', viewingContest);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
                  >
                    <Edit2 size={16} />
                    Edit Contest
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      <ConfirmActionModal
        isOpen={!!confirmModal}
        onClose={() => {
          if (!confirmLoading) setConfirmModal(null);
        }}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        confirmLabel={confirmModal?.confirmLabel || 'Confirm'}
        variant={confirmModal?.variant || 'danger'}
        onConfirm={() => {
          void confirmModal?.onConfirm();
        }}
        isLoading={confirmLoading}
      />
    </div>
  );
};

export default ContestManager;

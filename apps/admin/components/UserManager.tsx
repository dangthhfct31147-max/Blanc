import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Shield,
  ShieldAlert,
  GraduationCap,
  Eye,
  Edit2,
  Trash2,
  Ban,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Users,
  Sparkles,
  Download as DownloadIcon,
  Plus,
} from 'lucide-react';
import { Dropdown } from './ui/Dropdown';
import { ViewProfileModal, EditUserModal, ConfirmActionModal, CreateUserModal, CreateUserPayload } from './ui/UserModals';
import { User, UserProfile, UpdateUserPayload } from '../types';
import { userService, UserFilters } from '../services/userService';
import { useDebounce } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, avatarPresets } from '../utils/avatar';
import toast from 'react-hot-toast';

const UserManager: React.FC = () => {
  // Auth context - get current user
  const { user: currentUser } = useAuth();

  // Abort controller for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'student' | 'mentor' | 'admin' | 'super_admin'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'banned'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'nameAsc' | 'nameDesc' | 'balanceDesc'>('newest');

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Stats
  const [stats, setStats] = useState<{ totalUsers: number; activeUsers: number; bannedUsers: number; newUsersThisMonth: number }>({
    totalUsers: 0,
    activeUsers: 0,
    bannedUsers: 0,
    newUsersThisMonth: 0,
  });

  // Modal States
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'active' | 'inactive' | 'banned'>('active');

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Debounce search
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch users with abort controller support
  const fetchUsers = useCallback(
    async (skipCache = false) => {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const filters: UserFilters = {
          search: debouncedSearch || undefined,
          role: filterRole !== 'all' ? filterRole : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          page: pagination.page,
          limit: pagination.limit,
        };

        const response = await userService.getAll(filters, {
          signal: controller.signal,
          skipCache,
        });

        // Only update state if this request wasn't aborted
        if (!controller.signal.aborted) {
          setUsers(response.items);
          setPagination((prev) => ({
            ...prev,
            total: response.total,
            totalPages: response.totalPages,
          }));
          setError(null);
        }
      } catch (err: any) {
        // Ignore abort errors
        if (err.name === 'AbortError' || controller.signal.aborted) {
          return;
        }

        console.error('Failed to fetch users:', err);
        setError(err.message || 'Failed to load users. Please check your connection and try again.');
        setUsers([]);
      } finally {
        // Only set loading false if this controller is still the current one
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [debouncedSearch, filterRole, filterStatus, pagination.page, pagination.limit]
  );

  // Initial fetch and cleanup
  useEffect(() => {
    fetchUsers();
    // Load user stats for hero
    (async () => {
      const s = await userService.getStats();
      setStats(s);
    })();

    // Cleanup: abort on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchUsers]);

  // Reset to first page on search/filter changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch, filterRole, filterStatus]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.action-dropdown')) return;
      setOpenActionId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Protected accounts that cannot be deleted or banned
  const PROTECTED_EMAILS = ['dangthhfct31147@gmail.com'];

  const canCreateUsers = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  const allowedCreateRoles = useMemo<CreateUserPayload['role'][]>(() => {
    if (currentUser?.role === 'super_admin') return ['student', 'mentor', 'admin', 'super_admin'];
    if (currentUser?.role === 'admin') return ['student', 'mentor'];
    return [];
  }, [currentUser?.role]);

  // Check if user is self (cannot ban/delete self)
  const isSelf = (userId: string) => currentUser?.id === userId;

  // Check if user is protected (cannot be deleted)
  const isProtectedUser = (email: string) => PROTECTED_EMAILS.includes(email.toLowerCase());

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectAll((prev) => !prev);
    setSelectedIds((prev) => {
      if (!selectAll) {
        return new Set(users.map((u) => u.id));
      }
      return new Set();
    });
  };

  const handleCreateUser = async (payload: CreateUserPayload) => {
    if (!canCreateUsers) {
      toast.error('You do not have permission to create users');
      return;
    }

    if (!allowedCreateRoles.includes(payload.role)) {
      toast.error('You are not allowed to assign that role');
      return;
    }

    try {
      setCreateLoading(true);
      await userService.create(payload);
      toast.success('User created successfully');
      setShowCreateModal(false);
      await fetchUsers(true);
      const s = await userService.getStats();
      setStats(s);
    } catch (err: any) {
      console.error('Failed to create user:', err);
      toast.error(err?.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle View Profile action
  const handleViewProfile = async (user: User) => {
    setSelectedUser(user);
    setOpenActionId(null);
    setProfileLoading(true);
    setShowProfileModal(true);

    try {
      const profile = await userService.getUserProfile(user.id);
      setUserProfile(profile);
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      toast.error(err.message || 'Failed to load user profile');
      // Use basic user data as fallback
      setUserProfile({
        ...user,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as UserProfile);
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Edit action
  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setOpenActionId(null);
    setShowEditModal(true);
  };

  // Handle Save Edit
  const handleSaveEdit = async (data: UpdateUserPayload) => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      const updatedUser = await userService.updateUserDetails(selectedUser.id, data);

      // Invalidate cache and refresh from server
      userService.invalidateCache();

      // Update local state
      setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, ...updatedUser } : u)));

      toast.success('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Failed to update user:', err);
      toast.error(err.message || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Status Change (Ban/Activate)
  const handleStatusAction = (user: User, newStatus: 'active' | 'inactive' | 'banned') => {
    if (isSelf(user.id)) {
      toast.error('Cannot change your own status');
      return;
    }
    setSelectedUser(user);
    setPendingStatus(newStatus);
    setOpenActionId(null);
    setShowStatusConfirm(true);
  };

  // Confirm Status Change
  const handleConfirmStatus = async (reason?: string) => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      let updated;
      if (pendingStatus === 'banned') {
        updated = await userService.ban(selectedUser.id, reason);
        toast.success(`User "${selectedUser.name}" has been banned.`);
      } else {
        updated = await userService.activate(selectedUser.id);
        toast.success(`User "${selectedUser.name}" has been activated.`);
      }

      // Invalidate cache
      userService.invalidateCache();

      // Update local state
      setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, status: updated.status } : u)));

      setShowStatusConfirm(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      toast.error(err.message || 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete action
  const handleDeleteAction = (user: User) => {
    if (isSelf(user.id)) {
      toast.error('Cannot delete your own account');
      return;
    }
    if (isProtectedUser(user.email)) {
      toast.error('This account is protected and cannot be deleted');
      return;
    }
    setSelectedUser(user);
    setOpenActionId(null);
    setShowDeleteConfirm(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async (reason?: string) => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      await userService.deleteUser(selectedUser.id, { reason });

      // Invalidate cache
      userService.invalidateCache();

      // Remove from local state
      setUsers(users.filter((u) => u.id !== selectedUser.id));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));

      toast.success('User deleted successfully');
      setShowDeleteConfirm(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  // Legacy handleAction for compatibility
  const handleAction = async (action: string, user: User) => {
    setOpenActionId(null);

    switch (action) {
      case 'view':
        handleViewProfile(user);
        break;
      case 'edit':
        handleEdit(user);
        break;
      case 'ban':
        handleStatusAction(user, 'banned');
        break;
      case 'activate':
        handleStatusAction(user, 'active');
        break;
      case 'delete':
        handleDeleteAction(user);
        break;
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Visible users after local sort
  const visibleUsers = useMemo(() => {
    const sorted = [...users];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'nameAsc':
          return a.name.localeCompare(b.name);
        case 'nameDesc':
          return b.name.localeCompare(a.name);
        case 'balanceDesc':
          return b.balance - a.balance;
        case 'newest':
        default:
          // Without createdAt, keep server order
          return 0;
      }
    });
    return sorted;
  }, [users, sortBy]);

  // Bulk actions
  const exportSelectedCSV = () => {
    const rows = visibleUsers
      .filter((u) => selectedIds.has(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        balance: u.balance,
      }));
    const header = 'id,name,email,role,status,balance';
    const csv = [header, ...rows.map((r) => `${r.id},"${r.name.replace(/"/g, '"')}",${r.email},${r.role},${r.status},${r.balance}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySelectedEmails = () => {
    const emails = visibleUsers
      .filter((u) => selectedIds.has(u.id))
      .map((u) => u.email)
      .join(', ');
    navigator.clipboard.writeText(emails).then(() => toast.success('Copied emails to clipboard'));
  };

  const bulkUpdateStatus = async (status: 'active' | 'banned') => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setActionLoading(true);
    try {
      for (const id of ids) {
        if (status === 'banned') {
          await userService.ban(id, 'Bulk action');
        } else {
          await userService.activate(id);
        }
      }
      userService.invalidateCache();
      await fetchUsers(true);
      setSelectedIds(new Set());
      setSelectAll(false);
      toast.success(`Bulk ${status === 'banned' ? 'ban' : 'activate'} completed`);
    } catch (err: any) {
      toast.error(err.message || 'Bulk action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro hero with stats */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl shadow-sky-100/60">
        <div className="absolute inset-0 bg-linear-to-br from-sky-50 via-white to-emerald-50 opacity-90" aria-hidden="true" />
        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.35fr_1fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm">
                <Users className="h-3.5 w-3.5" />
                Quản trị người dùng
              </div>
              <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">Quản lý tài khoản, vai trò và trạng thái</h2>
              <p className="text-sm text-gray-600 md:text-base">Bộ công cụ toàn diện: lọc, sắp xếp, thao tác hàng loạt, xuất CSV, xem hồ sơ và nhật ký.</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-sm">
                  <Search className="h-4 w-4 text-sky-500" />
                  Tìm kiếm nhanh
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-sm">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  Lọc & sắp xếp
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-md">
                <div className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Tổng quan</div>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-3xl font-bold text-gray-900">{stats.totalUsers || 0}</span>
                  <span className="text-sm text-gray-500">người dùng</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Cập nhật liên tục từ hệ thống.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
                  <div className="text-xs font-semibold text-emerald-700">Active</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-800">{stats.activeUsers || 0}</div>
                </div>
                <div className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3">
                  <div className="text-xs font-semibold text-red-700">Banned</div>
                  <div className="mt-1 text-2xl font-bold text-red-800">{stats.bannedUsers || 0}</div>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3">
                  <div className="text-xs font-semibold text-amber-700">Tháng này</div>
                  <div className="mt-1 text-2xl font-bold text-amber-800">{stats.newUsersThisMonth || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Students & Admins</h2>
          <p className="mt-1 text-gray-500">Manage user roles and permissions</p>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!canCreateUsers || createLoading}
            className={
              canCreateUsers
                ? 'inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50'
                : 'inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-400'
            }
            title={canCreateUsers ? 'Add user' : 'Only admin/super admin can create users'}
          >
            <Plus size={18} />
            Add User
          </button>
          <div className="relative w-full sm:w-72">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-lg border p-2 transition-colors ${showFilters ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            title="Toggle filters"
          >
            <Filter size={18} />
          </button>
          <button
            onClick={() => fetchUsers(true)}
            disabled={isLoading}
            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <div className="min-w-40">
            <Dropdown
              label="Role"
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'student', label: 'Student', color: 'bg-gray-400' },
                { value: 'mentor', label: 'Mentor', color: 'bg-emerald-500' },
                { value: 'admin', label: 'Admin', color: 'bg-purple-500' },
                { value: 'super_admin', label: 'Super Admin', color: 'bg-red-500' },
              ]}
              value={filterRole}
              onChange={(val) => setFilterRole(val as typeof filterRole)}
              placeholder="Select role"
              size="sm"
            />
          </div>
          <div className="min-w-40">
            <Dropdown
              label="Sort"
              options={[
                { value: 'newest', label: 'Newest' },
                { value: 'nameAsc', label: 'Name A-Z' },
                { value: 'nameDesc', label: 'Name Z-A' },
                { value: 'balanceDesc', label: 'Balance High-Low' },
              ]}
              value={sortBy}
              onChange={(val) => setSortBy(val as typeof sortBy)}
              placeholder="Select sort"
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Bulk actions toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <span className="text-sm text-gray-600">Đã chọn {selectedIds.size} người dùng</span>
          <button
            onClick={() => bulkUpdateStatus('active')}
            disabled={actionLoading}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Activate
          </button>
          <button
            onClick={() => bulkUpdateStatus('banned')}
            disabled={actionLoading}
            className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Ban
          </button>
          <button
            onClick={exportSelectedCSV}
            className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <DownloadIcon className="h-4 w-4" />
            Export CSV
          </button>
          <button onClick={copySelectedEmails} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            Copy Emails
          </button>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="animate-fade-in-up flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="min-w-40">
            <Dropdown
              label="Status"
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active', color: 'bg-green-500' },
                { value: 'banned', label: 'Banned', color: 'bg-red-500' },
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

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="min-h-[300px] overflow-x-auto">
          {' '}
          {/* min-h ensure dropdown has space if few items */}
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-900 uppercase">
              <tr>
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={selectAll && selectedIds.size === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Balance</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
                    <p className="text-gray-500">Loading users...</p>
                  </td>
                </tr>
              ) : visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                visibleUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input type="checkbox" aria-label={`Select ${user.name}`} checked={selectedIds.has(user.id)} onChange={() => toggleSelect(user.id)} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img src={getAvatarUrl(user.avatar, user.name, avatarPresets.table)} alt="" className="h-10 w-10 rounded-full border border-gray-200" />
                        <div>
                          <p className="font-semibold text-gray-900">{user.name}</p>
                          <p className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail size={10} /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {user.role === 'super_admin' ? (
                          <ShieldAlert size={16} className="text-red-600" />
                        ) : user.role === 'admin' ? (
                          <ShieldAlert size={16} className="text-purple-600" />
                        ) : user.role === 'mentor' ? (
                          <GraduationCap size={16} className="text-emerald-600" />
                        ) : (
                          <Shield size={16} className="text-gray-400" />
                        )}
                        <span
                          className={`capitalize ${
                            user.role === 'super_admin'
                              ? 'font-medium text-red-700'
                              : user.role === 'admin'
                                ? 'font-medium text-purple-700'
                                : user.role === 'mentor'
                                  ? 'font-medium text-emerald-700'
                                  : 'text-gray-700'
                          }`}
                        >
                          {user.role === 'super_admin' ? 'super admin' : user.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-700">₫{user.balance.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="action-dropdown relative inline-block text-left">
                        <button
                          onClick={() => setOpenActionId(openActionId === user.id ? null : user.id)}
                          title="User actions"
                          className={`rounded-lg border p-2 transition-all duration-200 ${
                            openActionId === user.id
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {/* Dropdown Menu */}
                        {openActionId === user.id && (
                          <div className="animate-fade-in-up absolute right-0 z-50 mt-2 w-48 origin-top-right overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
                            <div className="py-1">
                              <button
                                onClick={() => handleAction('view', user)}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                              >
                                <Eye size={16} className="text-gray-400" />
                                <span>View Profile</span>
                              </button>
                              <button
                                onClick={() => handleAction('edit', user)}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                              >
                                <Edit2 size={16} className="text-gray-400" />
                                <span>Edit Details</span>
                              </button>

                              <div className="my-1 border-t border-gray-50"></div>

                              {user.status === 'active' ? (
                                <button
                                  onClick={() => handleAction('ban', user)}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-amber-600 transition-colors hover:bg-amber-50"
                                >
                                  <Ban size={16} />
                                  <span>Ban User</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAction('activate', user)}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-emerald-600 transition-colors hover:bg-emerald-50"
                                >
                                  <CheckCircle size={16} />
                                  <span>Activate</span>
                                </button>
                              )}

                              {!isProtectedUser(user.email) && (
                                <button
                                  onClick={() => handleAction('delete', user)}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                                >
                                  <Trash2 size={16} />
                                  <span>Delete User</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
          <span className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
            entries
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
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="rounded border border-gray-300 bg-white px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateUser}
        isLoading={createLoading}
        allowedRoles={allowedCreateRoles}
      />

      {/* View Profile Modal */}
      <ViewProfileModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setUserProfile(null);
          setSelectedUser(null);
        }}
        profile={userProfile}
        isLoading={profileLoading}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSave={handleSaveEdit}
        isLoading={actionLoading}
        isSelf={selectedUser ? isSelf(selectedUser.id) : false}
      />

      {/* Status Change Confirmation Modal */}
      <ConfirmActionModal
        isOpen={showStatusConfirm}
        onClose={() => {
          setShowStatusConfirm(false);
          setSelectedUser(null);
        }}
        title={pendingStatus === 'active' ? 'Activate User' : pendingStatus === 'banned' ? 'Ban User' : 'Deactivate User'}
        message={
          pendingStatus === 'active'
            ? `Are you sure you want to activate "${selectedUser?.name}"? They will regain full access to the platform.`
            : pendingStatus === 'banned'
              ? `Are you sure you want to ban "${selectedUser?.name}"? They will lose access to the platform.`
              : `Are you sure you want to deactivate "${selectedUser?.name}"?`
        }
        confirmLabel={pendingStatus === 'active' ? 'Activate' : pendingStatus === 'banned' ? 'Ban User' : 'Deactivate'}
        variant={pendingStatus === 'active' ? 'success' : pendingStatus === 'banned' ? 'danger' : 'warning'}
        showReasonInput={pendingStatus === 'banned'}
        reasonRequired={pendingStatus === 'banned'}
        onConfirm={handleConfirmStatus}
        isLoading={actionLoading}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmActionModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedUser(null);
        }}
        title="Delete User"
        message={`Are you sure you want to delete "${selectedUser?.name}"? This action cannot be undone.`}
        confirmLabel="Delete User"
        variant="danger"
        showReasonInput={true}
        onConfirm={handleConfirmDelete}
        isLoading={actionLoading}
      />
    </div>
  );
};

export default UserManager;

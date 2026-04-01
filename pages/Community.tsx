import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Users, Filter, Plus, Loader2, RefreshCw, ChevronRight, ChevronDown, Check, X, Sparkles, MessageCircle, UsersRound } from 'lucide-react';
import { Button, Card, Badge } from '../components/ui/Common';
import CreateTeamPostModal from '../components/CreateTeamPostModal';
import TeamPostDetailModal from '../components/TeamPostDetailModal';
import TeamMembersManager from '../components/TeamMembersManager';
import TeammateRecommendations from '../components/TeammateRecommendations';
import UserAvatar from '../components/UserAvatar';
import { api } from '../lib/api';
import { TeamPost } from '../types';
import { useI18n } from '../contexts/I18nContext';
import { useAppAuth } from '../contexts/AppAuthContext';

const ROLES = [
   'Frontend Dev',
   'Backend Dev',
   'Fullstack Dev',
   'Mobile Dev',
   'UI/UX Designer',
   'Graphic Designer',
   'Business Analyst',
   'Product Manager',
   'Data Analyst',
   'DevOps',
   'QA/Tester',
   'Pitching',
   'Content Writer',
   'Marketing',
   'Other'
];

const ROLE_COLORS: Record<string, string> = {
   'Frontend Dev': 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800',
   'Backend Dev': 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-100 dark:border-green-800',
   'Fullstack Dev': 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800',
   'Mobile Dev': 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-100 dark:border-cyan-800',
   'UI/UX Designer': 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800',
   'Graphic Designer': 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-100 dark:border-pink-800',
   'Business Analyst': 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800',
   'Product Manager': 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-800',
   'Data Analyst': 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-800',
   'DevOps': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
   'QA/Tester': 'bg-lime-50 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 border-lime-100 dark:border-lime-800',
   'Pitching': 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-800',
   'Content Writer': 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-100 dark:border-violet-800',
   'Marketing': 'bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-100 dark:border-fuchsia-800',
   'Other': 'bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-gray-800'
};

interface TeamPostsResponse {
   posts: TeamPost[];
   pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
   };
}

const Community: React.FC = () => {
   const { locale } = useI18n();
   const { authStatus, syncError, user } = useAppAuth();
   const isEn = locale === 'en';

   const copy = useMemo(() => isEn ? {
      badge: 'ContestHub Community',
      heroTitle: 'Team up for contests, find the right teammates',
      heroDesc: 'Find perfect teammates for upcoming contests. Connect, share ideas, and win together.',
      quickTeam: 'Quick team matching',
      discussIdeas: 'Discuss ideas',
      connectMentor: 'Connect with mentors',
      openPosts: 'Open posts',
      posts: 'posts',
      updatedDaily: 'Updated daily to help you find the right teammates.',
      popularRoles: 'Popular roles',
      connectionSpeed: 'Connection speed',
      fast: 'Fast',
      searchPlaceholder: 'Search by team name, contest...',
      allRoles: 'All roles',
      selectRole: 'Select a role',
      filter: 'Filter',
      postTeam: 'Post team search',
      found: 'Found',
      postsCount: 'posts',
      refresh: 'Refresh',
      loading: 'Loading list...',
      errorTitle: 'An error occurred',
      retry: 'Retry',
      noPosts: 'No posts yet',
      noPostsFiltered: 'No posts matching your filters. Try changing your search criteria.',
      noPostsEmpty: 'Be the first to post a team search for an upcoming contest!',
      freeTeam: 'Open team search',
      lookingFor: 'Looking for:',
      viewMore: 'View more',
      prev: 'Previous',
      next: 'Next',
      pageOf: 'Page',
      today: 'Today',
      yesterday: 'Yesterday',
      daysAgo: 'days ago',
      loadError: 'Could not load list',
   } : {
      badge: 'Cộng đồng ContestHub',
      heroTitle: 'Ghép đội thi đấu, kết nối đúng đồng đội',
      heroDesc: 'Tìm kiếm đồng đội hoàn hảo cho các cuộc thi sắp tới. Kết nối, chia sẻ ý tưởng và cùng nhau chiến thắng.',
      quickTeam: 'Ghép đội nhanh',
      discussIdeas: 'Thảo luận ý tưởng',
      connectMentor: 'Kết nối mentor',
      openPosts: 'Bài đăng đang mở',
      posts: 'bài đăng',
      updatedDaily: 'Cập nhật mới mỗi ngày để bạn tìm đúng đồng đội.',
      popularRoles: 'Vai trò phổ biến',
      connectionSpeed: 'Tốc độ kết nối',
      fast: 'Nhanh',
      searchPlaceholder: 'Tìm theo tên đội, cuộc thi...',
      allRoles: 'Mọi vai trò',
      selectRole: 'Chọn vai trò',
      filter: 'Lọc',
      postTeam: 'Đăng tin tìm đội',
      found: 'Tìm thấy',
      postsCount: 'bài đăng',
      refresh: 'Làm mới',
      loading: 'Đang tải danh sách...',
      errorTitle: 'Có lỗi xảy ra',
      retry: 'Thử lại',
      noPosts: 'Chưa có bài đăng nào',
      noPostsFiltered: 'Không tìm thấy bài đăng phù hợp với bộ lọc của bạn. Thử thay đổi điều kiện tìm kiếm.',
      noPostsEmpty: 'Hãy là người đầu tiên đăng tin tìm đội cho cuộc thi sắp tới!',
      freeTeam: 'Tìm đội tự do',
      lookingFor: 'Cần tìm:',
      viewMore: 'Xem thêm',
      prev: 'Trước',
      next: 'Sau',
      pageOf: 'Trang',
      today: 'Hôm nay',
      yesterday: 'Hôm qua',
      daysAgo: 'ngày trước',
      loadError: 'Không thể tải danh sách',
   }, [isEn]);

   const [posts, setPosts] = useState<TeamPost[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedRole, setSelectedRole] = useState('');
   const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
   const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
   const [selectedPost, setSelectedPost] = useState<TeamPost | null>(null);
   const [isMembersManagerOpen, setIsMembersManagerOpen] = useState(false);
   const dropdownRef = useRef<HTMLDivElement>(null);

   const isLoggedIn = authStatus === 'authenticated' && Boolean(user);
   const currentUserId = user?.id;

   // Close dropdown when clicking outside
   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsRoleDropdownOpen(false);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);

   const fetchPosts = useCallback(async (page = 1) => {
      setIsLoading(true);
      setError(null);

      try {
         const params = new URLSearchParams({
            page: page.toString(),
            limit: '12',
            status: 'open'
         });

         if (searchQuery.trim()) {
            params.set('search', searchQuery.trim());
         }
         if (selectedRole) {
            params.set('role', selectedRole);
         }

         const data = await api.get<TeamPostsResponse>(`/teams?${params}`);
         setPosts(data.posts);
         setPagination({
            page: data.pagination.page,
            totalPages: data.pagination.totalPages,
            total: data.pagination.total
         });
      } catch (err) {
         setError(err instanceof Error ? err.message : copy.loadError);
      } finally {
         setIsLoading(false);
      }
   }, [searchQuery, selectedRole]);

   useEffect(() => {
      fetchPosts();
   }, [fetchPosts]);

   const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      fetchPosts(1);
   };

   const handleCreateClick = () => {
      if (authStatus === 'signed_out') {
         window.dispatchEvent(new CustomEvent('show-auth-modal', { detail: { mode: 'login' } }));
         return;
      }
      if (!isLoggedIn) {
         alert(syncError?.message || (isEn
            ? 'Your account is still syncing. Please wait a moment and try again.'
            : 'Tài khoản của bạn đang được đồng bộ. Vui lòng đợi một chút rồi thử lại.'));
         return;
      }
      setIsModalOpen(true);
   };

   const handlePostSuccess = () => {
      fetchPosts(1);
   };

   const getInitials = (name?: string) => {
      if (!name) return '??';
      return name
         .split(' ')
         .map(word => word[0])
         .join('')
         .toUpperCase()
         .slice(0, 2);
   };

   const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return copy.today;
      if (diffDays === 1) return copy.yesterday;
      if (diffDays < 7) return `${diffDays} ${copy.daysAgo}`;
      return date.toLocaleDateString(isEn ? 'en-US' : 'vi-VN');
   };

   return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
         {/* Header */}
         <section className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-emerald-100/60 mb-12">
            <div className="absolute inset-0 bg-linear-to-br from-emerald-50 dark:from-emerald-950/30 via-white dark:via-slate-950 to-sky-50 dark:to-sky-950/30 opacity-90" aria-hidden="true" />
            <div className="absolute -top-24 right-8 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-28 left-6 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" aria-hidden="true" />
            <div className="relative p-6 md:p-8 lg:p-10">
               <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-8 items-center">
                  <div className="space-y-4 animate-fade-in-up">
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 border border-white/70 dark:border-slate-700 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-sm">
                        <Sparkles className="w-3.5 h-3.5" />
                        {copy.badge}
                     </div>
                     <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
                        {copy.heroTitle}
                     </h1>
                     <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                        {copy.heroDesc}
                     </p>
                     <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 shadow-sm">
                           <UsersRound className="w-4 h-4 text-emerald-500" />
                           {copy.quickTeam}
                        </div>
                        <div className="flex items-center gap-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 shadow-sm">
                           <MessageCircle className="w-4 h-4 text-sky-500" />
                           {copy.discussIdeas}
                        </div>
                        <div className="flex items-center gap-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 shadow-sm">
                           <Users className="w-4 h-4 text-amber-500" />
                           {copy.connectMentor}
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4 animate-fade-in-up">
                     <div className="rounded-2xl border border-white/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 p-5 shadow-md">
                        <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-400">{copy.openPosts}</div>
                        <div className="mt-3 flex items-end gap-2">
                           <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{isLoading ? '--' : pagination.total}</span>
                           <span className="text-sm text-slate-500 dark:text-slate-400">{copy.posts}</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                           {copy.updatedDaily}
                        </p>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                        <div className="rounded-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-900/30 px-4 py-3">
                           <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{copy.popularRoles}</div>
                           <div className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                              {isLoading ? '--' : ROLES.length}
                           </div>
                        </div>
                        <div className="rounded-xl border border-sky-100 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-900/30 px-4 py-3">
                           <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">{copy.connectionSpeed}</div>
                           <div className="mt-1 text-2xl font-bold text-sky-800 dark:text-sky-200">{copy.fast}</div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </section>

         {/* AI Teammate Recommendations */}
         {isLoggedIn && (
            <div className="mb-8">
               <TeammateRecommendations
                  onViewProfile={(userId) => {
                     console.log('View profile:', userId);
                     // TODO: Navigate to user profile
                  }}
                  onInvite={(userId) => {
                     console.log('Invite user:', userId);
                     // TODO: Open invite modal
                  }}
               />
            </div>
         )}

         {/* Filter Bar */}
         <form onSubmit={handleSearch} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-center mb-8">
            <div className="relative grow w-full">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
               <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none dark:text-slate-100"
               />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
               {/* Custom Role Dropdown */}
               <div className="relative" ref={dropdownRef}>
                  <button
                     type="button"
                     onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                     className={`min-w-[180px] px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 outline-none cursor-pointer transition-all flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${isRoleDropdownOpen ? 'ring-2 ring-primary-500 border-primary-500 bg-white dark:bg-slate-900' : ''
                        } ${selectedRole ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                     <span className="truncate">{selectedRole || copy.allRoles}</span>
                     <div className="flex items-center gap-1">
                        {selectedRole && (
                           <span
                              onClick={(e) => {
                                 e.stopPropagation();
                                 setSelectedRole('');
                              }}
                              className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                           >
                              <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                           </span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                     </div>
                  </button>

                  {/* Dropdown Menu */}
                  {isRoleDropdownOpen && (
                     <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                           <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider px-2">{copy.selectRole}</p>
                        </div>
                        <div className="max-h-[280px] overflow-y-auto p-2">
                           <button
                              type="button"
                              onClick={() => {
                                 setSelectedRole('');
                                 setIsRoleDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2.5 rounded-lg text-sm text-left transition-all flex items-center justify-between group ${!selectedRole
                                 ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                                 : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                 }`}
                           >
                              <span>{copy.allRoles}</span>
                              {!selectedRole && <Check className="w-4 h-4 text-primary-600" />}
                           </button>
                           {ROLES.map(role => {
                              const isSelected = selectedRole === role;
                              const colorClass = ROLE_COLORS[role] || ROLE_COLORS['Other'];
                              return (
                                 <button
                                    key={role}
                                    type="button"
                                    onClick={() => {
                                       setSelectedRole(role);
                                       setIsRoleDropdownOpen(false);
                                    }}
                                    className={`w-full px-3 py-2.5 rounded-lg text-sm text-left transition-all flex items-center justify-between group ${isSelected
                                       ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                                       : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                       }`}
                                 >
                                    <div className="flex items-center gap-2">
                                       <span className={`w-2 h-2 rounded-full ${colorClass.split(' ')[0].replace('bg-', 'bg-').replace('-50', '-400')}`}></span>
                                       <span>{role}</span>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-primary-600" />}
                                 </button>
                              );
                           })}
                        </div>
                     </div>
                  )}
               </div>

               <Button type="submit" variant="secondary" className="hidden md:flex">
                  <Filter className="w-4 h-4 mr-2" />
                  {copy.filter}
               </Button>
               <Button type="button" onClick={handleCreateClick}>
                  <Plus className="w-4 h-4 mr-2" />
                  {copy.postTeam}
               </Button>
            </div>
         </form>

         {/* Stats */}
         {!isLoading && !error && (
            <div className="flex items-center justify-between mb-6">
               <p className="text-sm text-slate-500 dark:text-slate-400">
                  {copy.found} <span className="font-semibold text-slate-900 dark:text-slate-100">{pagination.total}</span> {copy.postsCount}
               </p>
               <button
                  onClick={() => fetchPosts(pagination.page)}
                  className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
               >
                  <RefreshCw className="w-4 h-4" />
                  {copy.refresh}
               </button>
            </div>
         )}

         {/* Loading State */}
         {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
               <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-4" />
               <p className="text-slate-500 dark:text-slate-400">{copy.loading}</p>
            </div>
         )}

         {/* Error State */}
         {error && !isLoading && (
            <Card className="p-8 text-center">
               <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-red-500" />
               </div>
               <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{copy.errorTitle}</h3>
               <p className="text-slate-500 dark:text-slate-400 mb-4">{error}</p>
               <Button onClick={() => fetchPosts(1)}>{copy.retry}</Button>
            </Card>
         )}

         {/* Empty State */}
         {!isLoading && !error && posts.length === 0 && (
            <Card className="p-12 text-center">
               <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <Users className="w-10 h-10 text-slate-400" />
               </div>
               <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">{copy.noPosts}</h3>
               <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                  {searchQuery || selectedRole
                     ? copy.noPostsFiltered
                     : copy.noPostsEmpty}
               </p>
               <Button onClick={handleCreateClick}>
                  <Plus className="w-4 h-4 mr-2" />
                  {copy.postTeam}
               </Button>
            </Card>
         )}

         {/* Team Cards Grid */}
         {!isLoading && !error && posts.length > 0 && (
            <>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.map(post => (
                     <Card key={post.id} className="p-6 hover:border-primary-300 hover:shadow-lg transition-all group">
                        {/* Header */}
                        <div className="flex items-start gap-4 mb-4">
                           <UserAvatar
                              userId={post.createdBy.id}
                              name={post.createdBy.name}
                              avatar={post.createdBy.avatar}
                              size="lg"
                           />
                           <div className="grow min-w-0">
                              <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-primary-600 transition-colors">
                                 {post.title}
                              </h3>
                              {post.contestTitle ? (
                                 <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{post.contestTitle}</div>
                              ) : (
                                 <div className="text-xs text-slate-400 dark:text-slate-500">{copy.freeTeam}</div>
                              )}
                           </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
                           {post.description}
                        </p>

                        {/* Roles Needed */}
                        <div className="mb-4">
                           <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block mb-2">{copy.lookingFor}</span>
                           <div className="flex flex-wrap gap-1.5">
                              {post.rolesNeeded.slice(0, 3).map(role => (
                                 <Badge key={role} className={ROLE_COLORS[role] || ROLE_COLORS['Other']}>
                                    {role}
                                 </Badge>
                              ))}
                              {post.rolesNeeded.length > 3 && (
                                 <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    +{post.rolesNeeded.length - 3}
                                 </Badge>
                              )}
                           </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                           <div className="flex items-center gap-3">
                              {/* Members */}
                              <div className="flex -space-x-2">
                                 {post.members.slice(0, 3).map((member) => (
                                    <div
                                       key={member.id}
                                       className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 overflow-hidden"
                                       title={member.name}
                                    >
                                       {member.avatar ? (
                                          <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                                       ) : (
                                          <div className="w-full h-full bg-linear-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-xs font-medium">
                                             {getInitials(member.name)}
                                          </div>
                                       )}
                                    </div>
                                 ))}
                                 {post.members.length > 3 && (
                                    <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-600 dark:text-slate-400 font-medium">
                                       +{post.members.length - 3}
                                    </div>
                                 )}
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                 {post.currentMembers}/{post.maxMembers}
                              </span>
                           </div>

                           <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(post.createdAt)}</span>
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                                 onClick={() => setSelectedPost(post)}
                              >
                                 {copy.viewMore}
                                 <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                           </div>
                        </div>
                     </Card>
                  ))}
               </div>

               {/* Pagination */}
               {pagination.totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                     <Button
                        variant="secondary"
                        size="sm"
                        disabled={pagination.page === 1}
                        onClick={() => fetchPosts(pagination.page - 1)}
                     >
                        {copy.prev}
                     </Button>
                     <span className="flex items-center px-4 text-sm text-slate-600 dark:text-slate-400">
                        {copy.pageOf} {pagination.page} / {pagination.totalPages}
                     </span>
                     <Button
                        variant="secondary"
                        size="sm"
                        disabled={pagination.page === pagination.totalPages}
                        onClick={() => fetchPosts(pagination.page + 1)}
                     >
                        {copy.next}
                     </Button>
                  </div>
               )}
            </>
         )}

         {/* Create Modal */}
         <CreateTeamPostModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={handlePostSuccess}
         />

         {/* Detail Modal */}
         <TeamPostDetailModal
            isOpen={!!selectedPost && !isMembersManagerOpen}
            onClose={() => setSelectedPost(null)}
            post={selectedPost}
            currentUserId={currentUserId}
            onJoinRequest={() => {
               // Refresh posts after join request
               fetchPosts(pagination.page);
            }}
            onManageMembers={() => setIsMembersManagerOpen(true)}
         />

         {/* Members Manager Modal */}
         <TeamMembersManager
            isOpen={isMembersManagerOpen}
            onClose={() => setIsMembersManagerOpen(false)}
            post={selectedPost}
            onUpdate={() => {
               // Refresh post data after member update
               fetchPosts(pagination.page);
               if (selectedPost) {
                  // Optionally refresh the selected post detail
                  api.get<TeamPost>(`/teams/${selectedPost.id}`)
                     .then(updatedPost => setSelectedPost(updatedPost))
                     .catch(() => { });
               }
            }}
         />
      </div>
   );
};

export default Community;

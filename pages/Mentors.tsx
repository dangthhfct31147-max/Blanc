import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDownAZ, ArrowDownZA, ArrowLeft, Calendar, CalendarArrowDown, CalendarArrowUp, Info, Loader2, Search, Shuffle, Sparkles, Users, ShieldCheck } from 'lucide-react';
import { Button, Card, Dropdown, DropdownOption, Input } from '../components/ui/Common';
import OptimizedImage from '../components/OptimizedImage';
import Pagination from '../components/Pagination';
import { mentorApi } from '../lib/mentorApi';
import { useDebounce } from '../lib/hooks';
import { MentorDetail, MentorSummary } from '../types';
import { CONTEST_CATEGORIES, ContestCategoryValue } from '../constants/contestCategories';
import { useI18n } from '../contexts/I18nContext';

const ITEMS_PER_PAGE = 12;
const DAILY_SEED_KEY = 'mentor-list-seed';
const DAILY_SEED_DATE_KEY = 'mentor-list-seed-date';
const RANDOM_BATCH_LIMIT = 60;
const MAX_RANDOM_PAGES = 50;

type SortValue = 'random' | 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const SORT_OPTIONS: DropdownOption[] = [
  {
    value: 'random',
    label: 'Ngẫu nhiên (trong ngày)',
    icon: <Shuffle className="w-4 h-4 text-slate-500" />,
    color: 'bg-amber-400',
  },
  {
    value: 'newest',
    label: 'Mới nhất',
    icon: <CalendarArrowDown className="w-4 h-4 text-slate-500" />,
    color: 'bg-emerald-500',
  },
  {
    value: 'oldest',
    label: 'Cũ nhất',
    icon: <CalendarArrowUp className="w-4 h-4 text-slate-500" />,
    color: 'bg-slate-400',
  },
  {
    value: 'name-asc',
    label: 'Tên A-Z',
    icon: <ArrowDownAZ className="w-4 h-4 text-slate-500" />,
    color: 'bg-sky-500',
  },
  {
    value: 'name-desc',
    label: 'Tên Z-A',
    icon: <ArrowDownZA className="w-4 h-4 text-slate-500" />,
    color: 'bg-indigo-500',
  },
];

type MentorFieldValue = '' | ContestCategoryValue;

const CATEGORY_LABELS: Record<string, string> = {
  'it': 'IT & Tech',
  'it & tech': 'IT & Tech',
  'it & tech (hackathon, coding, ai/ml)': 'IT & Tech',
  'hackathon': 'IT & Tech',
  'coding': 'IT & Tech',
  'coding contest': 'IT & Tech',
  'ai/ml': 'IT & Tech',
  'ai': 'IT & Tech',
  'ml': 'IT & Tech',
  'programming': 'IT & Tech',
  'data': 'Data & Analytics',
  'data & analytics': 'Data & Analytics',
  'analytics': 'Data & Analytics',
  'data science': 'Data & Analytics',
  'cyber': 'Cybersecurity',
  'cybersecurity': 'Cybersecurity',
  'security': 'Cybersecurity',
  'infosec': 'Cybersecurity',
  'robotics': 'Robotics & IoT',
  'robot': 'Robotics & IoT',
  'iot': 'Robotics & IoT',
  'embedded': 'Robotics & IoT',
  'hardware': 'Robotics & IoT',
  'design': 'Design / UI-UX',
  'ui': 'Design / UI-UX',
  'ux': 'Design / UI-UX',
  'ui/ux': 'Design / UI-UX',
  'product design': 'Design / UI-UX',
  'business': 'Business & Strategy',
  'strategy': 'Business & Strategy',
  'case study': 'Business & Strategy',
  'management': 'Business & Strategy',
  'startup': 'Startup & Innovation',
  'innovation': 'Startup & Innovation',
  'pitch': 'Startup & Innovation',
  'entrepreneurship': 'Startup & Innovation',
  'marketing': 'Marketing & Growth',
  'growth': 'Marketing & Growth',
  'branding': 'Marketing & Growth',
  'brand': 'Marketing & Growth',
  'seo': 'Marketing & Growth',
  'ads': 'Marketing & Growth',
  'finance': 'Finance & Fintech',
  'fintech': 'Finance & Fintech',
  'investment': 'Finance & Fintech',
  'trading': 'Finance & Fintech',
  'health': 'Health & Biotech',
  'biotech': 'Health & Biotech',
  'medical': 'Health & Biotech',
  'med': 'Health & Biotech',
  'education': 'Education & EdTech',
  'edtech': 'Education & EdTech',
  'learning': 'Education & EdTech',
  'training': 'Education & EdTech',
  'sustainability': 'Sustainability & Environment',
  'environment': 'Sustainability & Environment',
  'green': 'Sustainability & Environment',
  'climate': 'Sustainability & Environment',
  'gaming': 'Gaming & Esports',
  'esports': 'Gaming & Esports',
  'game': 'Gaming & Esports',
  'research': 'Research & Science',
  'science': 'Research & Science',
  'other': 'Other',
};

const getCategoryLabel = (category?: string) => {
  if (!category) return '';
  const normalized = category.toLowerCase().trim();
  if (CATEGORY_LABELS[normalized]) return CATEGORY_LABELS[normalized];
  const hit = Object.entries(CATEGORY_LABELS).find(([key]) => normalized.includes(key));
  return hit ? hit[1] : category;
};

const FIELD_OPTIONS: DropdownOption[] = [
  { value: '', label: 'Tất cả' },
  ...CONTEST_CATEGORIES.map((category) => ({
    value: category.value,
    label: getCategoryLabel(category.value),
  })),
];

const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDailySeed = () => {
  const today = getLocalDateKey();
  try {
    const storedDate = localStorage.getItem(DAILY_SEED_DATE_KEY);
    const storedSeed = localStorage.getItem(DAILY_SEED_KEY);
    if (storedDate === today && storedSeed) {
      return storedSeed;
    }
    const nextSeed = Math.random().toString(36).slice(2, 10);
    localStorage.setItem(DAILY_SEED_DATE_KEY, today);
    localStorage.setItem(DAILY_SEED_KEY, nextSeed);
    return nextSeed;
  } catch {
    return today;
  }
};

const hashSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffleWithSeed = <T,>(items: T[], seed: string): T[] => {
  const result = [...items];
  const random = mulberry32(hashSeed(seed || '0'));
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const formatDate = (value?: string | null, locale: 'en-US' | 'vi-VN' = 'en-US') => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const MentorList: React.FC = () => {
  const navigate = useNavigate();
  const { locale } = useI18n();
  const isEn = locale === 'en';

  const copy = useMemo(() => isEn ? {
    badge: 'Mentor companions',
    heroTitle: 'Connect with the right mentor, accelerate your goals',
    heroDesc: 'Discover mentors by field, optimize your growth path, and get daily recommendations.',
    searchByExpertise: 'Search by expertise',
    highQuality: 'High quality',
    dailySuggestions: 'Daily suggestions',
    mentorCommunity: 'Mentor community',
    matchingResults: 'Matching results',
    totalMentors: 'Total mentors',
    currentlyShowing: 'Currently showing',
    fields: 'Fields',
    pages: 'Pages',
    mentorNoun: 'mentors',
    updatedNote: 'Continuously updated, prioritizing recently active mentors.',
    title: 'Mentor',
    subtitle: 'List of mentors and their journey accompanying learners.',
    privacyNote: 'This page does not use your personal data for mentor suggestions. This is a curated list of mentors for your reference.',
    searchPlaceholder: 'Search mentor by name...',
    fieldLabel: 'Field',
    selectField: 'Select field',
    allFields: 'All',
    sortLabel: 'Sort by',
    sortPlaceholder: 'Select...',
    loadingMentors: 'Loading mentors...',
    noMentors: 'No matching mentors found.',
    joined: 'Joined:',
    loadError: 'Could not load mentor list',
    randomLoadError: 'Could not load mentors',
    sortRandom: 'Random (daily)',
    sortNewest: 'Newest',
    sortOldest: 'Oldest',
    sortNameAsc: 'Name A-Z',
    sortNameDesc: 'Name Z-A',
  } : {
    badge: 'Mentor đồng hành',
    heroTitle: 'Kết nối mentor phù hợp, bứt phá mục tiêu học tập',
    heroDesc: 'Khám phá mentor theo lĩnh vực, tối ưu lộ trình phát triển và nhận gợi ý phù hợp mỗi ngày.',
    searchByExpertise: 'Tìm theo chuyên môn',
    highQuality: 'Chất lượng cao',
    dailySuggestions: 'Gợi ý mỗi ngày',
    mentorCommunity: 'Cộng đồng mentor',
    matchingResults: 'Kết quả phù hợp',
    totalMentors: 'Tổng mentor',
    currentlyShowing: 'Đang hiển thị',
    fields: 'Lĩnh vực',
    pages: 'Trang',
    mentorNoun: 'mentor',
    updatedNote: 'Cập nhật liên tục, ưu tiên mentor có hoạt động gần đây.',
    title: 'Mentor',
    subtitle: 'Danh sách mentor và hành trình đồng hành cùng học viên.',
    privacyNote: 'Trang này không dùng thông tin người dùng để gợi ý mentor. Đây là nơi tổng hợp thông tin mentor để bạn tham khảo.',
    searchPlaceholder: 'Tìm mentor theo tên...',
    fieldLabel: 'Lĩnh vực',
    selectField: 'Chọn lĩnh vực',
    allFields: 'Tất cả',
    sortLabel: 'Sắp xếp',
    sortPlaceholder: 'Chọn...',
    loadingMentors: 'Đang tải mentor...',
    noMentors: 'Chưa có mentor phù hợp.',
    joined: 'Tham gia:',
    loadError: 'Không thể tải danh sách mentor',
    randomLoadError: 'Không thể tải mentor',
    sortRandom: 'Ngẫu nhiên (trong ngày)',
    sortNewest: 'Mới nhất',
    sortOldest: 'Cũ nhất',
    sortNameAsc: 'Tên A-Z',
    sortNameDesc: 'Tên Z-A',
  }, [isEn]);

  const SORT_OPTIONS_LOCALIZED: DropdownOption[] = useMemo(() => [
    { value: 'random', label: copy.sortRandom, icon: <Shuffle className="w-4 h-4 text-slate-500" />, color: 'bg-amber-400' },
    { value: 'newest', label: copy.sortNewest, icon: <CalendarArrowDown className="w-4 h-4 text-slate-500" />, color: 'bg-emerald-500' },
    { value: 'oldest', label: copy.sortOldest, icon: <CalendarArrowUp className="w-4 h-4 text-slate-500" />, color: 'bg-slate-400' },
    { value: 'name-asc', label: copy.sortNameAsc, icon: <ArrowDownAZ className="w-4 h-4 text-slate-500" />, color: 'bg-sky-500' },
    { value: 'name-desc', label: copy.sortNameDesc, icon: <ArrowDownZA className="w-4 h-4 text-slate-500" />, color: 'bg-indigo-500' },
  ], [copy]);

  const FIELD_OPTIONS_LOCALIZED: DropdownOption[] = useMemo(() => [
    { value: '', label: copy.allFields },
    ...CONTEST_CATEGORIES.map((category) => ({
      value: category.value,
      label: getCategoryLabel(category.value),
    })),
  ], [copy]);
  const [mentors, setMentors] = useState<MentorSummary[]>([]);
  const [randomMentors, setRandomMentors] = useState<MentorSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [field, setField] = useState<MentorFieldValue>('');
  const [sort, setSort] = useState<SortValue>('random');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, field, sort]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / ITEMS_PER_PAGE)), [total]);

  const fetchMentors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await mentorApi.listPublic({
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch || undefined,
        field: field || undefined,
        sort,
      });
      setMentors(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadError);
      setMentors([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadError, debouncedSearch, field, page, sort]);

  const fetchRandomMentors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setRandomMentors(null);
    setTotal(0);

    try {
      const seed = getDailySeed();
      const allMentors: MentorSummary[] = [];
      let pageIndex = 1;
      let totalCount = 0;
      const searchTerm = debouncedSearch || undefined;

      do {
        const data = await mentorApi.listPublic({
          page: pageIndex,
          limit: RANDOM_BATCH_LIMIT,
          search: searchTerm,
          field: field || undefined,
          sort: 'newest',
        });
        if (pageIndex === 1) {
          totalCount = data.total || 0;
        }
        allMentors.push(...(data.items || []));
        if (allMentors.length >= totalCount || (data.items || []).length === 0) {
          break;
        }
        pageIndex += 1;
      } while (pageIndex <= MAX_RANDOM_PAGES);

      const sorted = [...allMentors].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
      const shuffled = shuffleWithSeed(sorted, seed);
      setRandomMentors(shuffled);
      setTotal(shuffled.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.randomLoadError);
      setRandomMentors([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [copy.randomLoadError, debouncedSearch, field]);

  useEffect(() => {
    if (sort === 'random') {
      fetchRandomMentors();
      return;
    }
    fetchMentors();
  }, [fetchMentors, fetchRandomMentors, sort]);

  useEffect(() => {
    if (sort !== 'random') {
      setRandomMentors(null);
    }
  }, [sort]);

  const visibleMentors = useMemo(() => {
    if (sort === 'random') {
      if (!randomMentors) return [];
      const start = (page - 1) * ITEMS_PER_PAGE;
      return randomMentors.slice(start, start + ITEMS_PER_PAGE);
    }
    return mentors;
  }, [mentors, page, randomMentors, sort]);

  const fieldCount = CONTEST_CATEGORIES.length;
  const visibleCount = visibleMentors.length;
  const pageCount = total > 0 ? totalPages : 0;
  const resultLabel = debouncedSearch || field ? copy.matchingResults : copy.totalMentors;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-6">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-sky-100/60 dark:shadow-sky-900/60">
          <div className="absolute inset-0 bg-linear-to-br from-sky-50 dark:from-sky-950/30 via-white dark:via-slate-950 to-emerald-50 dark:to-emerald-950/30 opacity-90" aria-hidden="true" />
          <div className="absolute -top-24 right-8 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-28 left-6 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" aria-hidden="true" />
          <div className="relative p-6 md:p-8 lg:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-8 items-center">
              <div className="space-y-4 animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-white/70 text-xs font-semibold text-sky-700 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  {copy.badge}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                  {copy.heroTitle}
                </h2>
                <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-xl md:max-w-none md:whitespace-nowrap">
                  {copy.heroDesc}
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-100 px-3 py-2 text-xs text-slate-600 shadow-sm">
                    <Search className="w-4 h-4 text-sky-500" />
                    {copy.searchByExpertise}
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-100 px-3 py-2 text-xs text-slate-600 shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    {copy.highQuality}
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-100 px-3 py-2 text-xs text-slate-600 shadow-sm">
                    <Shuffle className="w-4 h-4 text-amber-500" />
                    {copy.dailySuggestions}
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-100 px-3 py-2 text-xs text-slate-600 shadow-sm">
                    <Users className="w-4 h-4 text-slate-600" />
                    {copy.mentorCommunity}
                  </div>
                </div>
              </div>

              <div className="space-y-4 animate-fade-in-up">
                <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-md">
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">{resultLabel}</div>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-3xl font-bold text-slate-900">{isLoading ? '--' : total}</span>
                    <span className="text-sm text-slate-500">{copy.mentorNoun}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {copy.updatedNote}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
                  <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3">
                    <div className="text-xs font-semibold text-sky-700">{copy.currentlyShowing}</div>
                    <div className="mt-1 text-2xl font-bold text-sky-800">
                      {isLoading ? '--' : visibleCount}
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
                    <div className="text-xs font-semibold text-emerald-700">{copy.fields}</div>
                    <div className="mt-1 text-2xl font-bold text-emerald-800">{fieldCount}</div>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3">
                    <div className="text-xs font-semibold text-amber-700">{copy.pages}</div>
                    <div className="mt-1 text-2xl font-bold text-amber-800">
                      {isLoading ? '--' : pageCount}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-slate-900">{copy.title}</h1>
          <p className="text-slate-500 text-sm">{copy.subtitle}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 flex gap-2">
          <Info className="w-4 h-4 mt-0.5 text-slate-400" />
          <p>{copy.privacyNote}</p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
          <div className="w-full lg:flex-1">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="pl-10"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div className="w-full lg:w-64">
            <Dropdown
              label={copy.fieldLabel}
              headerText={copy.selectField}
              value={field}
              onChange={(value) => setField(value as MentorFieldValue)}
              options={FIELD_OPTIONS_LOCALIZED}
              placeholder={copy.allFields}
            />
          </div>
          <div className="w-full lg:w-60">
            <Dropdown
              label={copy.sortLabel}
              headerText={copy.sortLabel}
              value={sort}
              onChange={(value) => setSort(value as SortValue)}
              options={SORT_OPTIONS_LOCALIZED}
              placeholder={copy.sortPlaceholder}
            />
          </div>
        </div>

        {error && (
          <Card className="p-4 border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            {copy.loadingMentors}
          </div>
        ) : visibleMentors.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            {copy.noMentors}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleMentors.map((mentor) => {
              const bannerSrc = mentor.bannerUrl || `https://picsum.photos/seed/mentor-${mentor.id}/800/450`;
              const fields = (mentor.fields || []).slice(0, 3);
              return (
                <Card
                  key={mentor.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => navigate(`/mentors/${mentor.id}`)}
                >
                  <OptimizedImage
                    src={bannerSrc}
                    alt={mentor.name}
                    aspectRatio="video"
                    className="w-full"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-slate-900 line-clamp-1 group-hover:text-primary-600 transition-colors">
                      {mentor.name}
                    </h3>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span>{copy.joined} {formatDate(mentor.joinedAt, isEn ? 'en-US' : 'vi-VN')}</span>
                    </div>
                    {fields.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {fields.map((field) => (
                          <span
                            key={`${mentor.id}-${field}`}
                            className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};

const MentorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { locale } = useI18n();
  const isEn = locale === 'en';

  const copy = useMemo(() => isEn ? {
    back: 'Back',
    loadingMentors: 'Loading mentor...',
    joined: 'Joined:',
    noBlog: 'Mentor has not updated their blog yet.',
    invalidId: 'Invalid mentor ID',
    loadError: 'Could not load mentor',
  } : {
    back: 'Quay lại',
    loadingMentors: 'Đang tải mentor...',
    joined: 'Tham gia:',
    noBlog: 'Mentor chưa cập nhật blog.',
    invalidId: 'ID mentor không hợp lệ',
    loadError: 'Không thể tải mentor',
  }, [isEn]);
  const [mentor, setMentor] = useState<MentorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMentor = async () => {
      if (!id) {
        setError(copy.invalidId);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const data = await mentorApi.getPublic(id);
        setMentor(data.mentor);
      } catch (err) {
        setError(err instanceof Error ? err.message : copy.loadError);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentor();
  }, [copy.invalidId, copy.loadError, id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        {copy.loadingMentors}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-500">
        <p>{error}</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {copy.back}</Button>
      </div>
    );
  }

  if (!mentor) {
    return null;
  }

  const bannerSrc = mentor.bannerUrl || `https://picsum.photos/seed/mentor-${mentor.id}/1200/600`;
  const body = mentor.mentorBlog?.body || mentor.bio || '';
  const fields = (mentor.fields || []).slice(0, 6);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button variant="secondary" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {copy.back}</Button>

      <Card className="overflow-hidden">
        <OptimizedImage
          src={bannerSrc}
          alt={mentor.name}
          className="w-full h-64 md:h-80"
          lazy={false}
        />
        <div className="p-6 md:p-8 space-y-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{mentor.name}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {copy.joined} {formatDate(mentor.joinedAt, isEn ? 'en-US' : 'vi-VN')}
            </p>
            {fields.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {fields.map((field) => (
                  <span
                    key={`${mentor.id}-${field}`}
                    className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium"
                  >
                    {field}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="prose prose-slate max-w-none">
            {body ? (
              <p className="whitespace-pre-line text-slate-700">{body}</p>
            ) : (
              <p className="text-slate-500">{copy.noBlog}</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export { MentorList, MentorDetailPage as MentorDetail };

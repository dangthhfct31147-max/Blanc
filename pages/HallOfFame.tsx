import React, { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  FileText,
  FolderOpen,
  Lightbulb,
  PlayCircle,
  Search,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { Badge, Button, Card, Dropdown, DropdownOption } from '../components/ui/Common';
import OptimizedImage from '../components/OptimizedImage';
import Pagination from '../components/Pagination';
import { LIBRARY_FIELDS, LIBRARY_FIELD_LABELS } from '../constants/libraryFields';
import { useI18n } from '../contexts/I18nContext';
import { useDebounce, useHallOfFame } from '../lib/hooks';
import type { HallOfFameEntry, HallOfFameResource, HallOfFameResourceType } from '../types';

type HallOfFameSortValue = 'latest' | 'titleAsc' | 'titleDesc';

const ITEMS_PER_PAGE = 6;

const HallOfFame: React.FC = () => {
  const { locale } = useI18n();
  const isEn = locale === 'en';
  const copy = useMemo(() => isEn ? {
    badge: 'Hall of Fame',
    title: 'Award-winning sample projects, annotated for beginners',
    description: 'A curated library of briefs, slide decks, and pitch references from strong teams. Each sample shows what belongs on each section so newcomers can learn by example.',
    searchPlaceholder: 'Search project, team, contest...',
    sortLabel: 'Sort by',
    sortNewest: 'Newest first',
    sortTitleAsc: 'Name A → Z',
    sortTitleDesc: 'Name Z → A',
    fieldLabel: 'Field',
    yearLabel: 'Year',
    resourceLabel: 'Material type',
    all: 'All',
    allYears: 'All years',
    totalProjects: 'Sample projects',
    featuredProjects: 'Featured',
    withVideo: 'With pitch guide',
    featuredTitle: 'Recommended starting point',
    overview: 'Overview',
    problem: 'Problem',
    solution: 'Solution',
    impact: 'Impact',
    whyItWon: 'Why it stood out',
    structure: 'Deck structure',
    materials: 'Materials',
    takeaways: 'What to borrow',
    openPreview: 'Open preview',
    explore: 'Explore structure',
    resultCount: 'sample projects',
    team: 'Team',
    contest: 'Contest',
    close: 'Close',
    retry: 'Retry',
    loading: 'Loading Hall of Fame...',
    noResults: 'No matching sample projects found.',
    noResultsHint: 'Try another keyword or reset the filters.',
    clearFilters: 'Clear filters',
    project: 'Project brief',
    slides: 'Slide deck',
    video: 'Pitch walkthrough',
    sectionGoal: 'Goal',
  } : {
    badge: 'Hall of Fame',
    title: 'Kho dự án đoạt giải, có annotate để người mới học nhanh',
    description: 'Thư viện chọn lọc các project brief, slide deck và mẫu pitch của những đội làm tốt. Mỗi mẫu chỉ ra rõ từng phần nên đặt gì để người mới tham khảo trực tiếp.',
    searchPlaceholder: 'Tìm dự án, đội thi, cuộc thi...',
    sortLabel: 'Sắp xếp',
    sortNewest: 'Mới nhất',
    sortTitleAsc: 'Tên A → Z',
    sortTitleDesc: 'Tên Z → A',
    fieldLabel: 'Lĩnh vực',
    yearLabel: 'Năm',
    resourceLabel: 'Loại tư liệu',
    all: 'Tất cả',
    allYears: 'Mọi năm',
    totalProjects: 'Dự án mẫu',
    featuredProjects: 'Mẫu nổi bật',
    withVideo: 'Có kèm pitch',
    featuredTitle: 'Mẫu nên xem trước',
    overview: 'Tổng quan',
    problem: 'Vấn đề',
    solution: 'Giải pháp',
    impact: 'Kết quả',
    whyItWon: 'Điểm khiến bài nổi bật',
    structure: 'Cấu trúc deck',
    materials: 'Tư liệu',
    takeaways: 'Điểm nên học theo',
    openPreview: 'Mở preview',
    explore: 'Xem cấu trúc',
    resultCount: 'dự án mẫu',
    team: 'Đội thi',
    contest: 'Cuộc thi',
    close: 'Đóng',
    retry: 'Thử lại',
    loading: 'Đang tải Hall of Fame...',
    noResults: 'Không tìm thấy dự án mẫu phù hợp.',
    noResultsHint: 'Hãy thử từ khóa khác hoặc xóa bộ lọc.',
    clearFilters: 'Xóa bộ lọc',
    project: 'Project brief',
    slides: 'Slide deck',
    video: 'Pitch walkthrough',
    sectionGoal: 'Mục tiêu',
  }, [isEn]);

  const sortOptions: DropdownOption[] = [
    { value: 'latest', label: copy.sortNewest },
    { value: 'titleAsc', label: copy.sortTitleAsc },
    { value: 'titleDesc', label: copy.sortTitleDesc },
  ];

  const resourceMeta: Record<HallOfFameResourceType, { label: string; Icon: React.ComponentType<{ className?: string }>; className: string }> = {
    project: { label: copy.project, Icon: FolderOpen, className: 'bg-sky-50 text-sky-700 border-sky-100' },
    slides: { label: copy.slides, Icon: FileText, className: 'bg-amber-50 text-amber-700 border-amber-100' },
    video: { label: copy.video, Icon: PlayCircle, className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [activeField, setActiveField] = useState('');
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [activeResourceType, setActiveResourceType] = useState<'' | HallOfFameResourceType>('');
  const [sortValue, setSortValue] = useState<HallOfFameSortValue>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeEntry, setActiveEntry] = useState<HallOfFameEntry | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const sortParams = useMemo(() => {
    if (sortValue === 'titleAsc') return { sortBy: 'title', sortOrder: 'asc' as const };
    if (sortValue === 'titleDesc') return { sortBy: 'title', sortOrder: 'desc' as const };
    return { sortBy: 'year', sortOrder: 'desc' as const };
  }, [sortValue]);

  const { items, meta, isLoading, error, refetch } = useHallOfFame({
    limit: ITEMS_PER_PAGE,
    page: currentPage,
    field: activeField || undefined,
    year: activeYear ?? undefined,
    resourceType: activeResourceType || undefined,
    search: debouncedSearch || undefined,
    sortBy: sortParams.sortBy,
    sortOrder: sortParams.sortOrder,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [activeField, activeResourceType, activeYear, debouncedSearch, sortValue]);

  const years = useMemo(
    () => Array.from(new Set(items.map((item) => item.year).filter(Boolean))).sort((a, b) => b - a),
    [items],
  );

  const fields = useMemo(() => {
    const values = new Set(items.map((item) => item.field).filter(Boolean));
    return LIBRARY_FIELDS.filter((field) => field.value && values.has(field.value));
  }, [items]);

  const featuredEntry = items.find((item) => item.featured) || items[0] || null;
  const featuredCount = items.filter((item) => item.featured).length;
  const videoCount = items.filter((item) => item.hasVideo).length;

  const openResource = (resource: HallOfFameResource) => {
    if (!resource.url) return;
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setActiveField('');
    setActiveYear(null);
    setActiveResourceType('');
    setSortValue('latest');
    setCurrentPage(1);
  };

  const resourceBadges = (entry: HallOfFameEntry) => {
    const enabled = [
      entry.hasProject ? 'project' : null,
      entry.hasSlides ? 'slides' : null,
      entry.hasVideo ? 'video' : null,
    ].filter(Boolean) as HallOfFameResourceType[];

    return enabled.map((type) => {
      const meta = resourceMeta[type];
      return (
        <span key={type} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
          <meta.Icon className="w-3.5 h-3.5" />
          {meta.label}
        </span>
      );
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-primary-100/60 mb-10">
        <div className="absolute inset-0 bg-linear-to-br from-primary-50 via-white to-amber-50 opacity-90" aria-hidden="true" />
        <div className="absolute -top-24 left-12 h-48 w-48 rounded-full bg-primary-200/40 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-28 right-8 h-56 w-56 rounded-full bg-amber-200/40 blur-3xl" aria-hidden="true" />
        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/85 px-3 py-1 text-xs font-semibold text-primary-700 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                {copy.badge}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">{copy.title}</h1>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">{copy.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
              <div className="rounded-2xl border border-primary-100 bg-white/90 p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">{copy.totalProjects}</div>
                <div className="mt-3 text-3xl font-bold text-slate-900">{isLoading ? '--' : meta.total}</div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-white/90 p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">{copy.featuredProjects}</div>
                <div className="mt-3 text-3xl font-bold text-slate-900">{isLoading ? '--' : featuredCount}</div>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{copy.withVideo}</div>
                <div className="mt-3 text-3xl font-bold text-slate-900">{isLoading ? '--' : videoCount}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {featuredEntry && !isLoading && (
        <section className="mb-10">
          <Card className="overflow-hidden border-primary-100 shadow-lg shadow-primary-100/50">
            <div className="grid grid-cols-1 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="relative min-h-[280px]">
                <OptimizedImage
                  src={featuredEntry.thumbnail || `https://picsum.photos/seed/${featuredEntry.slug}/1200/900`}
                  alt={featuredEntry.title}
                  className="absolute inset-0 w-full h-full"
                  lazy
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-900/30 to-transparent" aria-hidden="true" />
                <div className="relative z-10 flex h-full flex-col justify-end gap-3 p-6 text-white">
                  <Badge className="w-fit border-white/20 bg-white/15 text-white">{copy.featuredTitle}</Badge>
                  <h2 className="text-2xl font-bold">{featuredEntry.title}</h2>
                  <p className="text-sm text-white/80 max-w-lg">{featuredEntry.summary}</p>
                  <div className="flex flex-wrap gap-2">{resourceBadges(featuredEntry)}</div>
                </div>
              </div>

              <div className="bg-white p-6 md:p-8 space-y-5">
                <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 border border-slate-200">
                    <Users className="w-4 h-4 text-slate-400" />
                    {copy.team}: <strong className="text-slate-800">{featuredEntry.teamName}</strong>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 border border-slate-200">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    {featuredEntry.award} • {featuredEntry.year}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.problem}</div>
                    <p className="mt-2 text-sm text-slate-700 line-clamp-4">{featuredEntry.problem}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.solution}</div>
                    <p className="mt-2 text-sm text-slate-700 line-clamp-4">{featuredEntry.solution}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.impact}</div>
                    <p className="mt-2 text-sm text-slate-700 line-clamp-4">{featuredEntry.impact}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {featuredEntry.structure.slice(0, 3).map((segment) => (
                    <div key={segment.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">{segment.label}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{segment.title}</div>
                      <div className="mt-1 text-sm text-slate-600">{segment.description}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setActiveEntry(featuredEntry)}>{copy.explore}</Button>
                  {featuredEntry.resources[0] && (
                    <Button variant="secondary" onClick={() => openResource(featuredEntry.resources[0])}>
                      {copy.openPreview}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </section>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white/85 shadow-sm p-4 md:p-5 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder={copy.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 rounded-full border border-slate-200 pl-12 pr-10 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="w-full lg:max-w-xs lg:ml-auto">
            <Dropdown
              label={copy.sortLabel}
              headerText={copy.sortLabel}
              value={sortValue}
              onChange={(value) => setSortValue(value as HallOfFameSortValue)}
              options={sortOptions}
            />
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm text-slate-500 mb-2">{copy.fieldLabel}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveField('')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeField === '' ? 'bg-primary-600 text-white shadow-md shadow-primary-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                {copy.all}
              </button>
              {fields.map((field) => (
                <button
                  key={field.value}
                  type="button"
                  onClick={() => setActiveField(field.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeField === field.value ? 'bg-primary-600 text-white shadow-md shadow-primary-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                  {LIBRARY_FIELD_LABELS[field.value as keyof typeof LIBRARY_FIELD_LABELS] || field.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-500 mb-2">{copy.yearLabel}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveYear(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeYear === null ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                {copy.allYears}
              </button>
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setActiveYear(year)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeYear === year ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-500 mb-2">{copy.resourceLabel}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveResourceType('')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeResourceType === '' ? 'bg-amber-500 text-white shadow-md shadow-amber-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                {copy.all}
              </button>
              {(Object.keys(resourceMeta) as HallOfFameResourceType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveResourceType(type)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeResourceType === type ? 'bg-amber-500 text-white shadow-md shadow-amber-100' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                >
                  {resourceMeta[type].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 text-sm text-slate-500">
        {isLoading ? copy.loading : `${meta.total} ${copy.resultCount}`}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <div className="aspect-[4/3] bg-slate-200" />
              <div className="p-5 space-y-3">
                <div className="h-4 w-28 rounded bg-slate-200" />
                <div className="h-6 w-3/4 rounded bg-slate-200" />
                <div className="h-4 w-full rounded bg-slate-100" />
              </div>
            </Card>
          ))
        ) : error ? (
          <div className="col-span-full text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={refetch}>{copy.retry}</Button>
          </div>
        ) : items.length > 0 ? (
          <>
            {items.map((item) => (
              <Card key={item.id} className="group overflow-hidden hover:-translate-y-1 transition-transform">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <OptimizedImage
                    src={item.thumbnail || `https://picsum.photos/seed/${item.slug}/1200/900`}
                    alt={item.title}
                    className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                    lazy
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950/80 to-transparent p-4">
                    <div className="flex items-center justify-between gap-2 text-white">
                      <Badge className="border-white/15 bg-white/15 text-white">{item.award}</Badge>
                      <span className="text-xs font-semibold">{item.year}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
                      {LIBRARY_FIELD_LABELS[item.field as keyof typeof LIBRARY_FIELD_LABELS] || item.field}
                    </div>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-3">{item.summary}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-xs text-slate-400">{copy.team}</div>
                      <div className="mt-1 font-semibold text-slate-900 line-clamp-1">{item.teamName}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-xs text-slate-400">{copy.contest}</div>
                      <div className="mt-1 font-semibold text-slate-900 line-clamp-1">{item.contestName}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">{resourceBadges(item)}</div>

                  <div className="flex flex-wrap gap-2">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">{tag}</span>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1 justify-center" onClick={() => setActiveEntry(item)}>
                      {copy.explore}
                    </Button>
                    {item.resources[0] && (
                      <Button className="flex-1 justify-center" onClick={() => openResource(item.resources[0])}>
                        {copy.openPreview}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            <div className="col-span-full">
              <Pagination currentPage={currentPage} totalPages={meta.totalPages} onPageChange={setCurrentPage} />
            </div>
          </>
        ) : (
          <div className="col-span-full text-center py-14">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
              <Lightbulb className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-700 font-medium mb-2">{copy.noResults}</p>
            <p className="text-sm text-slate-500 mb-4">{copy.noResultsHint}</p>
            <Button variant="secondary" onClick={resetFilters}>{copy.clearFilters}</Button>
          </div>
        )}
      </div>

      {activeEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setActiveEntry(null)} aria-hidden="true" />
          <Card className="relative w-full max-w-6xl max-h-[92vh] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">{activeEntry.award} • {activeEntry.year}</div>
                <h2 className="text-xl font-bold text-slate-900">{activeEntry.title}</h2>
              </div>
              <button type="button" onClick={() => setActiveEntry(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600" aria-label={copy.close}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="max-h-[calc(92vh-72px)] overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-100 bg-white">
                <div className="p-6 md:p-8 space-y-6">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-slate-100 bg-slate-100">
                    <OptimizedImage
                      src={activeEntry.thumbnail || `https://picsum.photos/seed/${activeEntry.slug}/1200/900`}
                      alt={activeEntry.title}
                      className="w-full h-full"
                      lazy
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge className="border-slate-200 bg-slate-50 text-slate-700">{activeEntry.teamName}</Badge>
                    <Badge className="border-slate-200 bg-slate-50 text-slate-700">{activeEntry.contestName}</Badge>
                    {activeEntry.tags.map((tag) => (
                      <Badge key={tag} className="border-slate-200 bg-white text-slate-600">{tag}</Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.overview}</div>
                      <p className="mt-2 text-sm text-slate-700">{activeEntry.summary}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.whyItWon}</div>
                      <p className="mt-2 text-sm text-slate-700">{activeEntry.whyItWon}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">{copy.problem}</div>
                      <p className="mt-2 text-sm text-slate-700">{activeEntry.problem}</p>
                    </div>
                    <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{copy.solution}</div>
                      <p className="mt-2 text-sm text-slate-700">{activeEntry.solution}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">{copy.impact}</div>
                      <p className="mt-2 text-sm text-slate-700">{activeEntry.impact}</p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-4 flex items-center gap-2 text-slate-900">
                      <FileText className="w-4 h-4 text-primary-600" />
                      <h3 className="font-semibold">{copy.structure}</h3>
                    </div>
                    <div className="space-y-3">
                      {activeEntry.structure.map((segment) => (
                        <div key={segment.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">{segment.label}</div>
                          <div className="mt-2 text-base font-semibold text-slate-900">{segment.title}</div>
                          <p className="mt-2 text-sm text-slate-600">{segment.description}</p>
                          {segment.objective && (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                              <span><strong>{copy.sectionGoal}:</strong> {segment.objective}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-h-[calc(92vh-72px)] overflow-y-auto bg-slate-50/70">
                <div className="p-6 md:p-8 space-y-6">
                  <div>
                    <div className="mb-4 flex items-center gap-2 text-slate-900">
                      <Sparkles className="w-4 h-4 text-primary-600" />
                      <h3 className="font-semibold">{copy.materials}</h3>
                    </div>
                    <div className="space-y-3">
                      {activeEntry.resources.map((resource) => {
                        const meta = resourceMeta[resource.type];
                        return (
                          <button
                            key={resource.id}
                            type="button"
                            onClick={() => openResource(resource)}
                            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}>
                              <meta.Icon className="w-3.5 h-3.5" />
                              {meta.label}
                            </div>
                            <div className="mt-3 text-base font-semibold text-slate-900">{resource.title}</div>
                            {resource.description && <p className="mt-2 text-sm text-slate-600">{resource.description}</p>}
                            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                              <span>{resource.format || meta.label}</span>
                              <span className="inline-flex items-center gap-1 font-semibold text-primary-700">
                                {copy.openPreview}
                                <ExternalLink className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-slate-900">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <h3 className="font-semibold">{copy.takeaways}</h3>
                    </div>
                    <div className="space-y-3">
                      {activeEntry.takeaways.map((takeaway, index) => (
                        <div key={`${activeEntry.id}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          {takeaway}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HallOfFame;

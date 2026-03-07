import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Star, BookOpen, Clock, PlayCircle, CheckCircle, Loader2, X, Phone, ExternalLink, Calendar, Copy, Check } from 'lucide-react';
import { Button, Card, Badge, Tabs, Dropdown, DropdownOption } from '../components/ui/Common';
import { useCourses, useDebounce, useEnrolledCourses } from '../lib/hooks';
import { Course } from '../types';
import { api } from '../lib/api';
import OptimizedImage from '../components/OptimizedImage';
import Pagination from '../components/Pagination';
import Reviews from '../components/Reviews';
import { LIBRARY_FIELDS, LibraryFieldValue, matchesLibraryField } from '../constants/libraryFields';
import { useI18n } from '../contexts/I18nContext';

type CourseSortValue = 'newest' | 'ratingDesc' | 'priceAsc' | 'priceDesc';

// Constants
const ITEMS_PER_PAGE = 8;

// --- MARKETPLACE LIST ---
const Marketplace: React.FC = () => {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const numberLocale = locale === 'en' ? 'en-US' : 'vi-VN';
  const [activeField, setActiveField] = useState<LibraryFieldValue>('');
  const [activeLevel, setActiveLevel] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortValue, setSortValue] = useState<CourseSortValue>('newest');
  const [showAllFields, setShowAllFields] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const formatPrice = (price: number) => {
    if (price === 0) return t('common.free');
    return `${price.toLocaleString(numberLocale)} ₫`;
  };

  const sortOptions = useMemo<DropdownOption[]>(
    () => [
      { value: 'newest', label: t('marketplace.sort.option.newest') },
      { value: 'ratingDesc', label: t('marketplace.sort.option.ratingDesc') },
      { value: 'priceAsc', label: t('marketplace.sort.option.priceAsc') },
      { value: 'priceDesc', label: t('marketplace.sort.option.priceDesc') },
    ],
    [t],
  );

  const getLevelLabel = useCallback(
    (level: string) => {
      switch (level) {
        case 'Beginner':
          return t('common.level.beginner');
        case 'Intermediate':
          return t('common.level.intermediate');
        case 'Advanced':
          return t('common.level.advanced');
        default:
          return level;
      }
    },
    [t],
  );

  const levelOptions = useMemo(
    () => [
      { value: 'Beginner', label: t('common.level.beginner') },
      { value: 'Intermediate', label: t('common.level.intermediate') },
      { value: 'Advanced', label: t('common.level.advanced') },
    ],
    [t],
  );

  // Fetch courses from database
  const { courses, isLoading, error, refetch } = useCourses({ limit: 50 });

  // Filter + sort courses locally
  const filteredCourses = useMemo(() => {
    const filtered = courses.filter((course) => {
      // Search filter
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const matchesSearch =
          course.title.toLowerCase().includes(query) ||
          course.instructor.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Level filter
      if (activeLevel && course.level !== activeLevel) {
        return false;
      }

      // Field filter (synced from Admin contest categories)
      if (activeField) {
        const haystack = `${course.title} ${course.description || ''} ${course.instructor}`;
        if (!matchesLibraryField(activeField as Exclude<LibraryFieldValue, ''>, haystack)) return false;
      }

      return true;
    });

    const getCreatedAt = (course: Course) => (course.createdAt ? new Date(course.createdAt).getTime() : 0);

    filtered.sort((a, b) => {
      switch (sortValue) {
        case 'ratingDesc':
          return (b.rating || 0) - (a.rating || 0) || getCreatedAt(b) - getCreatedAt(a);
        case 'priceAsc':
          return (a.price || 0) - (b.price || 0) || getCreatedAt(b) - getCreatedAt(a);
        case 'priceDesc':
          return (b.price || 0) - (a.price || 0) || getCreatedAt(b) - getCreatedAt(a);
        case 'newest':
        default:
          return getCreatedAt(b) - getCreatedAt(a);
      }
    });

    return filtered;
  }, [activeField, activeLevel, courses, debouncedSearch, sortValue]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);

  // Get paginated courses
  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCourses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCourses, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeField, activeLevel, sortValue]);

  // Reset to page 1 if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Intro hero section */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-sky-100/60 mb-10">
        <div className="absolute inset-0 bg-linear-to-br from-sky-50 via-white to-emerald-50 opacity-90" aria-hidden="true" />
        <div className="absolute -top-24 right-8 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-28 left-6 h-56 w-56 rounded-full bg-emerald-200/40 blur-3xl" aria-hidden="true" />
        <div className="relative p-6 md:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-8 items-center">
            <div className="space-y-4 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-white/70 text-xs font-semibold text-sky-700 shadow-sm">
                <BookOpen className="w-3.5 h-3.5" />
                {t('marketplace.hero.pill')}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
                {t('marketplace.hero.title')}
              </h2>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-xl md:max-w-none">
                {t('marketplace.hero.description')}
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-100 px-3 py-2 text-xs text-slate-600 shadow-sm">
                  <Search className="w-4 h-4 text-sky-500" />
                  {t('marketplace.hero.feature.search')}
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-100 px-3 py-2 text-xs text-slate-600 shadow-sm">
                  <Badge className="bg-white/90 text-slate-700 border border-slate-200">{t('marketplace.hero.feature.level')}</Badge>
                  {t('marketplace.hero.feature.quickFilter')}
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/90 border border-slate-100 px-3 py-2 text-xs text-slate-600 shadow-sm">
                  <Star className="w-4 h-4 text-amber-500" />
                  {t('marketplace.hero.feature.topRated')}
                </div>
              </div>
            </div>

            {(() => {
              const fieldCount = LIBRARY_FIELDS.length;
              const visibleCount = paginatedCourses.length;
              const pageCount = totalPages;
              const resultLabel = debouncedSearch || activeField || activeLevel ? t('marketplace.stats.matchingResults') : t('marketplace.stats.totalCourses');
              return (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-md">
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">{resultLabel}</div>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-3xl font-bold text-slate-900">{isLoading ? '--' : filteredCourses.length}</span>
                      <span className="text-sm text-slate-500">{t('marketplace.stats.courseNoun')}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{t('marketplace.stats.updatedNote')}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
                    <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3">
                      <div className="text-xs font-semibold text-sky-700">{t('marketplace.stats.showing')}</div>
                      <div className="mt-1 text-2xl font-bold text-sky-800">{isLoading ? '--' : visibleCount}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
                      <div className="text-xs font-semibold text-emerald-700">{t('marketplace.stats.fields')}</div>
                      <div className="mt-1 text-2xl font-bold text-emerald-800">{fieldCount}</div>
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3">
                      <div className="text-xs font-semibold text-amber-700">{t('marketplace.stats.pages')}</div>
                      <div className="mt-1 text-2xl font-bold text-amber-800">{isLoading ? '--' : pageCount}</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="max-w-md mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t('marketplace.search.placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-10 rounded-full border border-slate-200 shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              title={t('common.clearSearch')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="flex flex-wrap justify-center gap-3 mb-3">
        {(showAllFields ? LIBRARY_FIELDS : LIBRARY_FIELDS.slice(0, 5)).map((field) => (
          <button
            key={field.value || 'all'}
            onClick={() => setActiveField(field.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${activeField === field.value
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            {field.value ? field.label : t('common.all')}
          </button>
        ))}
      </div>
      {LIBRARY_FIELDS.length > 5 && (
        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={() => setShowAllFields((prev) => !prev)}
            className="text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            {showAllFields ? t('marketplace.filters.showLess') : t('marketplace.filters.showMore')}
          </button>
        </div>
      )}

      {/* Level filters */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        <span className="text-sm text-slate-500 py-1">{t('marketplace.filters.levelLabel')}</span>
        <button
          onClick={() => setActiveLevel('')}
          className={`px-3 py-1 rounded text-sm transition-all ${!activeLevel ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
        >
          {t('common.all')}
        </button>
        {levelOptions.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveLevel(value)}
            className={`px-3 py-1 rounded text-sm transition-all ${activeLevel === value ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="text-center mb-6">
        <p className="text-sm text-slate-500">
          {isLoading ? t('common.loading') : (filteredCourses.length === 1 ? t('marketplace.courseCountOne') : t('marketplace.courseCountMany', { count: filteredCourses.length }))}
        </p>
      </div>

      {/* Course Grid */}
      <div className="max-w-sm mx-auto mb-6">
        <Dropdown
          label={t('marketplace.sort.label')}
          headerText={t('marketplace.sort.label')}
          value={sortValue}
          onChange={(value) => setSortValue(value as CourseSortValue)}
          options={sortOptions}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          // Loading skeleton
          [...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-4/3 bg-slate-200" />
              <div className="p-4">
                <div className="h-5 w-full bg-slate-200 rounded mb-2" />
                <div className="h-3 w-24 bg-slate-100 rounded mb-3" />
                <div className="h-4 w-20 bg-slate-100 rounded mb-3" />
                <div className="pt-3 border-t border-slate-100 flex justify-between">
                  <div className="h-5 w-20 bg-slate-200 rounded" />
                  <div className="h-5 w-16 bg-slate-100 rounded" />
                </div>
              </div>
            </Card>
          ))
        ) : error ? (
          <div className="col-span-full text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={refetch}>{t('common.retry')}</Button>
          </div>
        ) : filteredCourses.length > 0 ? (
          <>
            {paginatedCourses.map((course) => (
              <Card
                key={course.id}
                className="group cursor-pointer hover:-translate-y-1 transition-transform"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <div className="aspect-4/3 overflow-hidden bg-slate-200 relative">
                  <OptimizedImage
                    src={course.image || `https://picsum.photos/seed/${course.id}/400/300`}
                    alt={course.title}
                    className="w-full h-full"
                    lazy={true}
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <PlayCircle className="w-12 h-12 text-white" />
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900 line-clamp-2 pr-2">{course.title}</h3>
                  </div>
                  <div className="text-xs text-slate-500 mb-3">{course.instructor}</div>
                  <div className="flex items-center gap-1 mb-3">
                    <span className="text-yellow-500 font-bold text-sm">{course.rating?.toFixed(1) || '0.0'}</span>
                    <div className="flex text-yellow-400 text-xs">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < Math.floor(course.rating || 0) ? 'fill-current' : ''}`}
                        />
                      ))}
                    </div>
                    <span className="text-slate-400 text-xs">({course.reviewsCount || 0})</span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-900">{formatPrice(course.price)}</span>
                    <Badge className="bg-primary-50 text-primary-700 border-0">
                      {getLevelLabel(course.level)}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}

            {/* Pagination */}
            <div className="col-span-full">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        ) : (
          <div className="col-span-full text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 mb-2">{t('marketplace.empty.title')}</p>
            <p className="text-sm text-slate-400 mb-4">{t('marketplace.empty.subtitle')}</p>
            <Button variant="secondary" onClick={() => {
              setActiveField('');
              setActiveLevel('');
              setSearchQuery('');
              setCurrentPage(1);
              setShowAllFields(false);
            }}>
              {t('marketplace.empty.clearFilters')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- COURSE DETAIL ---
interface EnrollmentStatus {
  enrolled: boolean;
  enrollmentId?: string;
  status?: 'active' | 'completed';
  enrolledAt?: string;
  progress?: number;
}

const CourseDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const dateLocale = locale === 'en' ? 'en-US' : 'vi-VN';
  const numberLocale = locale === 'en' ? 'en-US' : 'vi-VN';
  const [activeTab, setActiveTab] = useState<'content' | 'benefits' | 'reviews'>('content');
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  // Enrollment status state
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus | null>(null);
  const [isCheckingEnrollment, setIsCheckingEnrollment] = useState(true);

  const { enrollCourse } = useEnrolledCourses({ autoFetch: false });

  // Fetch course details và enrollment status
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      setIsCheckingEnrollment(true);
      setError(null);

      try {
        // Fetch course details
        const courseData = await api.get<{ course: Course }>(`/courses/${id}`);
        setCourse(courseData.course);

        // Check enrollment status (có thể fail nếu chưa login - không sao)
        try {
          const statusData = await api.get<EnrollmentStatus>(`/courses/enrollment-status/${id}`);
          setEnrollmentStatus(statusData);
        } catch {
          // User chưa đăng nhập hoặc chưa enroll - set default
          setEnrollmentStatus({ enrolled: false });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('marketplace.detail.loadFailed'));
      } finally {
        setIsLoading(false);
        setIsCheckingEnrollment(false);
      }
    };
    fetchData();
  }, [id, t]);

  // Handle course enrollment
  const handleEnrollCourse = useCallback(async () => {
    if (!course || !id) return;

    setIsEnrolling(true);
    try {
      // 1. Đăng ký khóa học (lưu vào database)
      await enrollCourse(id);

      // 2. Cập nhật enrollment status ngay lập tức
      setEnrollmentStatus({
        enrolled: true,
        status: 'active',
        enrolledAt: new Date().toISOString(),
        progress: 0
      });

      setEnrollSuccess(true);

      // 3. Xử lý thông tin liên hệ
      if (course.contactInfo) {
        if (course.contactType === 'link') {
          // Chuyển hướng đến link đăng ký
          setTimeout(() => {
            window.open(course.contactInfo, '_blank', 'noopener,noreferrer');
          }, 500);
        } else if (course.contactType === 'phone') {
          // Copy số điện thoại
          try {
            await navigator.clipboard.writeText(course.contactInfo);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
          } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = course.contactInfo;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
          }
        }
      }

      // Hide success message after 5 seconds
      setTimeout(() => {
        setEnrollSuccess(false);
      }, 5000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('marketplace.detail.enrollment.failed');
      // Check if already enrolled
      if (errorMessage.includes('Already enrolled')) {
        // Refresh enrollment status
        setEnrollmentStatus({ enrolled: true, status: 'active' });
        alert(t('marketplace.detail.alertAlreadyEnrolled'));
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsEnrolling(false);
    }
  }, [course, id, enrollCourse, t]);

  // Copy phone number manually
  const handleCopyPhone = useCallback(async () => {
    if (!course?.contactInfo || course.contactType !== 'phone') return;
    try {
      await navigator.clipboard.writeText(course.contactInfo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = course.contactInfo;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [course]);

  const getLevelLabel = useCallback(
    (level: string) => {
      switch (level) {
        case 'Beginner':
          return t('common.level.beginner');
        case 'Intermediate':
          return t('common.level.intermediate');
        case 'Advanced':
          return t('common.level.advanced');
        default:
          return level;
      }
    },
    [t],
  );

  // Format price
  const formatPrice = (price: number) => {
    if (price === 0) return t('common.free');
    return `${price.toLocaleString(numberLocale)} ₫`;
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const tabItems = useMemo(
    () => [
      { value: 'content', label: t('marketplace.detail.tabs.content') },
      { value: 'benefits', label: t('marketplace.detail.tabs.benefits') },
      { value: 'reviews', label: t('marketplace.detail.tabs.reviews') },
    ],
    [t],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">{error || t('marketplace.detail.notFound')}</p>
        <Button onClick={() => navigate('/marketplace')}>{t('marketplace.detail.back')}</Button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <div className="bg-slate-900 text-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <div className="text-primary-400 font-semibold mb-2 text-sm tracking-wide uppercase">
              {getLevelLabel(course.level)}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{course.title}</h1>
            <p className="text-slate-300 text-lg mb-6 max-w-2xl">
              {course.description || t('marketplace.detail.defaultDescription')}
            </p>
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-slate-300">
              <span className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                {course.rating?.toFixed(1) || '0.0'} ({(course.reviewsCount || 0) === 1 ? t('marketplace.detail.reviewsOne') : t('marketplace.detail.reviewsMany', { count: course.reviewsCount || 0 })})
              </span>
              {course.duration && (
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" /> {course.duration}
                </span>
              )}
              {course.hoursPerWeek && (
                <span className="flex items-center">
                  <BookOpen className="w-4 h-4 mr-1" /> {t('marketplace.detail.hoursPerWeek', { count: course.hoursPerWeek })}
                </span>
              )}
            </div>
            {(course.startDate || course.endDate) && (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                <Calendar className="w-4 h-4" />
                <span>{t('marketplace.detail.timeRange', { start: formatDate(course.startDate), end: formatDate(course.endDate) })}</span>
              </div>
            )}
            <div className="mt-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
                <OptimizedImage
                  src={`https://picsum.photos/seed/${course.instructor}/100/100`}
                  alt={course.instructor}
                  className="w-full h-full"
                  lazy={false}
                />
              </div>
              <div>
                <div className="font-medium text-white">{t('marketplace.detail.instructorLabel', { name: course.instructor })}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <Tabs tabs={tabItems} activeTab={activeTab} onChange={(tab) => setActiveTab(tab as 'content' | 'benefits' | 'reviews')} />
            <div className="prose prose-slate max-w-none">
              {activeTab === 'content' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">{t('marketplace.detail.syllabusTitle')}</h3>
                  {course.description ? (
                    <div className="whitespace-pre-wrap text-slate-600">{course.description}</div>
                  ) : (
                    [1, 2, 3, 4].map((section) => (
                      <div key={section} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 font-medium text-slate-700 flex justify-between cursor-pointer">
                          <span>{t('marketplace.detail.sectionTitle', { section })}</span>
                          <span className="text-xs text-slate-500 mt-1">{t('marketplace.detail.sectionMeta', { lessons: 5, minutes: 45 })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {activeTab === 'benefits' && (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <li className="flex items-start"><CheckCircle className="w-5 h-5 text-emerald-500 mr-2 shrink-0" /> <span>{t('marketplace.detail.benefits.deepKnowledge')}</span></li>
                  <li className="flex items-start"><CheckCircle className="w-5 h-5 text-emerald-500 mr-2 shrink-0" /> <span>{t('marketplace.detail.benefits.portfolio')}</span></li>
                  <li className="flex items-start"><CheckCircle className="w-5 h-5 text-emerald-500 mr-2 shrink-0" /> <span>{t('marketplace.detail.benefits.certificate')}</span></li>
                  <li className="flex items-start"><CheckCircle className="w-5 h-5 text-emerald-500 mr-2 shrink-0" /> <span>{t('marketplace.detail.benefits.support')}</span></li>
                </ul>
              )}
              {activeTab === 'reviews' && (
                <Reviews
                  targetType="course"
                  targetId={id!}
                  targetTitle={course.title}
                  canReview={enrollmentStatus?.enrolled}
                  showTitle={true}
                />
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <Card className="p-6 sticky top-24 shadow-lg border-primary-100">
            {/* Course Image */}
            <div className="aspect-video rounded-lg overflow-hidden mb-4 bg-slate-100">
              <OptimizedImage
                src={course.image || `https://picsum.photos/seed/${course.id}/400/300`}
                alt={course.title}
                className="w-full h-full"
                lazy={false}
              />
            </div>

            {/* Price */}
            <div className="text-3xl font-bold text-slate-900 mb-2">{formatPrice(course.price)}</div>

            {/* Schedule Info */}
            {(course.startDate || course.duration) && (
              <div className="mb-4 p-3 bg-primary-50 rounded-lg">
                <div className="flex items-center gap-2 text-primary-700 text-sm font-medium mb-1">
                  <Calendar className="w-4 h-4" />
                  {t('marketplace.detail.schedule.title')}
                </div>
                {course.duration && (
                  <p className="text-sm text-slate-600">{t('marketplace.detail.schedule.duration', { duration: course.duration })}</p>
                )}
                {course.hoursPerWeek && (
                  <p className="text-sm text-slate-600">{t('marketplace.detail.hoursPerWeek', { count: course.hoursPerWeek })}</p>
                )}
                {course.startDate && (
                  <p className="text-sm text-slate-600">{t('marketplace.detail.schedule.startsOn', { date: formatDate(course.startDate) })}</p>
                )}
              </div>
            )}

            {/* Enroll Button - Hiển thị dựa trên trạng thái enrollment */}
            {isCheckingEnrollment ? (
              <Button className="w-full mb-3" size="lg" disabled>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('marketplace.detail.enrollment.checking')}
              </Button>
            ) : enrollmentStatus?.enrolled ? (
              <div className="mb-3">
                <div className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-2">
                  <div className="flex flex-col gap-1 text-emerald-700 font-medium">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>{t('marketplace.detail.enrollment.purchased')}</span>
                    </div>
                    {enrollmentStatus.enrolledAt && (
                      <span className="text-xs text-emerald-600 pl-7">
                        {t('marketplace.detail.enrollment.enrolledAt', { date: formatDate(enrollmentStatus.enrolledAt) })}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => navigate('/profile?tab=courses')}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  {t('marketplace.detail.enrollment.viewMyCourses')}
                </Button>
              </div>
            ) : (
              // Chưa đăng ký - nút mua
              <Button
                className="w-full mb-3 shadow-md shadow-primary-200"
                size="lg"
                onClick={handleEnrollCourse}
                disabled={isEnrolling}
              >
                {isEnrolling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('marketplace.detail.enrollment.processing')}
                  </>
                ) : enrollSuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t('marketplace.detail.enrollment.success')}
                  </>
                ) : (
                  t('marketplace.detail.enrollment.buy')
                )}
              </Button>
            )}

            {/* Success Message - Chỉ hiển thị khi vừa mua xong */}
            {enrollSuccess && !enrollmentStatus?.enrolled && (
              <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-700 font-medium">
                  {t('marketplace.detail.purchase.successTitle')}
                </p>
                <p className="text-sm text-emerald-600 mt-1">
                  {t('marketplace.detail.purchase.saved')}
                </p>
                {course.contactType === 'phone' && copied && (
                  <p className="text-sm text-emerald-600 mt-1">
                    {t('marketplace.detail.purchase.copiedPhone', { phone: course.contactInfo ?? '' })}
                  </p>
                )}
                {course.contactType === 'link' && (
                  <p className="text-sm text-emerald-600 mt-1">
                    {t('marketplace.detail.purchase.redirecting')}
                  </p>
                )}
              </div>
            )}

            {/* Contact Info Display */}
            {course.contactInfo && (
              <div className="mb-3">
                {course.contactType === 'phone' ? (
                  <button
                    onClick={handleCopyPhone}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-600">{t('common.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4" />
                        <span>{course.contactInfo}</span>
                        <Copy className="w-4 h-4 text-slate-400" />
                      </>
                    )}
                  </button>
                ) : course.contactType === 'link' ? (
                  <a
                    href={course.contactInfo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{t('marketplace.detail.contact.viewRegistration')}</span>
                  </a>
                ) : null}
              </div>
            )}

            <Button variant="secondary" className="w-full" onClick={() => navigate('/marketplace')}>
              {t('marketplace.detail.backToList')}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export { Marketplace, CourseDetail };

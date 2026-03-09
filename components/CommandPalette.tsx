import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Trophy,
    BookOpen,
    FileText,
    Users,
    Star,
    Newspaper,
    GraduationCap,
    ArrowRight,
    Command,
    CornerDownLeft,
    Hash,
    MessageSquare,
    BarChart3,
    Mail,
    ShieldCheck,
    TreePine,
} from 'lucide-react';
import { useSearch } from '../lib/hooks';
import { useI18n } from '../contexts/I18nContext';

// ── Quick-nav pages ──
const PAGES = [
    { label: 'nav.home', path: '/', icon: Hash, keywords: ['home', 'trang chủ'] },
    { label: 'nav.contests', path: '/contests', icon: Trophy, keywords: ['contests', 'cuộc thi'] },
    { label: 'nav.learning', path: '/marketplace', icon: BookOpen, keywords: ['courses', 'khóa học', 'learning', 'marketplace'] },
    { label: 'Tài liệu', path: '/documents', icon: FileText, keywords: ['documents', 'tài liệu'] },
    { label: 'Cộng đồng', path: '/community', icon: Users, keywords: ['community', 'cộng đồng'] },
    { label: 'Peer Review', path: '/peer-review', icon: MessageSquare, keywords: ['peer review', 'đánh giá'] },
    { label: 'Hall of Fame', path: '/hall-of-fame', icon: Star, keywords: ['hall of fame', 'vinh danh'] },
    { label: 'Tin tức', path: '/news', icon: Newspaper, keywords: ['news', 'tin tức'] },
    { label: 'nav.mentors', path: '/mentors', icon: GraduationCap, keywords: ['mentors', 'cố vấn'] },
    { label: 'Báo cáo', path: '/reports', icon: BarChart3, keywords: ['reports', 'báo cáo'] },
    { label: 'Hồ sơ', path: '/profile', icon: Users, keywords: ['profile', 'hồ sơ'] },
    { label: 'Liên hệ', path: '/contact', icon: Mail, keywords: ['contact', 'liên hệ'] },
    { label: 'Bảo mật', path: '/account/security', icon: ShieldCheck, keywords: ['security', 'bảo mật'] },
    { label: 'Skill Tree', path: '/skill-tree', icon: TreePine, keywords: ['skill tree', 'kỹ năng'] },
] as const;

type Category = 'pages' | 'contests' | 'courses';

interface ResultItem {
    id: string;
    title: string;
    subtitle?: string;
    icon: React.ElementType;
    category: Category;
    path: string;
}

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { t } = useI18n();

    const { query, setQuery, results, isLoading, clearSearch } = useSearch({
        debounceMs: 200,
        minChars: 2,
        limit: 8,
    });

    // ── Keyboard shortcut (Ctrl+K / Cmd+K) ──
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
            if (e.key === 'Escape') {
                setOpen(false);
            }
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    // ── Focus input when opening ──
    useEffect(() => {
        if (open) {
            // Small delay lets the animation start before focusing
            const timer = setTimeout(() => inputRef.current?.focus(), 50);
            return () => clearTimeout(timer);
        }
        // Reset on close
        setQuery('');
        clearSearch();
        setActiveIndex(0);
    }, [open, setQuery, clearSearch]);

    // ── Build result list ──
    const items = useMemo<ResultItem[]>(() => {
        const list: ResultItem[] = [];
        const q = query.toLowerCase().trim();

        // Quick-nav pages (always shown when query matches or is empty)
        const filteredPages = q
            ? PAGES.filter(
                (p) =>
                    p.keywords.some((kw) => kw.includes(q)) ||
                    p.label.toLowerCase().includes(q) ||
                    p.path.includes(q)
            )
            : PAGES;

        for (const page of filteredPages.slice(0, 6)) {
            list.push({
                id: `page:${page.path}`,
                title: page.label.startsWith('nav.') ? t(page.label as any) : page.label,
                subtitle: page.path,
                icon: page.icon,
                category: 'pages',
                path: page.path,
            });
        }

        // Search results from API
        if (results.contests?.length) {
            for (const c of results.contests) {
                list.push({
                    id: `contest:${c.id}`,
                    title: c.title,
                    subtitle: c.organizer,
                    icon: Trophy,
                    category: 'contests',
                    path: `/contests/${c.id}`,
                });
            }
        }

        if (results.courses?.length) {
            for (const c of results.courses) {
                list.push({
                    id: `course:${c.id}`,
                    title: c.title,
                    subtitle: c.instructor,
                    icon: BookOpen,
                    category: 'courses',
                    path: `/courses/${c.id}`,
                });
            }
        }

        return list;
    }, [query, results, t]);

    // Clamp active index when results change
    useEffect(() => {
        setActiveIndex(0);
    }, [items.length]);

    // ── Navigate to selected item ──
    const go = useCallback(
        (item: ResultItem) => {
            navigate(item.path);
            setOpen(false);
        },
        [navigate]
    );

    // ── Keyboard navigation inside the palette ──
    const onInputKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % Math.max(items.length, 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => (i - 1 + items.length) % Math.max(items.length, 1));
            } else if (e.key === 'Enter' && items[activeIndex]) {
                e.preventDefault();
                go(items[activeIndex]);
            }
        },
        [items, activeIndex, go]
    );

    // ── Scroll active item into view ──
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const active = list.querySelector('[data-active="true"]');
        active?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    // ── Category labels ──
    const categoryLabel: Record<Category, string> = {
        pages: 'Trang',
        contests: 'Cuộc thi',
        courses: 'Khóa học',
    };

    // ── Group items by category for rendering ──
    const grouped = useMemo(() => {
        const map = new Map<Category, ResultItem[]>();
        for (const item of items) {
            if (!map.has(item.category)) map.set(item.category, []);
            map.get(item.category)!.push(item);
        }
        return map;
    }, [items]);

    // Flat index for keyboard nav
    let flatIndex = 0;

    return (
        <>
            {/* Trigger hint in header */}
            <button
                onClick={() => setOpen(true)}
                className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/60 px-2.5 py-1.5 text-sm text-slate-400 backdrop-blur transition-all hover:border-slate-300 hover:bg-white hover:text-slate-600 hover:shadow-sm"
            >
                <Search size={14} />
                <span className="max-w-28 truncate lg:max-w-32">{t('common.search' as any) || 'Tìm kiếm...'}</span>
                <kbd className="ml-1.5 hidden items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 2xl:flex">
                    <Command size={10} />K
                </kbd>
            </button>

            {/* Mobile trigger */}
            <button
                onClick={() => setOpen(true)}
                className="flex md:hidden items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Search"
            >
                <Search size={18} />
            </button>

            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
                            onClick={() => setOpen(false)}
                        />

                        {/* Dialog */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: -20 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className="fixed inset-x-4 top-[12vh] z-[101] mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 sm:inset-x-auto"
                        >
                            {/* Search input */}
                            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                                <Search size={18} className="shrink-0 text-slate-400" />
                                <input
                                    ref={inputRef}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={onInputKeyDown}
                                    placeholder={t('common.search' as any) || 'Tìm trang, cuộc thi, khóa học...'}
                                    className="grow bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                {isLoading && (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-r-transparent" />
                                )}
                                <kbd className="hidden items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:flex">
                                    ESC
                                </kbd>
                            </div>

                            {/* Results */}
                            <div ref={listRef} className="max-h-[50vh] overflow-y-auto overscroll-contain px-2 py-2">
                                {items.length === 0 && query.length >= 2 && !isLoading && (
                                    <div className="py-12 text-center text-sm text-slate-400">
                                        Không tìm thấy kết quả cho "<span className="font-medium text-slate-500">{query}</span>"
                                    </div>
                                )}

                                {Array.from(grouped.entries()).map(([category, catItems]) => (
                                    <div key={category} className="mb-1">
                                        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                            {categoryLabel[category]}
                                        </div>
                                        {catItems.map((item) => {
                                            const idx = flatIndex++;
                                            const isActive = idx === activeIndex;
                                            return (
                                                <button
                                                    key={item.id}
                                                    data-active={isActive}
                                                    onClick={() => go(item)}
                                                    onMouseEnter={() => setActiveIndex(idx)}
                                                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${isActive
                                                            ? 'bg-primary-50 text-primary-700'
                                                            : 'text-slate-700 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div
                                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive
                                                                ? 'bg-primary-100 text-primary-600'
                                                                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                                                            }`}
                                                    >
                                                        <item.icon size={16} />
                                                    </div>
                                                    <div className="min-w-0 grow">
                                                        <div className="truncate text-sm font-medium">{item.title}</div>
                                                        {item.subtitle && (
                                                            <div className="truncate text-xs text-slate-400">{item.subtitle}</div>
                                                        )}
                                                    </div>
                                                    {isActive && (
                                                        <ArrowRight size={14} className="shrink-0 text-primary-400" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>

                            {/* Footer hints */}
                            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-[11px] text-slate-400">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                        <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono">↑↓</kbd>
                                        di chuyển
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <CornerDownLeft size={10} />
                                        chọn
                                    </span>
                                </div>
                                <span className="flex items-center gap-1">
                                    <kbd className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono">ESC</kbd>
                                    đóng
                                </span>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

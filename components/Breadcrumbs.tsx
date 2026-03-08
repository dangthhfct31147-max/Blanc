import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import type { TranslationKey } from '../lib/i18n';

/** Map path segments → i18n keys. Dynamic segments (e.g. `:id`) are skipped. */
const SEGMENT_KEYS: Record<string, TranslationKey> = {
    contests: 'nav.contests',
    marketplace: 'nav.marketplace',
    courses: 'nav.courses',
    documents: 'nav.documents',
    'hall-of-fame': 'nav.hallOfFame',
    community: 'nav.community',
    news: 'nav.news',
    'peer-review': 'nav.peerReview',
    mentors: 'nav.mentors',
    reports: 'nav.reports',
    new: 'nav.reportsNew',
    profile: 'nav.profile',
    contact: 'nav.contact',
    'skill-tree': 'nav.skillTree',
    'my-team-posts': 'nav.myTeamPosts',
    terms: 'nav.terms',
    privacy: 'nav.privacy',
    account: 'nav.profile',
    security: 'nav.security',
};

/** Pages where breadcrumbs add no value. */
const HIDDEN_PATHS = ['/', '/login', '/register', '/forgot-password'];

const Breadcrumbs: React.FC = () => {
    const { pathname } = useLocation();
    const { t } = useI18n();

    if (HIDDEN_PATHS.includes(pathname)) return null;

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const crumbs: { label: string; href: string }[] = [];
    let accumulated = '';

    for (const seg of segments) {
        accumulated += `/${seg}`;
        const key = SEGMENT_KEYS[seg];
        if (key) {
            crumbs.push({ label: t(key), href: accumulated });
        }
        // Dynamic segments (UUIDs, numeric IDs) are silently skipped —
        // the detail page title is already shown in the page itself.
    }

    if (crumbs.length === 0) return null;

    return (
        <nav aria-label="Breadcrumb" className="mx-auto max-w-7xl px-4 pt-3 pb-1 sm:px-6 lg:px-8">
            <ol className="flex items-center gap-1.5 text-sm text-slate-500">
                <li>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                        <Home className="h-3.5 w-3.5" />
                        <span className="sr-only">{t('nav.home')}</span>
                    </Link>
                </li>
                {crumbs.map((crumb, i) => {
                    const isLast = i === crumbs.length - 1;
                    return (
                        <li key={crumb.href} className="flex items-center gap-1.5">
                            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                            {isLast ? (
                                <span className="font-medium text-slate-800" aria-current="page">
                                    {crumb.label}
                                </span>
                            ) : (
                                <Link
                                    to={crumb.href}
                                    className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                >
                                    {crumb.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;

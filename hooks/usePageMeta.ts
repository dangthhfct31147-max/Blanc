import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PageMeta {
    title?: string;
    description?: string;
    ogImage?: string;
}

const SITE_NAME = 'Blanc';
const DEFAULT_DESCRIPTION = 'Nền tảng thi đấu và học tập trực tuyến hàng đầu';

const ROUTE_META: Record<string, PageMeta> = {
    '/': { title: 'Trang chủ', description: DEFAULT_DESCRIPTION },
    '/contests': { title: 'Cuộc thi', description: 'Khám phá các cuộc thi lập trình và học thuật' },
    '/marketplace': { title: 'Marketplace', description: 'Khóa học và tài liệu học tập chất lượng' },
    '/documents': { title: 'Tài liệu', description: 'Kho tài liệu học tập phong phú' },
    '/hall-of-fame': { title: 'Vinh danh', description: 'Bảng vinh danh các thành tích xuất sắc' },
    '/community': { title: 'Cộng đồng', description: 'Diễn đàn thảo luận và chia sẻ kiến thức' },
    '/peer-review': { title: 'Peer Review', description: 'Đánh giá và nhận xét bài làm' },
    '/news': { title: 'Tin tức', description: 'Cập nhật tin tức mới nhất' },
    '/mentors': { title: 'Mentors', description: 'Tìm mentor phù hợp' },
    '/reports': { title: 'Báo cáo', description: 'Quản lý báo cáo cá nhân' },
    '/profile': { title: 'Hồ sơ', description: 'Hồ sơ cá nhân và cài đặt' },
    '/contact': { title: 'Liên hệ', description: 'Liên hệ với đội ngũ Blanc' },
    '/skill-tree': { title: 'Skill Tree', description: 'Cây kỹ năng và lộ trình học tập' },
    '/my-team-posts': { title: 'Bài viết nhóm', description: 'Quản lý bài viết nhóm' },
    '/terms': { title: 'Điều khoản', description: 'Điều khoản sử dụng' },
    '/privacy': { title: 'Quyền riêng tư', description: 'Chính sách quyền riêng tư' },
};

function setMetaTag(property: string, content: string) {
    let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
    if (!el) {
        el = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement | null;
    }
    if (el) {
        el.setAttribute('content', content);
    } else {
        el = document.createElement('meta');
        if (property.startsWith('og:')) {
            el.setAttribute('property', property);
        } else {
            el.setAttribute('name', property);
        }
        el.setAttribute('content', content);
        document.head.appendChild(el);
    }
}

/**
 * Updates document title and meta tags based on current route.
 * Optionally override with custom values for dynamic pages.
 */
export function usePageMeta(overrides?: PageMeta) {
    const location = useLocation();

    useEffect(() => {
        const basePath = '/' + location.pathname.split('/').filter(Boolean).slice(0, 1).join('/');
        const routeMeta = ROUTE_META[location.pathname] || ROUTE_META[basePath] || {};
        const meta = { ...routeMeta, ...overrides };

        const pageTitle = meta.title ? `${meta.title} | ${SITE_NAME}` : SITE_NAME;
        const desc = meta.description || DEFAULT_DESCRIPTION;

        document.title = pageTitle;
        setMetaTag('description', desc);
        setMetaTag('og:title', pageTitle);
        setMetaTag('og:description', desc);
        setMetaTag('og:url', window.location.href);

        if (meta.ogImage) {
            setMetaTag('og:image', meta.ogImage);
        }
    }, [location.pathname, overrides?.title, overrides?.description, overrides?.ogImage]);
}

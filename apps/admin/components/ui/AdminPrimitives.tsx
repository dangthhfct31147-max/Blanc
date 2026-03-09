import type { ElementType, ReactNode } from 'react';

type ClassValue = string | false | null | undefined;

const cx = (...values: ClassValue[]) => values.filter(Boolean).join(' ');

export const AdminPage = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cx('space-y-6 lg:space-y-8', className)}>{children}</div>
);

export const AdminPageHeader = ({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <section className="admin-surface-card admin-page-header overflow-hidden px-6 py-6 sm:px-7 sm:py-7">
    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl space-y-3">
        {eyebrow ? (
          <span className="admin-pill inline-flex">{eyebrow}</span>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  </section>
);

export const AdminSectionCard = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <section className={cx('admin-surface-card p-5 sm:p-6', className)}>{children}</section>;

export const AdminFilterBar = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cx(
      'admin-surface-card flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5',
      className
    )}
  >
    {children}
  </div>
);

export const AdminSectionTitle = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="space-y-1">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      {description ? <p className="text-sm text-slate-500">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
  </div>
);

export const AdminStatCard = ({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'teal',
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'teal' | 'sky' | 'indigo' | 'amber' | 'rose' | 'slate';
}) => (
  <article className={cx('admin-stat-card', `admin-stat-card--${tone}`)}>
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      </div>
      <div className="admin-stat-card__icon">
        <Icon size={18} />
      </div>
    </div>
    {detail ? <p className="mt-3 text-sm text-slate-500">{detail}</p> : null}
  </article>
);

export const AdminQuickActionCard = ({
  icon: Icon,
  title,
  description,
  href,
  onClick,
}: {
  icon: ElementType;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}) => {
  const content = (
    <>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(13,148,136,0.14),rgba(125,211,252,0.18))] text-teal-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <Icon size={20} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </>
  );

  const className =
    'admin-action-card flex h-full flex-col gap-4 rounded-[1.5rem] border border-slate-200/70 bg-white/75 p-5 text-left shadow-[0_16px_50px_-32px_rgba(15,23,42,0.28)] transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_55px_-28px_rgba(15,23,42,0.24)]';

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
};

export const AdminTableShell = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cx('admin-surface-card overflow-hidden p-0', className)}>
    {children}
  </div>
);

export const AdminEmptyState = ({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType;
  title: string;
  description: string;
}) => (
  <div className="admin-empty-state flex min-h-[240px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300/90 bg-white/45 px-6 py-10 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
      <Icon size={24} />
    </div>
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
  </div>
);

export const AdminModalShell = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cx(
      'admin-surface-card rounded-[1.9rem] border border-white/75 bg-white/92 shadow-[0_32px_80px_-34px_rgba(15,23,42,0.36)] backdrop-blur-xl',
      className
    )}
  >
    {children}
  </div>
);

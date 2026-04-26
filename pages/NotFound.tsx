import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '../components/ui/Common';
import { useI18n } from '../contexts/I18nContext';

const NotFound: React.FC = () => {
  const { t } = useI18n();

  return (
    <section className="min-h-[60vh] bg-slate-50 px-4 py-16 dark:bg-slate-950">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
          <Compass className="h-8 w-8" />
        </div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-primary-600 dark:text-primary-300">404</p>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 md:text-4xl">
          {t('notFound.title')}
        </h1>
        <p className="mt-4 max-w-xl text-slate-600 dark:text-slate-400">
          {t('notFound.description')}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to="/">
            <Button variant="secondary" className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('notFound.backHome')}
            </Button>
          </Link>
          <Link to="/contests">
            <Button className="w-full sm:w-auto">
              {t('notFound.exploreContests')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NotFound;

import React from 'react';
import { useI18n } from '../contexts/I18nContext';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', fullScreen = false }) => {
    const { t } = useI18n();
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-[3px]',
        lg: 'w-12 h-12 border-4',
    };

    const spinner = (
        <div className={`${sizeClasses[size]} inline-block rounded-full border-blue-600 border-r-transparent animate-spin`} />
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
                <div className="flex flex-col items-center gap-3">
                    {spinner}
                    <p className="text-sm text-slate-600 animate-pulse">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center py-12">
            {spinner}
        </div>
    );
};

export default LoadingSpinner;

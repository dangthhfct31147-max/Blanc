import React from 'react';
import { AlertTriangle, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { Button, cn } from './ui/Common';
import type { AppAuthSyncError } from '../contexts/AppAuthContext';

interface AuthSyncNoticeProps {
  status: 'syncing' | 'error';
  syncError?: AppAuthSyncError | null;
  onRetry?: () => void;
  onSignOut?: () => void;
  compact?: boolean;
  className?: string;
}

const AuthSyncNotice: React.FC<AuthSyncNoticeProps> = ({
  status,
  syncError,
  onRetry,
  onSignOut,
  compact = false,
  className,
}) => {
  if (status === 'syncing') {
    return (
      <div
        className={cn(
          compact
            ? 'flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm'
            : 'rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm',
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
        <div>
          <p className="font-semibold text-slate-900">Đang đồng bộ tài khoản</p>
          {!compact && (
            <p className="mt-1 text-sm text-slate-500">
              Ứng dụng đang tải hồ sơ nội bộ từ phiên Clerk hiện tại.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        compact
          ? 'rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900'
          : 'rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{syncError?.title || 'Không thể đồng bộ tài khoản'}</p>
          <p className="mt-1 text-sm leading-6 text-amber-900/90">
            {syncError?.message || 'Ứng dụng không thể tải hồ sơ nội bộ từ phiên Clerk hiện tại.'}
          </p>
          {!compact && syncError?.detail && syncError.detail !== syncError.message && (
            <p className="mt-2 text-xs text-amber-900/70">
              Chi tiết: {syncError.detail}
            </p>
          )}
          {(onRetry || onSignOut) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {onRetry && (
                <Button type="button" size="sm" onClick={onRetry} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Đồng bộ lại
                </Button>
              )}
              {onSignOut && (
                <Button type="button" size="sm" variant="secondary" onClick={onSignOut} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthSyncNotice;

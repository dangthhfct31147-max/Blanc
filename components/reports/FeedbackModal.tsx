import React from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { Button } from '../ui/Common';
import { ReportFeedbackItem } from '../../services/reportService';
import { formatDateTime } from './reportUtils';

export interface FeedbackModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  isLoading: boolean;
  items: ReportFeedbackItem[];
  message: string;
  isSending: boolean;
  onChangeMessage: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  title = 'Feedback',
  subtitle,
  isLoading,
  items,
  message,
  isSending,
  onChangeMessage,
  onSend,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</p>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
          </div>
          <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="py-10 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Đang tải...
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-slate-500 dark:text-slate-400 text-sm">Chưa có feedback.</div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto space-y-2">
              {items.map((item) => (
                <div key={item.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {item.authorName ? item.authorName : item.authorRole}
                    </p>
                    <p className="text-xs text-slate-400">{formatDateTime(item.createdAt || null)}</p>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-100 mt-2 whitespace-pre-wrap">{item.message}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-end gap-2">
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Trả lời</label>
              <textarea
                value={message}
                onChange={(e) => onChangeMessage(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                placeholder="Gửi phản hồi..."
                disabled={isSending}
              />
            </div>
            <Button onClick={onSend} disabled={isSending || !message.trim()} className="gap-2">
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Gửi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;


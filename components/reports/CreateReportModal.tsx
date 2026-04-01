import React from 'react';
import { X } from 'lucide-react';
import { Button, Dropdown, Input } from '../ui/Common';
import { useI18n } from '../../contexts/I18nContext';

export type CreateTemplateKey = 'personal' | 'contest' | 'course';

export interface ContestOption {
  id: string;
  title: string;
}

export interface CreateReportModalProps {
  isOpen: boolean;
  isLocked: boolean;
  template: CreateTemplateKey;
  title: string;
  contestId: string;
  contests: ContestOption[];
  onChangeTemplate: (value: CreateTemplateKey) => void;
  onChangeTitle: (value: string) => void;
  onChangeContestId: (value: string) => void;
  onClose: () => void;
  onCreate: () => void;
}

const CreateReportModal: React.FC<CreateReportModalProps> = ({
  isOpen,
  isLocked,
  template,
  title,
  contestId,
  contests,
  onChangeTemplate,
  onChangeTitle,
  onChangeContestId,
  onClose,
  onCreate,
}) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="font-semibold text-slate-900 dark:text-slate-100">{t('reports.create.title')}</p>
          <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <Dropdown
            label={t('reports.create.typeLabel')}
            headerText={t('reports.create.typeHeader')}
            value={template}
            onChange={(value) => onChangeTemplate(value as CreateTemplateKey)}
            disabled={isLocked}
            options={[
              { value: 'personal', label: t('reports.create.type.personal') },
              { value: 'contest', label: t('reports.create.type.contest') },
              { value: 'course', label: t('reports.create.type.course') },
            ]}
          />

          {template === 'contest' && (
            <Dropdown
              label={t('reports.create.contestLabel')}
              headerText={t('reports.create.contestHeader')}
              placeholder={t('reports.create.contestPlaceholder')}
              value={contestId}
              onChange={onChangeContestId}
              disabled={isLocked}
              options={[
                { value: '', label: t('reports.create.contestPlaceholder') },
                ...contests.map((c) => ({ value: c.id, label: c.title })),
              ]}
            />
          )}

          <Input
            label={t('reports.create.titleLabel')}
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder={t('reports.create.titlePlaceholder')}
            disabled={isLocked}
          />
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onCreate} disabled={isLocked}>
            {t('reports.create.submit')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateReportModal;

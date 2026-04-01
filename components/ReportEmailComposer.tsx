import React, { useState, useEffect } from 'react';
import { X, Send, Clock, Sparkles, Copy, Check } from 'lucide-react';
import { generateEmailDraft } from '../services/geminiService';
import { useI18n } from '../contexts/I18nContext';

interface ReportEmailComposerProps {
    isOpen: boolean;
    onClose: () => void;
    reportContent: string;
}

export const ReportEmailComposer: React.FC<ReportEmailComposerProps> = ({ isOpen, onClose, reportContent }) => {
    const { t } = useI18n();
    const [tone, setTone] = useState<'Formal' | 'Neutral' | 'Friendly'>('Formal');
    const [body, setBody] = useState('');
    const [subject, setSubject] = useState(() => t('reports.email.defaultSubject'));
    const [to, setTo] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const toneLabels = {
        'Formal': t('reports.email.tone.formal'),
        'Neutral': t('reports.email.tone.neutral'),
        'Friendly': t('reports.email.tone.friendly')
    };

    useEffect(() => {
        if (isOpen && reportContent && !body) {
            handleGenerate();
        }
    }, [isOpen, reportContent]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        const draft = await generateEmailDraft(reportContent, toneLabels[tone]);
        setBody(draft);
        setIsGenerating(false);
    };

    const handleToneChange = (newTone: typeof tone) => {
        setTone(newTone);
        handleGenerate();
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(body);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity opacity-100 pointer-events-auto"
                onClick={onClose}
            />

            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl sm:rounded-2xl shadow-2xl transform transition-transform translate-y-0 pointer-events-auto flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <h2 className="font-semibold text-slate-800 dark:text-slate-100">{t('reports.email.title')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400" title={t('common.close')} aria-label={t('common.close')}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Controls */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 flex gap-4 overflow-x-auto">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <span>{t('reports.email.tone.label')}</span>
                        {(['Formal', 'Neutral', 'Friendly'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => handleToneChange(t)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${tone === t
                                    ? 'bg-white dark:bg-slate-900 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-700 border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    }`}
                            >
                                {toneLabels[t]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Inputs */}
                <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                    <div className="grid grid-cols-[4rem_1fr] gap-4 items-center">
                        <label htmlFor="email-to" className="text-slate-400 text-sm font-medium">{t('reports.email.toLabel')}</label>
                        <input
                            id="email-to"
                            type="text"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none py-1 text-slate-800 dark:text-slate-100"
                            placeholder={t('reports.email.toPlaceholder')}
                        />
                    </div>
                    <div className="grid grid-cols-[4rem_1fr] gap-4 items-center">
                        <label htmlFor="email-subject" className="text-slate-400 text-sm font-medium">{t('reports.email.subjectLabel')}</label>
                        <input
                            id="email-subject"
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none py-1 text-slate-800 dark:text-slate-100 font-medium"
                            placeholder={t('reports.email.subjectPlaceholder')}
                        />
                    </div>

                    <div className="relative mt-4">
                        {isGenerating ? (
                            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-10 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-sm text-blue-600 font-medium">{t('reports.email.generating')}</span>
                                </div>
                            </div>
                        ) : null}
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full h-64 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none text-slate-700 dark:text-slate-300 leading-relaxed resize-none"
                            placeholder={t('reports.email.bodyPlaceholder')}
                        />
                        <button
                            onClick={copyToClipboard}
                            className="absolute top-2 right-2 p-2 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-800 transition-all"
                            title={t('reports.email.copy')}
                        >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sm:rounded-b-2xl">
                    <button className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium text-sm px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <Clock className="w-4 h-4" />
                        {t('reports.email.schedule')}
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            {t('common.cancel')}
                        </button>
                        <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/30 transition-all flex items-center gap-2">
                            <Send className="w-4 h-4" />
                            {t('reports.email.sendNow')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportEmailComposer;

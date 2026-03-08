import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, Image, Film, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './Common';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileItem {
    id: string;
    file: File;
    preview?: string;
    status: 'queued' | 'uploading' | 'done' | 'error';
    progress: number;
    url?: string;
    error?: string;
}

export interface FileUploadProps {
    /** Called for each file that needs uploading. Should return the URL on success. */
    onUpload: (file: File, onProgress: (pct: number) => void) => Promise<string>;
    /** Called when a file is successfully uploaded. */
    onComplete?: (file: File, url: string) => void;
    /** Accepted MIME types. Default: images, PDF, DOCX, PPTX, MP4. */
    accept?: string;
    /** Max file size in bytes. Default: 25 MB. */
    maxSize?: number;
    /** Allow multiple files. Default: true. */
    multiple?: boolean;
    /** Max number of simultaneous uploads. Default: 2. */
    concurrency?: number;
    /** Extra className. */
    className?: string;
    /** Label shown in the drop zone. */
    label?: string;
}

// ---------------------------------------------------------------------------
// Icon helper
// ---------------------------------------------------------------------------

function FileIcon({ mime }: { mime: string }) {
    if (mime.startsWith('image/')) return <Image className="h-5 w-5 text-indigo-500" />;
    if (mime.startsWith('video/')) return <Film className="h-5 w-5 text-purple-500" />;
    return <FileText className="h-5 w-5 text-slate-500" />;
}

function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

let _nextId = 1;

const FileUpload: React.FC<FileUploadProps> = ({
    onUpload,
    onComplete,
    accept = 'image/*,application/pdf,video/mp4,video/webm,.docx,.pptx',
    maxSize = 25 * 1024 * 1024,
    multiple = true,
    concurrency = 2,
    className,
    label = 'Drop files here or click to browse',
}) => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const uploadingRef = useRef(0);
    const queueRef = useRef<FileItem[]>([]);

    // --- Queue processor ------------------------------------------------------
    const processQueue = useCallback(() => {
        while (uploadingRef.current < concurrency && queueRef.current.length > 0) {
            const item = queueRef.current.shift()!;
            uploadingRef.current++;

            setFiles((prev) =>
                prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' } : f)),
            );

            onUpload(item.file, (pct) => {
                setFiles((prev) =>
                    prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f)),
                );
            })
                .then((url) => {
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === item.id ? { ...f, status: 'done', progress: 100, url } : f,
                        ),
                    );
                    onComplete?.(item.file, url);
                })
                .catch((err) => {
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === item.id
                                ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
                                : f,
                        ),
                    );
                })
                .finally(() => {
                    uploadingRef.current--;
                    processQueue();
                });
        }
    }, [concurrency, onUpload, onComplete]);

    // --- Add files ------------------------------------------------------------
    const addFiles = useCallback(
        (fileList: FileList | File[]) => {
            const incoming = Array.from(fileList);
            const items: FileItem[] = [];

            for (const file of incoming) {
                if (file.size > maxSize) continue; // silently skip oversize
                const id = `fu-${_nextId++}`;
                const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
                const item: FileItem = { id, file, preview, status: 'queued', progress: 0 };
                items.push(item);
            }

            if (items.length === 0) return;

            setFiles((prev) => (multiple ? [...prev, ...items] : items));
            queueRef.current.push(...items);
            processQueue();
        },
        [maxSize, multiple, processQueue],
    );

    // --- Remove file ----------------------------------------------------------
    const removeFile = useCallback((id: string) => {
        setFiles((prev) => {
            const f = prev.find((x) => x.id === id);
            if (f?.preview) URL.revokeObjectURL(f.preview);
            return prev.filter((x) => x.id !== id);
        });
        queueRef.current = queueRef.current.filter((x) => x.id !== id);
    }, []);

    // --- Drag handlers --------------------------------------------------------
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        },
        [addFiles],
    );

    // --- Render ---------------------------------------------------------------
    return (
        <div className={cn('w-full space-y-3', className)}>
            {/* Drop zone */}
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    'relative flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 transition-all',
                    dragging
                        ? 'border-indigo-400 bg-indigo-50/60 ring-4 ring-indigo-100'
                        : 'border-slate-300 bg-slate-50/50 hover:border-indigo-300 hover:bg-indigo-50/30',
                )}
            >
                <Upload className={cn('h-8 w-8', dragging ? 'text-indigo-500' : 'text-slate-400')} />
                <span className="text-sm font-medium text-slate-600">{label}</span>
                <span className="text-xs text-slate-400">Max {formatSize(maxSize)} per file</span>
            </button>

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
                className="sr-only"
                aria-label="Upload files"
            />

            {/* File list */}
            <AnimatePresence>
                {files.map((item) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                            {/* Preview / icon */}
                            {item.preview ? (
                                <img
                                    src={item.preview}
                                    alt=""
                                    className="h-10 w-10 rounded-md object-cover"
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100">
                                    <FileIcon mime={item.file.type} />
                                </div>
                            )}

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-medium text-slate-800">{item.file.name}</p>
                                <p className="text-xs text-slate-400">{formatSize(item.file.size)}</p>
                                {/* Progress bar */}
                                {(item.status === 'uploading' || item.status === 'queued') && (
                                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                        <motion.div
                                            className="h-full rounded-full bg-indigo-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.progress}%` }}
                                            transition={{ ease: 'easeOut', duration: 0.3 }}
                                        />
                                    </div>
                                )}
                                {item.status === 'error' && (
                                    <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                                        <AlertCircle className="h-3 w-3" />
                                        {item.error}
                                    </p>
                                )}
                            </div>

                            {/* Status indicators */}
                            <div className="shrink-0">
                                {item.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />}
                                {item.status === 'done' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                                {(item.status === 'queued' || item.status === 'error') && (
                                    <button onClick={() => removeFile(item.id)} className="rounded p-0.5 hover:bg-slate-100" aria-label="Remove file">
                                        <X className="h-4 w-4 text-slate-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default FileUpload;

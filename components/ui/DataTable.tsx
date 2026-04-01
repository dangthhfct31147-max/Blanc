import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
    ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
    Search, Settings2, Download, Loader2, Check,
} from 'lucide-react';
import { cn } from './Common';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColumnDef<T> {
    /** Unique key for the column. */
    id: string;
    /** Header label. */
    header: string;
    /** Cell renderer – receives the row data. */
    cell: (row: T) => React.ReactNode;
    /** Return a primitive for sorting. If omitted, column is not sortable. */
    sortValue?: (row: T) => string | number;
    /** Return a string for text-filtering. If omitted, column is not filterable. */
    filterValue?: (row: T) => string;
    /** Default visibility (true). */
    defaultVisible?: boolean;
    /** Min width in px (optional). */
    minWidth?: number;
}

export type SortDir = 'asc' | 'desc';

export interface DataTableProps<T> {
    /** Column definitions. */
    columns: ColumnDef<T>[];
    /** Row data. */
    data: T[];
    /** Unique key accessor per row (for React keys & selection). */
    rowKey: (row: T) => string;
    /** When true, shows a spinner overlay on the table body. */
    loading?: boolean;
    /** Placeholder when data is empty. */
    emptyMessage?: string;
    /** Enable row selection checkboxes. */
    selectable?: boolean;
    /** Callback when selection changes. */
    onSelectionChange?: (selectedKeys: Set<string>) => void;
    /** External search value (if you provide your own search input). */
    externalSearch?: string;
    /** Hide the built-in search bar. */
    hideSearch?: boolean;
    /** Extra toolbar content rendered to the right of the search bar. */
    toolbarRight?: React.ReactNode;
    /** Page size options. Default: [10, 25, 50] */
    pageSizeOptions?: number[];
    /** Enable CSV export button. */
    exportable?: boolean;
    /** File name for CSV export (without extension). */
    exportFileName?: string;
    /** Additional class for the outer wrapper. */
    className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeCSV(val: unknown): string {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DataTableInner<T>(
    props: DataTableProps<T>,
) {
    const {
        columns,
        data,
        rowKey,
        loading = false,
        emptyMessage = 'No data',
        selectable = false,
        onSelectionChange,
        externalSearch,
        hideSearch = false,
        toolbarRight,
        pageSizeOptions = [10, 25, 50],
        exportable = false,
        exportFileName = 'export',
        className,
    } = props;

    // --- State ----------------------------------------------------------------
    const [search, setSearch] = useState('');
    const [sortId, setSortId] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(pageSizeOptions[0] ?? 10);
    const [selection, setSelection] = useState<Set<string>>(new Set());
    const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
        const set = new Set<string>();
        columns.forEach((c) => {
            if (c.defaultVisible !== false) set.add(c.id);
        });
        return set;
    });
    const [showColMenu, setShowColMenu] = useState(false);
    const colMenuRef = useRef<HTMLDivElement>(null);

    const activeSearch = externalSearch ?? search;

    // --- Derived data ---------------------------------------------------------
    const activeColumns = useMemo(
        () => columns.filter((c) => visibleCols.has(c.id)),
        [columns, visibleCols],
    );

    const filtered = useMemo(() => {
        if (!activeSearch) return data;
        const lower = activeSearch.toLowerCase();
        return data.filter((row) =>
            columns.some((col) => {
                const fn = col.filterValue;
                return fn && fn(row).toLowerCase().includes(lower);
            }),
        );
    }, [data, activeSearch, columns]);

    const sorted = useMemo(() => {
        if (!sortId) return filtered;
        const col = columns.find((c) => c.id === sortId);
        if (!col?.sortValue) return filtered;
        const copy = [...filtered];
        copy.sort((a, b) => {
            const av = col.sortValue!(a);
            const bv = col.sortValue!(b);
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return copy;
    }, [filtered, sortId, sortDir, columns]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

    // --- Callbacks ------------------------------------------------------------
    const toggleSort = useCallback(
        (colId: string) => {
            if (sortId === colId) {
                setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
            } else {
                setSortId(colId);
                setSortDir('asc');
            }
            setPage(1);
        },
        [sortId],
    );

    const updateSelection = useCallback(
        (next: Set<string>) => {
            setSelection(next);
            onSelectionChange?.(next);
        },
        [onSelectionChange],
    );

    const toggleRow = useCallback(
        (key: string) => {
            const next = new Set(selection);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            updateSelection(next);
        },
        [selection, updateSelection],
    );

    const toggleAll = useCallback(() => {
        if (selection.size === pageRows.length) {
            updateSelection(new Set());
        } else {
            updateSelection(new Set(pageRows.map(rowKey)));
        }
    }, [selection, pageRows, rowKey, updateSelection]);

    const toggleCol = useCallback((colId: string) => {
        setVisibleCols((prev) => {
            const next = new Set(prev);
            if (next.has(colId)) {
                if (next.size > 1) next.delete(colId);
            } else {
                next.add(colId);
            }
            return next;
        });
    }, []);

    const exportCSV = useCallback(() => {
        const headers = activeColumns.map((c) => c.header);
        const rows = sorted.map((row) =>
            activeColumns.map((c) => {
                const fn = c.filterValue ?? c.sortValue;
                return escapeCSV(fn ? fn(row) : '');
            }),
        );
        const csv = [headers.map(escapeCSV).join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportFileName}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [activeColumns, sorted, exportFileName]);

    // close column menu on outside click
    React.useEffect(() => {
        if (!showColMenu) return;
        const handler = (e: MouseEvent) => {
            if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
                setShowColMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showColMenu]);

    // Reset page when search changes
    React.useEffect(() => { setPage(1); }, [activeSearch]);

    // --- Render ---------------------------------------------------------------
    const allSelected = pageRows.length > 0 && selection.size === pageRows.length;

    return (
        <div className={cn('w-full rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900', className)}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                {!hideSearch && (
                    <div className="relative flex-1 min-w-45 max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search…"
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-600 dark:focus:ring-indigo-900"
                        />
                    </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                    {/* Column visibility */}
                    <div className="relative" ref={colMenuRef}>
                        <button
                            onClick={() => setShowColMenu((v) => !v)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            <Settings2 className="h-3.5 w-3.5" />
                            Columns
                        </button>
                        {showColMenu && (
                            <div className="absolute right-0 z-30 mt-1.5 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                {columns.map((col) => (
                                    <button
                                        key={col.id}
                                        onClick={() => toggleCol(col.id)}
                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                    >
                                        <span className={cn(
                                            'flex h-4 w-4 items-center justify-center rounded border transition',
                                            visibleCols.has(col.id) ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 dark:border-slate-600',
                                        )}>
                                            {visibleCols.has(col.id) && <Check className="h-3 w-3" />}
                                        </span>
                                        {col.header}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* CSV export */}
                    {exportable && (
                        <button
                            onClick={exportCSV}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export
                        </button>
                    )}

                    {toolbarRight}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60 text-left dark:border-slate-800 dark:bg-slate-800/60">
                            {selectable && (
                                <th className="w-10 px-3 py-2.5">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                        aria-label="Select all rows"
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
                                    />
                                </th>
                            )}
                            {activeColumns.map((col) => {
                                const sortable = !!col.sortValue;
                                const isSorted = sortId === col.id;
                                return (
                                    <th
                                        key={col.id}
                                        className={cn(
                                            'px-3 py-2.5 font-semibold text-slate-600 whitespace-nowrap dark:text-slate-400',
                                            sortable && 'cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200',
                                        )}
                                        style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                                        onClick={sortable ? () => toggleSort(col.id) : undefined}
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            {col.header}
                                            {sortable && (
                                                isSorted
                                                    ? (sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)
                                                    : <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />
                                            )}
                                        </span>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody className="relative divide-y divide-slate-100 dark:divide-slate-800">
                        {loading && (
                            <tr>
                                <td colSpan={activeColumns.length + (selectable ? 1 : 0)} className="h-40">
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70">
                                        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                                    </div>
                                </td>
                            </tr>
                        )}

                        {!loading && pageRows.length === 0 && (
                            <tr>
                                <td
                                    colSpan={activeColumns.length + (selectable ? 1 : 0)}
                                    className="py-12 text-center text-slate-400"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            pageRows.map((row) => {
                                const key = rowKey(row);
                                const selected = selection.has(key);
                                return (
                                    <tr
                                        key={key}
                                        className={cn(
                                            'transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50',
                                            selected && 'bg-indigo-50/40 dark:bg-indigo-900/20',
                                        )}
                                    >
                                        {selectable && (
                                            <td className="px-3 py-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => toggleRow(key)}
                                                    aria-label="Select row"
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
                                                />
                                            </td>
                                        )}
                                        {activeColumns.map((col) => (
                                            <td key={col.id} className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                                                {col.cell(row)}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <div className="flex items-center gap-2">
                    <span>Rows per page</span>
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                        aria-label="Rows per page"
                        className="rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                        {pageSizeOptions.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>

                <span>
                    {sorted.length === 0
                        ? '0 results'
                        : `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} of ${sorted.length}`}
                </span>

                <div className="flex items-center gap-1">
                    <button
                        disabled={safePage === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="rounded p-1 transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-2 font-medium">{safePage} / {totalPages}</span>
                    <button
                        disabled={safePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="rounded p-1 transition hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                        aria-label="Next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Wrap in generic-preserving memo — consumers get proper type inference.
const DataTable = React.memo(DataTableInner) as typeof DataTableInner;

export default DataTable;

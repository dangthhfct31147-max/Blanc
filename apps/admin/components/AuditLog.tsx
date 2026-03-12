import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { analyzeAuditLogs } from '../services/geminiService';
import { auditLogService, AUDIT_ACTIONS } from '../services/auditLogService';
import { AuditLogEntry } from '../types';
import { Dropdown } from './ui/Dropdown';

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await auditLogService.getAll({
        page,
        limit,
        search: searchTerm || undefined,
        status: (statusFilter as any) || undefined,
        action: actionFilter || undefined,
      });
      setLogs(result.items);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, statusFilter, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    const analysis = await analyzeAuditLogs(logs);
    setAiAnalysis(analysis);
    setIsAnalyzing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'Failed':
        return <XCircle size={16} className="text-red-500" />;
      case 'Warning':
        return <AlertTriangle size={16} className="text-orange-500" />;
      default:
        return <FileText size={16} className="text-gray-400" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Success':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'Failed':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'Warning':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
          <p className="mt-1 text-gray-500">Track system activities and security events</p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-sm transition-all hover:bg-emerald-700"
        >
          {isAnalyzing ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
          AI Security Insight
        </button>
      </div>

      {/* AI Analysis Panel */}
      {aiAnalysis && (
        <div className="animate-fade-in-up rounded-xl border-l-4 border-emerald-500 bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white shadow-md">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="text-emerald-400" />
            <h3 className="text-lg font-bold">Gemini Security Analysis</h3>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-line text-slate-200">{aiAnalysis}</div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex max-w-md min-w-[300px] flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          <Search size={20} className="ml-2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by action, user, or details..."
            className="flex-1 p-1 text-sm text-gray-700 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            title="Toggle filters"
            className={`rounded-lg p-1.5 ${showFilters ? 'bg-emerald-100 text-emerald-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
          </button>
        </div>
        <button onClick={fetchLogs} className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50" title="Refresh">
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="min-w-[150px]">
            <Dropdown
              options={[
                { value: '', label: 'All Status' },
                { value: 'Success', label: 'Success', color: 'bg-green-500' },
                { value: 'Failed', label: 'Failed', color: 'bg-red-500' },
                { value: 'Warning', label: 'Warning', color: 'bg-orange-500' },
              ]}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              placeholder="All Status"
              size="sm"
            />
          </div>
          <div className="min-w-[180px]">
            <Dropdown
              options={[{ value: '', label: 'All Actions' }, ...Object.values(AUDIT_ACTIONS).map((action) => ({ value: action, label: action }))]}
              value={actionFilter}
              onChange={(val) => {
                setActionFilter(val);
                setPage(1);
              }}
              placeholder="All Actions"
              size="sm"
            />
          </div>
          <button
            onClick={() => {
              setStatusFilter('');
              setActionFilter('');
              setSearchTerm('');
              setPage(1);
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-900 uppercase">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action / Target</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">IP Address</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <Loader2 className="mb-2 inline-block animate-spin text-emerald-600" size={24} />
                    <p className="text-gray-400">Loading audit logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400">
                    No logs found matching your criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  // Helper to safely render any value as string
                  const safeStr = (val: unknown): string => {
                    if (val === null || val === undefined) return '';
                    if (typeof val === 'object') return JSON.stringify(val);
                    return String(val);
                  };

                  return (
                    <tr key={log.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusStyle(log.status)}`}>
                          {getStatusIcon(log.status)}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{safeStr(log.action)}</div>
                        <div className="text-xs text-gray-500">{safeStr(log.target)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700">{safeStr(log.user)}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{safeStr(log.ip)}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="max-w-xs truncate px-6 py-4 text-gray-600" title={safeStr(log.details)}>
                        {safeStr(log.details)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
          <span className="text-sm text-gray-500">{isLoading ? 'Loading...' : `Showing ${logs.length} of ${total} entries`}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="rounded border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="rounded border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;

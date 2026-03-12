import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  Lock,
  Unlock,
  Ban,
  CheckCircle,
  RefreshCw,
  Activity,
  Users,
  Globe,
  Clock,
  TrendingUp,
  Eye,
  XCircle,
} from 'lucide-react';
import securityService, { SecurityAnalysis, SecurityAlert, BlockedIP } from '../services/securityService';
import { Dropdown } from './ui/Dropdown';

const SecurityDashboard: React.FC = () => {
  const [data, setData] = useState<SecurityAnalysis | null>(null);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Block IP Modal
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockIPInput, setBlockIPInput] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockDuration, setBlockDuration] = useState(24);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [analysis, ipsData] = await Promise.all([securityService.getAnalysis(), securityService.getBlockedIPs()]);
      setData(analysis);
      setBlockedIPs(ipsData.blockedIPs);
    } catch (err) {
      setError('Failed to load security data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleUnlockAccount = async (email: string) => {
    setActionLoading(email);
    try {
      await securityService.unlockAccount(email);
      fetchData();
    } catch (err) {
      console.error('Failed to unlock account:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlockIP = async () => {
    if (!blockIPInput) return;
    setActionLoading('block-ip');
    try {
      await securityService.blockIP(blockIPInput, blockReason, blockDuration);
      setShowBlockModal(false);
      setBlockIPInput('');
      setBlockReason('');
      fetchData();
    } catch (err) {
      console.error('Failed to block IP:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblockIP = async (ip: string) => {
    setActionLoading(ip);
    try {
      await securityService.unblockIP(ip);
      fetchData();
    } catch (err) {
      console.error('Failed to unblock IP:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleQuickBlockIP = async (ip: string) => {
    setActionLoading(ip);
    try {
      await securityService.blockIP(ip, 'Blocked from security dashboard', 24);
      fetchData();
    } catch (err) {
      console.error('Failed to block IP:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="text-red-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-orange-500" size={20} />;
      default:
        return <Info className="text-blue-500" size={20} />;
    }
  };

  const getAlertStyle = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <AlertCircle className="mr-2 inline" />
        {error}
        <button onClick={fetchData} className="ml-4 underline">
          Retry
        </button>
      </div>
    );
  }

  const summary = data?.summary;
  const alerts = data?.alerts || [];
  const criticalAlerts = alerts.filter((a) => a.type === 'critical');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <ShieldAlert className="text-emerald-600" />
            Security Dashboard
          </h2>
          <p className="mt-1 text-gray-500">Monitor threats and protect your platform</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBlockModal(true)} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
            <Ban size={18} />
            Block IP
          </button>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="flex animate-pulse items-center gap-3 rounded-xl bg-red-600 p-4 text-white">
          <AlertCircle size={24} />
          <span className="font-bold">
            {criticalAlerts.length} Critical Security Alert{criticalAlerts.length > 1 ? 's' : ''} Detected!
          </span>
          <span className="text-red-200">Immediate action required</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Login Attempts (24h)</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.totalLoginAttempts24h || 0}</p>
            </div>
            <Activity className="text-blue-500" size={32} />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <CheckCircle className="mr-1 text-green-500" size={14} />
            <span className="text-green-600">{summary?.successfulLogins24h || 0} successful</span>
            <span className="mx-2 text-gray-300">|</span>
            <XCircle className="mr-1 text-red-500" size={14} />
            <span className="text-red-600">{summary?.failedLogins24h || 0} failed</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Failure Rate</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.failureRate || '0%'}</p>
            </div>
            <TrendingUp className={`${parseFloat(summary?.failureRate || '0') > 30 ? 'text-red-500' : 'text-green-500'}`} size={32} />
          </div>
          <p className="mt-2 text-sm text-gray-500">{parseFloat(summary?.failureRate || '0') > 30 ? 'High failure rate - possible attack' : 'Normal levels'}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Locked Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.lockedAccountsCount || 0}</p>
            </div>
            <Lock className="text-orange-500" size={32} />
          </div>
          <p className="mt-2 text-sm text-gray-500">Due to failed login attempts</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Threats</p>
              <p className={`text-2xl font-bold ${(summary?.activeThreatCount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summary?.activeThreatCount || 0}
              </p>
            </div>
            {(summary?.activeThreatCount || 0) > 0 ? <ShieldAlert className="text-red-500" size={32} /> : <ShieldCheck className="text-green-500" size={32} />}
          </div>
          <p className="mt-2 text-sm text-gray-500">{(summary?.activeThreatCount || 0) > 0 ? 'Requires attention' : 'All clear'}</p>
        </div>
      </div>

      {/* Security Alerts */}
      {alerts.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <AlertTriangle size={18} />
              Security Alerts ({alerts.length})
            </h3>
          </div>
          <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
            {alerts.map((alert, idx) => (
              <div key={idx} className={`p-4 ${getAlertStyle(alert.type)} border-l-4`}>
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    {alert.ip && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded bg-white/50 px-2 py-1 font-mono text-xs">{alert.ip}</span>
                        <button
                          onClick={() => handleQuickBlockIP(alert.ip!)}
                          disabled={actionLoading === alert.ip}
                          className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                        >
                          <Ban size={12} />
                          {actionLoading === alert.ip ? 'Blocking...' : 'Block IP'}
                        </button>
                      </div>
                    )}
                    {alert.email && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded bg-white/50 px-2 py-1 text-xs">{alert.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Locked Accounts */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <Lock size={18} />
              Locked Accounts ({data?.lockedAccounts.length || 0})
            </h3>
          </div>
          <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
            {data?.lockedAccounts.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <ShieldCheck className="mx-auto mb-2" size={32} />
                No locked accounts
              </div>
            ) : (
              data?.lockedAccounts.map((account) => (
                <div key={account._id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-gray-900">{account.email}</p>
                    <p className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock size={12} />
                      Locked until {new Date(account.lockedUntil).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnlockAccount(account.email)}
                    disabled={actionLoading === account.email}
                    className="flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-200"
                  >
                    <Unlock size={14} />
                    {actionLoading === account.email ? 'Unlocking...' : 'Unlock'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Blocked IPs */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <Ban size={18} />
              Blocked IPs ({blockedIPs.length})
            </h3>
          </div>
          <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
            {blockedIPs.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <Globe className="mx-auto mb-2" size={32} />
                No blocked IPs
              </div>
            ) : (
              blockedIPs.map((ip) => (
                <div key={ip._id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-mono font-medium text-gray-900">{ip.ip}</p>
                    <p className="text-sm text-gray-500">{ip.reason}</p>
                    <p className="text-xs text-gray-400">Expires: {new Date(ip.expiresAt).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleUnblockIP(ip.ip)}
                    disabled={actionLoading === ip.ip}
                    className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    <CheckCircle size={14} />
                    {actionLoading === ip.ip ? 'Unblocking...' : 'Unblock'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Suspicious IPs */}
      {(data?.suspiciousIPs.length || 0) > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <Eye size={18} />
              Suspicious IPs ({data?.suspiciousIPs.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">IP Address</th>
                  <th className="px-6 py-3 text-left">Total Attempts</th>
                  <th className="px-6 py-3 text-left">Failed</th>
                  <th className="px-6 py-3 text-left">Failure Rate</th>
                  <th className="px-6 py-3 text-left">Targeted Emails</th>
                  <th className="px-6 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.suspiciousIPs.map((ip) => (
                  <tr key={ip._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono">{ip._id}</td>
                    <td className="px-6 py-4">{ip.total}</td>
                    <td className="px-6 py-4 text-red-600">{ip.failed}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          ip.failureRate >= 0.9 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {(ip.failureRate * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {ip.emails.slice(0, 3).map((email, i) => (
                          <span key={i} className="rounded bg-gray-100 px-1 text-xs">
                            {email}
                          </span>
                        ))}
                        {ip.emails.length > 3 && <span className="text-xs text-gray-400">+{ip.emails.length - 3} more</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleQuickBlockIP(ip._id)}
                        disabled={actionLoading === ip._id}
                        className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                      >
                        {actionLoading === ip._id ? '...' : 'Block'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Security Events */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h3 className="flex items-center gap-2 font-semibold text-gray-900">
            <Activity size={18} />
            Recent Security Events
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Time</th>
                <th className="px-6 py-3 text-left">Action</th>
                <th className="px-6 py-3 text-left">User</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">IP</th>
                <th className="px-6 py-3 text-left">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.recentSecurityEvents.slice(0, 15).map((event) => (
                <tr key={event._id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-xs text-gray-500">{new Date(event.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        event.action === 'LOGIN_SUCCESS'
                          ? 'bg-green-100 text-green-700'
                          : event.action === 'LOGIN_ATTEMPT'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {event.action}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs">{event.userEmail || '-'}</td>
                  <td className="px-6 py-3">
                    {event.status === 'Success' ? <CheckCircle className="text-green-500" size={16} /> : <XCircle className="text-red-500" size={16} />}
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-gray-500">{event.ip}</td>
                  <td className="max-w-xs truncate px-6 py-3 text-xs text-gray-600">{event.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block IP Modal */}
      {showBlockModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBlockModal(false)} />
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                <Ban className="text-red-500" />
                Block IP Address
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">IP Address</label>
                  <input
                    type="text"
                    value={blockIPInput}
                    onChange={(e) => setBlockIPInput(e.target.value)}
                    placeholder="e.g., 192.168.1.1"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Reason</label>
                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="e.g., Brute force attack"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Duration (hours)</label>
                  <Dropdown
                    options={[
                      { value: '1', label: '1 hour' },
                      { value: '6', label: '6 hours' },
                      { value: '24', label: '24 hours' },
                      { value: '72', label: '3 days' },
                      { value: '168', label: '1 week' },
                      { value: '720', label: '30 days' },
                    ]}
                    value={String(blockDuration)}
                    onChange={(val) => setBlockDuration(Number(val))}
                    placeholder="Select duration"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowBlockModal(false)} className="rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100">
                  Cancel
                </button>
                <button
                  onClick={handleBlockIP}
                  disabled={!blockIPInput || actionLoading === 'block-ip'}
                  className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === 'block-ip' ? 'Blocking...' : 'Block IP'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default SecurityDashboard;

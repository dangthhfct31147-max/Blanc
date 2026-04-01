import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreHorizontal, Mail, Shield, ShieldAlert, Eye, Edit2, Trash2, Ban, CheckCircle, Send, Users, Loader2, X } from 'lucide-react';
import { MOCK_USERS } from '../constants';
import { User } from '../types';
import { api } from '../lib/api';

interface BroadcastResult {
  success: boolean;
  message: string;
  sent: number;
  failed: number;
  total: number;
}

const UserManager: React.FC = () => {
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Broadcast Email State
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastAudience, setBroadcastAudience] = useState<'all' | 'students' | 'admins'>('all');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResult | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.action-dropdown')) return;
      setOpenActionId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: string, user: User) => {
    console.log(`Action: ${action} on user: ${user.name}`);
    // In a real application, you would add logic here to open modals or make API calls
    setOpenActionId(null);
  };

  const handleSendBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastContent.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }

    setIsSendingBroadcast(true);
    setBroadcastResult(null);

    try {
      const result = await api.post<BroadcastResult>('/admin/email/broadcast', {
        subject: broadcastSubject,
        content: broadcastContent,
        audience: broadcastAudience,
      });

      setBroadcastResult(result);

      // Clear form on success
      if (result.success) {
        setBroadcastSubject('');
        setBroadcastContent('');
      }
    } catch (error) {
      setBroadcastResult({
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi khi gửi email',
        sent: 0,
        failed: 0,
        total: 0,
      });
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Students & Admins</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Manage user roles and permissions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBroadcast(!showBroadcast)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showBroadcast
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
          >
            <Mail size={18} />
            Broadcast Email
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none w-full sm:w-64 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
            />
          </div>
          <button title="Lọc người dùng" className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-400">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Broadcast Email Section */}
      {showBroadcast && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="text-emerald-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Broadcast Email cho Users</h3>
            </div>
            <button
              title="Đóng"
              onClick={() => {
                setShowBroadcast(false);
                setBroadcastResult(null);
              }}
              className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>
          </div>

          {/* Result Alert */}
          {broadcastResult && (
            <div className={`mb-4 p-4 rounded-lg ${broadcastResult.success
              ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}>
              <p className="font-medium">{broadcastResult.message}</p>
              {broadcastResult.success && (
                <p className="text-sm mt-1">
                  Đã gửi: {broadcastResult.sent} | Thất bại: {broadcastResult.failed} | Tổng: {broadcastResult.total}
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            {/* Audience Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Đối tượng</label>
              <select
                value={broadcastAudience}
                onChange={(e) => setBroadcastAudience(e.target.value as 'all' | 'students' | 'admins')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                title="Chọn đối tượng nhận email"
              >
                <option value="all">Tất cả người dùng</option>
                <option value="students">Chỉ học viên</option>
                <option value="admins">Chỉ Admin</option>
              </select>
            </div>

            {/* Subject Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tiêu đề</label>
              <input
                type="text"
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                placeholder="Tiêu đề email..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              />
            </div>

            {/* Content Textarea */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nội dung</label>
              <textarea
                value={broadcastContent}
                onChange={(e) => setBroadcastContent(e.target.value)}
                placeholder="Nội dung email... (Dùng {{name}} để chèn tên người nhận)"
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Hỗ trợ HTML cơ bản: &lt;p&gt;, &lt;br&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a&gt;</p>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendBroadcast}
              disabled={isSendingBroadcast || !broadcastSubject.trim() || !broadcastContent.trim()}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-white transition-all ${isSendingBroadcast || !broadcastSubject.trim() || !broadcastContent.trim()
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-md'
                }`}
            >
              {isSendingBroadcast ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Gửi Broadcast
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="overflow-x-auto min-h-[300px]"> {/* min-h ensure dropdown has space if few items */}
          <table className="w-full text-left text-sm text-gray-600 dark:text-slate-400">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-800 text-gray-900 dark:text-slate-100 uppercase font-semibold text-xs">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Balance</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {MOCK_USERS.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img src={user.avatar} alt="" className="h-10 w-10 rounded-full border border-gray-200 dark:border-slate-700" />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                          <Mail size={10} /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {user.role === 'admin' ? (
                        <ShieldAlert size={16} className="text-purple-600" />
                      ) : (
                        <Shield size={16} className="text-gray-400 dark:text-slate-400" />
                      )}
                      <span className={`capitalize ${user.role === 'admin' ? 'text-purple-700 dark:text-purple-300 font-medium' : 'text-gray-700 dark:text-slate-300'}`}>
                        {user.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-700 dark:text-slate-300">
                    ₫{user.balance.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative action-dropdown inline-block text-left">
                      <button
                        title="Thao tác"
                        onClick={() => setOpenActionId(openActionId === user.id ? null : user.id)}
                        className={`p-2 rounded-lg border transition-all duration-200 ${openActionId === user.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 shadow-sm'
                          : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                          }`}
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {/* Dropdown Menu */}
                      {openActionId === user.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 z-50 overflow-hidden animate-fade-in-up origin-top-right">
                          <div className="py-1">
                            <button onClick={() => handleAction('view', user)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                              <Eye size={16} className="text-gray-400 dark:text-slate-400" />
                              <span>View Profile</span>
                            </button>
                            <button onClick={() => handleAction('edit', user)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                              <Edit2 size={16} className="text-gray-400 dark:text-slate-400" />
                              <span>Edit Details</span>
                            </button>

                            <div className="border-t border-gray-50 dark:border-slate-800 my-1"></div>

                            {user.status === 'active' ? (
                              <button onClick={() => handleAction('ban', user)} className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 flex items-center gap-2 transition-colors">
                                <Ban size={16} />
                                <span>Ban User</span>
                              </button>
                            ) : (
                              <button onClick={() => handleAction('activate', user)} className="w-full text-left px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 flex items-center gap-2 transition-colors">
                                <CheckCircle size={16} />
                                <span>Activate</span>
                              </button>
                            )}

                            <button onClick={() => handleAction('delete', user)} className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 transition-colors">
                              <Trash2 size={16} />
                              <span>Delete User</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800 px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-slate-400">Showing 1 to 5 of 243 entries</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm text-gray-600 dark:text-slate-400 disabled:opacity-50">Previous</button>
            <button className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManager;
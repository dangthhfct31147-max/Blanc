import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Loader2, Sparkles, TrendingUp, Trophy,
    Zap, Target
} from 'lucide-react';
import { api } from '../lib/api';
import { useAppAuth } from '../contexts/AppAuthContext';
import SkillTree from '../components/SkillTree';

interface SkillTreeResponse {
    user: { id: string; name: string; avatar: string | null };
    totalXP: number;
    overallLevel: number;
    branches: any[];
}

export default function SkillTreePage() {
    const { user } = useAppAuth();
    const navigate = useNavigate();
    const [data, setData] = useState<SkillTreeResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user?.id) return;

        const fetchSkillTree = async () => {
            try {
                setLoading(true);
                setError('');
                const result = await api.get<SkillTreeResponse>(`/skill-tree/${user.id}`);
                setData(result);
            } catch (err: any) {
                setError(err?.message || 'Không thể tải dữ liệu');
            } finally {
                setLoading(false);
            }
        };

        fetchSkillTree();
    }, [user?.id]);

    if (loading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Đang tải cây kỹ năng...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <Target className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-200 mb-2">Không thể tải</h2>
                    <p className="text-slate-400 mb-4">{error}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    // Count unlocked nodes
    const totalUnlocked = data.branches.reduce(
        (acc, b) => acc + b.tiers.filter((t: any) => t.status !== 'locked').length,
        0
    );
    const totalNodes = data.branches.reduce((acc, b) => acc + b.tiers.length, 0);

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }}>
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Quay lại
                    </button>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-3">
                                <Sparkles className="w-3.5 h-3.5" />
                                Gamification
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                                🌳 Cây Kỹ Năng
                            </h1>
                            <p className="text-slate-400 text-sm">
                                Hành trình phát triển cá nhân qua các cuộc thi và khóa học
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.05))', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs text-indigo-300 font-medium">Tổng XP</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{data.totalXP.toLocaleString()}</div>
                    </div>

                    <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs text-emerald-300 font-medium">Level</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{data.overallLevel}</div>
                    </div>

                    <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <div className="flex items-center gap-2 mb-1">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span className="text-xs text-amber-300 font-medium">Đã mở khóa</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{totalUnlocked}<span className="text-sm text-slate-400 font-normal">/{totalNodes}</span></div>
                    </div>

                    <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(236, 72, 153, 0.05))', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                        <div className="flex items-center gap-2 mb-1">
                            <Target className="w-4 h-4 text-pink-400" />
                            <span className="text-xs text-pink-300 font-medium">Nhánh</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{data.branches.filter(b => b.xp > 0).length}<span className="text-sm text-slate-400 font-normal">/{data.branches.length}</span></div>
                    </div>
                </div>

                {/* Skill Tree Visualization */}
                <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.6))', border: '1px solid rgba(148, 163, 184, 0.1)', boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)' }}>
                    <SkillTree data={data} locale={(user as any)?.locale || 'vi'} />
                </div>

                {/* Info Footer */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-slate-500">
                        💡 Tham gia cuộc thi và hoàn thành khóa học để mở khóa thêm nhánh kỹ năng
                    </p>
                </div>
            </div>
        </div>
    );
}

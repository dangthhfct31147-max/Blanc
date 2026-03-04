import React from 'react';
import {
    Radar,
    RadarChart as RechartsRadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
} from 'recharts';

export interface RadarSkillsData {
    code: number;
    design: number;
    presentation: number;
    writing: number;
    management: number;
}

interface RadarChartProps {
    data: RadarSkillsData;
    color?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const SKILL_LABELS: Record<keyof RadarSkillsData, string> = {
    code: 'Code/Tech',
    design: 'Design/UI',
    presentation: 'Thuyết trình',
    writing: 'Viết lách',
    management: 'Quản lý',
};

export default function RadarChart({ data, color = '#6366f1', size = 'md', className = '' }: RadarChartProps) {
    // Always use fixed fullMark 10
    const chartData = Object.keys(data).map((key) => ({
        subject: SKILL_LABELS[key as keyof RadarSkillsData] || key,
        A: data[key as keyof RadarSkillsData],
        fullMark: 10,
    }));

    const sizeClasses = {
        sm: 'h-[180px]',
        md: 'h-[250px] sm:h-[300px]',
        lg: 'h-[350px] sm:h-[450px]',
    };

    const tickFontSize = size === 'sm' ? 10 : 12;

    return (
        <div className={`w-full flex justify-center items-center ${sizeClasses[size]} ${className}`}>
            <ResponsiveContainer width="100%" height="100%">
                <RechartsRadarChart cx="50%" cy="50%" outerRadius={size === 'sm' ? '60%' : '70%'} data={chartData}>
                    <PolarGrid stroke="#4b5563" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: tickFontSize }} />
                    {/* Hide the radius axis text but keep the domain 0-10 */}
                    <PolarRadiusAxis domain={[0, 10]} angle={30} tick={false} axisLine={false} />
                    <Radar
                        name="Skills"
                        dataKey="A"
                        stroke={color}
                        fill={color}
                        fillOpacity={0.5}
                        isAnimationActive={true}
                    />
                </RechartsRadarChart>
            </ResponsiveContainer>
        </div>
    );
}

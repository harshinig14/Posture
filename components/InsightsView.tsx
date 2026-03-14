import React, { useState, useEffect } from 'react';
import { PostureData } from '../types';

const API_URL = 'http://localhost:8000';

interface InsightsViewProps {
    data: PostureData;
}

interface MLInsightsData {
    success: boolean;
    has_enough_data: boolean;
    data_points: number;
    message?: string;
    quick_stats: {
        today: { percent: number; readings: number };
        week: { percent: number; readings: number };
    };
    risk_score: {
        score: number;
        level: string;
        label: string;
        color: string;
        factors: string[];
    };
    health_streak: {
        current_streak: number;
        best_streak: number;
        total_good_days: number;
    };
    patterns: {
        worst_hour: { hour: number | null; bad_percent: number };
        best_hour: { hour: number | null; good_percent: number };
        worst_day: { day: number | null; day_name: string | null; bad_percent: number };
        fatigue_threshold: { threshold_minutes: number; confidence?: string };
        improvement_rate: { improvement: number; trend: string; this_week_percent: number; last_week_percent: number };
        daily_average: { average_percent: number; days_tracked: number };
        peak_productivity: { start: number | null; end: number | null; readable?: string; good_percent?: number };
        session_stats: { avg_duration: number; total_sessions: number; longest_session?: number };
    } | null;
    insights: Array<{
        type: string;
        icon: string;
        title: string;
        description: string;
        priority: number;
    }>;
    recommendations: Array<{
        icon: string;
        title: string;
        description: string;
        category: string;
        priority: number;
    }>;
    weekly_summary: {
        this_week_percent: number;
        last_week_percent: number;
        change: number;
        trend: string;
        message: string;
        emoji: string;
        days_tracked: number;
        total_sessions: number;
        avg_session_duration: number;
    } | null;
    slouch_forecast: {
        available: boolean;
        probability: number;
        alert_in_minutes?: number | null;
        confidence?: string;
        message: string;
    };
    model_status: {
        has_personalized_model: boolean;
        total_samples: number;
        accuracy?: number;
        training_count: number;
        is_training: boolean;
    };
}

const InsightsView: React.FC<InsightsViewProps> = ({ data }) => {
    const [mlData, setMlData] = useState<MLInsightsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [noToken, setNoToken] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMLInsights();
    }, []);

    const fetchMLInsights = async () => {
        try {
            const token = localStorage.getItem('posture_token');
            if (!token) { setNoToken(true); setLoading(false); return; }

            const response = await fetch(`${API_URL}/api/ml/insights`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setMlData(data);
            } else {
                setError(data.detail || data.message || 'Failed to load insights');
            }
        } catch (err: any) {
            console.error('Error fetching ML insights:', err);
            setError('Could not connect to server');
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
            </div>
        );
    }

    if (noToken) {
        return (
            <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">🔒</span>
                </div>
                <p className="text-slate-500 text-lg">Please log in to view your insights</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">⚠️</span>
                </div>
                <p className="text-slate-700 text-lg font-bold">Something went wrong</p>
                <p className="text-slate-500 mt-2">{error}</p>
                <button onClick={() => { setError(null); setLoading(true); fetchMLInsights(); }} className="mt-4 px-6 py-2 bg-teal-500 text-white rounded-full text-sm font-bold hover:bg-teal-600 transition-colors">
                    Try Again
                </button>
            </div>
        );
    }

    if (!mlData) {
        return (
            <div className="text-center py-16">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">📊</span>
                </div>
                <p className="text-slate-500 text-lg">No insights data available yet</p>
                <p className="text-slate-400 mt-2">Start using the system to generate personalized insights</p>
            </div>
        );
    }

    const { quick_stats, risk_score, health_streak, patterns, insights, recommendations, weekly_summary, slouch_forecast, model_status } = mlData;

    const riskColors: Record<string, string> = {
        emerald: 'from-emerald-500 to-green-600',
        amber: 'from-amber-500 to-yellow-600',
        orange: 'from-orange-500 to-red-500',
        rose: 'from-rose-500 to-red-600',
        slate: 'from-slate-400 to-slate-500',
    };

    const insightTypeColors: Record<string, string> = {
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        prediction: 'bg-purple-50 border-purple-200 text-purple-800',
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        alert: 'bg-rose-50 border-rose-200 text-rose-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        tip: 'bg-teal-50 border-teal-200 text-teal-800',
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-3xl font-extrabold text-slate-900">Health Insights</h2>
                <p className="text-slate-500 mt-1">AI-powered analysis of your posture patterns</p>
            </div>

            {/* ===== ROW 1: Health Streak + Quick Stats ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Health Streak */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl text-center flex flex-col justify-center">
                    <div className="text-5xl mb-3">{health_streak.current_streak > 0 ? '🔥' : '💤'}</div>
                    <p className="text-5xl font-black text-slate-900">{health_streak.current_streak}</p>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Day Streak</p>
                    <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-400">
                        <span>Best: <strong className="text-slate-600">{health_streak.best_streak}</strong></span>
                        <span>•</span>
                        <span>Good days: <strong className="text-slate-600">{health_streak.total_good_days}</strong></span>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-6 rounded-[2rem] text-white shadow-xl">
                        <h3 className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Today</h3>
                        <p className="text-4xl font-black">{quick_stats?.today?.percent ?? 0}%</p>
                        <p className="text-teal-100 text-xs mt-1">{quick_stats?.today?.readings ?? 0} readings</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-[2rem] text-white shadow-xl">
                        <h3 className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">This Week</h3>
                        <p className="text-4xl font-black">{quick_stats?.week?.percent ?? 0}%</p>
                        <p className="text-purple-100 text-xs mt-1">{quick_stats?.week?.readings ?? 0} readings</p>
                    </div>
                </div>
            </div>

            {/* ===== ROW 2: Slouch Forecast + Weekly Summary ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Slouch Forecast */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl">
                    <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-3">
                        <div className="w-2 h-6 bg-purple-400 rounded-full" />
                        Slouch Forecast
                    </h3>
                    {slouch_forecast.available ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-6">
                                <div className="relative w-24 h-24">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                                        <circle cx="50" cy="50" r="40" fill="transparent"
                                            stroke={slouch_forecast.probability > 0.7 ? '#ef4444' : slouch_forecast.probability > 0.4 ? '#f59e0b' : '#10b981'}
                                            strokeWidth="8" strokeDasharray={251.2} strokeDashoffset={251.2 - (slouch_forecast.probability * 251.2)}
                                            strokeLinecap="round" className="transition-all duration-1000" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xl font-black text-slate-900">{Math.round(slouch_forecast.probability * 100)}%</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600">{slouch_forecast.message}</p>
                                    {slouch_forecast.alert_in_minutes && (
                                        <p className="text-xs text-slate-400 mt-2">
                                            ⏱️ Alert in ~{slouch_forecast.alert_in_minutes} min
                                        </p>
                                    )}
                                    {slouch_forecast.confidence && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            Confidence: {slouch_forecast.confidence}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm">Prediction model not ready yet. Keep collecting data!</p>
                    )}
                </div>

                {/* Weekly Summary */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl">
                    <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-3">
                        <div className="w-2 h-6 bg-indigo-400 rounded-full" />
                        Weekly Report
                    </h3>
                    {weekly_summary ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                                <span className="text-3xl">{weekly_summary.emoji}</span>
                                <p className="text-sm font-medium text-slate-700">{weekly_summary.message}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-3 bg-slate-50 rounded-xl">
                                    <p className="text-lg font-black text-slate-900">{weekly_summary.this_week_percent}%</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">This Week</p>
                                </div>
                                <div className="text-center p-3 bg-slate-50 rounded-xl">
                                    <p className="text-lg font-black text-slate-900">{weekly_summary.last_week_percent}%</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Last Week</p>
                                </div>
                                <div className="text-center p-3 bg-slate-50 rounded-xl">
                                    <p className={`text-lg font-black ${weekly_summary.change > 0 ? 'text-emerald-600' : weekly_summary.change < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                                        {weekly_summary.change > 0 ? '+' : ''}{weekly_summary.change}%
                                    </p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Change</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                <span>📅 {weekly_summary.days_tracked} days tracked</span>
                                <span>📊 {weekly_summary.total_sessions} sessions</span>
                                <span>⏱️ Avg {weekly_summary.avg_session_duration} min</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm">Weekly report will appear after a few days of data.</p>
                    )}
                </div>
            </div>

            {/* ===== ROW 3: All 8 Pattern Cards ===== */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <div className="w-2 h-6 bg-amber-400 rounded-full" />
                    Discovered Patterns
                </h3>

                {patterns ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Challenging Hour */}
                        <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100">
                            <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center mb-2">
                                <span className="text-lg">⏰</span>
                            </div>
                            <h4 className="font-bold text-rose-700 text-sm mb-1">Challenging Hour</h4>
                            <p className="text-2xl font-black text-rose-600">
                                {patterns.worst_hour?.hour !== null ? `${patterns.worst_hour.hour}:00` : 'N/A'}
                            </p>
                            <p className="text-xs text-rose-500 mt-1">{patterns.worst_hour?.bad_percent ?? 0}% bad rate</p>
                        </div>

                        {/* Best Hour */}
                        <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center mb-2">
                                <span className="text-lg">✨</span>
                            </div>
                            <h4 className="font-bold text-emerald-700 text-sm mb-1">Best Hour</h4>
                            <p className="text-2xl font-black text-emerald-600">
                                {patterns.best_hour?.hour !== null ? `${patterns.best_hour.hour}:00` : 'N/A'}
                            </p>
                            <p className="text-xs text-emerald-500 mt-1">{patterns.best_hour?.good_percent ?? 0}% good rate</p>
                        </div>

                        {/* Worst Day */}
                        <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center mb-2">
                                <span className="text-lg">📅</span>
                            </div>
                            <h4 className="font-bold text-orange-700 text-sm mb-1">Toughest Day</h4>
                            <p className="text-2xl font-black text-orange-600">
                                {patterns.worst_day?.day_name ?? 'N/A'}
                            </p>
                            <p className="text-xs text-orange-500 mt-1">{patterns.worst_day?.bad_percent ?? 0}% bad rate</p>
                        </div>

                        {/* Fatigue Point */}
                        <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
                            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center mb-2">
                                <span className="text-lg">😴</span>
                            </div>
                            <h4 className="font-bold text-amber-700 text-sm mb-1">Fatigue Point</h4>
                            <p className="text-2xl font-black text-amber-600">
                                {patterns.fatigue_threshold?.threshold_minutes ?? 60} min
                            </p>
                            <p className="text-xs text-amber-500 mt-1">
                                {patterns.fatigue_threshold?.confidence ?? 'low'} confidence
                            </p>
                        </div>

                        {/* Weekly Trend */}
                        <div className="p-5 bg-sky-50 rounded-2xl border border-sky-100">
                            <div className="w-9 h-9 bg-sky-100 rounded-xl flex items-center justify-center mb-2">
                                <span className="text-lg">
                                    {patterns.improvement_rate?.trend === 'improving' ? '📈' : patterns.improvement_rate?.trend === 'declining' ? '📉' : '➡️'}
                                </span>
                            </div>
                            <h4 className="font-bold text-sky-700 text-sm mb-1">Weekly Trend</h4>
                            <p className="text-2xl font-black text-sky-600">
                                {patterns.improvement_rate?.improvement > 0 ? '+' : ''}{patterns.improvement_rate?.improvement ?? 0}%
                            </p>
                            <p className="text-xs text-sky-500 mt-1">
                                {patterns.improvement_rate?.trend === 'improving' ? 'Improving!' : patterns.improvement_rate?.trend === 'declining' ? 'Declining' : 'Stable'}
                            </p>
                        </div>

                        {/* Daily Average */}
                        <div className="p-5 bg-violet-50 rounded-2xl border border-violet-100">
                            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center mb-2">
                                <span className="text-lg">📊</span>
                            </div>
                            <h4 className="font-bold text-violet-700 text-sm mb-1">Daily Average</h4>
                            <p className="text-2xl font-black text-violet-600">
                                {patterns.daily_average?.average_percent ?? 0}%
                            </p>
                            <p className="text-xs text-violet-500 mt-1">
                                {patterns.daily_average?.days_tracked ?? 0} days tracked
                            </p>
                        </div>

                        {/* Peak Productivity */}
                        <div className="p-5 bg-teal-50 rounded-2xl border border-teal-100">
                            <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center mb-2">
                                <span className="text-lg">🎯</span>
                            </div>
                            <h4 className="font-bold text-teal-700 text-sm mb-1">Peak Window</h4>
                            <p className="text-xl font-black text-teal-600">
                                {patterns.peak_productivity?.readable ?? 'N/A'}
                            </p>
                            <p className="text-xs text-teal-500 mt-1">
                                {patterns.peak_productivity?.good_percent ? `${patterns.peak_productivity.good_percent}% good` : 'Best posture window'}
                            </p>
                        </div>

                        {/* Session Stats */}
                        <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center mb-2">
                                <span className="text-lg">⏱️</span>
                            </div>
                            <h4 className="font-bold text-indigo-700 text-sm mb-1">Session Stats</h4>
                            <p className="text-2xl font-black text-indigo-600">
                                {patterns.session_stats?.avg_duration ?? 0} min
                            </p>
                            <p className="text-xs text-indigo-500 mt-1">
                                {patterns.session_stats?.total_sessions ?? 0} sessions total
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">📊</span>
                        </div>
                        <p className="text-slate-500">Not enough data yet. Keep using the system to discover patterns!</p>
                        <p className="text-slate-400 text-sm mt-2">We need at least 10 readings to analyze your patterns.</p>
                    </div>
                )}
            </div>

            {/* ===== ROW 4: AI Insights Feed ===== */}
            {insights && insights.length > 0 && (
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl">
                    <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                        <div className="w-2 h-6 bg-blue-400 rounded-full" />
                        AI-Generated Insights
                    </h3>
                    <div className="space-y-3">
                        {insights.map((insight, i) => (
                            <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl border ${insightTypeColors[insight.type] || 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                <span className="text-2xl flex-shrink-0 mt-0.5">{insight.icon}</span>
                                <div>
                                    <p className="font-bold text-sm">{insight.title}</p>
                                    <p className="text-xs opacity-75 mt-1">{insight.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== ROW 5: Personalized Recommendations ===== */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <div className="w-2 h-6 bg-teal-400 rounded-full" />
                    Personalized Recommendations
                </h3>
                <div className="space-y-3">
                    {recommendations && recommendations.length > 0 ? (
                        recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                                <span className="text-2xl flex-shrink-0">{rec.icon}</span>
                                <div className="flex-1">
                                    <p className="font-bold text-slate-700 text-sm">{rec.title}</p>
                                    <p className="text-xs text-slate-500 mt-1">{rec.description}</p>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 bg-white rounded-lg border border-slate-100">
                                    {rec.category}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="flex items-start gap-4 p-4 bg-teal-50 rounded-2xl">
                            <span className="text-2xl">🌟</span>
                            <div>
                                <p className="font-bold text-slate-700 text-sm">Start collecting data</p>
                                <p className="text-xs text-slate-500 mt-1">Use the app for a few hours to get personalized tips</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== ROW 6: ML Model Status ===== */}
            {model_status && (
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-black flex items-center gap-2 mb-3">
                            🧠 AI Learning Status
                            {model_status.is_training && (
                                <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold animate-pulse">Training...</span>
                            )}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 bg-white/10 rounded-xl text-center">
                                <p className="text-2xl font-black">{model_status.has_personalized_model ? '✅' : '⏳'}</p>
                                <p className="text-[10px] uppercase tracking-widest text-purple-200 mt-1">Model</p>
                            </div>
                            <div className="p-3 bg-white/10 rounded-xl text-center">
                                <p className="text-2xl font-black">{model_status.total_samples}</p>
                                <p className="text-[10px] uppercase tracking-widest text-purple-200 mt-1">Samples</p>
                            </div>
                            <div className="p-3 bg-white/10 rounded-xl text-center">
                                <p className="text-2xl font-black">
                                    {model_status.accuracy ? `${(model_status.accuracy * 100).toFixed(0)}%` : 'N/A'}
                                </p>
                                <p className="text-[10px] uppercase tracking-widest text-purple-200 mt-1">Accuracy</p>
                            </div>
                            <div className="p-3 bg-white/10 rounded-xl text-center">
                                <p className="text-2xl font-black">{model_status.training_count}</p>
                                <p className="text-[10px] uppercase tracking-widest text-purple-200 mt-1">Trained</p>
                            </div>
                        </div>
                    </div>
                    <svg className="absolute -right-8 -bottom-8 opacity-10 w-48 h-48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                </div>
            )}
        </div>
    );
};

export default InsightsView;

import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000';

interface DailySummary {
    date: string;
    totalReadings: number;
    goodPercent: number;
    badCount: number;
    avgPitch: number;
    avgRoll: number;
}

const HistoryView: React.FC = () => {
    const [dailyData, setDailyData] = useState<DailySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);

    useEffect(() => {
        fetchHistory();
    }, [days]);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('posture_token');
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await fetch(`${API_URL}/api/history/daily?days=${days}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                setDailyData(data.daily || []);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
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

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900">Posture History</h2>
                    <p className="text-slate-500 mt-1">Track your posture trends over time</p>
                </div>
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600"
                >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                </select>
            </div>

            {dailyData.length === 0 ? (
                <div className="bg-white p-12 rounded-[2.5rem] border border-slate-50 shadow-xl text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">No History Yet</h3>
                    <p className="text-slate-500">Connect your ESP32 and start monitoring to see your posture history.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {dailyData.map((day, index) => (
                        <div key={index} className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-lg flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${day.goodPercent >= 80 ? 'bg-emerald-100 text-emerald-600' : day.goodPercent >= 60 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                                    <span className="text-xl font-black">{Math.round(day.goodPercent)}%</span>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                    <p className="text-sm text-slate-400">{day.totalReadings} readings • {day.badCount} bad posture alerts</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-xs text-slate-400 uppercase font-bold">Avg Pitch</p>
                                    <p className="text-lg font-bold text-slate-700">{day.avgPitch}°</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-slate-400 uppercase font-bold">Avg Roll</p>
                                    <p className="text-lg font-bold text-slate-700">{day.avgRoll}°</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HistoryView;

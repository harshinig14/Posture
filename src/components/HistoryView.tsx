
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';

const HistoryView: React.FC = () => {
  const dailyData = [
    { name: 'Mon', good: 85, bad: 15 },
    { name: 'Tue', good: 70, bad: 30 },
    { name: 'Wed', good: 90, bad: 10 },
    { name: 'Thu', good: 65, bad: 35 },
    { name: 'Fri', good: 80, bad: 20 },
    { name: 'Sat', good: 95, bad: 5 },
    { name: 'Sun', good: 88, bad: 12 },
  ];

  const hourlyData = [
    { time: '09:00', score: 95 },
    { time: '10:00', score: 92 },
    { time: '11:00', score: 85 },
    { time: '12:00', score: 70 },
    { time: '13:00', score: 45 },
    { time: '14:00', score: 55 },
    { time: '15:00', score: 75 },
    { time: '16:00', score: 88 },
    { time: '17:00', score: 90 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold text-slate-900">Posture History</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-8">Daily Summary (Good vs Bad %)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="good" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="bad" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900">Hourly Posture Quality</h3>
            <span className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 uppercase">Alert Peak: 13:00</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Weekly Highlights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Most Consistent Day</p>
            <p className="text-xl font-bold text-slate-900">Saturday</p>
            <p className="text-sm text-slate-500">95% score maintained</p>
          </div>
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
            <p className="text-xs font-bold text-rose-600 uppercase mb-1">Slouching Peak</p>
            <p className="text-xl font-bold text-slate-900">Thu, 13:30</p>
            <p className="text-sm text-slate-500">Afternoon slump detected</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Goal Progress</p>
            <p className="text-xl font-bold text-slate-900">82% Complete</p>
            <p className="text-sm text-slate-500">Better than last week (+12%)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryView;

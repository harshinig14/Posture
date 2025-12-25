
import React from 'react';
import { PostureData, PostureState, UserProfile } from '../types';

interface DashboardViewProps {
  data: PostureData;
  profile: UserProfile;
}

const DashboardView: React.FC<DashboardViewProps> = ({ data, profile }) => {
  const getStatusColor = (state: PostureState) => {
    switch (state) {
      case PostureState.GOOD: return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case PostureState.WARNING: return 'text-amber-600 bg-amber-50 border-amber-100';
      case PostureState.BAD: return 'text-rose-600 bg-rose-50 border-rose-100';
    }
  };

  const getTip = (state: PostureState) => {
    switch (state) {
      case PostureState.GOOD: return "You're doing great! Keep your core engaged and stay relaxed.";
      case PostureState.WARNING: return "You're leaning a bit too far forward. Roll your shoulders back.";
      case PostureState.BAD: return "Time to reset! Sit upright, feet flat on the floor, and pull your chin back.";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Welcome back, {profile.name}</h2>
          <p className="text-slate-500 mt-1">Here is your posture overview for today.</p>
        </div>
        <div className="px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 bg-[#2dd4bf] rounded-full"></span>
          <span className="text-sm font-bold text-slate-600">Smart Guardian Active</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Score Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50 flex flex-col items-center justify-center text-center">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Posture Score</h3>
          <div className="relative w-44 h-44 flex items-center justify-center">
             <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="88" cy="88" r="76" 
                  fill="transparent" 
                  stroke="#f1f5f9" 
                  strokeWidth="12" 
                />
                <circle 
                  cx="88" cy="88" r="76" 
                  fill="transparent" 
                  stroke={data.score > 80 ? '#14b8a6' : data.score > 50 ? '#f59e0b' : '#ef4444'} 
                  strokeWidth="12" 
                  strokeDasharray={477}
                  strokeDashoffset={477 - (477 * data.score) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-slate-900">{data.score}</span>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Points</span>
             </div>
          </div>
          <p className="text-xs text-slate-400 mt-6 font-medium italic">Synced with PostureGuard IoT</p>
        </div>

        {/* Status Card */}
        <div className="md:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50 flex flex-col justify-between">
           <div>
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Current Status</h3>
                 <span className={`px-6 py-2 rounded-2xl border text-xs font-black uppercase tracking-widest ${getStatusColor(data.state)}`}>
                    {data.state}
                 </span>
              </div>
              <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100">
                <p className="text-slate-700 font-bold text-xl leading-relaxed italic">
                  "{getTip(data.state)}"
                </p>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-8 mt-10">
              <div className="flex items-center gap-4">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${data.neckStatus === 'Aligned' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Neck</p>
                    <p className="text-lg font-extrabold text-slate-800">{data.neckStatus}</p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${data.backStatus === 'Straight' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Spine</p>
                    <p className="text-lg font-extrabold text-slate-800">{data.backStatus}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-gradient-to-br from-[#14b8a6] to-[#0d9488] p-10 rounded-[2.5rem] text-white shadow-2xl shadow-teal-100/50 relative overflow-hidden group">
            <div className="relative z-10">
               <h3 className="text-2xl font-black mb-4">Posture Tip</h3>
               <p className="text-teal-50 text-lg leading-relaxed mb-8 opacity-90">
                 Taking a 2-minute stretch break every hour can reduce neck fatigue by up to 40%. Try the "Chin Tuck" exercise now!
               </p>
               <button className="px-8 py-3 bg-white text-[#0d9488] font-black rounded-2xl text-sm hover:shadow-xl hover:-translate-y-0.5 transition-all">
                 Show Guide
               </button>
            </div>
            <svg className="absolute top-0 right-0 opacity-10 w-64 h-64 -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM14.95 14.95a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM6.464 18.95a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414z" /></svg>
         </div>

         <div className="bg-white p-10 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50">
            <h3 className="text-xl font-extrabold text-slate-900 mb-8 flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-[#f0fdfa] text-[#14b8a6] flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               Session Overview
            </h3>
            <div className="space-y-4">
               {[
                 { label: "Active Duration", value: "4h 22m", color: "text-slate-900" },
                 { label: "Perfect Posture", value: "72%", color: "text-emerald-500" },
                 { label: "Alerts Triggered", value: "8", color: "text-rose-500" }
               ].map((stat, i) => (
                 <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{stat.label}</span>
                    <span className={`text-lg font-black ${stat.color}`}>{stat.value}</span>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default DashboardView;

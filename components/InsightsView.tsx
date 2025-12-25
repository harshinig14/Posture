
import React from 'react';
import { PostureData } from '../types';

interface InsightsViewProps {
  data: PostureData;
}

const InsightsView: React.FC<InsightsViewProps> = ({ data }) => {
  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Health Insights</h2>
          <p className="text-slate-500 mt-1">Personalized advice powered by AI analysis of your posture trends.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
           <span className="text-sm font-bold">Smart Analysis ON</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               </div>
               Common Patterns
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Based on your data from the last 24 hours, you tend to <span className="font-bold text-slate-900">lean forward by 15°</span> during virtual meetings. This increases the load on your cervical spine by approx. 12 lbs.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Possible Health Risks</h3>
            <div className="space-y-4">
               {[
                 { title: 'Neck Strain', risk: 'Medium', color: 'text-amber-500' },
                 { title: 'Lower Back Compression', risk: 'Low', color: 'text-emerald-500' },
                 { title: 'Shoulder Impingement', risk: 'Elevated', color: 'text-rose-500' }
               ].map((item, idx) => (
                 <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="font-medium text-slate-700">{item.title}</span>
                    <span className={`text-sm font-bold ${item.color}`}>{item.risk} Risk</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Recommended Exercises</h3>
          <div className="space-y-6 flex-1">
             <div className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                <img src="https://picsum.photos/200/200?random=1" className="w-20 h-20 rounded-xl object-cover" alt="Stretch" />
                <div>
                   <h4 className="font-bold text-slate-900">The Doorway Stretch</h4>
                   <p className="text-sm text-slate-500 mt-1">Perfect for opening chest muscles and counteracting rounded shoulders.</p>
                   <p className="text-xs font-bold text-indigo-600 mt-2 uppercase">2 Minutes • 3 Reps</p>
                </div>
             </div>
             <div className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                <img src="https://picsum.photos/200/200?random=2" className="w-20 h-20 rounded-xl object-cover" alt="Stretch" />
                <div>
                   <h4 className="font-bold text-slate-900">Chin Tucks</h4>
                   <p className="text-sm text-slate-500 mt-1">Strengthens neck muscles and corrects 'Tech Neck' patterns.</p>
                   <p className="text-xs font-bold text-indigo-600 mt-2 uppercase">1 Minute • 10 Reps</p>
                </div>
             </div>
             <div className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                <img src="https://picsum.photos/200/200?random=3" className="w-20 h-20 rounded-xl object-cover" alt="Stretch" />
                <div>
                   <h4 className="font-bold text-slate-900">Wall Slides</h4>
                   <p className="text-sm text-slate-500 mt-1">Excellent for scapular stability and upper back alignment.</p>
                   <p className="text-xs font-bold text-indigo-600 mt-2 uppercase">3 Minutes • 12 Reps</p>
                </div>
             </div>
          </div>
          <button className="w-full mt-8 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors">
             View All Exercises
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsightsView;

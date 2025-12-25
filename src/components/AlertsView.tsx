
import React from 'react';
import { AlertLog, PostureState } from '../../types';

interface AlertsViewProps {
  alerts: AlertLog[];
}

const AlertsView: React.FC<AlertsViewProps> = ({ alerts }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
         <h2 className="text-3xl font-bold text-slate-900">Alerts & Logs</h2>
         <button className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-rose-500 transition-colors">
            Clear All Logs
         </button>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-white p-20 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
           </div>
           <p className="text-slate-400 font-medium italic">No alerts recorded in the current session.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Time</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Duration</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Alert Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">State</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Action</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{alert.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                          <p className="text-xs text-slate-400">{alert.timestamp.toLocaleDateString()}</p>
                       </td>
                       <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-600">{alert.duration}s</span>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-indigo-400" />
                             <span className="text-sm text-slate-700">{alert.type}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                            alert.severity === PostureState.BAD ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                             {alert.severity}
                          </span>
                       </td>
                       <td className="px-6 py-4">
                          <button className="text-indigo-600 text-xs font-bold hover:underline">Details</button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
};

export default AlertsView;

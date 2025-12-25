
import React from 'react';

const SettingsView: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold text-slate-900">Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
               <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
               Notification Preferences
            </h3>
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-700">Desktop Notifications</p>
                    <p className="text-xs text-slate-400">Get posture alerts directly on your PC</p>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </div>
               </div>
               <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-700">Audio Alerts</p>
                    <p className="text-xs text-slate-400">Play a subtle sound when slouching</p>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </div>
               </div>
               <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-700">Vibration Feedback</p>
                    <p className="text-xs text-slate-400">ESP32 wearable vibrates on bad posture</p>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </div>
               </div>
            </div>
         </div>

         <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
               <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
               Data Management
            </h3>
            <div className="space-y-4">
               <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors flex items-center justify-between group">
                  <span className="text-sm font-medium text-slate-700">Export Posture Data (.csv)</span>
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </button>
               <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors flex items-center justify-between group">
                  <span className="text-sm font-medium text-slate-700">Sync with Google Fit / Apple Health</span>
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 2.051V2m0 9c0-3.517 1.009-6.799 2.753-9.571m-3.44 2.04l-.054.09A10.003 10.003 0 0112 19.949V20" /></svg>
               </button>
               <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-rose-50 border border-slate-100 hover:border-rose-100 transition-colors flex items-center justify-between group">
                  <span className="text-sm font-medium text-rose-600">Delete All History</span>
                  <svg className="w-5 h-5 text-rose-300 group-hover:text-rose-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SettingsView;

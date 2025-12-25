
import React from 'react';

const HelpView: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold text-slate-900">Help & Information</h2>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
         <h3 className="text-xl font-bold text-slate-900 mb-6">How It Works</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
               <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl mb-4">1</div>
               <h4 className="font-bold text-slate-900 mb-2">Wear Your Sensor</h4>
               <p className="text-sm text-slate-500 leading-relaxed">Place the ESP32 module between your shoulder blades using the adhesive patch or strap.</p>
            </div>
            <div className="flex flex-col items-center text-center">
               <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl mb-4">2</div>
               <h4 className="font-bold text-slate-900 mb-2">Calibrate Your Best</h4>
               <p className="text-sm text-slate-500 leading-relaxed">Sit in your ideal upright posture and press 'Calibrate' in the profile tab to set your baseline.</p>
            </div>
            <div className="flex flex-col items-center text-center">
               <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl mb-4">3</div>
               <h4 className="font-bold text-slate-900 mb-2">Monitor & Improve</h4>
               <p className="text-sm text-slate-500 leading-relaxed">Receive gentle vibrations when slouching. Use the dashboard to track your progress over time.</p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Frequently Asked Questions</h3>
            <div className="space-y-6">
               <details className="group">
                  <summary className="list-none flex items-center justify-between cursor-pointer font-bold text-slate-700 hover:text-indigo-600 transition-colors">
                     What is a 'Good' posture score?
                     <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </summary>
                  <p className="mt-4 text-sm text-slate-500 leading-relaxed">A score above 80 is considered excellent. It means you are maintaining neutral spine alignment for most of your active session.</p>
               </details>
               <details className="group border-t border-slate-50 pt-6">
                  <summary className="list-none flex items-center justify-between cursor-pointer font-bold text-slate-700 hover:text-indigo-600 transition-colors">
                     Is the sensor waterproof?
                     <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </summary>
                  <p className="mt-4 text-sm text-slate-500 leading-relaxed">The enclosure is sweat-resistant but not waterproof. Avoid wearing it during intense cardio or swimming.</p>
               </details>
               <details className="group border-t border-slate-50 pt-6">
                  <summary className="list-none flex items-center justify-between cursor-pointer font-bold text-slate-700 hover:text-indigo-600 transition-colors">
                     How often should I recalibrate?
                     <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </summary>
                  <p className="mt-4 text-sm text-slate-500 leading-relaxed">It's recommended to recalibrate once a day or whenever you move to a different workspace (e.g., from a chair to a standing desk).</p>
               </details>
            </div>
         </div>

         <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Project Overview</h3>
            <p className="text-sm text-slate-500 mb-6">PosturePro v1.2.0 is an IoT-driven healthcare solution aimed at reducing workplace physical strain through intelligent real-time feedback loop.</p>
            <div className="flex gap-4">
               <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Framework</p>
                  <p className="text-xs font-bold text-slate-700">React + TS</p>
               </div>
               <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Hardware</p>
                  <p className="text-xs font-bold text-slate-700">ESP32 + MPU6050</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default HelpView;

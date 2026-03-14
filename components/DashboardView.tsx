
import React from 'react';
import { PostureData, PostureState, UserProfile } from '../types';

interface DashboardViewProps {
   data: PostureData;
}

// Risk Score Card Component - fetches from ML insights API
const RiskScoreCard: React.FC = () => {
   const [riskData, setRiskData] = React.useState<{ score: number; level: string; label: string; color: string; factors: string[] } | null>(null);
   const [loading, setLoading] = React.useState(true);

   React.useEffect(() => {
      const fetchRisk = async () => {
         try {
            const token = localStorage.getItem('posture_token');
            if (!token) { setLoading(false); return; }
            const res = await fetch('http://localhost:8000/api/ml/insights', {
               headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.risk_score) {
               setRiskData(data.risk_score);
            }
         } catch (e) {
            console.error('Failed to fetch risk score:', e);
         }
         setLoading(false);
      };
      fetchRisk();
      const interval = setInterval(fetchRisk, 60000);
      return () => clearInterval(interval);
   }, []);

   const gradients: Record<string, string> = {
      emerald: 'from-emerald-500 to-green-600',
      amber: 'from-amber-500 to-yellow-600',
      orange: 'from-orange-500 to-red-500',
      rose: 'from-rose-500 to-red-600',
      slate: 'from-slate-400 to-slate-500',
   };

   const score = riskData?.score ?? 0;
   const circumference = 2 * Math.PI * 54;
   const progress = (score / 100) * circumference;
   const gradient = gradients[riskData?.color || 'slate'] || gradients.slate;

   return (
      <div className={`bg-gradient-to-br ${gradient} p-8 rounded-[2.5rem] shadow-xl shadow-slate-100/50 flex flex-col items-center justify-center text-center text-white relative overflow-hidden`}>
         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
         <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

         <h3 className="text-white/80 text-xs font-bold uppercase tracking-widest mb-4 relative z-10">Posture Risk Score</h3>

         {loading ? (
            <div className="w-28 h-28 rounded-full border-4 border-white/20 flex items-center justify-center">
               <span className="text-white/50 text-sm">Loading...</span>
            </div>
         ) : (
            <>
               <div className="relative w-32 h-32 flex items-center justify-center mb-3">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                     <circle cx="64" cy="64" r="54" fill="transparent" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
                     <circle cx="64" cy="64" r="54" fill="transparent" stroke="white" strokeWidth="10"
                        strokeDasharray={circumference} strokeDashoffset={circumference - progress}
                        strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-4xl font-black leading-none">{score}</span>
                     <span className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-80">/ 100</span>
                  </div>
               </div>
               <p className="text-sm font-bold opacity-90 mb-2">{riskData?.label || 'No data yet'}</p>
               {riskData?.factors && riskData.factors.length > 0 && (
                  <div className="space-y-1 w-full">
                     {riskData.factors.slice(0, 2).map((f, i) => (
                        <p key={i} className="text-[10px] opacity-60">• {f}</p>
                     ))}
                  </div>
               )}
            </>
         )}
      </div>
   );
};

const DashboardView: React.FC<{ data: PostureData; profile: UserProfile }> = ({ data, profile }) => {
   const [showNotifications, setShowNotifications] = React.useState(false);
   const [badPostureMinutes, setBadPostureMinutes] = React.useState(0);
   const [notifications, setNotifications] = React.useState<{ id: number, message: string, time: string, type: 'warning' | 'critical' }[]>([]);

   // Track bad posture duration from IoT data
   const alertThresholdMinutes = profile.alertDelay || 5; // User-configured threshold (in minutes)
   const notificationsEnabled = (profile.alertIntensity ?? 80) > 0; // Toggle from alert preferences

   // Buzzer timer — track how long buzzer has been continuously active
   const buzzerStartRef = React.useRef<number | null>(null);
   const buzzerNotifiedRef = React.useRef<boolean>(false);

   React.useEffect(() => {
      // Check if data has badPostureMinutes from backend broadcast
      const mins = (data as any).badPostureMinutes || 0;
      setBadPostureMinutes(mins);

      if (!notificationsEnabled) return; // Skip if notifications are OFF

      // Add notification when bad posture exceeds user's threshold
      if (mins >= alertThresholdMinutes) {
         const existingCritical = notifications.find(n => n.type === 'critical');
         if (!existingCritical) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setNotifications(prev => [{
               id: Date.now(),
               message: profile.isDisabled
                  ? `⚠️ ${profile.name}'s posture has been bad for ${Math.floor(mins)} minutes! Please check on them.`
                  : `⚠️ Your posture has been bad for ${Math.floor(mins)} minutes! Take a break and stretch.`,
               time: timeStr,
               type: 'critical'
            }, ...prev.slice(0, 9)]);
         }
      } else if (mins >= Math.max(1, Math.floor(alertThresholdMinutes / 2))) {
         const existingWarning = notifications.find(n => n.type === 'warning');
         if (!existingWarning) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setNotifications(prev => [{
               id: Date.now(),
               message: profile.isDisabled
                  ? `🔔 ${profile.name} has had poor posture for ${Math.floor(mins)} minutes.`
                  : `🔔 You've had poor posture for ${Math.floor(mins)} minutes. Consider correcting it.`,
               time: timeStr,
               type: 'warning'
            }, ...prev.slice(0, 9)]);
         }
      }
   }, [data]);

   // Buzzer Help Notification — triggers after buzzer is ON for 10+ seconds
   React.useEffect(() => {
      if (data.buzzerActive) {
         // Buzzer just turned on — start timing
         if (buzzerStartRef.current === null) {
            buzzerStartRef.current = Date.now();
            buzzerNotifiedRef.current = false;
         }

         // Check every second if 10 seconds have passed
         const timer = setInterval(() => {
            if (buzzerStartRef.current && !buzzerNotifiedRef.current) {
               const elapsed = (Date.now() - buzzerStartRef.current) / 1000;
               if (elapsed >= 10) {
                  buzzerNotifiedRef.current = true;
                  const now = new Date();
                  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  setNotifications(prev => [{
                     id: Date.now(),
                     message: `🚨 HELP NEEDED! ${profile.name || 'Your client'} has been requesting assistance for ${Math.floor(elapsed)} seconds. Please check on them immediately!`,
                     time: timeStr,
                     type: 'critical'
                  }, ...prev.slice(0, 9)]);
               }
            }
         }, 1000);

         return () => clearInterval(timer);
      } else {
         // Buzzer turned off — reset timer
         buzzerStartRef.current = null;
         buzzerNotifiedRef.current = false;
      }
   }, [data.buzzerActive, profile.name]);

   // Head Tilt Caretaker Notification — triggers when head is tilted left/right for 15+ seconds
   const lastHeadTiltNotifStepRef = React.useRef<number>(0);
   React.useEffect(() => {
      if (!notificationsEnabled) return;

      const headTiltMins = (data as any).headTiltMinutes || 0;
      const headTiltSecs = headTiltMins * 60;
      if (headTiltSecs >= 15) {
         // Notify every additional 15 seconds (15s, 30s, 45s, ...)
         const currentStep = Math.floor(headTiltSecs / 15);
         if (currentStep > lastHeadTiltNotifStepRef.current) {
            lastHeadTiltNotifStepRef.current = currentStep;
            const totalSecs = Math.floor(headTiltSecs);
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setNotifications(prev => [{
               id: Date.now(),
               message: `🚨 CARETAKER ALERT: ${profile.name || 'Your client'} has been tilting their head for ${totalSecs} seconds! Please assist them immediately.`,
               time: timeStr,
               type: 'critical'
            }, ...prev.slice(0, 9)]);
         }
      } else {
         // Reset when head tilt is corrected
         lastHeadTiltNotifStepRef.current = 0;
      }
   }, [data, profile.isDisabled, profile.name, notificationsEnabled]);

   // Determine greeting
   const isCaretakerMode = profile.isDisabled && profile.caretakerName;
   const greetingName = isCaretakerMode ? profile.caretakerName : profile.name;
   const greetingTitle = isCaretakerMode
      ? `Hey ${greetingName}`
      : `Welcome back, ${greetingName}`;
   const greetingSubtitle = isCaretakerMode
      ? `Here is ${profile.name}'s posture overview for today.`
      : `Here is your posture overview for today.`;

   const hasActiveAlert = notificationsEnabled && badPostureMinutes >= alertThresholdMinutes;
   const hasNotifications = notifications.length > 0;

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
               <h2 className="text-3xl font-extrabold text-slate-900">{greetingTitle}</h2>
               <p className="text-slate-500 mt-1">{greetingSubtitle}</p>
            </div>
            <div className="flex items-center gap-3">
               {/* Notification Bell */}
               <div className="relative">
                  <button
                     onClick={() => setShowNotifications(!showNotifications)}
                     className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${hasActiveAlert
                        ? 'bg-rose-100 text-rose-600 animate-pulse shadow-lg shadow-rose-100'
                        : hasNotifications
                           ? 'bg-amber-50 text-amber-500 hover:bg-amber-100'
                           : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                        }`}
                  >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                     </svg>
                     {hasNotifications && (
                        <span className={`absolute -top-1 -right-1 w-4 h-4 text-[9px] font-black text-white rounded-full flex items-center justify-center ${hasActiveAlert ? 'bg-rose-500' : 'bg-amber-500'
                           }`}>
                           {notifications.length}
                        </span>
                     )}
                  </button>

                  {/* Notification Dropdown */}
                  {showNotifications && (
                     <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                           <h4 className="font-black text-slate-900 text-sm">Notifications</h4>
                           {notifications.length > 0 && (
                              <button
                                 onClick={() => setNotifications([])}
                                 className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                              >
                                 Clear all
                              </button>
                           )}
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                           {notifications.length === 0 ? (
                              <div className="p-6 text-center">
                                 <p className="text-slate-400 text-sm">No notifications yet</p>
                                 <p className="text-slate-300 text-xs mt-1">Alerts appear when posture is bad for 5+ minutes</p>
                              </div>
                           ) : (
                              notifications.map((notif) => (
                                 <div key={notif.id} className={`p-4 border-b border-slate-50 ${notif.type === 'critical' ? 'bg-rose-50/50' : 'bg-amber-50/30'}`}>
                                    <p className="text-sm text-slate-700 font-medium">{notif.message}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{notif.time}</p>
                                 </div>
                              ))
                           )}
                        </div>
                     </div>
                  )}
               </div>

               <div className="px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#2dd4bf] rounded-full"></span>
                  <span className="text-sm font-bold text-slate-600">Smart Guardian Active</span>
               </div>
            </div>
         </header>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Risk Score Card */}
            <RiskScoreCard />

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
                     { label: "IoT Status", value: data.iotConnected ? "Connected" : "Offline", color: data.iotConnected ? "text-emerald-500" : "text-slate-400" },
                     { label: "Pitch", value: `${(data.pitch ?? 0).toFixed(1)}°`, color: "text-slate-900" },
                     { label: "Roll", value: `${(data.roll ?? 0).toFixed(1)}°`, color: "text-slate-900" },
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

         {/* ML Learning Status Card */}
         <MLStatusCard />
      </div>
   );
};

// ML Status Card Component
const MLStatusCard: React.FC = () => {
   const [mlStatus, setMlStatus] = React.useState<{
      has_personalized_model: boolean;
      total_samples: number;
      samples_needed_for_training: number;
      accuracy?: number;
      training_count: number;
      is_training: boolean;
      status_message: string;
   } | null>(null);

   React.useEffect(() => {
      const fetchStatus = async () => {
         try {
            const token = localStorage.getItem('posture_token');
            if (!token) return;

            const response = await fetch('http://localhost:8000/api/ml/status', {
               headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
               setMlStatus(data);
            }
         } catch (e) {
            // Silently fail - ML status is optional
         }
      };

      fetchStatus();
      const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
      return () => clearInterval(interval);
   }, []);

   if (!mlStatus) return null;

   const progressPercent = mlStatus.samples_needed_for_training > 0
      ? Math.min(100, (mlStatus.total_samples / (mlStatus.total_samples + mlStatus.samples_needed_for_training)) * 100)
      : 100;

   return (
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-purple-100/50 relative overflow-hidden">
         <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-xl font-black flex items-center gap-2">
                  🧠 AI Learning Status
               </h3>
               {mlStatus.is_training && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold animate-pulse">
                     Training...
                  </span>
               )}
            </div>

            {mlStatus.has_personalized_model ? (
               <div className="space-y-4">
                  <p className="text-purple-100 text-sm">
                     ✨ Your personalized AI is active and learning from your unique posture patterns!
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-3 bg-white/10 rounded-xl">
                        <p className="text-2xl font-black">{mlStatus.accuracy ? `${(mlStatus.accuracy * 100).toFixed(0)}%` : 'N/A'}</p>
                        <p className="text-[10px] uppercase tracking-widest text-purple-200">Accuracy</p>
                     </div>
                     <div className="p-3 bg-white/10 rounded-xl">
                        <p className="text-2xl font-black">{mlStatus.training_count}</p>
                        <p className="text-[10px] uppercase tracking-widest text-purple-200">Times Trained</p>
                     </div>
                  </div>
                  <p className="text-xs text-purple-200">
                     📊 {mlStatus.total_samples} data points collected
                  </p>
               </div>
            ) : (
               <div className="space-y-4">
                  <p className="text-purple-100 text-sm">
                     📈 Collecting data to build your personalized AI model...
                  </p>
                  <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                     <div
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                     />
                  </div>
                  <p className="text-xs text-purple-200">
                     {mlStatus.samples_needed_for_training > 0
                        ? `Need ${mlStatus.samples_needed_for_training} more samples (~${Math.ceil(mlStatus.samples_needed_for_training / 2)} mins)`
                        : 'Training will start automatically!'}
                  </p>
               </div>
            )}
         </div>

         {/* Background decoration */}
         <svg className="absolute -right-8 -bottom-8 opacity-10 w-48 h-48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
         </svg>
      </div>
   );
};

export default DashboardView;

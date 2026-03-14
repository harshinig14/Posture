import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';

interface SettingsViewProps {
   profile: UserProfile;
   setProfile: (profile: UserProfile) => void;
   token: string | null;
}

const API_URL = 'http://localhost:8000';

const SettingsView: React.FC<SettingsViewProps> = ({ profile, setProfile, token }) => {
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
   const [memberSince, setMemberSince] = useState('');

   // Health settings state
   const [healthSettings, setHealthSettings] = useState({
      age: '',
      occupation: 'desk',
      dailyGoal: 80,
      breakInterval: 45,
      soundAlerts: true,
      darkMode: false,
      weeklyReport: true,
      gender: '',
      emergencyContact: '',
      isDisabled: false,
      disabilityType: '',
      caretakerName: '',
      caretakerPhone: ''
   });

   useEffect(() => {
      if (token) {
         fetchProfile();
      } else {
         setLoading(false);
      }
   }, [token]);

   const fetchProfile = async () => {
      try {
         const response = await fetch(`${API_URL}/api/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
         });
         const data = await response.json();

         if (data.success && data.profile) {
            setProfile({
               name: data.profile.name || profile.name,
               height: data.profile.height || '',
               workingHours: data.profile.workingHours || '09:00 - 17:00',
               alertDelay: data.profile.alertDelay || 5,
               alertIntensity: data.profile.alertIntensity || 80
            });

            // Load health settings
            setHealthSettings({
               age: data.profile.age || '',
               occupation: data.profile.occupation || 'desk',
               dailyGoal: data.profile.dailyGoal || 80,
               breakInterval: data.profile.breakInterval || 45,
               soundAlerts: data.profile.soundAlerts ?? true,
               darkMode: false,
               weeklyReport: data.profile.weeklyReport ?? true,
               gender: data.profile.gender || '',
               emergencyContact: data.profile.emergencyContact || '',
               isDisabled: data.profile.isDisabled ?? false,
               disabilityType: data.profile.disabilityType || '',
               caretakerName: data.profile.caretakerName || '',
               caretakerPhone: data.profile.caretakerPhone || ''
            });

            if (data.profile.createdAt) {
               const date = new Date(data.profile.createdAt);
               setMemberSince(date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
            }
         }
      } catch (error) {
         console.error('Error fetching profile:', error);
      }
      setLoading(false);
   };

   const saveProfile = async () => {
      if (!token) return;

      setSaving(true);
      try {
         const response = await fetch(`${API_URL}/api/profile`, {
            method: 'PUT',
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
               name: profile.name,
               height: profile.height,
               workingHours: profile.workingHours,
               alertDelay: profile.alertDelay,
               alertIntensity: profile.alertIntensity,
               age: healthSettings.age,
               occupation: healthSettings.occupation,
               dailyGoal: healthSettings.dailyGoal,
               breakInterval: healthSettings.breakInterval,
               soundAlerts: healthSettings.soundAlerts,
               weeklyReport: healthSettings.weeklyReport,
               gender: healthSettings.gender,
               emergencyContact: healthSettings.emergencyContact,
               isDisabled: healthSettings.isDisabled,
               disabilityType: healthSettings.disabilityType,
               caretakerName: healthSettings.caretakerName,
               caretakerPhone: healthSettings.caretakerPhone
            })
         });

         if (response.ok) {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
         } else {
            setSaveStatus('error');
         }
      } catch (error) {
         console.error('Error saving profile:', error);
         setSaveStatus('error');
      }
      setSaving(false);
   };

   useEffect(() => {
      if (!loading && token) {
         const timer = setTimeout(() => {
            saveProfile();
         }, 1000);
         return () => clearTimeout(timer);
      }
   }, [profile.name, profile.height, profile.workingHours, profile.alertDelay, profile.alertIntensity,
   healthSettings.age, healthSettings.occupation, healthSettings.dailyGoal,
   healthSettings.breakInterval, healthSettings.soundAlerts, healthSettings.weeklyReport,
   healthSettings.gender, healthSettings.emergencyContact, healthSettings.isDisabled, healthSettings.disabilityType,
   healthSettings.caretakerName, healthSettings.caretakerPhone]);

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
            <h2 className="text-3xl font-extrabold text-slate-900">Settings</h2>
            <div className="flex items-center gap-4">
               {saveStatus === 'saved' && (
                  <span className="text-sm font-bold text-teal-600 flex items-center gap-2">
                     <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                     </svg>
                     Saved
                  </span>
               )}
               {saving && <span className="text-sm font-bold text-slate-400">Saving...</span>}
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50 flex flex-col items-center text-center">
               <div className="relative">
                  <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center border-4 border-white shadow-xl shadow-teal-100">
                     <span className="text-4xl font-black text-white">
                        {profile.name.charAt(0).toUpperCase()}
                     </span>
                  </div>
               </div>
               <h3 className="text-xl font-black text-slate-900 mt-5">{profile.name}</h3>
               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  {memberSince ? `Since ${memberSince}` : 'PostureGuard Member'}
               </p>

               {/* Quick Stats */}
               <div className="w-full mt-6 grid grid-cols-2 gap-3">
                  <div className="p-3 bg-teal-50 rounded-2xl text-center">
                     <p className="text-2xl font-black text-teal-600">{healthSettings.dailyGoal}%</p>
                     <p className="text-[8px] font-bold text-teal-400 uppercase">Daily Goal</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-2xl text-center">
                     <p className="text-2xl font-black text-amber-600">{healthSettings.breakInterval}m</p>
                     <p className="text-[8px] font-bold text-amber-400 uppercase">Break Timer</p>
                  </div>
               </div>

               {/* Quick Toggles */}
               <div className="w-full mt-4 space-y-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                     <span className="text-xs font-bold text-slate-600">🔔 Sound Alerts</span>
                     <button
                        onClick={() => setHealthSettings({ ...healthSettings, soundAlerts: !healthSettings.soundAlerts })}
                        className={`w-10 h-6 rounded-full transition-all ${healthSettings.soundAlerts ? 'bg-teal-500' : 'bg-slate-200'}`}
                     >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${healthSettings.soundAlerts ? 'ml-5' : 'ml-1'}`} />
                     </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                     <span className="text-xs font-bold text-slate-600">📧 Weekly Report</span>
                     <button
                        onClick={() => setHealthSettings({ ...healthSettings, weeklyReport: !healthSettings.weeklyReport })}
                        className={`w-10 h-6 rounded-full transition-all ${healthSettings.weeklyReport ? 'bg-teal-500' : 'bg-slate-200'}`}
                     >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${healthSettings.weeklyReport ? 'ml-5' : 'ml-1'}`} />
                     </button>
                  </div>
               </div>
            </div>

            {/* Main Settings */}
            <div className="lg:col-span-2 space-y-6">
               {/* Personal Info */}
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                     <div className="w-2 h-6 bg-[#14b8a6] rounded-full" />
                     Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                        <input
                           type="text"
                           value={profile.name}
                           onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                           className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age</label>
                        <input
                           type="number"
                           value={healthSettings.age}
                           onChange={(e) => setHealthSettings({ ...healthSettings, age: e.target.value })}
                           placeholder="25"
                           className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Height</label>
                        <input
                           type="text"
                           value={profile.height}
                           onChange={(e) => setProfile({ ...profile, height: e.target.value })}
                           placeholder="175 cm"
                           className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                        />
                     </div>
                  </div>

                  {!healthSettings.isDisabled && (
                     <div className="mt-6 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Work Style</label>
                        <div className="grid grid-cols-3 gap-3">
                           {[
                              { id: 'desk', label: '💻 Desk Job', desc: 'Mostly sitting' },
                              { id: 'hybrid', label: '🔄 Hybrid', desc: 'Sit & Stand' },
                              { id: 'active', label: '🚶 Active', desc: 'Moving around' }
                           ].map((option) => (
                              <button
                                 key={option.id}
                                 onClick={() => setHealthSettings({ ...healthSettings, occupation: option.id })}
                                 className={`p-4 rounded-2xl border-2 transition-all text-left ${healthSettings.occupation === option.id
                                    ? 'border-teal-500 bg-teal-50'
                                    : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                                    }`}
                              >
                                 <p className="font-bold text-slate-700">{option.label}</p>
                                 <p className="text-[10px] text-slate-400">{option.desc}</p>
                              </button>
                           ))}
                        </div>
                     </div>
                  )}
               </div>

               {/* Gender & Emergency Contact */}
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                     <div className="w-2 h-6 bg-blue-400 rounded-full" />
                     Additional Info
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender</label>
                        <div className="grid grid-cols-3 gap-2">
                           {['Male', 'Female', 'Other'].map((g) => (
                              <button
                                 key={g}
                                 onClick={() => setHealthSettings({ ...healthSettings, gender: g })}
                                 className={`px-3 py-2 rounded-xl font-bold text-xs transition-all ${healthSettings.gender === g
                                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-100'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                    }`}
                              >
                                 {g === 'Male' ? '👨' : g === 'Female' ? '👩' : '🧑'} {g}
                              </button>
                           ))}
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emergency Contact</label>
                        <input
                           type="tel"
                           value={healthSettings.emergencyContact}
                           onChange={(e) => setHealthSettings({ ...healthSettings, emergencyContact: e.target.value })}
                           placeholder="+91 98765 43210"
                           className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                        />
                     </div>
                  </div>
               </div>

               {/* Accessibility Settings */}
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                     <div className="w-2 h-6 bg-violet-400 rounded-full" />
                     Accessibility
                  </h3>

                  <div className="p-5 rounded-2xl bg-slate-50">
                     <div className="flex items-center justify-between">
                        <div>
                           <p className="font-bold text-slate-700">♿ Differently-abled</p>
                           <p className="text-xs text-slate-400 mt-1">Enables buzzer alert for caretaker on head tilt</p>
                        </div>
                        <button
                           onClick={() => setHealthSettings({ ...healthSettings, isDisabled: !healthSettings.isDisabled, disabilityType: !healthSettings.isDisabled ? healthSettings.disabilityType : '' })}
                           className={`w-14 h-8 rounded-full transition-all flex items-center ${healthSettings.isDisabled ? 'bg-teal-500' : 'bg-slate-200'}`}
                        >
                           <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all ${healthSettings.isDisabled ? 'ml-7' : 'ml-1'}`} />
                        </button>
                     </div>
                  </div>

                  {healthSettings.isDisabled && (
                     <div className="mt-4 p-5 rounded-2xl border-2 border-teal-200 bg-teal-50/50 animate-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-2 block">Type of Disability</label>
                        <input
                           type="text"
                           placeholder="e.g., Cerebral Palsy, Spinal Cord Injury, etc."
                           value={healthSettings.disabilityType}
                           onChange={(e) => setHealthSettings({ ...healthSettings, disabilityType: e.target.value })}
                           className="w-full px-5 py-3 rounded-xl bg-white border-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                        />
                        <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                           <p className="text-xs text-amber-700 font-semibold">
                              🔔 Tilting head left or right will activate a buzzer to alert your caretaker for assistance.
                           </p>
                        </div>

                        {/* Caretaker Info */}
                        <div className="mt-4 space-y-3">
                           <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest block">Caretaker's Name</label>
                           <input
                              type="text"
                              placeholder="e.g., Dr. Sharma"
                              value={healthSettings.caretakerName}
                              onChange={(e) => setHealthSettings({ ...healthSettings, caretakerName: e.target.value })}
                              className="w-full px-5 py-3 rounded-xl bg-white border-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                           />
                        </div>
                        <div className="mt-3 space-y-3">
                           <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest block">Caretaker's Phone No.</label>
                           <input
                              type="tel"
                              placeholder="e.g., +91 98765 43210"
                              value={healthSettings.caretakerPhone}
                              onChange={(e) => setHealthSettings({ ...healthSettings, caretakerPhone: e.target.value })}
                              className="w-full px-5 py-3 rounded-xl bg-white border-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-700"
                           />
                        </div>
                     </div>
                  )}
               </div>

               {/* Health Goals */}
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                     <div className="w-2 h-6 bg-emerald-400 rounded-full" />
                     Health Goals
                  </h3>

                  <div className="space-y-6">
                     <div>
                        <div className="flex items-center justify-between mb-3">
                           <div>
                              <label className="text-sm font-bold text-slate-700">Daily Posture Goal</label>
                              <p className="text-xs text-slate-400">Target good posture percentage</p>
                           </div>
                           <span className="text-xl font-black text-teal-600">{healthSettings.dailyGoal}%</span>
                        </div>
                        <input
                           type="range"
                           min="50" max="100"
                           value={healthSettings.dailyGoal}
                           onChange={(e) => setHealthSettings({ ...healthSettings, dailyGoal: parseInt(e.target.value) })}
                           className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                     </div>

                     <div>
                        <div className="flex items-center justify-between mb-3">
                           <div>
                              <label className="text-sm font-bold text-slate-700">Break Reminder</label>
                              <p className="text-xs text-slate-400">Remind me to take breaks every</p>
                           </div>
                           <span className="text-xl font-black text-amber-600">{healthSettings.breakInterval} min</span>
                        </div>
                        <input
                           type="range"
                           min="15" max="90" step="5"
                           value={healthSettings.breakInterval}
                           onChange={(e) => setHealthSettings({ ...healthSettings, breakInterval: parseInt(e.target.value) })}
                           className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                     </div>
                  </div>
               </div>

               {/* Alert Settings */}
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                     <div className="w-2 h-6 bg-amber-400 rounded-full" />
                     Alert Preferences
                  </h3>
                  <div className="space-y-6">
                     <div>
                        <div className="flex items-center justify-between mb-3">
                           <label className="text-sm font-bold text-slate-700">Alert Threshold</label>
                           <span className="text-sm font-black text-teal-600">{profile.alertDelay} {profile.alertDelay === 1 ? 'min' : 'mins'}</span>
                        </div>
                        <input
                           type="range"
                           min="1" max="15"
                           value={profile.alertDelay}
                           onChange={(e) => setProfile({ ...profile, alertDelay: parseInt(e.target.value) })}
                           className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Notify after bad posture for this many minutes</p>
                     </div>
                     <div className="p-5 rounded-2xl bg-slate-50">
                        <div className="flex items-center justify-between">
                           <div>
                              <p className="font-bold text-slate-700">Push Notifications</p>
                              <p className="text-xs text-slate-400 mt-1">Get notified when posture needs attention</p>
                           </div>
                           <button
                              onClick={() => setProfile({ ...profile, alertIntensity: profile.alertIntensity > 0 ? 0 : 80 })}
                              className={`w-14 h-8 rounded-full transition-all flex items-center ${profile.alertIntensity > 0 ? 'bg-teal-500' : 'bg-slate-200'}`}
                           >
                              <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all ${profile.alertIntensity > 0 ? 'ml-7' : 'ml-1'}`} />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Bottom Row */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50">
               <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-3">
                  <div className="w-2 h-6 bg-rose-400 rounded-full" />
                  Account
               </h3>
               <div className="space-y-3">
                  <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                     <span className="text-sm font-bold text-slate-700">🔒 Change Password</span>
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                     <span className="text-sm font-bold text-slate-700">📤 Export My Data</span>
                     <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <button className="w-full flex items-center justify-between p-4 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors">
                     <span className="text-sm font-bold text-rose-600">🗑️ Delete Account</span>
                     <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
               </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 opacity-10">
                  <svg className="w-40 h-40" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               </div>
               <h3 className="text-lg font-black mb-2">🎯 Your Progress</h3>
               <p className="text-slate-400 text-sm mb-6">Keep improving your posture every day!</p>

               <div className="space-y-4">
                  <div>
                     <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">This Week</span>
                        <span className="font-bold">78%</span>
                     </div>
                     <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full" style={{ width: '78%' }}></div>
                     </div>
                  </div>
                  <div>
                     <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Last Week</span>
                        <span className="font-bold">65%</span>
                     </div>
                     <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full" style={{ width: '65%' }}></div>
                     </div>
                  </div>
               </div>

               <p className="text-teal-400 text-sm font-bold mt-4">📈 +13% improvement!</p>
            </div>
         </div>
      </div>
   );
};

export default SettingsView;


import React from 'react';
import { UserProfile } from '../../types';

interface ProfileViewProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile, setProfile }) => {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <h2 className="text-3xl font-bold text-slate-900">User Profile</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className="relative">
              <img 
                src="https://picsum.photos/400/400?random=10" 
                className="w-32 h-32 rounded-full object-cover border-4 border-slate-50 shadow-lg" 
                alt="Profile" 
              />
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-white cursor-pointer hover:bg-indigo-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-6">{profile.name}</h3>
            <p className="text-slate-500 text-sm">Member since Jan 2024</p>
            <div className="w-full mt-8 space-y-3">
               <button className="w-full py-3 bg-indigo-50 text-indigo-700 font-bold rounded-2xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                  Recalibrate Sensor
               </button>
            </div>
         </div>

         <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
               <h3 className="text-lg font-bold text-slate-900 mb-6">Personal Details</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Full Name</label>
                    <input 
                      type="text" 
                      value={profile.name}
                      onChange={(e) => setProfile({...profile, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Height</label>
                    <input 
                      type="text" 
                      value={profile.height}
                      onChange={(e) => setProfile({...profile, height: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Typical Working Hours</label>
                    <input 
                      type="text" 
                      value={profile.workingHours}
                      onChange={(e) => setProfile({...profile, workingHours: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                    />
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
               <h3 className="text-lg font-bold text-slate-900 mb-6">Device Preferences</h3>
               <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                       <label className="text-xs font-bold text-slate-400 uppercase">Alert Delay (Seconds)</label>
                       <span className="text-sm font-bold text-indigo-600">{profile.alertDelay}s</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" max="60" 
                      value={profile.alertDelay}
                      onChange={(e) => setProfile({...profile, alertDelay: parseInt(e.target.value)})}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                       <label className="text-xs font-bold text-slate-400 uppercase">Vibration Intensity</label>
                       <span className="text-sm font-bold text-indigo-600">{profile.alertIntensity}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={profile.alertIntensity}
                      onChange={(e) => setProfile({...profile, alertIntensity: parseInt(e.target.value)})}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ProfileView;

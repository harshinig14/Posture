import React, { useState } from 'react';

interface ProfileSetupProps {
    userName: string;
    onComplete: () => void;
    token: string;
}

const API_URL = 'http://localhost:8000';

const ProfileSetup: React.FC<ProfileSetupProps> = ({ userName, onComplete, token }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({
        height: '',
        age: '',
        gender: '',
        emergencyContact: '',
        workingHours: '09:00 - 17:00',
        alertDelay: 5,
        alertIntensity: 80,
        isDisabled: false,
        disabilityType: '',
        caretakerName: '',
        caretakerPhone: ''
    });

    const totalSteps = 4;

    const handleNext = () => {
        if (step === 2 && profile.isDisabled) {
            // Skip Work Hours step for disabled users
            setStep(4);
        } else if (step < totalSteps) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step === 4 && profile.isDisabled) {
            // Skip Work Hours step going back for disabled users
            setStep(2);
        } else if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: userName,
                    height: profile.height,
                    workingHours: profile.workingHours,
                    alertDelay: profile.alertDelay,
                    alertIntensity: profile.alertIntensity,
                    age: parseInt(profile.age) || 0,
                    gender: profile.gender,
                    emergencyContact: profile.emergencyContact,
                    isDisabled: profile.isDisabled,
                    disabilityType: profile.disabilityType,
                    caretakerName: profile.caretakerName,
                    caretakerPhone: profile.caretakerPhone,
                    profileComplete: true
                })
            });

            if (response.ok) {
                onComplete();
            }
        } catch (error) {
            console.error('Error saving profile:', error);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-8 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black">Welcome, {userName}!</h2>
                    <p className="text-white/80 mt-2">Let's set up your profile for a personalized experience</p>
                </div>

                {/* Progress Bar */}
                <div className="px-8 pt-6">
                    <div className="flex items-center justify-between mb-2">
                        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                            <div
                                key={s}
                                className={`flex-1 h-2 rounded-full mx-1 transition-all ${s <= step ? 'bg-teal-500' : 'bg-slate-200'
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                        Step {step} of {totalSteps}
                    </p>
                </div>

                {/* Content */}
                <div className="p-8">
                    {/* Step 1: Personal Information */}
                    {step === 1 && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 mb-2">Personal Information</h3>
                                <p className="text-slate-400 text-sm mb-4">
                                    Help us personalize your posture monitoring experience
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age</label>
                                    <input
                                        type="number"
                                        placeholder="e.g., 25"
                                        value={profile.age}
                                        onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                                        className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-slate-700"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Height</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 175 cm"
                                        value={profile.height}
                                        onChange={(e) => setProfile({ ...profile, height: e.target.value })}
                                        className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-slate-700"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['Male', 'Female', 'Other'].map((g) => (
                                        <button
                                            key={g}
                                            onClick={() => setProfile({ ...profile, gender: g })}
                                            className={`px-4 py-3 rounded-xl font-bold text-sm transition-all ${profile.gender === g
                                                ? 'bg-teal-500 text-white shadow-lg shadow-teal-100'
                                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                                }`}
                                        >
                                            {g === 'Male' ? '👨' : g === 'Female' ? '👩' : '🧑'} {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emergency Contact No.</label>
                                <input
                                    type="tel"
                                    placeholder="e.g., +91 98765 43210"
                                    value={profile.emergencyContact}
                                    onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-slate-700"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Accessibility / Disability (MOVED UP) */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 mb-2">Accessibility</h3>
                                <p className="text-slate-400 text-sm mb-4">
                                    We offer special caretaker alerts for differently-abled users
                                </p>

                                {/* Disabled Toggle */}
                                <div className="p-5 rounded-2xl bg-slate-50 mb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-700">Are you differently-abled?</p>
                                            <p className="text-xs text-slate-400 mt-1">Enables buzzer alert for your caretaker on head tilt</p>
                                        </div>
                                        <button
                                            onClick={() => setProfile({ ...profile, isDisabled: !profile.isDisabled, disabilityType: !profile.isDisabled ? profile.disabilityType : '' })}
                                            className={`w-14 h-8 rounded-full transition-all flex items-center ${profile.isDisabled ? 'bg-teal-500' : 'bg-slate-200'}`}
                                        >
                                            <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all ${profile.isDisabled ? 'ml-7' : 'ml-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Disability Type (Conditional) */}
                                {profile.isDisabled && (
                                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                                        <div className="p-5 rounded-2xl border-2 border-teal-200 bg-teal-50/50">
                                            <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-2 block">Type of Disability</label>
                                            <input
                                                type="text"
                                                placeholder="e.g., Cerebral Palsy, Spinal Cord Injury, etc."
                                                value={profile.disabilityType}
                                                onChange={(e) => setProfile({ ...profile, disabilityType: e.target.value })}
                                                className="w-full px-5 py-3 rounded-xl bg-white border-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-slate-700"
                                            />
                                            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                                                <p className="text-xs text-amber-700 font-semibold">
                                                    🔔 When enabled, tilting your head left or right will activate a buzzer to alert your caretaker for assistance.
                                                </p>
                                            </div>

                                            {/* Caretaker Info */}
                                            <div className="mt-4 space-y-3">
                                                <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest block">Caretaker's Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g., Dr. Sharma"
                                                    value={profile.caretakerName}
                                                    onChange={(e) => setProfile({ ...profile, caretakerName: e.target.value })}
                                                    className="w-full px-5 py-3 rounded-xl bg-white border-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-slate-700"
                                                />
                                            </div>
                                            <div className="mt-3 space-y-3">
                                                <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest block">Caretaker's Phone No.</label>
                                                <input
                                                    type="tel"
                                                    placeholder="e.g., +91 98765 43210"
                                                    value={profile.caretakerPhone}
                                                    onChange={(e) => setProfile({ ...profile, caretakerPhone: e.target.value })}
                                                    className="w-full px-5 py-3 rounded-xl bg-white border-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-slate-700"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Work Style & Hours (ONLY for non-disabled users) */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 mb-2">Work Style & Hours</h3>
                                <p className="text-slate-400 text-sm mb-4">
                                    When should we monitor your posture?
                                </p>
                                <input
                                    type="text"
                                    placeholder="e.g., 09:00 - 17:00"
                                    value={profile.workingHours}
                                    onChange={(e) => setProfile({ ...profile, workingHours: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-teal-500 transition-all font-bold text-slate-700 text-lg"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Alert Preferences */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 mb-2">Alert Preferences</h3>
                                <p className="text-slate-400 text-sm mb-4">
                                    Customize how you want to be reminded
                                </p>

                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-sm font-bold text-slate-600">Alert Threshold</label>
                                            <span className="text-sm font-black text-teal-600">{profile.alertDelay} {profile.alertDelay === 1 ? 'minute' : 'minutes'}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="15"
                                            value={profile.alertDelay}
                                            onChange={(e) => setProfile({ ...profile, alertDelay: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                        />
                                        <p className="text-xs text-slate-400 mt-1">Notify you after bad posture for this many minutes</p>
                                    </div>

                                    {/* Notification Toggle */}
                                    <div className="p-5 rounded-2xl bg-slate-50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-slate-700">Push Notifications</p>
                                                <p className="text-xs text-slate-400 mt-1">Get notified when your posture needs attention</p>
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
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 pb-8 flex gap-4">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                        >
                            Back
                        </button>
                    )}

                    {step < totalSteps ? (
                        <button
                            onClick={handleNext}
                            className="flex-1 px-6 py-4 rounded-2xl font-bold text-white bg-teal-500 hover:bg-teal-600 transition-all shadow-lg shadow-teal-100"
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            onClick={handleComplete}
                            disabled={loading}
                            className="flex-1 px-6 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 transition-all shadow-lg shadow-teal-100 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : '🎉 Complete Setup'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileSetup;

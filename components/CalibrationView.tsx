import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000';

interface CalibrationViewProps {
    currentPitch?: number;
    currentRoll?: number;
}

const CalibrationView: React.FC<CalibrationViewProps> = ({ currentPitch = 0, currentRoll = 0 }) => {
    const [step, setStep] = useState(1);
    const [countdown, setCountdown] = useState(5);
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [calibrationResult, setCalibrationResult] = useState<{ pitch: number, roll: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [liveData, setLiveData] = useState({ pitch: currentPitch, roll: currentRoll });

    // Update live data when props change
    useEffect(() => {
        setLiveData({ pitch: currentPitch, roll: currentRoll });
    }, [currentPitch, currentRoll]);

    // Call the backend to save the current position as baseline
    const saveCalibration = async () => {
        try {
            const token = localStorage.getItem('posture_token');

            // Send current sensor values in the request body (for BLE mode)
            const requestBody = {
                pitch: liveData.pitch,
                roll: liveData.roll
            };

            console.log('Sending calibration request with:', requestBody);

            const response = await fetch(`${API_URL}/api/calibrate/instant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || ''}`
                },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Calibration saved:', result);
                setCalibrationResult(result.baseline || { pitch: liveData.pitch, roll: liveData.roll });
                setStep(3);
                setError(null);
            } else {
                const errorData = await response.json().catch(() => ({}));
                setError(errorData.detail || 'Failed to save calibration.');
            }
        } catch (err) {
            console.error('Calibration error:', err);
            setError('Failed to connect to server.');
        }
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isCalibrating && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        } else if (countdown === 0 && isCalibrating) {
            // When countdown reaches 0, save calibration
            setIsCalibrating(false);
            saveCalibration();
        }
        return () => clearInterval(timer);
    }, [isCalibrating, countdown]); // Removed liveData - it changes too often and resets the timer

    const startCalibration = () => {
        setError(null);
        setIsCalibrating(true);
        setCountdown(5);
    };

    // Quick calibration - saves immediately without countdown
    const quickCalibrate = async () => {
        setError(null);
        setIsCalibrating(true);
        await saveCalibration();
        setIsCalibrating(false);
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-extrabold text-slate-900">Personalized Calibration</h2>
                <div className="px-4 py-1.5 bg-teal-50 border border-teal-100 rounded-full">
                    <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest">Setup Wizard</span>
                </div>
            </div>

            {/* Live Sensor Data Display */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-600">Current Sensor Reading:</span>
                    <span className="text-lg font-mono font-bold text-slate-800">
                        Pitch: {liveData.pitch.toFixed(1)}° | Roll: {liveData.roll.toFixed(1)}°
                    </span>
                </div>
            </div>

            {/* Quick Calibrate Button - Always Visible */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold mb-1">⚡ Quick Calibrate</h3>
                        <p className="text-blue-100 text-sm">
                            Sit in your comfortable position and click to save as baseline instantly
                        </p>
                    </div>
                    <button
                        onClick={quickCalibrate}
                        disabled={isCalibrating}
                        className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold shadow-lg hover:bg-blue-50 transition-all disabled:opacity-50"
                    >
                        {isCalibrating ? 'Saving...' : 'Set Baseline Now'}
                    </button>
                </div>
                {calibrationResult && (
                    <div className="mt-4 pt-4 border-t border-blue-400">
                        <p className="text-sm text-blue-100">
                            ✅ Baseline saved: Pitch {calibrationResult.pitch.toFixed(1)}°, Roll {calibrationResult.roll.toFixed(1)}°
                        </p>
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700">
                    ⚠️ {error}
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50 p-10">
                <div className="max-w-2xl mx-auto">
                    {/* Stepper */}
                    <div className="flex items-center justify-between mb-12 relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${step >= s ? 'bg-[#14b8a6] text-white shadow-lg shadow-teal-100' : 'bg-white border-2 border-slate-100 text-slate-300'
                                    }`}
                            >
                                {s}
                            </div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="w-24 h-24 bg-teal-50 rounded-3xl flex items-center justify-center mx-auto text-[#14b8a6]">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">Device Connection</h3>
                            <p className="text-slate-500 leading-relaxed">
                                Ensure your ESP32 device is connected via Bluetooth.<br />
                                The sensor readings above should show your current orientation.
                            </p>
                            <button
                                onClick={() => setStep(2)}
                                className="px-10 py-4 bg-[#14b8a6] text-white rounded-2xl font-bold shadow-lg shadow-teal-100 hover:bg-[#0d9488] transition-all"
                            >
                                I'm Connected
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="w-24 h-24 bg-teal-50 rounded-3xl flex items-center justify-center mx-auto text-[#14b8a6]">
                                {isCalibrating ? (
                                    <span className="text-4xl font-black">{countdown}</span>
                                ) : (
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                )}
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">Set Your Baseline</h3>
                            <p className="text-slate-500 leading-relaxed">
                                Sit in your most comfortable "Good" posture position.<br />
                                This will become your personal baseline - the system will measure deviations from this position.
                            </p>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
                                💡 <strong>Tip:</strong> Keep your back straight and shoulders relaxed.
                                You can recalibrate anytime if the sensor position changes.
                            </div>
                            {!isCalibrating ? (
                                <button
                                    onClick={startCalibration}
                                    className="px-10 py-4 bg-[#14b8a6] text-white rounded-2xl font-bold shadow-lg shadow-teal-100 hover:bg-[#0d9488] transition-all"
                                >
                                    Start 5-Second Calibration
                                </button>
                            ) : (
                                <div className="flex items-center justify-center gap-2 text-[#14b8a6] font-bold">
                                    <div className="w-2 h-2 bg-[#14b8a6] rounded-full animate-ping" />
                                    Hold still... Recording your baseline position...
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto text-emerald-500">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">Calibration Complete! ✅</h3>
                            {calibrationResult && (
                                <div className="bg-slate-50 rounded-xl p-4 inline-block">
                                    <p className="text-sm text-slate-600">Your baseline position:</p>
                                    <p className="text-lg font-bold text-slate-800">
                                        Pitch: {calibrationResult.pitch.toFixed(1)}° | Roll: {calibrationResult.roll.toFixed(1)}°
                                    </p>
                                </div>
                            )}
                            <p className="text-slate-500 leading-relaxed">
                                PostureGuard will now monitor deviations from YOUR personalized baseline.<br />
                                <strong>30°+ deviation</strong> = Bad Posture Alert (after 8 seconds)<br />
                                <strong>18°+ deviation</strong> = "Needs Correction" warning (after 3 seconds)
                            </p>
                            <button
                                onClick={() => setStep(1)}
                                className="px-10 py-4 border-2 border-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                            >
                                Recalibrate
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalibrationView;


import React, { useState, useEffect } from 'react';
import { PostureState, PostureData, TabId, UserProfile, AlertLog, AppView } from './types';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import LiveView from './components/LiveView';
import HistoryView from './components/HistoryView';
import InsightsView from './components/InsightsView';
import AlertsView from './components/AlertsView';
import SettingsView from './components/SettingsView';
import HelpView from './components/HelpView';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import ChatBotView from './components/ChatBotView';
import ProfileSetup from './components/ProfileSetup';
import { useIoTData } from './hooks/useIoTData';
import { useBLEData } from './hooks/useBLEData';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'wifi' | 'ble'>('wifi');
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'User',
    height: '',
    workingHours: '09:00 - 17:00',
    alertIntensity: 80,
    alertDelay: 5,
    gender: '',
    emergencyContact: '',
    isDisabled: false,
    disabilityType: '',
    caretakerName: '',
    caretakerPhone: ''
  });

  // Real-time IoT State from backend (WiFi mode)
  const { sensorData: wifiSensorData, calibrate } = useIoTData();

  // BLE connection (Bluetooth mode)
  const { sensorData: bleSensorData, isConnected: bleConnected, isConnecting, connect: bleConnect, disconnect: bleDisconnect, error: bleError, recalibrate } = useBLEData();

  // Use the appropriate sensor data based on connection mode
  const sensorData = connectionMode === 'ble' ? bleSensorData : wifiSensorData;

  // Combined PostureData (uses real data when connected, simulation otherwise)
  const [currentPosture, setCurrentPosture] = useState<PostureData>({
    score: 85,
    state: PostureState.GOOD,
    neckStatus: 'Aligned',
    backStatus: 'Straight',
    vibrationActive: false,
    timeInCurrentState: 120,
    pitch: 0,
    roll: 0,
    iotConnected: false
  });

  const [alerts, setAlerts] = useState<AlertLog[]>([]);

  // Load saved alerts from backend on mount
  useEffect(() => {
    const loadAlerts = async () => {
      const token = localStorage.getItem('posture_token');
      if (!token) return;
      try {
        const res = await fetch('http://localhost:8000/api/alerts', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.alerts) {
          setAlerts(data.alerts.map((a: any) => ({
            id: a.alert_id,
            timestamp: new Date(a.timestamp),
            duration: a.duration,
            type: a.alert_type as 'Vibration' | 'Notification' | 'Help Request',
            severity: a.severity === 'Bad' ? PostureState.BAD : PostureState.WARNING
          })));
        }
      } catch (e) {
        console.error('Failed to load alerts:', e);
      }
    };
    loadAlerts();
  }, []);

  // Fetch full profile from API
  const fetchFullProfile = async (token: string) => {
    try {
      const res = await fetch('http://localhost:8000/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.profile) {
        const p = data.profile;
        setUserProfile(prev => ({
          ...prev,
          name: p.name || prev.name,
          height: p.height || '',
          workingHours: p.workingHours || '09:00 - 17:00',
          alertDelay: p.alertDelay ?? 5,
          alertIntensity: p.alertIntensity ?? 80,
          gender: p.gender || '',
          emergencyContact: p.emergencyContact || '',
          isDisabled: p.isDisabled ?? false,
          disabilityType: p.disabilityType || '',
          caretakerName: p.caretakerName || '',
          caretakerPhone: p.caretakerPhone || ''
        }));
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e);
    }
  };

  // Check for existing auth token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('posture_token');
    const savedUser = localStorage.getItem('posture_user');
    if (savedToken && savedUser) {
      setAuthToken(savedToken);
      const user = JSON.parse(savedUser);
      setUserProfile(prev => ({ ...prev, name: user.name }));
      // Check if profile is complete
      if (!user.profile_complete) {
        setShowProfileSetup(true);
      }
      setView('dashboard');
      // Fetch full profile from API
      fetchFullProfile(savedToken);
    }
  }, []);

  // Handle successful authentication
  const handleAuthSuccess = (token: string, user: any) => {
    setAuthToken(token);
    localStorage.setItem('posture_token', token);
    localStorage.setItem('posture_user', JSON.stringify(user));
    setUserProfile(prev => ({ ...prev, name: user.name }));

    // Show profile setup for new users
    if (!user.profile_complete) {
      setShowProfileSetup(true);
    }
    setView('dashboard');
    // Fetch full profile
    fetchFullProfile(token);
  };

  // Handle sign out
  const handleSignOut = () => {
    setAuthToken(null);
    localStorage.removeItem('posture_token');
    localStorage.removeItem('posture_user');
    setView('landing');
  };

  // Handle profile setup completion
  const handleProfileComplete = () => {
    setShowProfileSetup(false);
    // Update local storage
    const savedUser = localStorage.getItem('posture_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      user.profile_complete = true;
      localStorage.setItem('posture_user', JSON.stringify(user));
    }
    // Re-fetch full profile to sync all fields (isDisabled, caretakerName, etc.)
    if (authToken) fetchFullProfile(authToken);
  };

  // Simulation effect - ONLY runs when IoT is NOT connected
  useEffect(() => {
    // Skip simulation if IoT is connected - we use real data instead
    if (sensorData.connected) return;
    if (view !== 'dashboard') return;

    const interval = setInterval(() => {
      setCurrentPosture(prev => {
        // Just increment time when disconnected, no random changes
        return {
          ...prev,
          timeInCurrentState: prev.timeInCurrentState + 1
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [userProfile.alertDelay, view, sensorData.connected]);

  // Refs for deduplicating alerts
  const prevStateRef = React.useRef<PostureState>(PostureState.GOOD);
  const lastAlertTimeRef = React.useRef<number>(0);
  const prevBuzzerRef = React.useRef<boolean>(false);

  // Update posture from real IoT data when connected
  useEffect(() => {
    if (sensorData.connected) {
      setCurrentPosture(prev => {
        const isStateChanged = sensorData.state !== prev.state;

        return {
          ...prev,
          state: sensorData.state,
          neckStatus: sensorData.state === PostureState.BAD ? 'Forward' : 'Aligned',
          backStatus: sensorData.state === PostureState.BAD ? 'Rounded' : 'Straight',
          pitch: sensorData.pitch,
          roll: sensorData.roll,
          iotConnected: true,
          vibrationActive: sensorData.vibration,
          buzzerActive: wifiSensorData.buzzerActive || sensorData.buzzerActive,
          headTiltMinutes: (wifiSensorData as any).headTiltMinutes || (sensorData as any).headTiltMinutes || 0,
          timeInCurrentState: isStateChanged ? 0 : prev.timeInCurrentState + 1
        };
      });
    } else {
      // When disconnected, set iotConnected to false
      setCurrentPosture(prev => ({
        ...prev,
        iotConnected: false
      }));
    }
  }, [sensorData]);

  // Separate effect for creating alerts — prevents duplicates
  useEffect(() => {
    if (!sensorData.connected) return;
    const now = Date.now();

    // Alert when state transitions to BAD (with 2-second debounce)
    if (sensorData.state === PostureState.BAD && prevStateRef.current !== PostureState.BAD) {
      if (now - lastAlertTimeRef.current > 2000) {
        const newAlert: AlertLog = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          duration: 15,
          type: 'Vibration',
          severity: PostureState.BAD
        };
        setAlerts(curr => [newAlert, ...curr].slice(0, 100));
        lastAlertTimeRef.current = now;
        // Persist to backend
        const token = localStorage.getItem('posture_token');
        if (token) {
          fetch('http://localhost:8000/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              alert_id: newAlert.id,
              timestamp: newAlert.timestamp.toISOString(),
              duration: newAlert.duration,
              alert_type: newAlert.type,
              severity: 'Bad'
            })
          }).catch(e => console.error('Failed to save alert:', e));
        }
      }
    }
    prevStateRef.current = sensorData.state;

    // Buzzer Help Notification — when buzzer activates for handicapped user
    if (sensorData.buzzerActive && !prevBuzzerRef.current) {
      if (now - lastAlertTimeRef.current > 2000) {
        const helpAlert: AlertLog = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          duration: 0,
          type: 'Help Request',
          severity: PostureState.BAD
        };
        setAlerts(curr => [helpAlert, ...curr].slice(0, 100));
        lastAlertTimeRef.current = now;
        // Persist to backend
        const token = localStorage.getItem('posture_token');
        if (token) {
          fetch('http://localhost:8000/api/alerts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
              alert_id: helpAlert.id,
              timestamp: helpAlert.timestamp.toISOString(),
              duration: helpAlert.duration,
              alert_type: 'Help Request',
              severity: 'Bad'
            })
          }).catch(e => console.error('Failed to save help alert:', e));
        }
      }
    }
    prevBuzzerRef.current = sensorData.buzzerActive;
  }, [sensorData.state, sensorData.buzzerActive, sensorData.connected]);

  // Forward BLE sensor data to backend for ML logging (every 30 seconds)
  useEffect(() => {
    if (!sensorData.connected) return;

    const logInterval = setInterval(() => {
      const token = localStorage.getItem('posture_token');
      if (!token) return;

      fetch('http://localhost:8000/api/posture/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          pitch: sensorData.pitch,
          roll: sensorData.roll,
          yaw: 0,
          posture_state: sensorData.state
        })
      }).catch(e => console.error('Failed to log posture:', e));
    }, 30000); // Every 30 seconds

    // Log immediately on first connection
    const token = localStorage.getItem('posture_token');
    if (token) {
      fetch('http://localhost:8000/api/posture/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          pitch: sensorData.pitch,
          roll: sensorData.roll,
          yaw: 0,
          posture_state: sensorData.state
        })
      }).catch(e => console.error('Failed to log posture:', e));
    }

    return () => clearInterval(logInterval);
  }, [sensorData.connected]);

  const renderDashboardContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView data={currentPosture} profile={userProfile} />;
      case 'live': return <LiveView data={currentPosture} />;
      case 'chatbot': return <ChatBotView />;
      case 'history': return <HistoryView />;
      case 'insights': return <InsightsView data={currentPosture} />;
      case 'alerts': return <AlertsView alerts={alerts} onClear={() => {
        setAlerts([]);
        const token = localStorage.getItem('posture_token');
        if (token) {
          fetch('http://localhost:8000/api/alerts', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          }).catch(console.error);
        }
      }} />;
      case 'settings': return <SettingsView profile={userProfile} setProfile={setUserProfile} token={authToken} />;
      case 'help': return <HelpView />;
      default: return <DashboardView data={currentPosture} profile={userProfile} />;
    }
  };

  if (view === 'landing') {
    return <LandingPage onStart={() => setView('auth')} />;
  }

  if (view === 'auth') {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="flex min-h-screen text-slate-800 bg-[#f8fafc]">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignOut={handleSignOut}
        iotConnected={sensorData.connected}
        connectionMode={connectionMode}
        bleConnected={bleConnected}
        bleConnecting={isConnecting}
        onBleConnect={() => { setConnectionMode('ble'); bleConnect(); }}
        onBleDisconnect={() => { bleDisconnect(); setConnectionMode('wifi'); }}
        onRecalibrate={recalibrate}
        bleError={bleError}
      />
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          {renderDashboardContent()}
        </div>
      </main>

      {/* Profile Setup Modal for new users */}
      {showProfileSetup && authToken && (
        <ProfileSetup
          userName={userProfile.name}
          onComplete={handleProfileComplete}
          token={authToken}
        />
      )}
    </div>
  );
};

export default App;

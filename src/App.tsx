import React, { useState, useEffect } from 'react';
import { PostureState } from '../types';
import type { PostureData, TabId, UserProfile, AlertLog, AppView } from '../types';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import LiveView from './components/LiveView';
import HistoryView from './components/HistoryView';
import InsightsView from './components/InsightsView';
import AlertsView from './components/AlertsView';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import HelpView from './components/HelpView';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Alex Johnson',
    height: '180 cm',
    workingHours: '09:00 - 17:00',
    alertIntensity: 60,
    alertDelay: 5
  });

  const [currentPosture, setCurrentPosture] = useState<PostureData>({
    score: 85,
    state: PostureState.GOOD,
    neckStatus: 'Aligned',
    backStatus: 'Straight',
    vibrationActive: false,
    timeInCurrentState: 120
  });

  const [alerts, setAlerts] = useState<AlertLog[]>([]);

  useEffect(() => {
    if (view !== 'dashboard') return;

    const interval = setInterval(() => {
      setCurrentPosture(prev => {
        const rand = Math.random();
        let newState = prev.state;
        let newNeck = prev.neckStatus;
        let newBack = prev.backStatus;
        let newScore = prev.score;

        if (rand > 0.95) {
          newState = PostureState.BAD;
          newNeck = 'Forward';
          newBack = 'Rounded';
          newScore = Math.max(0, prev.score - 5);
        } else if (rand > 0.85) {
          newState = PostureState.WARNING;
          newNeck = 'Forward';
          newBack = 'Straight';
          newScore = Math.max(0, prev.score - 2);
        } else if (rand < 0.2) {
          newState = PostureState.GOOD;
          newNeck = 'Aligned';
          newBack = 'Straight';
          newScore = Math.min(100, prev.score + 1);
        }

        const isStateChanged = newState !== prev.state;
        
        if (newState === PostureState.BAD && prev.timeInCurrentState >= userProfile.alertDelay && !prev.vibrationActive) {
           const newAlert: AlertLog = {
             id: Math.random().toString(36).substr(2, 9),
             timestamp: new Date(),
             duration: 15,
             type: 'Vibration',
             severity: PostureState.BAD
           };
           setAlerts(curr => [newAlert, ...curr].slice(0, 20));
        }

        return {
          ...prev,
          state: newState,
          neckStatus: newNeck,
          backStatus: newBack,
          score: newScore,
          vibrationActive: newState === PostureState.BAD && prev.timeInCurrentState >= userProfile.alertDelay,
          timeInCurrentState: isStateChanged ? 0 : prev.timeInCurrentState + 1
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [userProfile.alertDelay, view]);

  const renderDashboardContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView data={currentPosture} profile={userProfile} />;
      case 'live': return <LiveView data={currentPosture} />;
      case 'history': return <HistoryView />;
      case 'insights': return <InsightsView data={currentPosture} />;
      case 'alerts': return <AlertsView alerts={alerts} />;
      case 'profile': return <ProfileView profile={userProfile} setProfile={setUserProfile} />;
      case 'settings': return <SettingsView />;
      case 'help': return <HelpView />;
      default: return <DashboardView data={currentPosture} profile={userProfile} />;
    }
  };

  if (view === 'landing') {
    return <LandingPage onStart={() => setView('auth')} />;
  }

  if (view === 'auth') {
    return <AuthPage onAuthSuccess={() => setView('dashboard')} />;
  }

  return (
    <div className="flex min-h-screen text-slate-800 bg-[#f8fafc]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={() => setView('landing')} />
      <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          {renderDashboardContent()}
        </div>
      </main>
    </div>
  );
};

export default App;

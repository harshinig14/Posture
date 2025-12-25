
import React from 'react';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-[#f0f9fa] flex flex-col font-sans text-[#2c3e50]">
      {/* Header */}
      <header className="p-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#14b8a6] rounded-full flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">PostureGuard</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Smart IoT Posture Monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onStart} className="text-sm font-medium hover:text-[#14b8a6] transition-colors">Sign In</button>
          <button onClick={onStart} className="bg-[#14b8a6] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#0d9488] transition-all">
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-5xl mx-auto text-center">
        <div className="inline-block px-4 py-1.5 bg-[#d1fae5] text-[#0d9488] rounded-full text-xs font-bold uppercase tracking-wider mb-8">
          Smart IoT Posture Monitoring
        </div>
        
        <h2 className="text-5xl md:text-7xl font-extrabold mb-6 leading-[1.1]">
          Your Personal <span className="text-[#2dd4bf]">Posture Guardian</span>
        </h2>
        
        <p className="text-lg md:text-xl text-slate-500 max-w-3xl mb-12 leading-relaxed">
          Real-time posture monitoring powered by advanced IoT sensors. Get instant feedback, track your progress, and protect your neck and back health with clear, friendly insights.
        </p>

        <div className="flex flex-col md:flex-row gap-4 mb-20 w-full md:w-auto">
          <button onClick={onStart} className="bg-[#0d9488] text-white px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-[#14b8a622] transition-all">
            Start Monitoring
          </button>
          <button onClick={onStart} className="bg-white text-slate-800 px-10 py-4 rounded-2xl font-bold text-lg border border-slate-100 shadow-sm hover:bg-slate-50 transition-all">
            View Demo Dashboard
          </button>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {[
            {
              title: "Real-time Alerts",
              desc: "Instant notifications when your posture needs attention, before strain builds up.",
              icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            },
            {
              title: "Progress Tracking",
              desc: "Daily and weekly summaries that turn sensor data into clear posture scores.",
              icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            },
            {
              title: "Smart Detection",
              desc: "Advanced IoT sensors distinguish healthy shifts from harmful slouching.",
              icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            }
          ].map((feature, idx) => (
            <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-sm text-left border border-slate-50 flex flex-col gap-4">
              <div className="w-12 h-12 bg-[#f0fdfa] text-[#14b8a6] rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                </svg>
              </div>
              <h4 className="text-xl font-bold">{feature.title}</h4>
              <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-sm">
        <p>© 2025 PostureGuard. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-600 transition-colors">Privacy</a>
          <a href="#" className="hover:text-slate-600 transition-colors">Terms</a>
          <a href="#" className="hover:text-slate-600 transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

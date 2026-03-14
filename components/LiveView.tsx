
import React from 'react';
import { PostureData, PostureState } from '../types';

interface LiveViewProps {
  data: PostureData;
}

const LiveView: React.FC<LiveViewProps> = ({ data }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-extrabold text-slate-900">Live Monitoring</h2>
        <div className={`flex items-center gap-3 px-6 py-2 rounded-2xl border transition-all ${data.vibrationActive ? 'bg-rose-100 border-rose-200 text-rose-700 animate-pulse' : 'bg-[#f0fdfa] border-[#ccfbf1] text-[#0d9488]'}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${data.vibrationActive ? 'bg-rose-500' : 'bg-[#14b8a6] animate-pulse'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {data.vibrationActive ? 'Vibration Alert ON' : 'Posture Guard Active'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[500px]">
        {/* Silhouette Visualization */}
        <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50 flex flex-col items-center justify-center p-10 overflow-hidden relative">
          <div className="absolute top-8 left-8">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Visualizer</p>
            <p className="text-sm font-extrabold text-slate-500">Posture Silhouette</p>
          </div>

          <div className="w-full h-full flex items-center justify-center">
            {/* SVG Silhouette representation */}
            <svg width="240" height="400" viewBox="0 0 240 400" className="transition-all duration-500">
              {/* Head */}
              <circle
                cx="120"
                cy={data.neckStatus === 'Forward' ? 95 : 80}
                r="35"
                fill={data.neckStatus === 'Forward' ? '#fecaca' : '#ccfbf1'}
                className="transition-all duration-500"
              />
              {/* Spine */}
              <path
                d={data.backStatus === 'Straight' ? "M120 115 L120 300" : "M120 115 Q150 200 120 300"}
                stroke={data.backStatus === 'Straight' ? '#2dd4bf' : '#fecaca'}
                strokeWidth="14"
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-500"
              />
              {/* Shoulders */}
              <line
                x1="80" y1="130"
                x2="160" y2="130"
                stroke="#14b8a6"
                strokeWidth="18"
                strokeLinecap="round"
              />
              {/* Hips */}
              <line
                x1="90" y1="300"
                x2="150" y2="300"
                stroke="#0d9488"
                strokeWidth="24"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="w-full flex justify-around mt-auto pt-6 border-t border-slate-50">
            <div className="text-center">
              <span className={`text-[10px] font-black uppercase tracking-widest ${data.neckStatus === 'Aligned' ? 'text-emerald-500' : 'text-rose-500'}`}>Neck Status</span>
              <p className="text-lg font-black text-slate-800">{data.neckStatus}</p>
            </div>
            <div className="text-center">
              <span className={`text-[10px] font-black uppercase tracking-widest ${data.backStatus === 'Straight' ? 'text-emerald-500' : 'text-rose-500'}`}>Back Status</span>
              <p className="text-lg font-black text-slate-800">{data.backStatus}</p>
            </div>
          </div>
        </div>

        {/* Real-time stats */}
        <div className="flex flex-col gap-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-50 shadow-xl shadow-slate-100/50 flex-1 flex flex-col justify-center text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">State Duration</p>
            <p className="text-8xl font-black text-slate-900 tracking-tighter tabular-nums">
              {formatTime(data.timeInCurrentState)}
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <div className={`px-8 py-3 rounded-2xl border text-sm font-black uppercase tracking-widest ${data.state === PostureState.GOOD ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                data.state === PostureState.WARNING ? 'border-amber-200 bg-amber-50 text-amber-700' :
                  'border-rose-200 bg-rose-50 text-rose-700'
                }`}>
                {data.state}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-50 shadow-xl shadow-slate-100/50">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">IoT Status</p>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-300 ${data.iotConnected ? 'bg-[#14b8a6]' : 'bg-slate-300'}`} style={{ width: data.iotConnected ? '100%' : '0%' }}></div>
              </div>
              <p className={`text-xl font-black mt-4 ${data.iotConnected ? 'text-emerald-600' : 'text-slate-400'}`}>{data.iotConnected ? 'Connected' : 'Offline'}</p>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-50 shadow-xl shadow-slate-100/50">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Alert Gate</p>
              <p className="text-lg font-black text-slate-800 mt-4 leading-tight">After <span className="text-[#14b8a6]">5s</span> slouched</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Pitch', value: `${(data.pitch ?? 0).toFixed(1)}°`, color: 'teal' },
              { label: 'Roll', value: `${(data.roll ?? 0).toFixed(1)}°`, color: 'emerald' },
              { label: 'Yaw', value: '0.0°', color: 'slate' }
            ].map((sensor) => (
              <div key={sensor.label} className="bg-white p-6 rounded-[1.5rem] border border-slate-50 shadow-lg shadow-slate-100/50">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-2">{sensor.label}</p>
                <p className="text-xl font-black text-slate-800">{sensor.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveView;

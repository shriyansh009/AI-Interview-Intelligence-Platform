import React, { useState, useEffect } from 'react';

interface ATSScoreProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export const ATSScore: React.FC<ATSScoreProps> = ({ score, size = 160, strokeWidth = 12 }) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score || 0));
  const strokeDashoffset = circumference * (1 - (animated ? clamped : 0) / 100);

  const getTone = (val: number) => {
    if (val >= 80) return { ring: '#14b8a6', text: 'text-teal-400', badge: 'Strong Match', bg: 'bg-teal-500/10 border-teal-500/30' };
    if (val >= 60) return { ring: '#f59e0b', text: 'text-amber-400', badge: 'Good Match', bg: 'bg-amber-500/10 border-amber-500/30' };
    return { ring: '#f43f5e', text: 'text-rose-400', badge: 'Gaps Identified', bg: 'bg-rose-500/10 border-rose-500/30' };
  };

  const tone = getTone(clamped);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 transform">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-800"
            fill="transparent"
          />
          {/* Animated score ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={tone.ring}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Inner Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-['JetBrains_Mono',monospace] text-3xl font-extrabold tracking-tight text-slate-100">
            {clamped}%
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">
            ATS Score
          </span>
        </div>
      </div>

      <div className={`mt-3 px-3 py-1 rounded-full border text-xs font-semibold ${tone.text} ${tone.bg}`}>
        {tone.badge}
      </div>
    </div>
  );
};

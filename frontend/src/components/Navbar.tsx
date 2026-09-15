import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC<{ title?: string; subtitle?: string }> = ({
  title = "Dashboard",
  subtitle = "Interview Preparation & Knowledge Intelligence"
}) => {
  const { user } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md px-6 flex items-center justify-between shrink-0 sticky top-0 z-10">
      <div>
        <h2 className="text-base font-bold text-slate-100">{title}</h2>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
          <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
          <span>RAG Engine Online</span>
        </div>
      </div>
    </header>
  );
};

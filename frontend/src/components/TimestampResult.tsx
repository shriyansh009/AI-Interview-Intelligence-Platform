import React from 'react';
import { Play, Clock, Sparkles } from 'lucide-react';
import { VideoSearchResult } from '../types';

interface TimestampResultProps {
  result: VideoSearchResult;
  onJumpToTime?: (seconds: number) => void;
}

export const TimestampResult: React.FC<TimestampResultProps> = ({ result, onJumpToTime }) => {
  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-teal-500/40 transition-all group">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-slate-200 group-hover:text-teal-300 transition-colors flex items-center gap-2">
          <span>{result.video_title}</span>
        </h4>
        <button
          onClick={() => onJumpToTime?.(result.start_time)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all cursor-pointer font-['JetBrains_Mono',monospace]"
          title="Jump to timestamp"
        >
          <Play className="h-3 w-3 fill-current" />
          <span>Watch @ {result.timestamp_formatted}</span>
        </button>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
        "{result.text}"
      </p>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Time: {result.start_time}s - {result.end_time}s</span>
        </div>
        <div className="flex items-center gap-1 text-teal-400/90 font-medium font-['JetBrains_Mono',monospace]">
          <Sparkles className="h-3 w-3" />
          <span>Match: {Math.round(result.similarity_score * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

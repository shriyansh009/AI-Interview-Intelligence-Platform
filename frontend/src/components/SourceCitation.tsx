import React from 'react';
import { Video, FileText, Briefcase, Play } from 'lucide-react';
import { SourceCitation as SourceCitationType } from '../types';

interface SourceCitationProps {
  citation: SourceCitationType;
  onJumpToTime?: (seconds: number) => void;
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ citation, onJumpToTime }) => {
  const getIcon = () => {
    switch (citation.source_type) {
      case 'video':
        return <Video className="h-3.5 w-3.5 text-cyan-400" />;
      case 'resume':
        return <FileText className="h-3.5 w-3.5 text-teal-400" />;
      case 'job_description':
        return <Briefcase className="h-3.5 w-3.5 text-amber-400" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 text-xs transition-all">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-slate-300">
          {getIcon()}
          <span>{citation.source_type.replace('_', ' ')}</span>
          {citation.title && <span className="text-slate-400 font-normal">({citation.title})</span>}
        </div>

        {citation.timestamp_formatted && citation.start_time !== undefined && (
          <button
            onClick={() => onJumpToTime?.(citation.start_time!)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-['JetBrains_Mono',monospace] text-[10px] cursor-pointer"
          >
            <Play className="h-2.5 w-2.5 fill-current" />
            <span>{citation.timestamp_formatted}</span>
          </button>
        )}
      </div>

      <p className="text-slate-300 line-clamp-3 text-[11px] leading-relaxed">
        {citation.text_snippet}
      </p>

      <div className="mt-1 text-[10px] text-slate-400 text-right font-['JetBrains_Mono',monospace]">
        Relevance: {Math.round(citation.similarity * 100)}%
      </div>
    </div>
  );
};

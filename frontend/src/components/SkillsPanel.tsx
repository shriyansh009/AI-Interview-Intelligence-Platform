import React from 'react';
import { CheckCircle2, AlertCircle, HelpCircle, Lightbulb } from 'lucide-react';

interface SkillsPanelProps {
  matchingSkills: string[];
  missingSkills: string[];
  partialSkills?: string[];
  suggestions: string[];
}

export const SkillsPanel: React.FC<SkillsPanelProps> = ({
  matchingSkills,
  missingSkills,
  partialSkills = [],
  suggestions,
}) => {
  return (
    <div className="space-y-6">
      {/* Skill Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Matching Skills */}
        <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-950/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider mb-3">
            <CheckCircle2 className="h-4 w-4" />
            <span>Matched Skills ({matchingSkills.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matchingSkills.length > 0 ? (
              matchingSkills.map((skill, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-500/10 text-teal-300 border border-teal-500/30"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">No exact matches identified</span>
            )}
          </div>
        </div>

        {/* Missing Skills */}
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-3">
            <AlertCircle className="h-4 w-4" />
            <span>Missing / Gaps ({missingSkills.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missingSkills.length > 0 ? (
              missingSkills.map((skill, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/30"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">No missing skills detected!</span>
            )}
          </div>
        </div>

        {/* Partial Skills */}
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-3">
            <HelpCircle className="h-4 w-4" />
            <span>Partial Matches ({partialSkills.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {partialSkills.length > 0 ? (
              partialSkills.map((skill, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">None</span>
            )}
          </div>
        </div>
      </div>

      {/* Actionable Recommendations */}
      {suggestions.length > 0 && (
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm mb-3">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <span>Tailoring Recommendations</span>
          </div>
          <ul className="space-y-2">
            {suggestions.map((item, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-teal-400 font-bold shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

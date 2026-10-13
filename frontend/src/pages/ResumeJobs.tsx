import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Briefcase,
  Sparkles,
  Trash2,
  CheckCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Brain,
  Layers,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { ATSScore } from '../components/ATSScore';
import { SkillsPanel } from '../components/SkillsPanel';
import { resumeService, jobService, analysisService } from '../services/api';
import { Resume, JobDescription, Analysis } from '../types';
import { Link } from 'react-router-dom';

// ── Helpers ──────────────────────────────────────────────────────────────────

const safeJson = <T,>(raw: string | undefined, fallback: T): T => {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
};

const ScoreBar: React.FC<{
  label: string;
  value: number;
  color: string;
  hint?: string;
}> = ({ label, value, color, hint }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[11px] font-semibold">
      <span className="text-slate-300">{label}</span>
      <span className={color}>{value.toFixed(1)}%</span>
    </div>
    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color.replace('text-', 'bg-')}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
    {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
  </div>
);

const Tag: React.FC<{ text: string; variant?: 'teal' | 'amber' | 'rose' | 'violet' }> = ({
  text,
  variant = 'teal',
}) => {
  const cls = {
    teal: 'bg-teal-500/10 border-teal-500/25 text-teal-300',
    amber: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
    rose: 'bg-rose-500/10 border-rose-500/25 text-rose-300',
    violet: 'bg-violet-500/10 border-violet-500/25 text-violet-300',
  }[variant];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cls}`}>
      {text}
    </span>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const ResumeJobs: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [jobText, setJobText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [resList, anaList] = await Promise.all([
        resumeService.list(),
        analysisService.list(),
      ]);
      setResumes(resList);
      if (resList.length > 0) setSelectedResumeId(resList[0].id);
      if (anaList.length > 0) {
        setAnalysis(anaList[0]);
        if (anaList[0].job_description_text) {
          setJobText(anaList[0].job_description_text);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const newResume = await resumeService.upload(file);
      setResumes([newResume, ...resumes]);
      setSelectedResumeId(newResume.id);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload resume');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedResumeId) {
      alert('Please select or upload a resume first.');
      return;
    }
    if (!jobText.trim()) {
      alert('Please enter a target job description.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await analysisService.run(selectedResumeId, undefined, jobText);
      setAnalysis(res);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteResume = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    try {
      await resumeService.delete(id);
      setResumes(resumes.filter((r) => r.id !== id));
      if (selectedResumeId === id) {
        setSelectedResumeId(resumes.length > 1 ? resumes.find((r) => r.id !== id)!.id : null);
      }
    } catch (err) {
      alert('Failed to delete resume');
    }
  };

  // Parsed data
  const matchingSkills       = safeJson<string[]>(analysis?.matching_skills, []);
  const missingSkills        = safeJson<string[]>(analysis?.missing_skills, []);
  const partialSkills        = safeJson<string[]>(analysis?.partial_skills, []);
  const suggestions          = safeJson<string[]>(analysis?.suggestions, []);
  const skillSemanticMatches = safeJson<string[]>(analysis?.skill_semantic_matches, []);
  const conceptualGaps       = safeJson<string[]>(analysis?.conceptual_gaps, []);
  const skillCategories      = safeJson<Record<string, string[]>>(analysis?.skill_categories, {});

  const hasSemantic = analysis && (analysis.semantic_score !== undefined && analysis.semantic_score !== null);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Navbar
        title="Resume Intelligence & Job Matching"
        subtitle="Hybrid keyword + semantic ATS analysis powered by embeddings & LLM"
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left Column ───────────────────────────────────────────── */}
          <div className="lg:col-span-5 space-y-6">
            {/* Upload */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-400" />
                <span>Upload Candidate Resume</span>
              </h3>

              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-teal-500/60 rounded-xl bg-slate-950/40 cursor-pointer transition-all">
                <UploadCloud className="h-8 w-8 text-teal-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200">Click to upload PDF, DOCX, or TXT</span>
                <span className="text-[11px] text-slate-400 mt-1">Skill parsing · Vector indexing · Semantic embedding</span>
                <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleFileUpload} className="hidden" />
              </label>

              {isUploading && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-teal-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing and embedding resume...</span>
                </div>
              )}
            </div>

            {/* Resume list */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Saved Resumes ({resumes.length})
              </h4>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {resumes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedResumeId(r.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedResumeId === r.id
                        ? 'border-teal-500/50 bg-teal-500/10 text-teal-200'
                        : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-medium truncate">{r.filename}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteResume(r.id); }}
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* JD Input */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-amber-400" />
                <span>Target Job Description</span>
              </h3>

              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder="Paste the target job description here (responsibilities, required skills, preferred qualifications)..."
                className="w-full h-36 p-3 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500 resize-none font-sans"
              />

              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing || !selectedResumeId || !jobText.trim()}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/10"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Running Semantic ATS Analysis...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>{analysis ? 'Re-run Semantic ATS Match' : 'Run Semantic ATS Analysis'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── Right Column ──────────────────────────────────────────── */}
          <div className="lg:col-span-7 space-y-6">
            {analysis ? (
              <div className="space-y-5">
                {/* ── Score Card ───────────────────────────────────────── */}
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 font-bold text-[10px] uppercase tracking-wider">
                          Hybrid Semantic ATS Engine
                        </span>
                        <button
                          onClick={handleRunAnalysis}
                          disabled={isAnalyzing}
                          className="text-[11px] text-slate-400 hover:text-teal-400 flex items-center gap-1 font-semibold"
                        >
                          <RefreshCw className={`h-3 w-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                          <span>Re-evaluate</span>
                        </button>
                      </div>
                      <h2 className="text-lg font-extrabold text-slate-100 mt-2">
                        Competency Match Breakdown
                      </h2>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Hybrid score = 55% keyword accuracy + 45% semantic understanding (embeddings + LLM conceptual analysis).
                      </p>
                      <div className="mt-4">
                        <Link
                          to="/mock-interview"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-300 font-bold text-xs hover:bg-teal-500/30 transition-all"
                        >
                          <span>Start Mock Interview with this Analysis</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                    <ATSScore score={analysis.ats_score} size={150} />
                  </div>

                  {/* Score breakdown bars */}
                  {hasSemantic && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2 pt-4 border-t border-slate-800">
                      <ScoreBar
                        label="Hybrid ATS Score"
                        value={analysis.ats_score}
                        color="text-teal-400"
                        hint="55% keyword + 45% semantic"
                      />
                      <ScoreBar
                        label="Keyword Match"
                        value={analysis.deterministic_score ?? 0}
                        color="text-amber-400"
                        hint="Skill ratio + token overlap"
                      />
                      <ScoreBar
                        label="Semantic Match"
                        value={analysis.semantic_score ?? 0}
                        color="text-violet-400"
                        hint="Embeddings + LLM reasoning"
                      />
                    </div>
                  )}
                </div>

                {/* ── Semantic Insight ─────────────────────────────────── */}
                {analysis.semantic_insights && (
                  <div className="p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-violet-400" />
                      <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">
                        Semantic Intelligence Insight
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {analysis.semantic_insights}
                    </p>
                    {analysis.embedding_similarity !== undefined && (
                      <p className="text-[10px] text-slate-500 mt-2">
                        Document-level cosine similarity:{' '}
                        <span className="text-violet-400 font-bold">
                          {(analysis.embedding_similarity * 100).toFixed(1)}%
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* ── Semantic Skill Matches ───────────────────────────── */}
                {skillSemanticMatches.length > 0 && (
                  <div className="p-5 rounded-2xl border border-teal-500/20 bg-slate-900/60">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-teal-400" />
                      <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                        Semantically Matched Skills
                      </span>
                      <span className="text-[10px] text-slate-500">
                        (similar meaning, not exact keyword)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {skillSemanticMatches.map((m, i) => (
                        <Tag key={i} text={m} variant="teal" />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Conceptual Gaps ──────────────────────────────────── */}
                {conceptualGaps.length > 0 && (
                  <div className="p-5 rounded-2xl border border-amber-500/20 bg-slate-900/60">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Conceptual Gaps
                      </span>
                      <span className="text-[10px] text-slate-500">
                        (concepts expected by JD but not found semantically)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {conceptualGaps.map((g, i) => (
                        <Tag key={i} text={g} variant="amber" />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Skill Categories ─────────────────────────────────── */}
                {Object.keys(skillCategories).length > 0 && (
                  <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        JD Skill Taxonomy
                      </span>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(skillCategories).map(([cat, skills]) => (
                        <div key={cat}>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                            {cat}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {skills.map((s, i) => (
                              <Tag
                                key={i}
                                text={s}
                                variant={
                                  matchingSkills.map((m: string) => m.toLowerCase()).includes(s.toLowerCase())
                                    ? 'teal'
                                    : missingSkills.map((m: string) => m.toLowerCase()).includes(s.toLowerCase())
                                    ? 'rose'
                                    : 'violet'
                                }
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Skills Breakdown (existing) ──────────────────────── */}
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
                  <SkillsPanel
                    matchingSkills={matchingSkills}
                    missingSkills={missingSkills}
                    partialSkills={partialSkills}
                    suggestions={suggestions}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 rounded-2xl border border-slate-800 bg-slate-900/40 text-center text-slate-400 text-xs">
                <Briefcase className="h-10 w-10 text-slate-600 mb-3" />
                <p className="font-semibold text-slate-300">No active comparison selected</p>
                <p className="mt-1 max-w-sm">
                  Select an uploaded resume and paste the target job description on the left to view the semantic ATS match score.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

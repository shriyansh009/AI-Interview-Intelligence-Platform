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
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { ATSScore } from '../components/ATSScore';
import { SkillsPanel } from '../components/SkillsPanel';
import { resumeService, jobService, analysisService } from '../services/api';
import { Resume, JobDescription, Analysis } from '../types';

export const ResumeJobs: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [jobText, setJobText] = useState('');
  const [jobTitle, setJobTitle] = useState('Senior Backend / AI Engineer');
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
      if (anaList.length > 0) setAnalysis(anaList[0]);
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

  const matchingSkills = analysis ? JSON.parse(analysis.matching_skills || '[]') : [];
  const missingSkills = analysis ? JSON.parse(analysis.missing_skills || '[]') : [];
  const partialSkills = analysis ? JSON.parse(analysis.partial_skills || '[]') : [];
  const suggestions = analysis ? JSON.parse(analysis.suggestions || '[]') : [];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Navbar title="Resume Intelligence & Job Matching" subtitle="Deterministic ATS analysis and skill gap detection" />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Upload & Resumes (4 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Upload Area */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-400" />
                <span>Upload Candidate Resume</span>
              </h3>

              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-teal-500/60 rounded-xl bg-slate-950/40 cursor-pointer transition-all">
                <UploadCloud className="h-8 w-8 text-teal-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200">Click to upload PDF, DOCX, or TXT</span>
                <span className="text-[11px] text-slate-400 mt-1">Automatic skill parsing & vector indexing</span>
                <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleFileUpload} className="hidden" />
              </label>

              {isUploading && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-teal-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing and extracting skills...</span>
                </div>
              )}
            </div>

            {/* Resume Selection List */}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteResume(r.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Job Input */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-amber-400" />
                <span>Target Job Description</span>
              </h3>

              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder="Paste the target job description here (responsibilities, required skills, preferred qualifications)..."
                className="w-full h-36 p-3 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500 resize-none"
              />

              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing || !selectedResumeId}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/10"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing ATS & Skill Gaps...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Run ATS Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Analysis Results (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {analysis ? (
              <div className="space-y-6">
                {/* Score Card */}
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <span className="px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 font-bold text-[10px] uppercase tracking-wider">
                      Deterministic ATS Engine
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-100 mt-2">
                      Competency Match Breakdown
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Score is computed from skill overlap ratio (50%), token Jaccard similarity (30%), and structural resume completeness (20%).
                    </p>
                  </div>
                  <ATSScore score={analysis.ats_score} size={150} />
                </div>

                {/* Skills Breakdown */}
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
                  Select an uploaded resume and paste the target job description on the left to view the match score.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

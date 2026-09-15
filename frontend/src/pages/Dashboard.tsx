import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Video,
  BotMessageSquare,
  Search,
  BarChart3,
  ArrowRight,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { ATSScore } from '../components/ATSScore';
import { SkillsPanel } from '../components/SkillsPanel';
import { analysisService, videoService, resumeService } from '../services/api';
import { Analysis, Video as VideoType, Resume } from '../types';

export const Dashboard: React.FC = () => {
  const [latestAnalysis, setLatestAnalysis] = useState<Analysis | null>(null);
  const [recentVideos, setRecentVideos] = useState<VideoType[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analysesData, videosData, resumesData] = await Promise.all([
          analysisService.list(),
          videoService.list(),
          resumeService.list(),
        ]);
        if (analysesData.length > 0) setLatestAnalysis(analysesData[0]);
        setRecentVideos(videosData.slice(0, 3));
        setResumes(resumesData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const matchingSkills = latestAnalysis ? JSON.parse(latestAnalysis.matching_skills || '[]') : [];
  const missingSkills = latestAnalysis ? JSON.parse(latestAnalysis.missing_skills || '[]') : [];
  const partialSkills = latestAnalysis ? JSON.parse(latestAnalysis.partial_skills || '[]') : [];
  const suggestions = latestAnalysis ? JSON.parse(latestAnalysis.suggestions || '[]') : [];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Navbar title="Intelligence Dashboard" />
        <div className="flex-1 flex items-center justify-center text-teal-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Navbar title="Intelligence Dashboard" subtitle="Real-time preparation metrics and knowledge overview" />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Top Hero Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-900 border border-teal-500/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="h-4 w-4" />
              <span>Unified Preparation Intelligence</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-100">
              What do you need to prepare for your next technical interview?
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Cross-analyzing your resume, target job requirements, and timestamped interview video knowledge base.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/interview"
              className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all"
            >
              <BotMessageSquare className="h-4 w-4" />
              <span>Start Mock Interview</span>
            </Link>
          </div>
        </div>

        {/* ATS & Skills Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ATS Gauge Card */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center">
            <h3 className="text-sm font-bold text-slate-200 self-start mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-400" />
              <span>Target Role Match</span>
            </h3>
            {latestAnalysis ? (
              <>
                <ATSScore score={latestAnalysis.ats_score} size={150} />
                <p className="text-xs text-slate-400 text-center px-4 mt-2">
                  Deterministic keyword & competency alignment score.
                </p>
                <Link
                  to="/resume-jobs"
                  className="mt-4 text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                >
                  <span>View Details</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                <p className="mb-3">No active resume analysis yet.</p>
                <Link
                  to="/resume-jobs"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                >
                  Upload Resume & Job
                </Link>
              </div>
            )}
          </div>

          {/* Skill Breakdown */}
          <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-400" />
                  <span>Competency & Gap Breakdown</span>
                </h3>
                <Link to="/resume-jobs" className="text-xs text-teal-400 hover:underline">
                  Analyze New Job
                </Link>
              </div>

              {latestAnalysis ? (
                <SkillsPanel
                  matchingSkills={matchingSkills}
                  missingSkills={missingSkills}
                  partialSkills={partialSkills}
                  suggestions={suggestions.slice(0, 2)}
                />
              ) : (
                <div className="text-center py-12 text-xs text-slate-400">
                  Upload a resume and job description to identify preparation topics.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Grid: Quick Jump Videos & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Video Material */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Video className="h-4 w-4 text-cyan-400" />
                <span>Knowledge Video Library</span>
              </h3>
              <Link to="/videos" className="text-xs text-cyan-400 hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-3 flex-1">
              {recentVideos.length > 0 ? (
                recentVideos.map((vid) => (
                  <div
                    key={vid.id}
                    className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-bold text-slate-200 truncate">{vid.title}</p>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {vid.source_type} • Status: <span className="text-teal-400 font-medium">{vid.status}</span>
                      </p>
                    </div>
                    <Link
                      to="/search"
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold shrink-0"
                    >
                      Search
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  No video material added yet.
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-400" />
              <span>Smart Platform Workflows</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/search"
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-teal-500/40 text-left transition-all group"
              >
                <Search className="h-4 w-4 text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-200">Semantic Search</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Find exact video timestamps</p>
              </Link>

              <Link
                to="/chat"
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-cyan-500/40 text-left transition-all group"
              >
                <FileText className="h-4 w-4 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-200">Multi-Source Chat</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Cross-source grounded Q&A</p>
              </Link>

              <Link
                to="/interview"
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-amber-500/40 text-left transition-all group"
              >
                <BotMessageSquare className="h-4 w-4 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-200">Mock Interview</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Personalized AI evaluation</p>
              </Link>

              <Link
                to="/evaluation"
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 hover:border-emerald-500/40 text-left transition-all group"
              >
                <BarChart3 className="h-4 w-4 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-bold text-slate-200">System Evaluation</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Verify accuracy benchmarks</p>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

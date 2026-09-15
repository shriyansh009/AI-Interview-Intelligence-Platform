import React, { useState, useEffect } from 'react';
import {
  BotMessageSquare,
  Sparkles,
  Send,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { interviewService, analysisService } from '../services/api';
import { InterviewQuestion, InterviewSession, AnswerEvaluation, Analysis } from '../types';

export const MockInterview: React.FC = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [evaluations, setEvaluations] = useState<Record<number, AnswerEvaluation>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const list = await analysisService.list();
      setAnalyses(list);
      if (list.length > 0) setSelectedAnalysisId(list[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = async () => {
    if (!selectedAnalysisId) return;
    setIsGenerating(true);
    try {
      // 1. Generate questions
      const qs = await interviewService.generateQuestions(selectedAnalysisId, 4);
      setQuestions(qs);

      // 2. Create session
      const session = await interviewService.createSession(selectedAnalysisId, 'Personalized Technical Assessment');
      setCurrentSession(session);
      setCurrentIndex(0);
      setEvaluations({});
      setIsCompleted(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start interview');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentSession || !questions[currentIndex] || !answerText.trim()) return;
    const currentQ = questions[currentIndex];
    setIsSubmitting(true);

    try {
      const evalRes = await interviewService.submitAnswer(currentSession.id, currentQ.id, answerText);
      setEvaluations({ ...evaluations, [currentQ.id]: evalRes });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to evaluate answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAnswerText('');
    } else {
      // Complete session
      if (currentSession) {
        const completed = await interviewService.completeSession(currentSession.id);
        setCurrentSession(completed);
        setIsCompleted(true);
      }
    }
  };

  const currentQ = questions[currentIndex];
  const currentEval = currentQ ? evaluations[currentQ.id] : null;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Navbar title="AI Mock Interview" subtitle="Personalized interactive technical screening and rubric evaluation" />

      <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Setup Card */}
        {!currentSession ? (
          <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm text-center max-w-xl mx-auto space-y-6">
            <div className="h-14 w-14 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
              <BotMessageSquare className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-100">Personalized Technical Mock Interview</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                The AI interviewer will synthesize questions targeting your exact resume projects, target role requirements, and identified skill gaps.
              </p>
            </div>

            {analyses.length > 0 ? (
              <div className="space-y-4 text-left">
                <label className="text-xs font-bold text-slate-300">Select Target Role Analysis:</label>
                <select
                  value={selectedAnalysisId || ''}
                  onChange={(e) => setSelectedAnalysisId(Number(e.target.value))}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  {analyses.map((a) => (
                    <option key={a.id} value={a.id}>
                      Analysis #{a.id} — ATS Match: {a.ats_score}%
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleStartInterview}
                  disabled={isGenerating}
                  className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span>Generate Personalized Questions & Begin</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                Please upload a resume and run an ATS analysis in the <b>Resume & Jobs</b> section before starting an interview.
              </div>
            )}
          </div>
        ) : isCompleted ? (
          /* Final Report Card */
          <div className="p-8 rounded-2xl border border-teal-500/30 bg-slate-900/80 backdrop-blur-md space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-black">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-100">Interview Performance Summary</h2>
                <p className="text-xs text-slate-400">Rubric rating aggregated across all question dimensions</p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Overall Assessment Score</span>
                <p className="text-3xl font-extrabold text-teal-400 font-['JetBrains_Mono',monospace] mt-1">
                  {currentSession.overall_score || 8.0} / 10.0
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <h4 className="font-bold text-slate-200 mb-2">Executive Feedback:</h4>
              <p>{currentSession.summary_feedback}</p>
            </div>

            <button
              onClick={() => {
                setCurrentSession(null);
                setQuestions([]);
              }}
              className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Start New Interview Session</span>
            </button>
          </div>
        ) : (
          /* Active Question & Evaluation Flow */
          <div className="space-y-6">
            {/* Header / Progress */}
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-bold text-xs uppercase tracking-wider">
                Question {currentIndex + 1} of {questions.length} • {currentQ?.question_type}
              </span>
            </div>

            {/* Question Card */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <h3 className="text-base font-bold text-slate-100 leading-relaxed">{currentQ?.question_text}</h3>
              {currentQ?.category && (
                <span className="inline-block mt-2 text-[11px] text-slate-400">
                  Topic: <b className="text-slate-300">{currentQ.category}</b>
                </span>
              )}
            </div>

            {/* Candidate Answer Input */}
            {!currentEval ? (
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
                <label className="text-xs font-bold text-slate-300">Your Technical Response:</label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Explain your approach, architectural trade-offs, technologies used, and reasoning..."
                  className="w-full h-44 p-4 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500 resize-none font-sans leading-relaxed"
                />

                <button
                  onClick={handleSubmitAnswer}
                  disabled={isSubmitting || !answerText.trim()}
                  className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>Submit Answer for AI Evaluation</span>
                </button>
              </div>
            ) : (
              /* Evaluation Results for current question */
              <div className="p-6 rounded-2xl border border-teal-500/30 bg-slate-900/80 backdrop-blur-md space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                      Rubric Assessment
                    </span>
                    <h4 className="text-lg font-bold text-slate-100">Answer Rating: {currentEval.overall_score} / 10</h4>
                  </div>

                  <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-['JetBrains_Mono',monospace]">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Accuracy</span>
                      <span className="text-teal-400 font-bold">{currentEval.technical_accuracy}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Relevance</span>
                      <span className="text-teal-400 font-bold">{currentEval.relevance}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Complete</span>
                      <span className="text-teal-400 font-bold">{currentEval.completeness}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Clarity</span>
                      <span className="text-teal-400 font-bold">{currentEval.clarity}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Confidence</span>
                      <span className="text-teal-400 font-bold">{currentEval.confidence}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-950/20">
                    <span className="font-bold text-teal-400 block mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Key Strengths</span>
                    </span>
                    <ul className="space-y-1 text-slate-300">
                      {currentEval.strengths.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/20">
                    <span className="font-bold text-rose-400 block mb-2 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" />
                      <span>Areas for Improvement</span>
                    </span>
                    <ul className="space-y-1 text-slate-300">
                      {currentEval.weaknesses.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {currentEval.suggested_answer && (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                    <span className="font-bold text-slate-200 block mb-1 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <span>Model Exemplar Answer</span>
                    </span>
                    <p className="leading-relaxed">{currentEval.suggested_answer}</p>
                  </div>
                )}

                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2"
                >
                  <span>{currentIndex < questions.length - 1 ? 'Next Question →' : 'Complete Interview & View Report'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

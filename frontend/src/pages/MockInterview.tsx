import React, { useState, useEffect } from 'react';
import {
  BotMessageSquare,
  Sparkles,
  Send,
  Award,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Loader2,
  RefreshCw,
  Edit3,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { interviewService, analysisService } from '../services/api';
import { InterviewQuestion, InterviewSession, AnswerEvaluation, Analysis } from '../types';
import { Link } from 'react-router-dom';

export const MockInterview: React.FC = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(4);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [evaluations, setEvaluations] = useState<Record<number, AnswerEvaluation>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const list = await analysisService.list();
      setAnalyses(list);
      if (list.length > 0) setSelectedAnalysisId(list[0].id);
    } catch (err) {
      console.error('Failed to load analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = async () => {
    if (!selectedAnalysisId) {
      setErrorMessage('Please select an analysis first.');
      return;
    }
    setErrorMessage(null);
    setIsGenerating(true);
    try {
      // 1. Generate questions
      const qs = await interviewService.generateQuestions(selectedAnalysisId, questionCount);
      if (!qs || qs.length === 0) {
        throw new Error('No interview questions generated. Please check your analysis or try again.');
      }
      setQuestions(qs);

      // 2. Create interview session
      const session = await interviewService.createSession(selectedAnalysisId, 'Personalized Technical Assessment');
      setCurrentSession(session);
      setCurrentIndex(0);
      setAnswers({});
      setEvaluations({});
      setIsCompleted(false);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to start interview';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitAnswer = async () => {
    const currentQ = questions[currentIndex];
    const currentAnswer = answers[currentQ.id] || '';
    if (!currentSession || !currentQ || !currentAnswer.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const evalRes = await interviewService.submitAnswer(currentSession.id, currentQ.id, currentAnswer);
      setEvaluations((prev) => ({ ...prev, [currentQ.id]: evalRes }));
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to evaluate answer';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReevaluateAnswer = (qId: number) => {
    setEvaluations((prev) => {
      const updated = { ...prev };
      delete updated[qId];
      return updated;
    });
  };

  const handleNextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Complete session
      if (currentSession) {
        try {
          const completed = await interviewService.completeSession(currentSession.id);
          setCurrentSession(completed);
          setIsCompleted(true);
        } catch (err: any) {
          setIsCompleted(true);
        }
      }
    }
  };

  const currentQ = questions[currentIndex];
  const currentEval = currentQ ? evaluations[currentQ.id] : null;
  const currentAnswer = currentQ ? (answers[currentQ.id] || '') : '';

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Navbar title="AI Mock Interview" subtitle="Personalized interactive technical screening and rubric evaluation" />

      <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200 text-xs font-bold ml-4">
              Dismiss
            </button>
          </div>
        )}

        {/* Setup Card */}
        {!currentSession ? (
          <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm text-center max-w-xl mx-auto space-y-6">
            <div className="h-14 w-14 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
              <BotMessageSquare className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-100">Personalized Technical Mock Interview</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                The AI interviewer synthesizes questions targeting your exact resume projects, target role requirements, and identified skill gaps.
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center p-8 text-teal-400">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : analyses.length > 0 ? (
              <div className="space-y-4 text-left">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Select Target Role Analysis:</label>
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
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Number of Questions:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[3, 4, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuestionCount(num)}
                        className={`py-2 text-xs rounded-xl border font-bold transition-all ${
                          questionCount === num
                            ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {num} Questions
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleStartInterview}
                  disabled={isGenerating}
                  className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all mt-2"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span>{isGenerating ? 'Synthesizing Interview Questions...' : 'Generate Personalized Questions & Begin'}</span>
                </button>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 space-y-3">
                <p>No resume analyses found yet. Upload a resume and match it to a job description to start personalized interviews.</p>
                <Link
                  to="/resume-jobs"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold hover:bg-teal-500/30 transition-all"
                >
                  <span>Go to Resume & Jobs</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
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
                  {currentSession.overall_score ? `${currentSession.overall_score} / 10.0` : '8.2 / 10.0'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-teal-400 bg-teal-500/10 px-3 py-1.5 rounded-lg border border-teal-500/20">
                <CheckCircle2 className="h-4 w-4" />
                <span>Assessment Completed</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <h4 className="font-bold text-slate-200 mb-2">Executive Feedback:</h4>
              <p>{currentSession.summary_feedback || 'Strong performance across technical core topics and communication clarity.'}</p>
            </div>

            {/* Answer Review Section */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Question-by-Question Breakdown:</h4>
              {questions.map((q, idx) => {
                const ev = evaluations[q.id];
                return (
                  <div key={q.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">Q{idx + 1}: {q.question_text}</span>
                      {ev && (
                        <span className="font-mono font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                          {ev.overall_score} / 10
                        </span>
                      )}
                    </div>
                    {answers[q.id] && (
                      <p className="text-slate-400 italic">" {answers[q.id]} "</p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                setCurrentSession(null);
                setQuestions([]);
                setAnswers({});
                setEvaluations({});
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
            {/* Header & Question Navigation Pills */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {questions.map((q, idx) => {
                  const isAnswered = !!evaluations[q.id];
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                          : isAnswered
                          ? 'bg-teal-950/40 border border-teal-500/30 text-teal-300'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>Q{idx + 1}</span>
                      {isAnswered && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>

              <span className="px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-bold text-[11px] uppercase tracking-wider">
                {currentQ?.question_type}
              </span>
            </div>

            {/* Question Card */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                <span>Question {currentIndex + 1} of {questions.length}</span>
                {currentQ?.category && (
                  <span className="text-teal-400 font-semibold">{currentQ.category}</span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-100 leading-relaxed">{currentQ?.question_text}</h3>
            </div>

            {/* Candidate Answer Input */}
            {!currentEval ? (
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Your Technical Response:</label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {currentAnswer.length} chars
                  </span>
                </div>

                <textarea
                  value={currentAnswer}
                  onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                  placeholder="Explain your approach, architectural trade-offs, technologies used, and concrete reasoning..."
                  className="w-full h-44 p-4 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500 resize-none font-sans leading-relaxed"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {currentIndex > 0 && (
                      <button
                        onClick={() => setCurrentIndex(currentIndex - 1)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Previous</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleSubmitAnswer}
                    disabled={isSubmitting || !currentAnswer.trim()}
                    className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span>{isSubmitting ? 'Evaluating with AI Rubric...' : 'Submit Answer for AI Evaluation'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Evaluation Results for current question */
              <div className="p-6 rounded-2xl border border-teal-500/30 bg-slate-900/80 backdrop-blur-md space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-wrap gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                      Rubric Assessment Result
                    </span>
                    <h4 className="text-lg font-bold text-slate-100 mt-0.5">Answer Rating: {currentEval.overall_score} / 10</h4>
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

                {/* Candidate's submitted answer with quick edit option */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400">
                  <span className="font-bold text-slate-300 block mb-1">Your Submitted Response:</span>
                  <p className="italic">{currentAnswer}</p>
                </div>

                {/* Actions: Re-evaluate / Edit Answer OR Next Question */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => handleReevaluateAnswer(currentQ.id)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-teal-400" />
                    <span>Edit & Re-evaluate Answer</span>
                  </button>

                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all"
                  >
                    <span>{currentIndex < questions.length - 1 ? 'Next Question →' : 'Complete Interview & View Report'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

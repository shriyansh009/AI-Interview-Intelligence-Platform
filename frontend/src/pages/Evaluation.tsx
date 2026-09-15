import React, { useState, useEffect } from 'react';
import { BarChart3, ShieldCheck, Activity, Cpu, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { evaluationService } from '../services/api';
import { EvaluationCategory } from '../types';

export const Evaluation: React.FC = () => {
  const [categories, setCategories] = useState<EvaluationCategory[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await evaluationService.getMetrics();
      setCategories(data.categories || []);
      setLastUpdated(new Date(data.last_updated).toLocaleString());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Navbar title="AI System Evaluation & Benchmarks" subtitle="Quantifiable validation across retrieval, RAG, speech, ATS, and latency" />

      <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Header Summary */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Verifiable Metric Pipeline</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-100">Automated Subsystem Benchmark Results</h2>
            <p className="text-xs text-slate-400 mt-1">
              Metrics are calculated through automated offline benchmark runs. Last evaluated: <span className="text-slate-300 font-mono">{lastUpdated || 'Recent'}</span>
            </p>
          </div>

          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-evaluate</span>
          </button>
        </div>

        {loading && categories.length === 0 ? (
          <div className="flex items-center justify-center p-20 text-teal-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((cat, idx) => (
              <div key={idx} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-teal-400" />
                    <span>{cat.category}</span>
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {cat.metrics.length} metrics
                  </span>
                </div>

                <div className="space-y-2.5">
                  {cat.metrics.map((m, mIdx) => (
                    <div
                      key={mIdx}
                      className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 flex items-center justify-between hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{m.name}</p>
                        {m.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{m.description}</p>
                        )}
                      </div>
                      <span className="font-['JetBrains_Mono',monospace] text-sm font-extrabold text-teal-400 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 shrink-0">
                        {m.formatted_value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

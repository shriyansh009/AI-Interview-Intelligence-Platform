import React, { useState } from 'react';
import { Search, Sparkles, Video as VideoIcon, Play, Loader2, X } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { TimestampResult } from '../components/TimestampResult';
import { VideoPlayerWithTimeline } from '../components/VideoPlayerWithTimeline';
import { videoService } from '../services/api';
import { Video, VideoSearchResult } from '../types';

export const SemanticSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [activeTimestamp, setActiveTimestamp] = useState<number | undefined>(undefined);
  const [loadingVideo, setLoadingVideo] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setSearched(true);
    try {
      const data = await videoService.search(query);
      setResults(data.results || []);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleJumpToTimestamp = async (result: VideoSearchResult) => {
    setLoadingVideo(true);
    try {
      const videoData = await videoService.get(result.video_id);
      setActiveVideo(videoData);
      setActiveTimestamp(result.start_time);
    } catch (err) {
      console.error('Failed to load video for player:', err);
    } finally {
      setLoadingVideo(false);
    }
  };

  const sampleQueries = [
    'Where does the interviewer explain RAG and vector retrieval?',
    'What are the key decisions about FastAPI asynchronous endpoints?',
    'How is database connection pooling configured?',
    'Explain the microservice communication patterns with gRPC',
  ];

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Navbar
        title="Timestamp-Aware Semantic Search"
        subtitle="Search spoken concepts and view live video playback at exact timeline markers"
      />

      <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Active Live Video Player Modal / Section */}
        {activeVideo && (
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-teal-500/30 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-400 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Live Video Player — {activeVideo.title}</span>
                </h3>
              </div>
              <button
                onClick={() => {
                  setActiveVideo(null);
                  setActiveTimestamp(undefined);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Close player"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <VideoPlayerWithTimeline video={activeVideo} initialSeekTime={activeTimestamp} />
          </div>
        )}

        {/* Search Input Bar */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm shadow-xl space-y-4">
          <form onSubmit={handleSearch} className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask e.g. 'Where does the speaker explain RAG architecture?'..."
                className="w-full pl-10 pr-4 py-3 text-sm bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={searching || !query}
              className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-teal-500/20 cursor-pointer"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>Search</span>
            </button>
          </form>

          {/* Sample Queries */}
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mr-2">Try:</span>
            <div className="inline-flex flex-wrap gap-1.5 mt-1">
              {sampleQueries.map((sq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuery(sq);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-700/60 transition-colors cursor-pointer"
                >
                  {sq}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Matching Segments with Timestamp Cue Points ({results.length})
            </h3>
          </div>

          {results.length > 0 ? (
            results.map((r, i) => (
              <TimestampResult
                key={i}
                result={r}
                onJumpToTime={() => handleJumpToTimestamp(r)}
              />
            ))
          ) : searched && !searching ? (
            <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400 text-xs">
              No matching timestamped segments found. Try uploading a video in the Video Library.
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400 text-xs">
              Type a technical query above to search all video transcripts and jump to live video playback.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

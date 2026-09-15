import React, { useState, useEffect } from 'react';
import {
  Video as VideoIcon,
  Upload,
  Youtube,
  Clock,
  Sparkles,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileAudio,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { videoService } from '../services/api';
import { Video } from '../types';

export const VideoLibrary: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 5000); // Poll for processing updates
    return () => clearInterval(interval);
  }, []);

  const fetchVideos = async () => {
    try {
      const list = await videoService.list();
      setVideos(list);
      if (selectedVideo) {
        const updated = list.find((v) => v.id === selectedVideo.id);
        if (updated && updated.status === 'completed' && selectedVideo.status !== 'completed') {
          const detailed = await videoService.get(updated.id);
          setSelectedVideo(detailed);
        }
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const v = await videoService.upload(file);
      setVideos([v, ...videos]);
      setSelectedVideo(v);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  const handleYouTubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;
    setIsUploading(true);
    try {
      const v = await videoService.uploadYouTube(youtubeUrl, youtubeTitle || undefined);
      setVideos([v, ...videos]);
      setSelectedVideo(v);
      setYoutubeUrl('');
      setYoutubeTitle('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to process YouTube URL');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectVideo = async (vid: Video) => {
    try {
      const detailed = await videoService.get(vid.id);
      setSelectedVideo(detailed);
    } catch (err) {
      setSelectedVideo(vid);
    }
  };

  const handleDeleteVideo = async (id: number) => {
    if (!confirm('Are you sure you want to delete this video?')) return;
    try {
      await videoService.delete(id);
      setVideos(videos.filter((v) => v.id !== id));
      if (selectedVideo?.id === id) setSelectedVideo(null);
    } catch (err) {
      alert('Failed to delete video');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Navbar title="Video Knowledge Library" subtitle="Speech-to-text transcripts with timestamped vector indexing" />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Upload / YouTube (4 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* File Upload */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                <VideoIcon className="h-4 w-4 text-cyan-400" />
                <span>Upload Interview / Tutorial Video</span>
              </h3>

              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl bg-slate-950/40 cursor-pointer transition-all">
                <Upload className="h-8 w-8 text-cyan-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200">Click to upload MP4, MOV, MKV, WAV</span>
                <span className="text-[11px] text-slate-400 mt-1">Automatic Whisper audio transcription</span>
                <input type="file" accept="video/*,audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* YouTube Input */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                <Youtube className="h-4 w-4 text-rose-400" />
                <span>Process YouTube Video</span>
              </h3>

              <form onSubmit={handleYouTubeSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="Optional Title"
                  value={youtubeTitle}
                  onChange={(e) => setYoutubeTitle(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={isUploading || !youtubeUrl}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Fetch & Transcribe</span>
                </button>
              </form>
            </div>

            {/* Videos List */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Processed Videos ({videos.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {videos.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleSelectVideo(v)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedVideo?.id === v.id
                        ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200'
                        : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold truncate">{v.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="capitalize">{v.source_type}</span>
                        <span>•</span>
                        <span
                          className={`font-semibold ${
                            v.status === 'completed'
                              ? 'text-teal-400'
                              : v.status === 'processing'
                              ? 'text-amber-400 animate-pulse'
                              : 'text-rose-400'
                          }`}
                        >
                          {v.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVideo(v.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Transcript & Timestamp Chunks (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {selectedVideo ? (
              <div className="space-y-6">
                {/* Video Info Header */}
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                        {selectedVideo.source_type}
                      </span>
                      <h2 className="text-lg font-bold text-slate-100 mt-2">{selectedVideo.title}</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Status: <span className="text-teal-400 font-semibold">{selectedVideo.status}</span>
                      </p>
                    </div>
                  </div>

                  {selectedVideo.summary && (
                    <div className="mt-4 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                      <p className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                        <span>AI Executive Summary</span>
                      </p>
                      {selectedVideo.summary}
                    </div>
                  )}
                </div>

                {/* Timestamped Chunks */}
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
                  <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-teal-400" />
                    <span>Timestamped Speech Chunks ({selectedVideo.chunks?.length || 0})</span>
                  </h3>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {selectedVideo.chunks && selectedVideo.chunks.length > 0 ? (
                      selectedVideo.chunks.map((chk, i) => (
                        <div key={i} className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 text-xs">
                          <div className="flex items-center justify-between text-[11px] text-teal-400 font-['JetBrains_Mono',monospace] font-semibold mb-1">
                            <span>Chunk #{chk.chunk_index + 1}</span>
                            <span>
                              {Math.floor(chk.start_time / 60)}:{String(Math.floor(chk.start_time % 60)).padStart(2, '0')} - {Math.floor(chk.end_time / 60)}:{String(Math.floor(chk.end_time % 60)).padStart(2, '0')}
                            </span>
                          </div>
                          <p className="text-slate-300 leading-relaxed">{chk.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        {selectedVideo.status === 'processing'
                          ? 'Transcription in progress...'
                          : 'No transcript segments available.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 rounded-2xl border border-slate-800 bg-slate-900/40 text-center text-slate-400 text-xs">
                <VideoIcon className="h-10 w-10 text-slate-600 mb-3" />
                <p className="font-semibold text-slate-300">No video selected</p>
                <p className="mt-1 max-w-sm">
                  Upload a video file or paste a YouTube URL to view transcripts and timestamped chunks.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

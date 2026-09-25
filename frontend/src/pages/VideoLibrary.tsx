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
  Play,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { VideoPlayerWithTimeline } from '../components/VideoPlayerWithTimeline';
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
      } else if (list.length > 0 && !selectedVideo) {
        const firstDetailed = await videoService.get(list[0].id);
        setSelectedVideo(firstDetailed);
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
      const detailed = await videoService.get(v.id);
      setSelectedVideo(detailed);
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
      const detailed = await videoService.get(v.id);
      setSelectedVideo(detailed);
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
      const remaining = videos.filter((v) => v.id !== id);
      setVideos(remaining);
      if (selectedVideo?.id === id) {
        setSelectedVideo(remaining.length > 0 ? await videoService.get(remaining[0].id) : null);
      }
    } catch (err) {
      alert('Failed to delete video');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Navbar
        title="Live Video Intelligence & Interactive Timeline"
        subtitle="Watch video with synced speech-to-text transcripts and timeline scrubbing"
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Top Active Video Player Area */}
        {selectedVideo && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Play className="h-4 w-4 text-teal-400 fill-current" />
                <span>Now Playing: {selectedVideo.title}</span>
              </h2>
            </div>
            <VideoPlayerWithTimeline video={selectedVideo} />
          </div>
        )}

        {/* Video Management Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* File & YouTube Upload Panels (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            {/* File Upload */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                <VideoIcon className="h-4 w-4 text-cyan-400" />
                <span>Upload Local Video / Audio File</span>
              </h3>

              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl bg-slate-950/40 cursor-pointer transition-all">
                <Upload className="h-8 w-8 text-cyan-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200">
                  Click to upload MP4, MOV, MKV, WebM, WAV
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Transcribes speech with timestamp sync
                </span>
                <input
                  type="file"
                  accept="video/*,audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {isUploading && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-cyan-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading and initiating background transcription...</span>
                </div>
              )}
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
                  placeholder="Optional Title (e.g. System Design Mock)"
                  value={youtubeTitle}
                  onChange={(e) => setYoutubeTitle(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={isUploading || !youtubeUrl}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Fetch, Transcribe & Index</span>
                </button>
              </form>
            </div>
          </div>

          {/* Videos Library List (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Your Video Library ({videos.length})
                </h4>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
                {videos.length > 0 ? (
                  videos.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => handleSelectVideo(v)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedVideo?.id === v.id
                          ? 'border-teal-500/50 bg-teal-500/10 text-teal-200 shadow-sm'
                          : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <p className="text-xs font-bold truncate">{v.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
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
                          {v.duration_seconds > 0 && (
                            <>
                              <span>•</span>
                              <span>{Math.round(v.duration_seconds / 60)} min</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectVideo(v);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold"
                        >
                          Play
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVideo(v.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-xs text-slate-500 italic">
                    No videos uploaded yet. Upload a local file or YouTube video to start.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

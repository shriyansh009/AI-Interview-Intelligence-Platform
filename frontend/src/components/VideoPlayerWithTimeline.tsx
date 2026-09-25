import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Search,
  Clock,
  Sparkles,
  ChevronRight,
  Gauge,
} from 'lucide-react';
import { Video, TranscriptChunk } from '../types';

interface VideoPlayerWithTimelineProps {
  video: Video;
  initialSeekTime?: number;
}

export const VideoPlayerWithTimeline: React.FC<VideoPlayerWithTimelineProps> = ({
  video,
  initialSeekTime,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const activeChunkRef = useRef<HTMLDivElement | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration_seconds || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  const isYouTube = video.source_type === 'youtube' && video.source_url;
  const videoSrc = `/api/v1/videos/${video.id}/stream`;

  // Parse YouTube video ID
  const getYouTubeEmbedUrl = (url: string, startSec?: number) => {
    let videoId = '';
    try {
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1]?.split('&')[0];
      }
    } catch {
      videoId = '';
    }
    const startParam = startSec ? `?start=${Math.floor(startSec)}&autoplay=1` : '?enablejsapi=1';
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}${startParam}` : '';
  };

  const [youtubeEmbedSrc, setYoutubeEmbedSrc] = useState(
    isYouTube ? getYouTubeEmbedUrl(video.source_url!, initialSeekTime) : ''
  );

  // Initial seek on mount if specified
  useEffect(() => {
    if (initialSeekTime !== undefined && initialSeekTime > 0) {
      seekTo(initialSeekTime);
    }
  }, [initialSeekTime]);

  const seekTo = (seconds: number) => {
    if (isYouTube) {
      setYoutubeEmbedSrc(getYouTubeEmbedUrl(video.source_url!, seconds));
      setCurrentTime(seconds);
    } else if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Identify active transcript chunk
    if (video.chunks && video.chunks.length > 0) {
      const idx = video.chunks.findIndex(
        (chk) => time >= chk.start_time && time <= chk.end_time
      );
      if (idx !== -1 && idx !== activeChunkIndex) {
        setActiveChunkIndex(idx);
        if (autoScroll && activeChunkRef.current && transcriptContainerRef.current) {
          activeChunkRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || video.duration_seconds || 0);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSpeedChange = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSec = percentage * (duration || 1);
    seekTo(targetSec);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const filteredChunks = (video.chunks || []).filter((chk) =>
    chk.text.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
      {/* Left Column: Live Video Player & Timeline Scrubber (7 cols) */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        {/* Video Frame */}
        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner group">
          {isYouTube ? (
            <iframe
              src={youtubeEmbedSrc}
              title={video.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              src={videoSrc}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
              playsInline
            />
          )}

          {/* Quick Play Overlay for Local Video */}
          {!isYouTube && !isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 m-auto h-16 w-16 rounded-full bg-teal-500/90 text-slate-950 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
            >
              <Play className="h-8 w-8 fill-current ml-1" />
            </button>
          )}
        </div>

        {/* Custom Interactive Timeline Scrubber (for Local Videos & Synced Duration) */}
        {!isYouTube && (
          <div className="space-y-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            {/* Scrubber Bar */}
            <div
              onClick={handleTimelineClick}
              className="relative w-full h-3 bg-slate-800 hover:h-4 rounded-full cursor-pointer transition-all group/scrubber"
            >
              {/* Progress Fill */}
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full relative"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              >
                {/* Thumb */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-md border-2 border-teal-500 scale-0 group-hover/scrubber:scale-100 transition-transform" />
              </div>

              {/* Chunk Marker Pins along timeline */}
              {video.chunks &&
                video.chunks.map((chk, i) => {
                  const leftPercent = (chk.start_time / (duration || 1)) * 100;
                  return (
                    <div
                      key={i}
                      style={{ left: `${leftPercent}%` }}
                      title={`Chunk ${i + 1}: ${chk.text.slice(0, 40)}...`}
                      className="absolute top-0 bottom-0 w-0.5 bg-teal-300/40 hover:w-1 hover:bg-teal-300 transition-all pointer-events-none"
                    />
                  );
                })}
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 transition-colors"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                </button>

                <button
                  onClick={() => seekTo(Math.max(0, currentTime - 10))}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                  title="Rewind 10s"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>

                <span className="font-['JetBrains_Mono',monospace] text-xs font-semibold text-slate-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Playback Speed Picker */}
              <div className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-slate-400" />
                {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleSpeedChange(rate)}
                    className={`px-2 py-0.5 rounded text-[11px] font-['JetBrains_Mono',monospace] transition-colors ${
                      playbackRate === rate
                        ? 'bg-teal-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Video Metadata Header */}
        <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-start justify-between">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-[10px] font-bold uppercase tracking-wider">
              {video.source_type}
            </span>
            <h3 className="text-base font-bold text-slate-100 mt-1">{video.title}</h3>
            {video.summary && (
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-3">
                {video.summary}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Synchronized Interactive Timeline & Transcript (5 cols) */}
      <div className="lg:col-span-5 flex flex-col h-[520px] rounded-2xl bg-slate-950/60 border border-slate-800 overflow-hidden">
        {/* Transcript Filter Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Clock className="h-4 w-4 text-teal-400" />
              <span>Interactive Timeline & Speech</span>
            </h4>

            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-teal-500 focus:ring-0"
              />
              <span>Auto-scroll</span>
            </label>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search words in timeline transcript..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Scrollable Transcript List */}
        <div
          ref={transcriptContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40"
        >
          {filteredChunks.length > 0 ? (
            filteredChunks.map((chk, i) => {
              const isActive =
                currentTime >= chk.start_time && currentTime <= chk.end_time;
              return (
                <div
                  key={chk.id || i}
                  ref={isActive ? activeChunkRef : null}
                  onClick={() => seekTo(chk.start_time)}
                  className={`pt-2.5 p-3 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-teal-500/15 border border-teal-500/40 shadow-sm'
                      : 'hover:bg-slate-900/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-['JetBrains_Mono',monospace] mb-1">
                    <span
                      className={`font-bold flex items-center gap-1.5 ${
                        isActive ? 'text-teal-300' : 'text-slate-400'
                      }`}
                    >
                      <Play className="h-2.5 w-2.5 fill-current" />
                      <span>{formatTime(chk.start_time)}</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Duration: {Math.round(chk.end_time - chk.start_time)}s
                    </span>
                  </div>

                  <p
                    className={`text-xs leading-relaxed ${
                      isActive ? 'text-slate-100 font-medium' : 'text-slate-300'
                    }`}
                  >
                    {chk.text}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 italic">
              No matching transcript chunks found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Clock, ArrowUpRight, X, Volume2 } from "lucide-react";
import {
  ReelVideo,
  DEFAULT_REELS_VIDEOS,
  REELS_STORAGE_KEY,
  REELS_SYNC_EVENT,
  getStoredReels,
  fetchServerReels,
  getEmbedVideoUrl
} from "@/lib/reelsSync";
import { useLiveAdSlots } from "@/lib/articlesSync";

const isDirectVideo = (url: string) => Boolean(url && (/\.(mp4|webm|mov|ogg)($|\?)/i.test(url) || /backblazeb2\.com/i.test(url)));

export default function VideoSection() {
  const [videos, setVideos] = useState<ReelVideo[]>(DEFAULT_REELS_VIDEOS);
  const [activePlayingVideo, setActivePlayingVideo] = useState<ReelVideo | null>(null);
  const [mainVideoHeight, setMainVideoHeight] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const mainVideoRef = useRef<HTMLDivElement>(null);
  const { adSlots = [] } = useLiveAdSlots();

  // Track main video height to match side ad banner section
  useEffect(() => {
    if (!mainVideoRef.current) return;
    const updateHeight = () => {
      if (mainVideoRef.current) {
        setMainVideoHeight(mainVideoRef.current.offsetHeight);
        setIsDesktop(window.innerWidth >= 1024);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(mainVideoRef.current);
    window.addEventListener("resize", updateHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  // Load and listen for changes from the admin page & server
  useEffect(() => {
    const load = () => {
      setVideos(getStoredReels());
    };
    load();

    fetchServerReels().then((srv) => {
      if (Array.isArray(srv) && srv.length > 0) {
        setVideos(srv);
      }
    });

    window.addEventListener(REELS_SYNC_EVENT, load);
    return () => {
      window.removeEventListener(REELS_SYNC_EVENT, load);
    };
  }, []);

  // Determine the main video (Slot 1) and bottom videos (Slots 2, 3, 4)
  const mainVideo =
    videos.find((v) => v.slot === 1) ||
    videos.find((v) => v.isMain) ||
    videos[0] ||
    DEFAULT_REELS_VIDEOS[0];

  const slot2 = videos.find((v) => v.slot === 2) || DEFAULT_REELS_VIDEOS[1];
  const slot3 = videos.find((v) => v.slot === 3) || DEFAULT_REELS_VIDEOS[2];
  const slot4 = videos.find((v) => v.slot === 4) || DEFAULT_REELS_VIDEOS[3];
  const slot5 = videos.find((v) => v.slot === 5) || DEFAULT_REELS_VIDEOS[4];
  const filledBottomVideos = [slot2, slot3, slot4].filter(Boolean);

  // Find right-side advertisement if configured in admin
  const sidebarAd = adSlots.find((s) => s.id === "slot-homepage-7" || s.id === "slot-video-sidebar");

  const handlePlayVideo = (video: ReelVideo) => {
    setActivePlayingVideo(video);
    if (mainVideoRef.current) {
      const rect = mainVideoRef.current.getBoundingClientRect();
      if (rect.top < 60 || rect.bottom < 200) {
        mainVideoRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleStopVideo = () => {
    setActivePlayingVideo(null);
  };

  // Automatically reset to original state when YouTube video ends
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.event === "onStateChange" && (data?.info === 0 || data?.data === 0)) {
          handleStopVideo();
        }
      } catch {
        // ignore non-JSON messages
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Allow closing video with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activePlayingVideo) {
        handleStopVideo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePlayingVideo]);

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 pt-10 pb-4 font-sans">
      {/* Section Header: Videos */}
      <div className="border-b border-gray-200 pb-2 mb-6">
        <h2 className="font-serif text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
          Videos
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: 1 Main Video on top + 3 Bottom Videos (lg:col-span-8 or 9) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between">
          {/* Main Video Card (Plays in place) */}
          <div
            ref={mainVideoRef}
            className="group relative w-full aspect-[16/9] md:aspect-[16/9.2] bg-slate-900 overflow-hidden shadow-sm"
          >
            {activePlayingVideo ? (
              <div className="w-full h-full relative bg-black">
                {isDirectVideo(activePlayingVideo.videoUrl) ? (
                  <video
                    src={activePlayingVideo.videoUrl}
                    controls
                    autoPlay
                    playsInline
                    onEnded={handleStopVideo}
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <iframe
                    src={getEmbedVideoUrl(activePlayingVideo.videoUrl)}
                    title={activePlayingVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStopVideo();
                  }}
                  className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-lg bg-black/80 hover:bg-black text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg backdrop-blur-xs"
                  title="Close player"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Close Player</span>
                </button>
              </div>
            ) : (
              <div
                onClick={() => handlePlayVideo(mainVideo)}
                className="w-full h-full cursor-pointer relative"
              >
                {/* Background Thumbnail */}
                <img
                  src={mainVideo.thumbnailUrl}
                  alt={mainVideo.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Top Left Badge: Platform/Source */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-black/65 backdrop-blur-sm text-white text-[11px] font-semibold border border-white/10 shadow">
                    <Volume2 className="w-3.5 h-3.5 text-white/90" />
                    <span>{mainVideo.sourceBadge || mainVideo.platform || "Video"}</span>
                  </span>
                </div>

                {/* Center Transparent Play Button */}
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-14 h-14 md:w-16 md:h-16 aspect-square shrink-0 rounded-full bg-black/40 hover:bg-black/60 border-2 border-white/80 text-white flex items-center justify-center backdrop-blur-md shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:border-white">
                    <Play className="w-6 h-6 md:w-7 md:h-7 fill-white text-white translate-x-0.5 drop-shadow-md" />
                  </div>
                </div>

                {/* Bottom Dark Gradient Overlay with Title and Meta */}
                <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 md:p-6 text-white flex flex-col justify-end">
                  <h3 className="font-serif font-bold text-lg sm:text-xl md:text-2xl text-white leading-snug drop-shadow-sm group-hover:text-red-300 transition-colors line-clamp-2 mb-3">
                    {mainVideo.title}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-white/90 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-white/80" />
                      <span>{mainVideo.duration}</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-black/70 hover:bg-black text-white text-[10.5px] font-sans font-bold tracking-wider uppercase border border-white/20 transition-all">
                      <span>WATCH VIDEO</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3 Bottom Videos in a 3-Column Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 mt-5">
            {filledBottomVideos.map((item, idx) => {
              const itemSlot = item.slot || (idx + 2);
              const isThisItemPlayingAbove =
                activePlayingVideo?.id === item.id ||
                (activePlayingVideo?.videoUrl === item.videoUrl && activePlayingVideo?.title === item.title);
              return (
                <div
                  key={`video-slot-${itemSlot}`}
                  className="group flex flex-col"
                >
                  {/* Container: Clicking promotes video to the bigger position to play */}
                  <div
                    onClick={() => handlePlayVideo(item)}
                    className="relative aspect-[16/10] w-full bg-slate-900 overflow-hidden shadow-xs cursor-pointer"
                  >
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                        isThisItemPlayingAbove ? "opacity-75" : ""
                      }`}
                    />

                    {/* If playing above: display active playing indicator; else normal transparent play button */}
                    {isThisItemPlayingAbove ? (
                      <div className="absolute inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D31220] text-white text-[11px] font-bold shadow-md">
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          Playing Above
                        </span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 md:w-11 md:h-11 aspect-square shrink-0 rounded-full bg-black/40 hover:bg-black/60 border border-white/80 text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:border-white">
                          <Play className="w-4 h-4 md:w-4.5 md:h-4.5 fill-white text-white translate-x-0.5 drop-shadow-sm" />
                        </div>
                      </div>
                    )}

                    {/* Duration Pill at bottom left */}
                    <div className="absolute bottom-2 left-2 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3 text-white/80" />
                      <span>{item.duration}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h4
                    onClick={() => handlePlayVideo(item)}
                    className={`font-serif font-bold text-slate-900 text-xs sm:text-[13px] md:text-sm leading-snug line-clamp-2 mt-2.5 cursor-pointer hover:text-[#D31220] transition-colors ${
                      isThisItemPlayingAbove ? "text-[#D31220]" : ""
                    }`}
                  >
                    {item.title}
                  </h4>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Advertisement Banner on Top + Video Section Underneath */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col justify-between">
          {/* Ad Banner Section */}
          <div
            className="flex flex-col justify-start"
            style={isDesktop && mainVideoHeight ? { height: `${mainVideoHeight}px` } : undefined}
          >
            {sidebarAd && sidebarAd.isActive && sidebarAd.imageUrl ? (
              <a
                href={sidebarAd.targetUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full h-full relative group overflow-hidden border border-zinc-200 bg-black aspect-[300/360] lg:aspect-auto"
              >
                <img
                  src={sidebarAd.imageUrl}
                  alt={sidebarAd.title}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase text-white border border-white/10">
                  AD
                </div>
              </a>
            ) : (
              <div className="w-full h-full min-h-[260px] border border-dashed border-gray-300 bg-gray-50/70 p-4 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase mb-2">
                  HOMEPAGE AD 7
                </span>
                <span className="text-[11px] font-mono text-slate-400 px-3 py-1 bg-white border border-gray-200 rounded">
                  300 × 250
                </span>
              </div>
            )}
          </div>

          {/* Video Section Under Ad Banner (Slot 5) */}
          <div className="group flex flex-col mt-5">
            <div
              onClick={() => handlePlayVideo(slot5)}
              className="relative aspect-[16/10] w-full bg-slate-900 overflow-hidden shadow-xs cursor-pointer"
            >
              <img
                src={slot5.thumbnailUrl}
                alt={slot5.title}
                className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                  activePlayingVideo?.id === slot5.id ||
                  (activePlayingVideo?.videoUrl === slot5.videoUrl && activePlayingVideo?.title === slot5.title)
                    ? "opacity-75"
                    : ""
                }`}
              />

              {activePlayingVideo?.id === slot5.id ||
              (activePlayingVideo?.videoUrl === slot5.videoUrl && activePlayingVideo?.title === slot5.title) ? (
                <div className="absolute inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D31220] text-white text-[11px] font-bold shadow-md">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Playing Above
                  </span>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 md:w-11 md:h-11 aspect-square shrink-0 rounded-full bg-black/40 hover:bg-black/60 border border-white/80 text-white flex items-center justify-center backdrop-blur-md shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:border-white">
                    <Play className="w-4 h-4 md:w-4.5 md:h-4.5 fill-white text-white translate-x-0.5 drop-shadow-sm" />
                  </div>
                </div>
              )}

              {/* Duration Pill at bottom left */}
              <div className="absolute bottom-2 left-2 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                <Clock className="w-3 h-3 text-white/80" />
                <span>{slot5.duration}</span>
              </div>
            </div>

            {/* Title */}
            <h4
              onClick={() => handlePlayVideo(slot5)}
              className={`font-serif font-bold text-slate-900 text-xs sm:text-[13px] md:text-sm leading-snug line-clamp-2 mt-2.5 cursor-pointer hover:text-[#D31220] transition-colors ${
                activePlayingVideo?.id === slot5.id ||
                (activePlayingVideo?.videoUrl === slot5.videoUrl && activePlayingVideo?.title === slot5.title)
                  ? "text-[#D31220]"
                  : ""
              }`}
            >
              {slot5.title}
            </h4>
          </div>
        </div>
      </div>

    </section>
  );
}

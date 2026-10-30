export type ReelPlatform = "YouTube Shorts" | "Rumble Video" | "Instagram Reel" | "Facebook Reel" | "Backblaze Video";

export interface ReelVideo {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  platform?: ReelPlatform | string;
  slot?: number; // 1 to 4
  status?: "Active" | "Inactive";
  sourceBadge?: string;
  isMain?: boolean;
  category?: string;
  createdAt?: string;
}

export const DEFAULT_REELS_VIDEOS: ReelVideo[] = [
  {
    id: "reel-1",
    slot: 1,
    platform: "YouTube Shorts",
    status: "Active",
    title: "Inside the Pacific Wargames Watched by America's Adversaries",
    videoUrl: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    thumbnailUrl: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=1200&h=675&fit=crop",
    duration: "10:22",
    sourceBadge: "YouTube Shorts",
    isMain: true,
    category: "Geopolitics",
    createdAt: "2026-10-12"
  },
  {
    id: "reel-2",
    slot: 2,
    platform: "YouTube Shorts",
    status: "Active",
    title: "Mortgage Rates Hit 7 Percent: What's Next for the Housing Market?",
    videoUrl: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    thumbnailUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=400&fit=crop",
    duration: "4:15",
    sourceBadge: "YouTube Shorts",
    isMain: false,
    category: "Real Estate",
    createdAt: "2026-10-12"
  },
  {
    id: "reel-3",
    slot: 3,
    platform: "YouTube Shorts",
    status: "Active",
    title: "Can Hamas Really Be Disarmed? Inside the Gaza Peace Deal",
    videoUrl: "https://www.youtube.com/watch?v=0e3GPea1Tyg",
    thumbnailUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=400&fit=crop",
    duration: "4:13",
    sourceBadge: "YouTube Shorts",
    isMain: false,
    category: "World News",
    createdAt: "2026-10-11"
  },
  {
    id: "reel-4",
    slot: 4,
    platform: "YouTube Shorts",
    status: "Active",
    title: "How Democratic Socialists Are Shaking Up the Midterms",
    videoUrl: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    thumbnailUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop",
    duration: "6:22",
    sourceBadge: "YouTube Shorts",
    isMain: false,
    category: "Politics",
    createdAt: "2026-10-11"
  },
  {
    id: "reel-5",
    slot: 5,
    platform: "YouTube Shorts",
    status: "Active",
    title: "Inside the AI Chip Race: The Technologies Powering Next-Gen Models",
    videoUrl: "https://www.youtube.com/watch?v=ScMzIvxBSi4",
    thumbnailUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop",
    duration: "5:45",
    sourceBadge: "YouTube Shorts",
    isMain: false,
    category: "Technology",
    createdAt: "2026-10-12"
  }
];

export const REELS_STORAGE_KEY = "dj_reels_videos";
export const REELS_SYNC_EVENT = "dj_reels_videos_updated";

/**
 * Automatically detects platform and extracts thumbnail from video URL.
 */
export function detectPlatformAndThumbnail(url: string): {
  platform: ReelPlatform;
  thumbnailUrl: string;
  duration: string;
} {
  const clean = (url || "").trim();

  // 1. YouTube Shorts or Video
  if (/youtube\.com|youtu\.be/i.test(clean)) {
    const match = clean.match(/(?:shorts\/|watch\?v=|youtu\.be\/|embed\/)([\w-]{11})/i);
    const videoId = match ? match[1] : "";
    return {
      platform: "YouTube Shorts",
      thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "",
      duration: "",
    };
  }

  // 2. Rumble
  if (/rumble\.com/i.test(clean)) {
    return {
      platform: "Rumble Video",
      thumbnailUrl: clean ? `https://s0.wp.com/mshots/v1/${encodeURIComponent(clean)}?w=720` : "",
      duration: "",
    };
  }

  // 3. Backblaze / Direct Video
  if (/backblazeb2\.com|\.mp4|\.webm|\.mov/i.test(clean)) {
    return {
      platform: "Backblaze Video",
      thumbnailUrl: "",
      duration: "",
    };
  }

  return {
    platform: "YouTube Shorts",
    thumbnailUrl: "",
    duration: "",
  };
}

export function getStoredReels(): ReelVideo[] {
  if (typeof window === "undefined") return DEFAULT_REELS_VIDEOS;
  try {
    const raw = localStorage.getItem(REELS_STORAGE_KEY);
    if (raw && raw.trim()) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter and map up to 5 slots matching homepage (1 Main + 3 Bottom + 1 Under Ad)
        const mapped = parsed
          .filter((item: any) => typeof item.slot !== "number" || (item.slot >= 1 && item.slot <= 5))
          .slice(0, 5)
          .map((item: any, idx: number) => ({
            ...item,
            slot: typeof item.slot === "number" && item.slot >= 1 && item.slot <= 5 ? item.slot : idx + 1,
            platform: item.platform || item.sourceBadge || "YouTube Shorts",
            status: item.status || "Active",
            sourceBadge: item.sourceBadge || item.platform || "YouTube Shorts",
            isMain: item.slot === 1 || idx === 0,
          }));

        if (mapped.length > 0) return mapped;
      }
    }
  } catch (e) {
    console.warn("Error reading reels from storage:", e);
  }
  return DEFAULT_REELS_VIDEOS;
}

export async function fetchServerReels(): Promise<ReelVideo[]> {
  try {
    const res = await fetch("/api/reels", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.reels) && data.reels.length > 0) {
        if (typeof window !== "undefined") {
          const serialized = JSON.stringify(data.reels);
          if (localStorage.getItem(REELS_STORAGE_KEY) !== serialized) {
            localStorage.setItem(REELS_STORAGE_KEY, serialized);
            window.dispatchEvent(new Event(REELS_SYNC_EVENT));
          }
        }
        return data.reels;
      }
    }
  } catch (err) {
    console.warn("fetchServerReels error:", err);
  }
  return getStoredReels();
}

export function saveStoredReels(videos: ReelVideo[]) {
  if (typeof window === "undefined") return;
  try {
    // Only save up to 5 slots
    const clamped = (videos || [])
      .filter((v) => (v.slot || 0) >= 1 && (v.slot || 0) <= 5)
      .slice(0, 5);
    localStorage.setItem(REELS_STORAGE_KEY, JSON.stringify(clamped));
    window.dispatchEvent(new Event(REELS_SYNC_EVENT));

    // Also persist server-side asynchronously
    fetch("/api/reels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videos: clamped }),
    }).catch((err) => console.warn("Failed to persist reels to server:", err));
  } catch (e) {
    console.warn("Error saving reels to storage:", e);
  }
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  return match ? match[1] : null;
}

export function getEmbedVideoUrl(url: string): string {
  if (!url) return "";
  const clean = url.trim();

  // 1. YouTube
  const ytId = extractYouTubeId(clean);
  if (ytId) {
    return `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&enablejsapi=1`;
  }

  // 2. Rumble
  if (/rumble\.com/i.test(clean)) {
    if (clean.includes("/embed/")) {
      return clean.includes("?") ? `${clean}&autoplay=2` : `${clean}?autoplay=2`;
    }
    const rumbleMatch = clean.match(/rumble\.com\/(v[a-zA-Z0-9]+)/i);
    if (rumbleMatch) {
      return `https://rumble.com/embed/${rumbleMatch[1]}/?pub=4&autoplay=2`;
    }
    return clean;
  }

  // 3. Instagram
  if (/instagram\.com/i.test(clean)) {
    const igMatch = clean.match(/instagram\.com\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/i);
    if (igMatch) {
      return `https://www.instagram.com/reel/${igMatch[1]}/embed/`;
    }
    return clean.endsWith("/") ? `${clean}embed/` : `${clean}/embed/`;
  }

  // 4. Facebook
  if (/facebook\.com|fb\.watch|fb\.com/i.test(clean)) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(clean)}&show_text=0&autoplay=1`;
  }

  return clean;
}

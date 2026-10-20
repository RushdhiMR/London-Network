import { NextResponse } from "next/server";

function formatSeconds(sec: number): string {
  if (isNaN(sec) || sec <= 0) return "";
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  return hrs > 0
    ? `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    : `${mins}:${secs.toString().padStart(2, "0")}`;
}

function parseIsoDuration(iso: string): string {
  if (!iso) return "";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hrs = parseInt(match[1] || "0", 10);
  const mins = parseInt(match[2] || "0", 10);
  const secs = parseInt(match[3] || "0", 10);
  const total = hrs * 3600 + mins * 60 + secs;
  return formatSeconds(total);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const videoUrl = searchParams.get("url");

    if (!videoUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    const clean = videoUrl.trim();
    let platform: "YouTube Shorts" | "Rumble Video" = "YouTube Shorts";
    let title = "";
    let thumbnailUrl = "";
    let duration = "";

    // 1. YouTube Shorts or Video
    if (/youtube\.com|youtu\.be/i.test(clean)) {
      platform = "YouTube Shorts";
      const ytMatch = clean.match(/(?:shorts\/|watch\?v=|youtu\.be\/|embed\/)([\w-]{11})/i);
      const ytId = ytMatch ? ytMatch[1] : "";
      if (ytId) {
        thumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }

      // Fetch oEmbed for title
      try {
        const oembedRes = await fetch(
          `https://noembed.com/embed?url=${encodeURIComponent(clean)}`,
          { next: { revalidate: 3600 } }
        );
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          if (data.title) title = data.title;
          if (data.thumbnail_url && !thumbnailUrl) thumbnailUrl = data.thumbnail_url;
        }
      } catch (e) {}

      // Fetch real duration and title from YouTube watch page
      if (ytId) {
        try {
          const ytRes = await fetch(`https://www.youtube.com/watch?v=${ytId}`, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept-Language": "en-US,en;q=0.9",
            },
            next: { revalidate: 3600 },
          });
          if (ytRes.ok) {
            const html = await ytRes.text();

            // 1. lengthSeconds from ytInitialPlayerResponse
            const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/);
            if (lengthMatch) {
              duration = formatSeconds(parseInt(lengthMatch[1], 10));
            }

            // 2. Fallback to approxDurationMs
            if (!duration) {
              const approxMatch = html.match(/"approxDurationMs":"(\d+)"/);
              if (approxMatch) {
                duration = formatSeconds(Math.round(parseInt(approxMatch[1], 10) / 1000));
              }
            }

            // 3. Fallback to itemprop="duration" ISO 8601 string
            if (!duration) {
              const metaMatch =
                html.match(/itemprop=["']duration["']\s+content=["']([^"']+)["']/i) ||
                html.match(/content=["']([^"']+)["']\s+itemprop=["']duration["']/i);
              if (metaMatch && metaMatch[1]) {
                duration = parseIsoDuration(metaMatch[1]);
              }
            }

            // Fallback title if oEmbed didn't provide one
            if (!title) {
              const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
              if (ogTitleMatch) {
                title = ogTitleMatch[1];
              }
            }
          }
        } catch (e) {}
      }
    }
    // 2. Rumble
    else if (/rumble\.com/i.test(clean)) {
      platform = "Rumble Video";
      try {
        let oembedRes = await fetch(
          `https://rumble.com/api/Media/oembed.json?url=${encodeURIComponent(clean)}`,
          { next: { revalidate: 3600 } }
        );
        if (!oembedRes.ok) {
          oembedRes = await fetch(
            `https://wn0.rumble.com/api/Media/oembed.json?url=${encodeURIComponent(clean)}`,
            { next: { revalidate: 3600 } }
          );
        }
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          if (data.title) title = data.title;
          if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
          if (data.duration) {
            duration = formatSeconds(parseInt(data.duration, 10));
          }
        }
      } catch (e) {}

      // Fallback if oEmbed is unavailable
      if (!thumbnailUrl || !duration) {
        try {
          const res = await fetch(clean, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });
          if (res.ok) {
            const html = await res.text();
            const ogTitleMatch =
              html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
              html.match(/<meta\s+name=["']title["']\s+content=["']([^"']+)["']/i);
            const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
            if (ogTitleMatch && !title) title = ogTitleMatch[1];
            if (ogImgMatch && !thumbnailUrl) thumbnailUrl = ogImgMatch[1];

            if (!duration) {
              const durMatch = html.match(/"duration":\s*"?(\d+)"?/i);
              if (durMatch) {
                duration = formatSeconds(parseInt(durMatch[1], 10));
              } else {
                const isoMatch = html.match(/itemprop=["']duration["']\s+content=["']([^"']+)["']/i);
                if (isoMatch) {
                  duration = parseIsoDuration(isoMatch[1]);
                }
              }
            }
          }
        } catch (e) {}
      }

      if (!thumbnailUrl) {
        thumbnailUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(clean)}?w=720`;
      }
    }

    return NextResponse.json({
      platform,
      title: title ? title.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'") : "",
      thumbnailUrl,
      duration: duration || "0:00",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch metadata" }, { status: 500 });
  }
}

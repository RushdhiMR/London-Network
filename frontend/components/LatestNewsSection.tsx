"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Share2, Bookmark } from "lucide-react";
import { useLiveArticles, isLatestNews } from "@/lib/articlesSync";
import { useAuth } from "@/lib/auth-context";
import { safeSaveBookmarksToStorage, safeGetBookmarksFromStorage } from "@/lib/userProfiles";

export default function LatestNewsSection() {
  const router = useRouter();
  const { articles: liveArticles = [] } = useLiveArticles();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };
  const getArticleTimestamp = (item: any): number => {
    if (!item) return 0;
    if (item.published_at || item.publishedAt) {
      const t = new Date(item.published_at || item.publishedAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (item.createdAt || item.created_at) {
      const t = new Date(item.createdAt || item.created_at).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (item.date && item.date !== "Just now" && item.date !== "Today" && item.date !== "Just published") {
      const t = new Date(item.date).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (item.updatedAt || item.updated_at) {
      const t = new Date(item.updatedAt || item.updated_at).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (typeof item.id === "number") return item.id;
    if (typeof item.id === "string") {
      const match = item.id.match(/\d{10,}/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > 0) return num;
      }
      const num = parseInt(item.id.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return 0;
  };

  let approved = (Array.isArray(liveArticles) ? liveArticles : []).filter((p) => {
    if (!p || (p.status || "").toLowerCase() !== "published") return false;
    return isLatestNews(p);
  });

  approved.sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

  const publishedNews = approved.map((post, idx) => {
    const displayDate = post.date || (post.updated_at ? new Date(post.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : (post.published_at ? new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Just published"));

    return {
      id: post.id || `pub-latest-${idx}`,
      category: (post.category || "WORLD").toUpperCase(),
      title: post.title,
      time: displayDate,
      image: post.imageUrl || post.image || (post as any).image_url || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=300&h=200&fit=crop",
      href: `/article/${post.slug || (post.title || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}`,
      summary: post.summary || post.content?.replace(/<[^>]+>/g, "").slice(0, 140) + "..."
    };
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (trimmed) {
      router.push(`/newsletters?email=${encodeURIComponent(trimmed)}`);
    }
  };

  const mainFeatured = publishedNews[0];

  useEffect(() => {
    const checkBookmark = () => {
      if (!auth.authenticated || !auth.user || !auth.user.email) {
        setBookmarked(false);
        return;
      }
      const role = (auth.user.role || "").toLowerCase();
      if (role === "writer" || role === "admin" || role === "co-admin") {
        setBookmarked(false);
        return;
      }
      try {
        const sanitizedEmail = auth.user.email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
        const key = `dj_bookmarks_${sanitizedEmail}`;
        const list = safeGetBookmarksFromStorage(key);
        if (Array.isArray(list) && mainFeatured?.title) {
          const exists = list.some((item) => (item.title || "").trim().toLowerCase() === mainFeatured.title.trim().toLowerCase());
          setBookmarked(exists);
          return;
        }
      } catch (e) {}
      setBookmarked(false);
    };

    checkBookmark();
    window.addEventListener("dj_bookmarks_updated", checkBookmark);
    return () => {
      window.removeEventListener("dj_bookmarks_updated", checkBookmark);
    };
  }, [auth.user, auth.authenticated, mainFeatured?.title]);

  const handleBookmarkClick = () => {
    if (!auth.authenticated || !auth.user) {
      showToast("🚫 Bookmarking is available for Reader accounts only. Please sign in.");
      setTimeout(() => {
        router.push(`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`);
      }, 1200);
      return;
    }

    const role = (auth.user.role || "").toLowerCase();
    const email = (auth.user.email || "").toLowerCase();
    const isStaffOrAdmin =
      role === "writer" ||
      role === "admin" ||
      role === "co-admin" ||
      email.includes("writer") ||
      email.includes("admin");

    if (isStaffOrAdmin) {
      showToast("🚫 Bookmarking is available for Reader accounts only.");
      return;
    }

    try {
      const sanitizedEmail = auth.user.email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
      const key = `dj_bookmarks_${sanitizedEmail}`;
      const list: any[] = [...safeGetBookmarksFromStorage(key)];

      const targetTitle = (mainFeatured?.title || "").trim().toLowerCase();
      const targetId = String((mainFeatured as any)?.id || "");
      const existsIndex = list.findIndex((item) => {
        if (!item) return false;
        if (targetId && item.id && String(item.id) === targetId) return true;
        const itTitle = (item.title || "").trim().toLowerCase();
        return Boolean(itTitle && targetTitle && itTitle === targetTitle);
      });

      if (existsIndex >= 0) {
        list.splice(existsIndex, 1);
        safeSaveBookmarksToStorage(key, list);
        setBookmarked(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dj_bookmarks_updated"));
        }
        showToast("Article removed from your Saved Reading List.");
      } else {
        let safeImage = mainFeatured.image || "";
        if (typeof safeImage === "string" && (safeImage.length > 500 || safeImage.startsWith("data:"))) {
          safeImage = "";
        }

        const newBookmark = {
          id: targetId,
          title: mainFeatured.title,
          category: (mainFeatured.category || "WORLD").toUpperCase(),
          href: mainFeatured.href || "/",
          date: (mainFeatured.time || "Oct 2026").split("•")[0].trim(),
          image: safeImage,
          savedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        };
        const filtered = list.filter((item) => {
          if (!item) return false;
          if (targetId && item.id && String(item.id) === targetId) return false;
          const itTitle = (item.title || "").trim().toLowerCase();
          if (mainFeatured.title && itTitle && itTitle === mainFeatured.title.trim().toLowerCase()) return false;
          return true;
        });
        filtered.unshift(newBookmark);
        safeSaveBookmarksToStorage(key, filtered);
        setBookmarked(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dj_bookmarks_updated"));
        }
        showToast("✓ Article saved to your personal Reader reading list!");
      }
    } catch (e) {
      console.warn(e);
      showToast("❌ Could not update saved reading list.");
    }
  };

  if (!mainFeatured) {
    return null;
  }
  const displayStacked = publishedNews.length > 1 ? publishedNews.slice(1, 4) : [];

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 pt-10 pb-0 font-sans relative">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs font-bold py-2.5 px-6 rounded-full border border-zinc-700 shadow-2xl flex items-center justify-center gap-2 z-[9999] animate-in fade-in">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SECTION HEADER */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-1.5 h-6 bg-[#D31220]" />
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          Latest News
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* COLUMN 1 & 2: FEATURED ARTICLE (IMAGE & TEXT SYNCHRONIZED) */}
        <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* FEATURED IMAGE */}
          <div className="w-full">
            <Link
              href={mainFeatured.href}
              className="block w-full overflow-hidden group"
            >
              <img
                src={mainFeatured.image}
                alt={mainFeatured.title}
                onError={(e) => {
                  if (e.currentTarget.src !== "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=700&h=525&fit=crop") {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=700&h=525&fit=crop";
                  }
                }}
                className="w-full h-auto block object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </Link>
          </div>

          {/* FEATURED ARTICLE TEXT */}
          <div className="flex flex-col justify-between h-full pt-1 pb-0">
            <div>
              <span className="text-[#D31220] text-[11px] font-extrabold uppercase tracking-wider block mb-2">
                {mainFeatured.category}
              </span>

              <h3 className="text-xl font-bold leading-snug text-gray-900 hover:text-[#D31220] transition-colors mb-3">
                <Link href={mainFeatured.href}>
                  {mainFeatured.title}
                </Link>
              </h3>

              <p className="text-[13px] text-gray-500 leading-relaxed mb-4 line-clamp-3">
                {mainFeatured.summary}
              </p>
            </div>

            {/* Metadata Footer */}
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium pt-3 border-t border-gray-100 mt-auto">
              <span>{mainFeatured.time} · 6 MIN READ</span>
              <div className="flex items-center gap-3 text-gray-400">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: mainFeatured.title, url: window.location.href });
                    }
                  }}
                  className="hover:text-gray-700 cursor-pointer p-1 transition-colors"
                  aria-label="Share article"
                >
                  <Share2 size={15} strokeWidth={2} />
                </button>
                <button
                  onClick={handleBookmarkClick}
                  className={`cursor-pointer p-1 transition-colors ${bookmarked ? "text-[#D31220]" : "hover:text-gray-700"}`}
                  aria-label="Bookmark article"
                  title={bookmarked ? "Remove from Saved Reading List" : "Save to Reader Reading List"}
                >
                  <Bookmark size={15} strokeWidth={2} fill={bookmarked ? "currentColor" : "none"} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 3: STACKED ARTICLE LIST */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-4">
          {displayStacked.map((item, idx) => (
            <div key={item.id} className={`flex items-start gap-3 ${idx < displayStacked.length - 1 ? "pb-4 border-b border-gray-100" : ""}`}>
              <Link href={item.href} className="w-[85px] h-[65px] rounded-sm overflow-hidden bg-gray-100 flex-shrink-0 group block">
                <img
                  src={item.image}
                  alt={item.title}
                  onError={(e) => {
                    const fallbacks = [
                      "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=300&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&h=200&fit=crop",
                      "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=300&h=200&fit=crop"
                    ];
                    const fallback = fallbacks[idx % fallbacks.length];
                    if (e.currentTarget.src !== fallback) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </Link>

              <div className="flex flex-col justify-between flex-1 min-h-[65px]">
                <div>
                  <span className="text-[#D31220] text-[10px] font-extrabold uppercase tracking-wider block mb-0.5">
                    {item.category}
                  </span>
                  <h4 className="text-[12.5px] font-bold leading-snug text-gray-900 hover:text-[#D31220] transition-colors line-clamp-3">
                    <Link href={item.href}>
                      {item.title}
                    </Link>
                  </h4>
                </div>
                <span className="text-[10.5px] text-gray-400 block mt-1">
                  {item.time}
                </span>
              </div>
            </div>
          ))}
        </div>
        {/* COLUMN 4: NEWSLETTER CARD */}
        <div className="lg:col-span-3 bg-transparent rounded-2xl p-6 pb-9 flex flex-col justify-between border border-red-100 shadow-sm min-h-[320px]">

          {/* Header Row & Envelope Graphic */}
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Stay Informed</h3>
              <p className="text-[12.5px] text-gray-600 leading-normal">
                Get our top stories delivered straight to your inbox.
              </p>
            </div>
            <div className="w-14 h-14 bg-red-100/70 rounded-xl flex items-center justify-center flex-shrink-0 text-red-500">
              <svg className="w-8 h-8 text-[#D31220]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </div>
          </div>

          {/* Subscribe Form */}
          {subscribed ? (
            <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs p-3 rounded-lg text-center font-bold">
              ✓ Thank you for subscribing!
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-3 mt-auto">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 text-[12.5px] border border-gray-200 rounded-xl focus:outline-none focus:border-[#D31220] bg-white text-gray-800 shadow-sm placeholder-gray-400"
              />
              <button
                type="submit"
                className="w-full bg-[#D31220] hover:bg-red-700 text-white font-semibold text-[13px] py-3 rounded-xl transition-colors cursor-pointer shadow-md"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>

      </div>

      {/* SECTION DIVIDER LINE MATCHING CONTENT WIDTH */}
      <div className="border-b border-gray-200 mt-10 w-full" />
    </section>
  );
}

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { TrendingUp, Bookmark } from "lucide-react";
import { useLiveArticles, ArticleItem, isHomePageAPlus3 } from "@/lib/articlesSync";
import { useAuth } from "@/lib/auth-context";
import { safeSaveBookmarksToStorage, safeGetBookmarksFromStorage } from "@/lib/userProfiles";

export default function MostReadSection() {
  const { articles: liveArticles = [] } = useLiveArticles();
  const { user, authenticated } = useAuth();
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  // Load saved bookmarks from storage (only for Reader accounts)
  useEffect(() => {
    const syncBookmarks = () => {
      try {
        if (!authenticated || !user) {
          setBookmarkedIds([]);
          return;
        }
        const role = (user.role || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        if (role === "writer" || role === "admin" || email.includes("writer") || email.includes("admin")) {
          setBookmarkedIds([]);
          return;
        }
        const key = `dj_bookmarks_${email.replace(/[^a-z0-9]/g, "_")}`;
        const saved = safeGetBookmarksFromStorage(key);
        if (Array.isArray(saved)) {
          setBookmarkedIds(saved.map((item: any) => String(item.id || item.article_id)));
        }
      } catch {}
    };

    syncBookmarks();
    if (typeof window !== "undefined") {
      window.addEventListener("dj_bookmarks_updated", syncBookmarks);
      return () => {
        window.removeEventListener("dj_bookmarks_updated", syncBookmarks);
      };
    }
  }, [user, authenticated]);

  const handleToggleBookmark = (articleId: string | number) => {
    if (!authenticated || !user) {
      alert("Please sign in with a Reader account to bookmark articles.");
      return;
    }

    const role = (user.role || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    if (role === "writer" || role === "admin" || email.includes("writer") || email.includes("admin")) {
      alert("🚫 Bookmarking is available for Reader accounts only. Writer & Admin accounts cannot save articles.");
      return;
    }

    const idStr = String(articleId);
    try {
      const key = `dj_bookmarks_${email.replace(/[^a-z0-9]/g, "_")}`;
      const currentSaved: any[] = [...safeGetBookmarksFromStorage(key)];

      const target =
        mostReadItems.find((m) => String(m.id) === idStr) ||
        pool.find((a) => String(a.id) === idStr) ||
        (featured && String(featured.id) === idStr ? featured : null);

      const targetTitle = (target?.title || "").trim().toLowerCase();

      const isCurrentlySaved = currentSaved.some((item: any) => {
        if (!item) return false;
        if (idStr && (String(item.id) === idStr || String(item.article_id) === idStr)) return true;
        const itemTitle = (item.title || "").trim().toLowerCase();
        return Boolean(targetTitle && itemTitle && itemTitle === targetTitle);
      });

      let updatedList: any[] = [];
      if (isCurrentlySaved) {
        updatedList = currentSaved.filter((item: any) => {
          if (!item) return false;
          if (idStr && (String(item.id) === idStr || String(item.article_id) === idStr)) return false;
          const itemTitle = (item.title || "").trim().toLowerCase();
          if (targetTitle && itemTitle && itemTitle === targetTitle) return false;
          return true;
        });
        setBookmarkedIds((prev) => prev.filter((id) => id !== idStr));
      } else {
        let safeImage = (target as any)?.image || (target as any)?.imageUrl || "";
        if (typeof safeImage === "string" && (safeImage.length > 500 || safeImage.startsWith("data:"))) {
          safeImage = "";
        }

        const newBookmark = {
          id: idStr,
          title: target?.title || "Article",
          category: (target?.category || "WORLD").toUpperCase(),
          href: target?.href || `/article/${idStr}`,
          image: safeImage,
          date: target && (target as any).date ? String((target as any).date).split("•")[0].trim() : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          savedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        };

        const filtered = currentSaved.filter((item: any) => {
          if (!item) return false;
          if (idStr && (String(item.id) === idStr || String(item.article_id) === idStr)) return false;
          const itemTitle = (item.title || "").trim().toLowerCase();
          if (targetTitle && itemTitle && itemTitle === targetTitle) return false;
          return true;
        });

        updatedList = [newBookmark, ...filtered];
        setBookmarkedIds((prev) => (prev.includes(idStr) ? prev : [...prev, idStr]));
      }

      safeSaveBookmarksToStorage(key, updatedList);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dj_bookmarks_updated"));
      }
    } catch {}
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

  const getArticleViews = (a: any): number => {
    if (typeof a?.views === "number") return a.views;
    if (typeof a?.reads_count === "number") return a.reads_count;
    if (typeof a?.reads === "number") return a.reads;
    if (typeof a?.viewsCount === "number") return a.viewsCount;
    const parsed = parseInt(String(a?.views ?? a?.reads_count ?? a?.reads ?? 0), 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const published = (Array.isArray(liveArticles) ? liveArticles : []).filter((art: ArticleItem) => {
    if (!art || (art.status || "").toLowerCase() !== "published") return false;
    return true;
  });

  if (published.length === 0) {
    return null;
  }

  // Find article designated for Home Page A+ Section 3 (Featured Story on the left)
  const aPlus3Articles = (Array.isArray(liveArticles) ? liveArticles : []).filter((a) => {
    if (!a || (a.status || "").toLowerCase() !== "published") return false;
    return isHomePageAPlus3(a);
  });
  aPlus3Articles.sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

  const sortedByTime = [...published].sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));
  const featuredRaw = aPlus3Articles[0] || sortedByTime.find((a) => a.imageUrl || a.image) || sortedByTime[0];

  const featured = {
    id: featuredRaw.id,
    title: featuredRaw.title,
    description: featuredRaw.description || featuredRaw.summary || "",
    category: (featuredRaw.category || "WORLD").toUpperCase(),
    author: (featuredRaw.authorName || (featuredRaw as any).author_name || featuredRaw.author || "Ronda B").trim(),
    image: featuredRaw.imageUrl || featuredRaw.image || "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=1200&h=800&fit=crop",
    href: `/article/${featuredRaw.slug || String(featuredRaw.id)}`
  };

  // 7 articles for the "Most Read" right column (excluding the featured one and any A+ Section 3 if possible)
  const remaining = published.filter((a) => a.id !== featuredRaw.id && !isHomePageAPlus3(a));
  const pool = remaining.length >= 7 ? remaining : published.filter((a) => a.id !== featuredRaw.id);

  // Sort by popularity / view count from database
  const sortedByViews = [...pool].sort((a, b) => {
    const vDiff = getArticleViews(b) - getArticleViews(a);
    if (vDiff !== 0) return vDiff;
    return getArticleTimestamp(b) - getArticleTimestamp(a);
  });
  const mostReadItems = sortedByViews.slice(0, 7).map((a) => ({
    id: String(a.id),
    title: a.title,
    views: getArticleViews(a),
    href: `/article/${a.slug || String(a.id)}`,
    category: (a.category || "WORLD").toUpperCase(),
    image: a.imageUrl || a.image || "",
    date: (a.date || (a as any).published_at || "").split("•")[0].trim()
  }));

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 pt-10 pb-0 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: LARGE FEATURED ARTICLE (~58% WIDTH) */}
        <div className="lg:col-span-7 flex flex-col group">
          <div className="relative w-full mb-5">
            <Link
              href={featured.href}
              className="relative w-full aspect-[16/10] overflow-hidden bg-gray-100 rounded-none block"
            >
              <img
                src={featured.image}
                alt={featured.title}
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=1200&h=800&fit=crop";
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </Link>
            {/* Category Name Centered Across Bottom Edge of Image */}
            <Link
              href={featured.href}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 text-[10px] font-bold tracking-wider text-gray-700 bg-gray-100 px-3 py-1 uppercase rounded-none shadow-sm border border-gray-200/60 z-10 whitespace-nowrap hover:bg-gray-200 transition-colors"
            >
              {featured.category}
            </Link>
          </div>

          {/* Centered Headline */}
          <h3 className="text-center font-serif font-bold text-2xl lg:text-[26px] text-gray-900 leading-snug group-hover:text-[#D31220] transition-colors mb-2 max-w-xl mx-auto">
            <Link href={featured.href}>
              {featured.title}
            </Link>
          </h3>

          {/* Centered Author Byline */}
          <p className="text-center text-xs text-gray-500 font-sans mb-3">
            By <span className="font-semibold text-gray-700">{featured.author}</span>, <span className="italic">Senior Contributor</span>
          </p>

          {/* Centered Excerpt */}
          {featured.description && (
            <p className="text-center text-[13px] text-gray-600 font-sans leading-relaxed line-clamp-3 max-w-xl mx-auto">
              {featured.description}
            </p>
          )}
        </div>

        {/* RIGHT COLUMN: MOST READ LIST (~42% WIDTH) */}
        <div className="lg:col-span-5 flex flex-col">
          {/* Header with Title "Most Read" */}
          <div className="mb-1">
            <h2 className="font-serif font-bold text-2xl text-gray-900 tracking-tight">
              Most Read
            </h2>
            <div className="border-b border-gray-200 mt-2.5 w-full" />
          </div>

          {/* Numbered 1 to 7 List */}
          <div className="divide-y divide-gray-100">
            {mostReadItems.map((item, idx) => (
              <div key={`most-read-${item.id}-${idx}`} className="py-3 flex items-start gap-3 group">
                {/* Red Number: 1., 2., etc. */}
                <span className="text-[#D31220] font-serif font-bold text-xl shrink-0 w-6">
                  {idx + 1}.
                </span>

                {/* Title & Stats */}
                <div className="flex-1 min-w-0 pr-2">
                  <Link
                    href={item.href}
                    className="font-bold text-[13.5px] leading-snug text-gray-900 group-hover:text-[#D31220] transition-colors line-clamp-2 block mb-1 font-serif"
                  >
                    {item.title}
                  </Link>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-sans">
                    <TrendingUp size={12} className="text-gray-400 shrink-0" />
                    <span>{item.views.toLocaleString()} {item.views === 1 ? "view" : "views"} since publication</span>
                  </div>
                </div>

                {/* Bookmark Icon */}
                <button
                  type="button"
                  onClick={() => handleToggleBookmark(item.id)}
                  className="text-gray-300 hover:text-gray-700 transition-colors p-1 cursor-pointer shrink-0 mt-0.5"
                  aria-label="Bookmark article"
                >
                  <Bookmark
                    size={15}
                    strokeWidth={2}
                    className={bookmarkedIds.includes(item.id) ? "fill-[#D31220] text-[#D31220]" : ""}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* SECTION DIVIDER LINE MATCHING CONTENT WIDTH */}
      <div className="border-b border-gray-200 mt-10 w-full" />
    </section>
  );
}

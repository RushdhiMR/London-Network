"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Share2, Bookmark } from "lucide-react";
import { useLiveArticles } from "@/lib/articlesSync";
import { useAuth } from "@/lib/auth-context";

export default function LatestNewsSection() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [publishedNews, setPublishedNews] = useState<any[]>([]);
  const { articles: liveArticles } = useLiveArticles();
  const auth = useAuth();

  useEffect(() => {
    try {
      const getArticleTimestamp = (item: any): number => {
        if (!item) return 0;
        if (item.updatedAt || item.updated_at) {
          const t = new Date(item.updatedAt || item.updated_at).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
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
        const pl = (p.placement || "").toLowerCase();
        return pl.includes("latest") || pl === "latest news" || pl === "latest news section";
      });

      if (approved.length < 4) {
        const otherPublished = (Array.isArray(liveArticles) ? liveArticles : []).filter(
          (a) => a && (a.status || "").toLowerCase() === "published" && !approved.some(p => String(p.id) === String(a.id))
        );
        approved = [...approved, ...otherPublished];
      }

      approved.sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));
      const formatted = approved.map((post, idx) => {
        const displayDate = post.date || (post.updated_at ? new Date(post.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : (post.published_at ? new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Just published"));

        return {
          id: post.id || `pub-latest-${idx}`,
          category: (post.category || "WORLD").toUpperCase(),
          title: post.title,
          time: displayDate,
          image: post.imageUrl || post.image || (post as any).image_url || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=300&h=200&fit=crop",
          href: `/${(post.category || "news").toLowerCase()}/${(post.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}?id=${post.id}`,
          summary: post.summary || post.content?.replace(/<[^>]+>/g, "").slice(0, 140) + "..."
        };
      });
      setPublishedNews(formatted);
    } catch (e) {
      console.warn("Could not read published articles for LatestNews:", e);
    }
  }, [liveArticles]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  const stackedArticles = [
    {
      id: 1,
      category: "WORLD",
      title: "Central banks navigate rate decisions amid inflation uncertainties",
      time: "3 hours ago",
      image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=300&h=200&fit=crop",
      href: "/news/world/central-banks-rate-decisions"
    },
    {
      id: 2,
      category: "TECHNOLOGY",
      title: "Tech giants announce breakthrough in AI safety standards",
      time: "4 hours ago",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&h=200&fit=crop",
      href: "/technology/ai-safety-standards-breakthrough"
    },
    {
      id: 3,
      category: "BUSINESS",
      title: "Global markets rally as earnings season delivers positive surprises",
      time: "5 hours ago",
      image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=300&h=200&fit=crop",
      href: "/business/global-markets-rally-earnings-season"
    }
  ];

  const mainFeatured = publishedNews.length > 0 ? publishedNews[0] : {
    category: "ENERGY",
    title: "Clean energy investments hit record high as global transition accelerates",
    summary: "Governments and private investors are pouring billions into renewable energy, driving a cleaner and more sustainable future.",
    image: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=700&h=525&fit=crop",
    href: "/news/world/clean-energy-investments-record-high",
    time: "2 hours ago"
  };

  const displayStacked = publishedNews.length > 1 
    ? publishedNews.slice(1, 4) 
    : (publishedNews.length === 1 ? [...publishedNews.slice(1), ...stackedArticles].slice(0, 3) : stackedArticles);

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-10 border-b border-gray-200 font-sans">
      
      {/* SECTION HEADER */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-1.5 h-6 bg-[#D31220]" />
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          Latest News
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* COLUMN 1: FEATURED ARTICLE CARD (~52%) */}
        <div className="lg:col-span-6 bg-white flex flex-col md:flex-row gap-6 items-center">
          
          {/* Featured Image (Left side) */}
          <Link
            href={mainFeatured.href}
            className="w-full md:w-1/2 aspect-[4/3] overflow-hidden rounded-none bg-gray-100 flex-shrink-0 group block"
          >
            <img
              src={mainFeatured.image}
              alt={mainFeatured.title}
              onError={(e) => {
                if (e.currentTarget.src !== "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=700&h=525&fit=crop") {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=700&h=525&fit=crop";
                }
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </Link>

          {/* Featured Details (Right side) */}
          <div className="w-full md:w-1/2 flex flex-col justify-between h-full py-1">
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

            {/* Metadata Footer: Timestamp & Action Icons */}
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium pt-3 border-t border-gray-100 mt-auto">
              <span>{mainFeatured.time} • 4 MIN READ</span>
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
                  onClick={() => {
                    try {
                      if (auth.user) {
                        const role = (auth.user.role || "").toLowerCase();
                        const email = (auth.user.email || "").toLowerCase();
                        if (role === "writer" || role === "admin" || email.includes("writer") || email.includes("admin")) {
                          alert("🚫 Bookmarking is available for Reader accounts only. Writer & Admin accounts cannot save articles.");
                          return;
                        }
                      }
                    } catch (e) {}
                    setBookmarked(!bookmarked);
                  }} 
                  className={`cursor-pointer p-1 transition-colors ${bookmarked ? "text-[#D31220]" : "hover:text-gray-700"}`}
                  aria-label="Bookmark article"
                >
                  <Bookmark size={15} strokeWidth={2} fill={bookmarked ? "currentColor" : "none"} />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* COLUMN 2: STACKED ARTICLE LIST (~33%) */}
        <div className="lg:col-span-3 lg:border-l border-gray-100 lg:pl-8 flex flex-col justify-between space-y-4">
          {displayStacked.map((item, idx) => (
            <div key={item.id} className={`flex items-start gap-4 ${idx < displayStacked.length - 1 ? "pb-4 border-b border-gray-100" : ""}`}>
              <Link href={item.href} className="w-[85px] h-[65px] rounded-none overflow-hidden bg-gray-100 flex-shrink-0 group block">
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
                  <h4 className="text-[12.5px] font-bold leading-snug text-gray-900 hover:text-[#D31220] transition-colors line-clamp-2">
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

        {/* COLUMN 3: STAY INFORMED NEWSLETTER CARD (~33%) */}
        <div className="lg:col-span-3 bg-[#FFF5F5] rounded-2xl p-6 flex flex-col justify-between border border-red-100 shadow-sm">
          
          {/* Header Row & Pink Envelope Graphic */}
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Stay Informed
              </h3>
              <p className="text-[12.5px] text-gray-600 leading-normal">
                Get our top stories delivered straight to your inbox.
              </p>
            </div>

            {/* Pink Envelope Graphic */}
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
    </section>
  );
}

"use client";

import Link from "next/link";
import { useLiveArticles, ArticleItem, isTopPlacementArticle, articleMatchesMainCategory } from "@/lib/articlesSync";

export default function InterviewSection() {
  const { articles: liveArticles = [] } = useLiveArticles();

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

  const formatArticleDate = (item: any): string => {
    if (item.date && item.date !== "Just now" && item.date !== "Today" && item.date !== "Just published") {
      return item.date;
    }
    const rawDate = item.published_at || item.publishedAt || item.createdAt || item.created_at;
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
      } catch (e) {}
    }
    return item.date || "Oct 8, 2026";
  };

  const DEFAULT_ECONOMY_ARTICLES = [
    {
      id: 76,
      title: "Why Latin America and Parts of Europe Are Moving Right While the American Left Gains Momentum",
      description: "The apparent ideological contradiction reflects different economic experiences, political transitions, and shifting voter alignments across regions.",
      image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&h=480&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/76"
    },
    {
      id: "econ-def-2",
      title: "Federal Reserve and European Central Bank signal rate adjustments amid cooling inflation",
      description: "Central bank governors emphasize balanced liquidity measures as industrial manufacturing output stabilizes and consumer confidence gains momentum across major economies.",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=480&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/federal-reserve-and-european-central-bank-signal-rate-adjustments"
    },
    {
      id: "econ-def-3",
      title: "Global manufacturing purchasing managers index (PMI) rebounds into expansion territory",
      description: "Factory orders in Germany, the US, and South Korea indicate strengthening export demand as global supply chain pressures ease.",
      image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=480&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/global-manufacturing-purchasing-managers-index-rebounds"
    },
    {
      id: "econ-def-4",
      title: "Labor statistics report shows steady job growth in renewable engineering and technical trades",
      description: "Employment metrics show resilient hiring in clean energy sectors, outperforming traditional manufacturing across key industrial hubs.",
      image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=480&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/labor-statistics-report-shows-steady-job-growth"
    },
    {
      id: "econ-def-5",
      title: "Commercial real estate lending standards tighten as debt refinancing waves approach",
      description: "Institutional lenders implement stricter underwriting criteria as regional banks prepare for upcoming commercial property loan maturities.",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=480&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/commercial-real-estate-lending-standards-tighten"
    },
    {
      id: "econ-def-6",
      title: "Energy commodity prices steady as strategic reserves replenish across major consuming nations",
      description: "Crude and natural gas storage levels stabilize following coordinated international supply agreements and balanced seasonal demand.",
      image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=480&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/energy-commodity-prices-steady-as-strategic-reserves-replenish"
    }
  ];

  const economyLive = (Array.isArray(liveArticles) ? liveArticles : []).filter((art: ArticleItem) => {
    if (!art || (art.status || "").toLowerCase() !== "published") return false;
    if (isTopPlacementArticle(art)) return false;
    return articleMatchesMainCategory(art, "economy");
  });

  // Sort strictly by timestamp descending (newest first)
  economyLive.sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

  const combinedEconomy: any[] = [...economyLive];
  for (const def of DEFAULT_ECONOMY_ARTICLES) {
    if (combinedEconomy.length >= 6) break;
    const isDuplicate = combinedEconomy.some(
      (item) =>
        String(item.id) === String(def.id) ||
        (item.title && def.title && item.title.trim().toLowerCase() === def.title.trim().toLowerCase())
    );
    if (!isDuplicate) {
      combinedEconomy.push(def);
    }
  }

  const displayArticles = combinedEconomy.slice(0, 6).map((a: any) => ({
    id: a.id,
    title: a.title,
    description: a.description || a.summary || "",
    image: a.imageUrl || a.image || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=480&fit=crop",
    href: a.href || `/article/${a.slug || String(a.id)}`,
    date: formatArticleDate(a)
  }));

  const topArticles = displayArticles.slice(0, 2);
  const bottomArticles = displayArticles.slice(2, 6);

  if (displayArticles.length === 0) {
    return null;
  }

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 pt-10 pb-0 font-sans">
      {/* Red Bar Title */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1.5 h-6 bg-[#D31220]" />
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          Economy
        </h2>
      </div>

      {/* Top 2 Cards: 2 Equal 50/50 Columns */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${bottomArticles.length > 0 ? "mb-8" : ""}`}>
        {topArticles.map((article) => (
          <article key={article.id} className="flex flex-col group cursor-pointer">
            <Link
              href={article.href}
              className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100 rounded-none mb-4 block"
            >
              <img
                src={article.image}
                alt={article.title}
                onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=480&fit=crop"; }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </Link>

            <h3 className="text-xl font-bold leading-snug text-gray-900 group-hover:text-[#D31220] transition-colors mb-2 font-serif">
              <Link href={article.href}>
                {article.title}
              </Link>
            </h3>

            <p className="text-[13px] text-gray-600 leading-relaxed font-sans">
              {article.description}
            </p>
          </article>
        ))}
      </div>

      {/* Bottom 4 Cards: 4 Columns Across matching Image 2 format */}
      {bottomArticles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {bottomArticles.map((item) => (
            <article key={item.id} className="flex flex-col group cursor-pointer">
              <Link href={item.href} className="relative w-full aspect-[16/10] overflow-hidden bg-gray-100 mb-2.5 block">
                <img
                  src={item.image}
                  alt={item.title}
                  onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=500&h=330&fit=crop"; }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </Link>
              <h4 className="text-[14px] font-bold leading-snug text-gray-900 group-hover:text-[#D31220] transition-colors mb-1.5 font-serif">
                <Link href={item.href}>
                  {item.title}
                </Link>
              </h4>
              <p className="text-[12px] text-gray-600 leading-normal mb-2 line-clamp-3">
                {item.description}
              </p>
              <span className="text-[11px] text-gray-400 font-medium mt-auto">
                {item.date}
              </span>
            </article>
          ))}
        </div>
      )}

      {/* SECTION DIVIDER LINE MATCHING CONTENT WIDTH */}
      <div className="border-b border-gray-200 mt-10 w-full" />
    </section>
  );
}

"use client";

import Link from "next/link";
import { useLiveArticles, ArticleItem, isTopPlacementArticle, articleMatchesMainCategory } from "@/lib/articlesSync";

export default function TechnologyGrid() {
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

  const techLive = (Array.isArray(liveArticles) ? liveArticles : []).filter((art: ArticleItem) => {
    if (!art || (art.status || "").toLowerCase() !== "published") return false;
    if (isTopPlacementArticle(art)) return false;
    return articleMatchesMainCategory(art, "technology");
  });

  // Sort strictly by timestamp descending (newest first)
  techLive.sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

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

  const DEFAULT_TECH_ARTICLES = [
    {
      id: 23,
      title: "Technology Democratized Filmmaking. But Time and Money Still Matter",
      description: "For young filmmakers, the tools are more accessible than ever. The opportunity to build a career is not.",
      image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&h=480&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/23"
    },
    {
      id: 24,
      title: "SpaceX Shares Fall Below IPO Opening Price Despite Nasdaq 100 Inclusion",
      description: "SpaceX shares continued their recent decline on Wednesday, closing at $148, below the company's June 12 opening price of $150.",
      image: "https://images.unsplash.com/photo-1517976487504-59a1a04d2feed?w=800&h=480&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/24"
    },
    {
      id: "tech-def-3",
      title: "China's Moonshot AI chases 'DeepSeek' moment with math-focused model",
      description: "Moonshot AI is training reasoning models centered around mathematical verification to challenge American frontier labs.",
      image: "https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=800&h=480&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/chinas-moonshot-ai-chases-deepseek-moment-with-math-focused-model"
    },
    {
      id: "tech-def-4",
      title: "Silicon photonics breakthrough enables ultra-low power optical interconnects for AI data centers",
      description: "Researchers announce integrated photonic links delivering ten times the bandwidth of copper while slashing power draw.",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=480&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/silicon-photonics-breakthrough-enables-ultra-low-power-optical-interconnects"
    },
    {
      id: "tech-def-5",
      title: "The era of the generalist board director is over",
      description: "As technologies scale, company boards require specialized expertise in cybersecurity, AI ethics, and systems engineering to mitigate multi-vector enterprise risks.",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=480&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/the-era-of-the-generalist-board-director-is-over"
    },
    {
      id: "tech-def-6",
      title: "Review: Has AI been chasing the wrong dream since Alan Turing?",
      description: "The search for true artificial intelligence is in a critical transition as researchers debate statistical prediction versus symbolic reasoning models.",
      image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=480&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/review-has-ai-been-chasing-the-wrong-dream-since-alan-turing"
    }
  ];

  const combinedTech: any[] = [...techLive];
  for (const def of DEFAULT_TECH_ARTICLES) {
    if (combinedTech.length >= 6) break;
    const isDuplicate = combinedTech.some(
      (item) =>
        String(item.id) === String(def.id) ||
        (item.title && def.title && item.title.trim().toLowerCase() === def.title.trim().toLowerCase())
    );
    if (!isDuplicate) {
      combinedTech.push(def);
    }
  }

  const displayArticles = combinedTech.slice(0, 6).map((a: any) => ({
    id: a.id,
    title: a.title,
    description: a.description || a.summary || "",
    image: a.imageUrl || a.image || "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=480&fit=crop",
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
          Technology
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
                onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=480&fit=crop"; }}
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
                  onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&h=330&fit=crop"; }}
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

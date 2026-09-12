"use client";

import Link from "next/link";
import { useLiveArticles, ArticleItem, isTopPlacementArticle, articleMatchesMainCategory } from "@/lib/articlesSync";

export default function MarketsSection() {
  const { articles: liveArticles = [] } = useLiveArticles();

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

  const marketsLive = (Array.isArray(liveArticles) ? liveArticles : []).filter((art: ArticleItem) => {
    if (!art || (art.status || "").toLowerCase() !== "published") return false;
    return articleMatchesMainCategory(art, "markets") || (art.category || "").toLowerCase().includes("market");
  });

  marketsLive.sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

  const mappedLive = marketsLive.map((a: ArticleItem) => ({
    id: a.id,
    title: a.title,
    description: a.description || a.summary || "",
    image: a.imageUrl || a.image || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500&h=350&fit=crop",
    href: `/${(a.category || "news").toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}/${a.slug || String(a.id)}`
  }));

  const allPublished = (Array.isArray(liveArticles) ? liveArticles : []).filter(
    (a: ArticleItem) => a && (a.status || "").toLowerCase() === "published"
  );

  const displayList = mappedLive.length > 0
    ? mappedLive
    : allPublished.map((a: ArticleItem) => ({
        id: a.id,
        title: a.title,
        description: a.description || a.summary || "",
        image: a.imageUrl || a.image || "/ai_hero.png",
        href: `/${(a.category || "news").toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}/${a.slug || String(a.id)}`
      }));

  const displayArticles = displayList.slice(0, 4);

  if (displayArticles.length === 0) {
    return null;
  }

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-10 border-b border-gray-200 font-sans">
      {/* Red Bar Title */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1.5 h-6 bg-[#D31220]" />
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          Markets
        </h2>
      </div>

      {/* 4 Horizontal Cards Across */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayArticles.map((article) => (
          <article key={article.id} className="flex flex-col group cursor-pointer">
            <Link
              href={article.href}
              className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100 rounded-none mb-3 block"
            >
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </Link>

            <h3 className="text-[13.5px] font-bold leading-snug text-gray-900 group-hover:text-[#D31220] transition-colors mb-2 line-clamp-2">
              <Link href={article.href}>
                {article.title}
              </Link>
            </h3>

            <p className="text-[12px] text-gray-600 leading-relaxed line-clamp-3">
              {article.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

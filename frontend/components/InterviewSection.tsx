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

  const interviewLive = (Array.isArray(liveArticles) ? liveArticles : []).filter((art: ArticleItem) => {
    if (!art || (art.status || "").toLowerCase() !== "published") return false;
    if (isTopPlacementArticle(art)) return false;
    return articleMatchesMainCategory(art, "interview");
  });

  // Sort strictly by timestamp descending (newest first)
  interviewLive.sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

  const liveFormatted = interviewLive.map((a: ArticleItem) => ({
    id: a.id,
    title: a.title,
    description: a.description || a.summary || "",
    image: a.imageUrl || a.image || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=480&fit=crop",
    href: `/article/${a.slug || String(a.id)}`
  }));

  if (liveFormatted.length === 0) {
    return null;
  }

  const displayArticles = liveFormatted.slice(0, 2);

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 pt-10 pb-0 font-sans">
      {/* Red Bar Title */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1.5 h-6 bg-[#D31220]" />
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          Interview
        </h2>
      </div>

      {/* 2 Equal 50/50 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {displayArticles.map((article) => (
          <article key={article.id} className="flex flex-col group cursor-pointer">
            <Link
              href={article.href}
              className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100 rounded-none mb-4 block"
            >
              <img
                src={article.image}
                alt={article.title}
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

      {/* SECTION DIVIDER LINE MATCHING CONTENT WIDTH */}
      <div className="border-b border-gray-200 mt-10 w-full" />
    </section>
  );
}

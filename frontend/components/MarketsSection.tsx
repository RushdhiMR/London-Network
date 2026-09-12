"use client";

import Link from "next/link";
import { useLiveArticles, ArticleItem, isTopPlacementArticle, articleMatchesMainCategory } from "@/lib/articlesSync";

const FALLBACK_MARKET_ARTICLES = [
  {
    id: 1,
    title: "Canada's Conexiom bets that the future of AI lies in automation, not experimentation",
    description: "Conexiom's CEO discusses how automating key transactional data is the key to enterprise growth...",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500&h=350&fit=crop",
    href: "/news/markets/conexiom-bets-future-ai-automation"
  },
  {
    id: 2,
    title: "Canada's AI adoption problem meets its youth employment problem",
    description: "A new study outlines how integrating AI training into entry-level roles could solve both problems...",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&h=350&fit=crop",
    href: "/news/markets/ai-adoption-meets-youth-employment"
  },
  {
    id: 3,
    title: "Op-Ed: Rethinking humanity as automation rewrites human realities",
    description: "Automation is not just about replacing jobs; it's about redefining what it means to be human...",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&h=350&fit=crop",
    href: "/news/markets/op-ed-rethinking-humanity-automation"
  },
  {
    id: 4,
    title: "Lightworks, Scotiabank, Sun Life and TELUS launch AI Consortium",
    description: "Major financial and telecom leaders collaborate to invest in and govern ethical AI models...",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&h=350&fit=crop",
    href: "/news/markets/scotiabank-sun-life-telus-ai-consortium"
  }
];

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

  const displayArticles = mappedLive.length >= 4
    ? mappedLive.slice(0, 4)
    : [
        ...mappedLive,
        ...FALLBACK_MARKET_ARTICLES.filter(
          (fb) => !mappedLive.some((m) => m.title.toLowerCase().trim() === fb.title.toLowerCase().trim())
        )
      ].slice(0, 4);

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

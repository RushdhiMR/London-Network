"use client";

import Link from "next/link";
import { useLiveArticles, ArticleItem, isTopPlacementArticle, articleMatchesCategory } from "@/lib/articlesSync";

const FALLBACK_LIFESTYLE_ARTICLES = [
  {
    id: 1,
    title: "Silicon Valley chip manufacturers announce breakthrough architectural updates",
    description: "New nanometer transistor architectures are set to double computing speeds while reducing power requirements...",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&h=350&fit=crop",
    href: "/news/lifestyle/silicon-valley-chip-breakthrough"
  },
  {
    id: 2,
    title: "New quantum computing clusters open to public cloud developer preview",
    description: "Developers can now run quantum algorithms directly on secure cloud nodes powered by next-gen cooling systems...",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&h=350&fit=crop",
    href: "/news/lifestyle/quantum-computing-clusters-cloud-preview"
  },
  {
    id: 3,
    title: "Open-source database platform raises record funding round for scaling",
    description: "The open-source ecosystem gains support with a massive funding round targeted at global replication modules...",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&h=350&fit=crop",
    href: "/news/lifestyle/open-source-database-record-funding"
  },
  {
    id: 4,
    title: "How edge computing is transforming real-time telemetry processing",
    description: "Processing data closer to the source decreases latency and allows immediate feedback in remote sensor arrays...",
    image: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500&h=350&fit=crop",
    href: "/news/lifestyle/edge-computing-telemetry-processing"
  }
];

export default function LifeStyleSection() {
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

  const lifestyleLive = (Array.isArray(liveArticles) ? liveArticles : []).filter((art: ArticleItem) => {
    if (!art || (art.status || "").toLowerCase() !== "published") return false;
    if (isTopPlacementArticle(art)) return false;
    return articleMatchesCategory(art, "lifestyle");
  });

  lifestyleLive.sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

  const mappedLive = lifestyleLive.map((a: ArticleItem) => ({
    id: a.id,
    title: a.title,
    description: a.description || a.summary || "",
    image: a.imageUrl || a.image || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&h=350&fit=crop",
    href: `/${(a.category || "business").toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}/${a.slug || String(a.id)}?id=${a.id}`
  }));

  const displayArticles = [
    ...mappedLive,
    ...FALLBACK_LIFESTYLE_ARTICLES.filter(
      (fb) => !mappedLive.some((m) => m.title.toLowerCase().trim() === fb.title.toLowerCase().trim())
    )
  ].slice(0, 4);

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-10 border-b border-gray-200 font-sans">
      {/* Red Bar Title */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1.5 h-6 bg-[#D31220]" />
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          Life Style
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

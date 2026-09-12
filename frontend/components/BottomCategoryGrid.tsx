"use client";

import Link from "next/link";
import { useLiveArticles, ArticleItem, isTopPlacementArticle, articleMatchesMainCategory } from "@/lib/articlesSync";

export default function BottomCategoryGrid() {
  const { articles: liveArticles = [] } = useLiveArticles();

  // Helper to filter articles by category keywords (strictly main category for homepage sections)
  const getCategoryArticles = (keywords: string[]) => {
    return (Array.isArray(liveArticles) ? liveArticles : []).filter((art: ArticleItem) => {
      if (!art || (art.status || "").toLowerCase() !== "published") return false;
      return keywords.some(k => articleMatchesMainCategory(art, k));
    });
  };

  const researchLive = getCategoryArticles(["research"]);
  const sportsLive = getCategoryArticles(["sports"]);
  const economyLive = getCategoryArticles(["economy"]);
  const healthLive = getCategoryArticles(["health"]);
  const entertainmentLive = getCategoryArticles(["entertainment", "entertain", "entertinment"]);

  const buildColumnData = (
    title: string,
    liveList: ArticleItem[]
  ) => {
    // Sort liveList in strict descending order (newest first)
    const sortedLive = [...liveList].sort((a, b) => {
      const timeA = new Date(a.published_at || a.date || 0).getTime() || (typeof a.id === 'number' ? a.id : Number(String(a.id).replace(/\D/g, '')) || 0);
      const timeB = new Date(b.published_at || b.date || 0).getTime() || (typeof b.id === 'number' ? b.id : Number(String(b.id).replace(/\D/g, '')) || 0);
      return timeB - timeA;
    });

    if (sortedLive.length > 0) {
      const first = sortedLive[0];
      const rest = sortedLive.slice(1, 4);
      const firstCat = (first.category || first.category_name || title).toLowerCase().replace(/[^a-z0-9]/g, "-");
      const firstSlug = first.slug || (first.title || "").toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
      
      const restList = rest.map(r => {
        const rCat = (r.category || r.category_name || title).toLowerCase().replace(/[^a-z0-9]/g, "-");
        const rSlug = r.slug || (r.title || "").toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
        return { title: r.title, href: `/${rCat}/${rSlug}` };
      });

      return {
        title,
        featured: {
          title: first.title,
          description: first.description || first.summary || "",
          image: first.imageUrl || first.image || "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&h=250&fit=crop",
          href: `/${firstCat}/${firstSlug}`,
          hasPlay: false
        },
        list: restList
      };
    }

    return null;
  };

  const columns = [
    buildColumnData("Research & Innovation", researchLive),
    buildColumnData("Sports", sportsLive),
    buildColumnData("Economy", economyLive),
    buildColumnData("Health", healthLive),
    buildColumnData("Entertainment", entertainmentLive)
  ].filter(Boolean) as { title: string; featured: any; list: any[] }[];

  if (!columns || columns.length === 0) {
    return null;
  }

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {columns.map((col, idx) => (
          <div key={idx} className="flex flex-col">
            {/* Red Bar Title */}
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
              <div className="w-1.5 h-5 bg-[#BF1E2D]" />
              <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">
                {col.title}
              </h3>
            </div>

            {/* Main Featured Card */}
            <div className="group cursor-pointer mb-4">
              <Link href={col.featured.href} className="relative w-full aspect-[16/10] overflow-hidden bg-gray-100 rounded-none mb-3 block">
                <img
                  src={col.featured.image}
                  alt={col.featured.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {col.featured.hasPlay && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-red-600/90 rounded-full flex items-center justify-center text-white shadow-md">
                      <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                )}
              </Link>

              <h4 className="text-[14px] font-bold leading-snug text-gray-900 group-hover:text-[#BF1E2D] transition-colors mb-1.5 font-serif">
                <Link href={col.featured.href}>
                  {col.featured.title}
                </Link>
              </h4>

              <p className="text-[12px] text-gray-600 leading-normal line-clamp-2">
                {col.featured.description}
              </p>
            </div>

            {/* List of 3 Headlines */}
            <div className="divide-y divide-gray-100 border-t border-gray-100 pt-1">
              {col.list.map((item, lIdx) => (
                <Link
                  key={lIdx}
                  href={item.href}
                  className="py-2.5 block text-[12.5px] font-semibold text-gray-800 hover:text-[#BF1E2D] transition-colors leading-snug group"
                >
                  <span className="group-hover:underline">{item.title}</span>
                </Link>
              ))}
            </div>

          </div>
        ))}
      </div>
    </section>
  );
}

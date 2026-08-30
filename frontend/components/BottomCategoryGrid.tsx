"use client";

import Link from "next/link";
import { useLiveArticles, ArticleItem, isTopPlacementArticle, articleMatchesCategory } from "@/lib/articlesSync";

export default function BottomCategoryGrid() {
  const { articles: liveArticles = [] } = useLiveArticles();

  // Helper to filter articles by category keywords
  const getCategoryArticles = (keywords: string[]) => {
    return (Array.isArray(liveArticles) ? liveArticles : []).filter((art: ArticleItem) => {
      if (!art || (art.status || "").toLowerCase() !== "published") return false;
      if (isTopPlacementArticle(art)) return false;
      return keywords.some(k => articleMatchesCategory(art, k));
    });
  };

  const researchLive = getCategoryArticles(["research"]);
  const sportsLive = getCategoryArticles(["sports"]);
  const economyLive = getCategoryArticles(["economy"]);
  const healthLive = getCategoryArticles(["health"]);

  const buildColumnData = (
    title: string,
    liveList: ArticleItem[],
    fallbackFeatured: any,
    fallbackList: any[]
  ) => {
    if (liveList.length > 0) {
      // Sort in strict descending order (newest first)
      const sortedLive = [...liveList].sort((a, b) => {
        const timeA = new Date(a.published_at || a.date || 0).getTime() || (typeof a.id === 'number' ? a.id : Number(String(a.id).replace(/\D/g, '')) || 0);
        const timeB = new Date(b.published_at || b.date || 0).getTime() || (typeof b.id === 'number' ? b.id : Number(String(b.id).replace(/\D/g, '')) || 0);
        return timeB - timeA;
      });

      const first = sortedLive[0];
      const rest = sortedLive.slice(1);
      const firstCat = (first.category || first.category_name || title).toLowerCase().replace(/[^a-z0-9]/g, "-");
      const firstSlug = first.slug || (first.title || "").toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
      
      const restList = rest.map(r => {
        const rCat = (r.category || r.category_name || title).toLowerCase().replace(/[^a-z0-9]/g, "-");
        const rSlug = r.slug || (r.title || "").toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
        return { title: r.title, href: `/${rCat}/news/${rSlug}?id=${r.id}` };
      });

      // Shift previous fallback featured article down into the top of the list
      const allFallbackHeadlines = [
        { title: fallbackFeatured.title, href: fallbackFeatured.href },
        ...fallbackList.filter(f => f.title !== fallbackFeatured.title)
      ];

      // Combine in chronological order: older published articles first, then fallback headlines
      const combinedHeadlines = [...restList, ...allFallbackHeadlines].slice(0, 3);

      return {
        title,
        featured: {
          title: first.title,
          description: first.description || first.summary || "",
          image: first.imageUrl || first.image || fallbackFeatured.image,
          href: `/${firstCat}/news/${firstSlug}?id=${first.id}`,
          hasPlay: false
        },
        list: combinedHeadlines
      };
    }
    return { title, featured: fallbackFeatured, list: fallbackList };
  };

  const columns = [
    buildColumnData(
      "Research & Innovation",
      researchLive,
      {
        title: "What next for the green transition in light of new economic headwinds?",
        description: "Governments balance renewable targets with immediate energy security demands across key industrial sectors.",
        image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&h=250&fit=crop",
        href: "/news/top-news/green-transition-economic-headwinds"
      },
      [
        { title: "International data privacy standards updated after cross-border audits", href: "/news/top-news/data-privacy-standards" },
        { title: "Public transportation systems roll out unified digital ticketing", href: "/news/top-news/public-transport-digital-ticketing" },
        { title: "Education systems adapt curricula to include basic AI literacy", href: "/news/top-news/education-ai-literacy" }
      ]
    ),
    buildColumnData(
      "Sports",
      sportsLive,
      {
        title: "EU & US leaders sign historic defense and international trade agreement",
        description: "Multilateral summits conclude with commitments to strengthen economic ties and critical supply chains.",
        image: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=400&h=250&fit=crop",
        hasPlay: true,
        href: "/sports/eu-us-leaders-sign-trade-agreement"
      },
      [
        { title: "Global athletic championships adopt real-time AI biomechanics tracking", href: "/sports/athletic-championships-ai-tracking" },
        { title: "Formula E expands battery recovery rules ahead of next season", href: "/sports/formula-e-battery-recovery" },
        { title: "New stadium infrastructure integrates zero-waste solar canopy roofs", href: "/sports/stadium-zero-waste-solar" }
      ]
    ),
    buildColumnData(
      "Economy",
      economyLive,
      {
        title: "Transportation sector speeds up transition to zero emission heavy fleets",
        description: "Commercial freight operators replace diesel fleets with hydrogen and battery-electric heavy trucks.",
        image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=250&fit=crop",
        href: "/economy/transportation-zero-emission-fleets"
      },
      [
        { title: "Central banks test inter-bank settlement protocols via digital ledger", href: "/economy/central-banks-digital-ledger" },
        { title: "Global inflation indicators stabilize as supply lines recover", href: "/economy/global-inflation-indicators" },
        { title: "E-commerce platforms scale up localized transaction distribution nodes", href: "/economy/e-commerce-distribution-nodes" }
      ]
    ),
    buildColumnData(
      "Health",
      healthLive,
      {
        title: "AI in healthcare: groundbreaking algorithm detects early stage heart anomalies",
        description: "Machine learning models trained on millions of ECG scans identify cardiovascular risks long before symptoms emerge.",
        image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=250&fit=crop",
        href: "/health/ai-healthcare-heart-anomalies"
      },
      [
        { title: "Gene therapy trials deliver promising early results for rare conditions", href: "/health/gene-therapy-trials-promising" },
        { title: "Wearable biosensors allow real-time glucose and hydration monitoring", href: "/health/wearable-biosensors-real-time" },
        { title: "Surgical robotics systems achieve sub-millimeter precision milestone", href: "/health/surgical-robotics-precision" }
      ]
    )
  ];

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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

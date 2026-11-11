"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveArticles, ArticleItem, isTopPlacementArticle, articleMatchesMainCategory } from "@/lib/articlesSync";
import { getCategoryData } from "@/lib/categoryData";

interface BottomCategoryGridProps {
  currentCategory?: string;
}

const DEFAULT_CATEGORIES = [
  { key: "research", title: "Research & Innovation", keywords: ["research"] },
  { key: "sports", title: "Sports", keywords: ["sports", "sport"] },
  { key: "economy", title: "Economy", keywords: ["economy", "economic"] },
  { key: "health", title: "Health", keywords: ["health"] },
  { key: "entertainment", title: "Entertainment", keywords: ["entertainment", "entertain", "entertinment"] }
];

const ALTERNATIVE_CATEGORIES = [
  { key: "politics", title: "Politics", keywords: ["politics", "policy"] },
  { key: "technology", title: "Technology", keywords: ["technology", "tech"] },
  { key: "business", title: "Business", keywords: ["business"] },
  { key: "interview", title: "Interview", keywords: ["interview"] }
];

const normalizeCat = (cat?: string): string => {
  if (!cat) return "";
  const c = cat.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  if (c.includes("sport")) return "sports";
  if (c.includes("econom")) return "economy";
  if (c.includes("research") || c.includes("innovat")) return "research";
  if (c.includes("health") || c.includes("medic")) return "health";
  if (c.includes("entertain")) return "entertainment";
  if (c.includes("politic")) return "politics";
  if (c.includes("tech")) return "technology";
  if (c.includes("interview")) return "interview";
  if (c.includes("business")) return "business";
  if (c.includes("market")) return "markets";
  if (c.includes("ufo")) return "ufo";
  return c;
};

export default function BottomCategoryGrid({ currentCategory }: BottomCategoryGridProps = {}) {
  const { articles: liveArticles = [] } = useLiveArticles();
  const pathname = usePathname();

  const inferredCategory = currentCategory || (pathname?.startsWith("/category/") ? pathname.replace("/category/", "").split("/")[0] : "");
  const currentNorm = normalizeCat(inferredCategory);

  // Active 5 category slots: if the current article's category is one of them, shift it automatically to another category
  const activeCategories = (() => {
    const slots = [...DEFAULT_CATEGORIES];
    if (currentNorm) {
      const matchIdx = slots.findIndex(s => s.key === currentNorm);
      if (matchIdx !== -1) {
        const replacement = ALTERNATIVE_CATEGORIES.find(
          alt => alt.key !== currentNorm && !slots.some(s => s.key === alt.key)
        );
        if (replacement) {
          slots[matchIdx] = replacement;
        }
      }
    }
    return slots;
  })();

  // Helper to filter articles by category keywords (strictly main category for homepage sections)
  const getCategoryArticles = (keywords: string[]) => {
    return (Array.isArray(liveArticles) ? liveArticles : []).filter((art: ArticleItem) => {
      if (!art || (art.status || "").toLowerCase() !== "published") return false;
      if (isTopPlacementArticle(art)) return false;
      return keywords.some(k => articleMatchesMainCategory(art, k));
    });
  };

  const buildColumnData = (
    catConfig: { key: string; title: string; keywords: string[] }
  ) => {
    const liveList = getCategoryArticles(catConfig.keywords);

    // Sort liveList in strict descending order (newest first)
    const sortedLive = [...liveList].sort((a, b) => {
      const timeA = new Date(a.published_at || a.date || 0).getTime() || (typeof a.id === 'number' ? a.id : Number(String(a.id).replace(/\D/g, '')) || 0);
      const timeB = new Date(b.published_at || b.date || 0).getTime() || (typeof b.id === 'number' ? b.id : Number(String(b.id).replace(/\D/g, '')) || 0);
      return timeB - timeA;
    });

    const combined: any[] = [...sortedLive];

    // Supplement from getCategoryData if fewer than 4 articles
    if (combined.length < 4) {
      try {
        const catData = getCategoryData(catConfig.key);
        const staticList = [
          ...(catData?.featured ? [catData.featured] : []),
          ...(catData?.secondaryArticles || []),
          ...(catData?.newsArticles || [])
        ];
        for (const sa of staticList) {
          if (combined.length >= 4) break;
          const saTitle = (sa.title || "").trim();
          if (saTitle && !combined.some(c => (c.title || "").trim().toLowerCase() === saTitle.toLowerCase())) {
            const postSlug = saTitle.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
            combined.push({
              id: `static-${catConfig.key}-${postSlug.slice(0, 15)}`,
              title: saTitle,
              description: (sa as any).description || "",
              imageUrl: sa.image || "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&h=250&fit=crop",
              slug: postSlug,
              status: "Published",
              category: catConfig.title
            });
          }
        }
      } catch (e) {
        console.error("Error supplementing bottom grid category:", e);
      }
    }

    if (combined.length > 0) {
      const first = combined[0];
      const rest = combined.slice(1, 4);
      const firstSlug = first.slug || (first.title || "").toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
      
      const restList = rest.map(r => {
        const rSlug = r.slug || (r.title || "").toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
        return { title: r.title, href: `/article/${rSlug}` };
      });

      return {
        title: catConfig.title,
        featured: {
          title: first.title,
          description: first.description || first.summary || "",
          image: first.imageUrl || first.image || "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&h=250&fit=crop",
          href: `/article/${firstSlug}`,
          hasPlay: false
        },
        list: restList
      };
    }

    return null;
  };

  const columns = activeCategories
    .map(cfg => buildColumnData(cfg))
    .filter(Boolean) as { title: string; featured: any; list: any[] }[];

  if (!columns || columns.length === 0) {
    return null;
  }

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {columns.map((col, idx) => (
          <div key={idx} className="flex flex-col">
            {/* Red Bar Title */}
            <div className="flex items-center gap-2 mb-4 pb-0 md:pb-2 border-b-0 md:border-b border-gray-200">
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

"use client";

import Link from "next/link";
import { useLiveArticles, useLiveAdSlots, ArticleItem, isTopPlacementArticle, articleMatchesMainCategory, formatAdDimensions, isDuplicateAdImage } from "@/lib/articlesSync";

export default function BusinessGrid() {
  const { articles: liveArticles = [] } = useLiveArticles();
  const { adSlots } = useLiveAdSlots();

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

  const businessLive = (Array.isArray(liveArticles) ? liveArticles : []).filter((art: ArticleItem) => {
    if (!art || (art.status || "").toLowerCase() !== "published") return false;
    if (isTopPlacementArticle(art)) return false;
    return articleMatchesMainCategory(art, "business");
  });

  // Sort chronological descending: Newest article first
  businessLive.sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

  const displayList = businessLive;

  if (displayList.length === 0) {
    return null;
  }

  const featuredStory = {
    title: displayList[0].title,
    description: displayList[0].description || displayList[0].summary || "",
    image: displayList[0].imageUrl || displayList[0].image || "/ai_hero.png",
    time: displayList[0].date || "Just published",
    href: `/business/${displayList[0].slug || String(displayList[0].id)}`
  };

  const bottomCards = displayList.slice(1, 5).map((a, idx) => ({
    id: a.id || `biz-user-${idx}`,
    title: a.title,
    description: a.description || a.summary || "",
    time: a.date || "Just published",
    image: a.imageUrl || a.image || "/ai_hero.png",
    href: `/business/${a.slug || String(a.id)}`
  }));

  const businessAdSlot = adSlots.find(s => s.id === "slot-3" || s.title.includes("Business Section Top-Right") || s.title.includes("Business Section"));
  const businessDimensions = formatAdDimensions(businessAdSlot?.dimensions || "300X250");
  const hasBusinessImage =
    businessAdSlot &&
    businessAdSlot.isActive &&
    businessAdSlot.imageUrl &&
    businessAdSlot.imageUrl.trim() !== "" &&
    !isDuplicateAdImage(businessAdSlot.imageUrl, businessAdSlot.id, adSlots);

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 font-sans">
      
      {/* SECTION HEADER: Red Accent Bar + Title */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-[4px] h-5 bg-[#D31220]" />
        <h2 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight font-sans">
          Business
        </h2>
      </div>

      {/* FULL-WIDTH DIVIDER LINE */}
      <div className="border-b-2 border-gray-400/80 mb-8 w-full" />

      {/* TOP ROW: 4-Column Grid (3 columns for Main Story + 1 column for Top-Right Ad Box) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch mb-8">
        
        {/* MAIN FEATURED STORY (Spans 3 Columns with text on left and large image on right) */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* Left Text Column */}
          <div className="flex flex-col justify-start pr-0 md:pr-2">
            <h3 className="text-2xl md:text-[28px] font-bold leading-[1.15] text-gray-900 hover:text-[#D31220] transition-colors mb-3 font-serif">
              <Link href={featuredStory.href}>
                {featuredStory.title}
              </Link>
            </h3>
            <p className="text-[13px] text-gray-600 leading-relaxed mb-4">
              {featuredStory.description}
            </p>
            <span className="text-[11px] text-gray-400 font-medium">
              {featuredStory.time}
            </span>
          </div>

          {/* Right Big Image Column */}
          <div className="w-full">
            <Link href={featuredStory.href} className="relative w-full aspect-[16/10] overflow-hidden bg-gray-100 block group">
              <img
                src={featuredStory.image}
                alt={featuredStory.title}
                onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=1000&h=650&fit=crop"; }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </Link>
          </div>

        </div>

        {/* TOP-RIGHT ADVERTISEMENT BOX (1 Column) */}
        <div className="lg:col-span-1 flex flex-col h-full">
          {hasBusinessImage && businessAdSlot ? (
            <a
              href={businessAdSlot.targetUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-full min-h-[220px] aspect-[16/10] lg:aspect-auto bg-black flex items-center justify-center cursor-pointer group hover:opacity-95 transition-opacity relative overflow-hidden border border-zinc-800"
            >
              <img
                src={businessAdSlot.imageUrl}
                alt={businessAdSlot.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase text-white border border-white/10">
                Ad
              </div>
            </a>
          ) : (
            <div className="w-full h-full min-h-[220px] aspect-[16/10] lg:aspect-auto bg-[#111827] border border-dashed border-gray-700 flex flex-col items-center justify-center p-4 text-center">
              <span className="text-[10px] font-mono tracking-widest uppercase text-[#D31220] font-bold mb-1">
                ADVERTISEMENT
              </span>
              <span className="text-white font-mono font-bold text-sm tracking-widest">
                {businessDimensions}
              </span>
              <span className="text-[10px] font-mono text-gray-400 mt-1">
                Size: {businessDimensions} px
              </span>
            </div>
          )}
        </div>

      </div>

      {/* BOTTOM ROW: 4 Columns in sequential chronological order */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {bottomCards.map((item) => (
          <article key={item.id} className="flex flex-col group cursor-pointer">
            <Link href={item.href} className="relative w-full aspect-[16/10] overflow-hidden bg-gray-100 mb-2.5 block">
              <img
                src={item.image}
                alt={item.title}
                onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=500&h=330&fit=crop"; }}
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
              {item.time}
            </span>
          </article>
        ))}
      </div>

    </section>
  );
}

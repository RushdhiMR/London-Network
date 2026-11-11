"use client";

import Link from "next/link";
import { useLiveArticles, useLiveAdSlots, ArticleItem, isTopPlacementArticle, articleMatchesMainCategory, formatAdDimensions, isDuplicateAdImage } from "@/lib/articlesSync";

export default function BusinessGrid() {
  const { articles: liveArticles = [] } = useLiveArticles();
  const { adSlots } = useLiveAdSlots();

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

  const businessLive = (Array.isArray(liveArticles) ? liveArticles : []).filter((art: ArticleItem) => {
    if (!art || (art.status || "").toLowerCase() !== "published") return false;
    if (isTopPlacementArticle(art)) return false;
    return articleMatchesMainCategory(art, "business");
  });

  // Sort chronological descending: Newest article first
  businessLive.sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

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
    return item.date || item.time || "Oct 8, 2026";
  };

  const DEFAULT_BUSINESS_ARTICLES = [
    {
      id: 25,
      title: "The End of an Era: Sony's Move Away from Physical Media Signals a New Digital Future",
      description: "Sony's transition highlights how cloud delivery and subscription libraries are transforming physical entertainment distributions.",
      image: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=1000&h=650&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/25"
    },
    {
      id: 77,
      title: "Court Hears Text Messages Between Singer D4vd and Teen at Center of Murder Case",
      description: "Court hearings reveal critical digital communications and forensic timelines in the ongoing trial.",
      image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500&h=330&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/77"
    },
    {
      id: 78,
      title: "Erin Piacenti, 32, Identified as Victim of Deadly Times Square Stabbing",
      description: "Authorities confirm identity and issue public security advisories following the Times Square investigation.",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&h=330&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/78"
    },
    {
      id: 26,
      title: "Nepal’s Flash Flood Leaves Hundreds Missing From Around the World",
      description: "Severe weather events trigger critical emergency rescue missions and international humanitarian coordination.",
      image: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=500&h=330&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/26"
    },
    {
      id: 29,
      title: "China Evacuates Nearly Two Million Residents as Typhoon Bavi Strikes",
      description: "Coastline preparations and mass emergency relocations activate ahead of severe storm landfalls across eastern provinces.",
      image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=500&h=330&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/29"
    },
    {
      id: 103,
      title: "RuPaul’s Drag Race UK Leaves BBC as WOW Presents Plus Takes Over",
      description: "Major entertainment franchise completes exclusive streaming platform transition, reshaping international broadcast rights.",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=330&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/103"
    },
    {
      id: "biz-def-7",
      title: "Canada's Conexiom bets that the future of AI lies in automation, not experimentation",
      description: "Enterprise software providers pivot toward workflow automation and continuous systems integration across corporate supply chains.",
      image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=330&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/canadas-conexiom-bets-that-the-future-of-ai-lies-in-automation"
    },
    {
      id: "biz-def-8",
      title: "Lightworks, Scotiabank, Sun Life and TELUS launch AI Consortium",
      description: "Financial institutions and telecom operators establish a joint artificial intelligence governance initiative to accelerate secure enterprise adoption.",
      image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=500&h=330&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/lightworks-scotiabank-sun-life-and-telus-launch-ai-consortium"
    },
    {
      id: "biz-def-9",
      title: "Tunnel tech to survey the state of leaving framework",
      description: "Modern infrastructure diagnostics utilize high-frequency acoustic mapping to inspect sub-surface foundations and structural frameworks.",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&h=330&fit=crop",
      date: "Oct 8, 2026",
      href: "/article/tunnel-tech-to-survey-the-state-of-leaving-framework"
    }
  ];

  const combinedBusiness: any[] = [...businessLive];
  for (const def of DEFAULT_BUSINESS_ARTICLES) {
    if (combinedBusiness.length >= 9) break;
    const isDuplicate = combinedBusiness.some(
      (item) =>
        String(item.id) === String(def.id) ||
        (item.title && def.title && item.title.trim().toLowerCase() === def.title.trim().toLowerCase())
    );
    if (!isDuplicate) {
      combinedBusiness.push(def);
    }
  }

  const displayList = combinedBusiness;

  if (displayList.length === 0) {
    return null;
  }

  const featuredStory = {
    title: displayList[0].title,
    description: displayList[0].description || displayList[0].summary || "",
    image: displayList[0].imageUrl || displayList[0].image || "/ai_hero.png",
    time: formatArticleDate(displayList[0]),
    href: displayList[0].href || `/article/${displayList[0].slug || String(displayList[0].id)}`
  };

  const bottomCards = displayList.slice(1, 9).map((a, idx) => ({
    id: a.id || `biz-user-${idx}`,
    title: a.title,
    description: a.description || a.summary || "",
    time: formatArticleDate(a),
    image: a.imageUrl || a.image || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=500&h=330&fit=crop",
    href: a.href || `/article/${a.slug || String(a.id)}`
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
      <div className="flex items-center gap-2 mb-6 md:mb-2.5">
        <div className="w-[4px] h-5 bg-[#D31220]" />
        <h2 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight font-sans">
          Business
        </h2>
      </div>

      {/* FULL-WIDTH DIVIDER LINE */}
      <div className="hidden md:block border-b-2 border-gray-400/80 mb-8 w-full" />

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
              className="w-full h-full min-h-[220px] aspect-[300/250] bg-black flex items-center justify-center cursor-pointer group hover:opacity-95 transition-opacity relative overflow-hidden border border-zinc-800"
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
            <div className="w-full h-full min-h-[220px] aspect-[300/250] bg-[#111827] border border-dashed border-gray-700 flex flex-col items-center justify-center p-4 text-center">
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

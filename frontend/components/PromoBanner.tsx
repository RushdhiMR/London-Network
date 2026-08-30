"use client";

import Link from "next/link";
import { useLiveArticles } from "@/lib/articlesSync";

export default function PromoBanner() {
  const { articles } = useLiveArticles();

  // Find article designated for Home Page A+ Section 2
  const aPlus2Articles = (Array.isArray(articles) ? articles : []).filter((a) => {
    if (!a) return false;
    const st = (a.status || "").toLowerCase().trim();
    if (st !== "published" && st !== "approved") return false;
    const pl = (a.placement || "").toLowerCase().trim();
    return (
      pl === "home page a+ section 2" ||
      pl.includes("a+ section 2") ||
      pl.includes("section 2") ||
      pl.includes("a+2") ||
      pl.includes("a+ 2") ||
      pl === "middle dark spotlight banner"
    );
  });

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

  aPlus2Articles.sort((a, b) => {
    const timeA = getArticleTimestamp(a);
    const timeB = getArticleTimestamp(b);
    if (timeA !== timeB) return timeB - timeA;
    const aId = Number(String(a.id || "").replace(/\D/g, "")) || 0;
    const bId = Number(String(b.id || "").replace(/\D/g, "")) || 0;
    return bId - aId;
  });

  const featuredArticle = aPlus2Articles.length > 0 ? aPlus2Articles[0] : null;

  let targetHref = "/journal-of-record";
  let displayTitle = "The journal of record for technology decisions in Canada";
  let displayDesc = "London BigBen serves Canadian leaders responsible for what technology delivers across their organizations. Their decisions touch every function and every board conversation about where the organization is going.";
  let displayImage = "/ai_studio_booth.png";

  if (featuredArticle) {
    const cat = (featuredArticle.category || "news").toLowerCase().replace(/[^a-z0-9]/g, "") || "news";
    const slug = (featuredArticle.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    targetHref = `/${cat}/companies/${slug}?id=${featuredArticle.id}`;

    if (featuredArticle.title) {
      displayTitle = featuredArticle.title;
    }
    if (featuredArticle.summary || featuredArticle.subheading || featuredArticle.description) {
      displayDesc = featuredArticle.summary || featuredArticle.subheading || featuredArticle.description;
    }
    if (featuredArticle.imageUrl || featuredArticle.image) {
      displayImage = featuredArticle.imageUrl || featuredArticle.image || "/ai_studio_booth.png";
    }
  }

  return (
    <section className="w-full bg-zinc-950 text-white py-10 md:py-12 px-6 md:px-12 lg:px-16 my-6">
      <div className="max-w-[1180px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center justify-center">
        
        {/* Left Column Text (~60% width) */}
        <div className="lg:col-span-7 flex flex-col items-start pr-0 lg:pr-6 justify-center">
          <Link href={targetHref} className="group">
            <h2 className="text-xl md:text-2xl lg:text-[26px] font-bold leading-[1.25] mb-3 text-white group-hover:text-[#FF4D5E] transition-colors font-serif cursor-pointer">
              {displayTitle}
            </h2>
          </Link>

          <p className="text-[13px] md:text-[13.5px] text-zinc-300 leading-relaxed mb-5 font-sans line-clamp-3">
            {displayDesc}
          </p>

          <Link
            href={targetHref}
            className="bg-[#BF1E2D] hover:bg-red-700 text-white text-[11px] font-bold uppercase px-5 py-2.5 tracking-wider transition-all inline-flex items-center gap-2 cursor-pointer rounded-sm shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            Read More &rarr;
          </Link>
        </div>

        {/* Right Column Image (~40% width, increased height) */}
        <div className="lg:col-span-5 w-full h-[250px] sm:h-[280px] md:h-[320px] overflow-hidden bg-zinc-900 rounded-none relative border border-zinc-800 self-center group">
          <Link href={targetHref} className="block w-full h-full">
            <img
              src={displayImage}
              alt={displayTitle}
              onError={(e) => {
                e.currentTarget.src = "/ai_studio_booth.png";
              }}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
            />
          </Link>
        </div>

      </div>
    </section>
  );
}

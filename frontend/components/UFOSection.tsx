"use client";

import Link from "next/link";
import { useLiveArticles, ArticleItem, isTopPlacementArticle, articleMatchesMainCategory } from "@/lib/articlesSync";

const DEFAULT_UFO_ARTICLES = [
  {
    id: 120,
    title: "Pentagon's AARO Releases New Report on Unidentified Aerial Phenomena Sightings",
    description: "The All-domain Anomaly Resolution Office presents updated findings on military airspace encounters, sensor calibration protocols, and cross-agency data repositories.",
    image: "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=500&h=350&fit=crop",
    href: "/article/pentagon-aaro-releases-new-report-unidentified-aerial-phenomena"
  },
  {
    id: 121,
    title: "NASA Independent Study Team Recommends Modern Satellite Array for Anomalous Tracking",
    description: "Scientific panel highlights commercial satellite constellations and machine learning algorithms to evaluate unusual atmospheric phenomena.",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&h=350&fit=crop",
    href: "/article/nasa-independent-study-team-recommends-modern-satellite-array"
  },
  {
    id: 122,
    title: "Global Aviation Authorities Call for Standardized Commercial Pilot Reporting Protocols",
    description: "Civil aviation regulators examine flight safety implications and transparent transponder data integration for unidentified incursions.",
    image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=350&fit=crop",
    href: "/article/global-aviation-authorities-standardized-commercial-pilot-reporting"
  },
  {
    id: 123,
    title: "Congressional Hearing Spotlights Sensor Transparency and Multi-Spectrum Radar Logs",
    description: "Lawmakers press defense research agencies for unclassified telemetry data captured during routine maritime surveillance missions.",
    image: "https://images.unsplash.com/photo-1507499739999-097706ad8914?w=500&h=350&fit=crop",
    href: "/article/congressional-hearing-spotlights-sensor-transparency-radar-logs"
  }
];

export default function UFOSection() {
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

  const ufoLive = (Array.isArray(liveArticles) ? liveArticles : []).filter((art: ArticleItem) => {
    if (!art || (art.status || "").toLowerCase() !== "published") return false;
    if (isTopPlacementArticle(art)) return false;
    return articleMatchesMainCategory(art, "ufo");
  });

  ufoLive.sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

  const liveMapped = ufoLive.map((a: ArticleItem) => ({
    id: a.id,
    title: a.title,
    description: a.description || a.summary || "",
    image: a.imageUrl || a.image || "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=500&h=350&fit=crop",
    href: `/article/${a.slug || String(a.id)}`
  }));

  // Merge live articles first, filling remaining slots from defaults up to 4 total
  const combined = [...liveMapped];
  for (const def of DEFAULT_UFO_ARTICLES) {
    if (combined.length >= 4) break;
    if (!combined.some(c => c.title.toLowerCase() === def.title.toLowerCase() || String(c.id) === String(def.id))) {
      combined.push(def);
    }
  }

  const displayArticles = combined.slice(0, 4);

  if (displayArticles.length === 0) {
    return null;
  }

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 pt-10 pb-0 font-sans">
      {/* Red Bar Title */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1.5 h-6 bg-[#D31220]" />
        <Link href="/category/ufo" className="hover:text-[#D31220] transition-colors">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            UFO
          </h2>
        </Link>
      </div>

      {/* 4 Horizontal Cards Across (1 row, 4 slots) */}
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

      {/* SECTION DIVIDER LINE MATCHING CONTENT WIDTH */}
      <div className="border-b border-gray-200 mt-10 w-full" />
    </section>
  );
}


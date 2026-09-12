"use client";

import Link from "next/link";
import { useLiveArticles } from "@/lib/articlesSync";

export default function Hero() {
  const { articles: liveArticles = [] } = useLiveArticles();

  // Find newest published article, prioritizing featured
  const published = (Array.isArray(liveArticles) ? liveArticles : []).filter(
    (a: any) => a && (a.status === "Published" || (a.status || "").toLowerCase() === "published")
  );

  const featured = published.find((a: any) => a.is_featured || a.isFeatured) || published[0];

  const heroTitle = featured?.title || "Digital Journal Global Financial & Technology Report";
  const heroCategory = featured?.category || (featured as any)?.category_name || "Business & Finance";
  const heroDescription = featured?.summary || featured?.description || "In-depth investigative journalism, economic analysis, and technology developments from across the globe.";
  const heroImage = featured?.imageUrl || featured?.image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=800&fit=crop";
  const heroAuthor = featured?.authorName || (featured as any)?.author_name || featured?.author || "Rushdhi MR";
  const heroDate = featured?.date || (featured as any)?.published_at || "July 2026";
  const heroCategorySlug = heroCategory.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const heroSlug = featured?.slug || featured?.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || "article";
  const heroHref = featured ? `/${heroCategorySlug}/${heroSlug}` : "/business";

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Hero Image Clickable Link */}
        <Link
          href={heroHref}
          className="lg:col-span-2 relative w-full aspect-[16/10] sm:aspect-video lg:h-[480px] overflow-hidden bg-gray-100 rounded-none block group"
        >
          <img
            src={heroImage}
            alt={heroTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
        {/* Hero Content Card */}
        <div className="flex flex-col justify-center h-full">
          <span className="text-[#CC6633] text-xs font-bold uppercase tracking-wider mb-2.5 block">
            {heroCategory}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-4 text-black font-serif">
            <Link
              href={heroHref}
              className="hover:text-[#BF1E2D] transition-colors"
            >
              {heroTitle}
            </Link>
          </h1>
          <p className="text-[13.5px] text-gray-700 leading-relaxed mb-5 font-sans">
            {heroDescription}
          </p>
          <p className="text-[11px] text-gray-400 font-medium">
            By <Link href={`/author/${heroAuthor.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="text-black font-semibold hover:text-[#BF1E2D] hover:underline cursor-pointer transition-colors">{heroAuthor}</Link> • {heroDate}
          </p>
        </div>
      </div>
    </section>
  );
}

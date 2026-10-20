"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLiveArticles, isHomePageAPlus2 } from "@/lib/articlesSync";

export default function PromoBanner() {
  const { articles } = useLiveArticles();
  const [currentSlide, setCurrentSlide] = useState(0);
  const isPaused = useRef(false);

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

  // Find articles designated for Main News 2 / Home Page A+ Section 2
  let aPlus2Articles = (Array.isArray(articles) ? articles : []).filter((a) => {
    if (!a) return false;
    const st = (a.status || "").toLowerCase().trim();
    if (st !== "published" && st !== "approved") return false;
    return isHomePageAPlus2(a);
  });

  aPlus2Articles.sort((a, b) => {
    const timeA = getArticleTimestamp(a);
    const timeB = getArticleTimestamp(b);
    if (timeA !== timeB) return timeB - timeA;
    const aId = Number(String(a.id || "").replace(/\D/g, "")) || 0;
    const bId = Number(String(b.id || "").replace(/\D/g, "")) || 0;
    return bId - aId;
  });

  // Automatically take the latest 5 articles in Main News 2 section (up to 5 slots)
  let selectedArticles = aPlus2Articles.slice(0, 5);

  // If fewer than 5 articles explicitly tagged, supplement from other latest published articles to provide up to 5 slots
  if (selectedArticles.length < 5) {
    const existingIds = new Set(selectedArticles.map((a) => String(a.id)));
    const supplement = (Array.isArray(articles) ? articles : [])
      .filter((a) => {
        if (!a) return false;
        const st = (a.status || "").toLowerCase().trim();
        if (st !== "published" && st !== "approved") return false;
        return !existingIds.has(String(a.id));
      })
      .sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));
    selectedArticles = [...selectedArticles, ...supplement.slice(0, 5 - selectedArticles.length)];
  }

  // Construct slides
  const slides = selectedArticles.map((article) => {
    const cat = (article.category || "news").toLowerCase().replace(/[^a-z0-9]/g, "") || "news";
    const slug = (article.slug || (article.title || ""))
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    const targetHref = `/article/${slug}`;
    const displayTitle = article.title || "The journal of record for technology decisions in Canada";
    const displayDesc = article.summary || article.subheading || article.description || "London BigBen serves Canadian leaders responsible for what technology delivers across their organizations.";
    const displayImage = article.imageUrl || article.image || (article as any).image_url || "/ai_studio_booth.png";

    return {
      id: article.id,
      title: displayTitle,
      description: displayDesc,
      image: displayImage,
      href: targetHref,
      category: (article.category || "NEWS").toUpperCase()
    };
  });

  // Default fallback slide if no articles are available
  if (slides.length === 0) {
    slides.push({
      id: "default-record",
      title: "The journal of record for technology decisions in Canada",
      description: "London BigBen serves Canadian leaders responsible for what technology delivers across their organizations. Their decisions touch every function and every board conversation about where the organization is going.",
      image: "/ai_studio_booth.png",
      href: "/journal-of-record",
      category: "TECHNOLOGY"
    });
  }

  const handlePrevSlide = () => {
    if (slides.length <= 1) return;
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    if (slides.length <= 1) return;
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  // Auto-play: advance every 5 seconds, paused on hover
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      if (!isPaused.current) {
        setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const safeCurrentIndex = currentSlide >= slides.length ? 0 : currentSlide;
  const currentItem = slides[safeCurrentIndex] || slides[0];

  return (
    <section
      className="w-full bg-zinc-950 text-white py-10 md:py-12 px-4 sm:px-8 md:px-14 lg:px-18 my-6 relative group select-none overflow-hidden"
      onMouseEnter={() => { isPaused.current = true; }}
      onMouseLeave={() => { isPaused.current = false; }}
    >
      {/* Navigation Arrows (< and >) */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrevSlide}
            aria-label="Previous article"
            className="absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-zinc-900/80 hover:bg-black text-white/80 hover:text-white border border-zinc-700/60 flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm shadow-xl hover:scale-110 active:scale-95 group/btn"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover/btn:-translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={handleNextSlide}
            aria-label="Next article"
            className="absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-zinc-900/80 hover:bg-black text-white/80 hover:text-white border border-zinc-700/60 flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm shadow-xl hover:scale-110 active:scale-95 group/btn"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover/btn:translate-x-0.5" />
          </button>
        </>
      )}

      <div className="max-w-[1180px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center justify-center">
          {/* Left Column Text (~60% width) */}
          <div className="lg:col-span-7 flex flex-col items-start pr-0 lg:pr-6 justify-center">
            <Link href={currentItem.href} className="group">
              <h2 className="text-xl md:text-2xl lg:text-[26px] font-bold leading-[1.25] mb-3 text-[#FF4D5E] hover:text-white transition-colors font-serif cursor-pointer line-clamp-3">
                {currentItem.title}
              </h2>
            </Link>

            <p className="text-[13px] md:text-[13.5px] text-zinc-300 leading-relaxed mb-5 font-sans line-clamp-3">
              {currentItem.description}
            </p>

            <Link
              href={currentItem.href}
              className="bg-[#BF1E2D] hover:bg-red-700 text-white text-[11px] font-bold uppercase px-5 py-2.5 tracking-wider transition-all inline-flex items-center gap-2 cursor-pointer rounded-sm shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              Read More &rarr;
            </Link>
          </div>

          {/* Right Column Image (~40% width, fixed height matching layout) */}
          <div className="lg:col-span-5 w-full h-[250px] sm:h-[280px] md:h-[320px] overflow-hidden bg-zinc-900 rounded-none relative border border-zinc-800 self-center group">
            <Link href={currentItem.href} className="block w-full h-full">
              <img
                key={currentItem.id}
                src={currentItem.image}
                alt={currentItem.title}
                onError={(e) => {
                  e.currentTarget.src = "/ai_studio_booth.png";
                }}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer animate-fadeIn"
              />
            </Link>
          </div>
        </div>

        {/* Slider Indicator Dots (up to 5 slots) */}
        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 sm:mt-8 z-20 relative">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  safeCurrentIndex === idx
                    ? "w-6 h-2 bg-white shadow-sm"
                    : "w-2 h-2 bg-white/35 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

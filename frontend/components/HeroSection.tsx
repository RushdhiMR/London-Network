"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLiveArticles, isHomePageAPlus, isTrendingNow } from "@/lib/articlesSync";
import { getAuthorAvatarByNameOrEmail, resolveUserAvatar } from "@/lib/userProfiles";
import { dispatchPageDataReady } from "@/components/GlobalPageLoader";


export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const isPaused = useRef(false);
  // Track whether we have completed at least one full data processing cycle
  // after the server fetch resolved. Used to gate the dispatchPageDataReady call
  // so the skeleton only dismisses once all derived states are computed.
  const heroDataInitialized = useRef(false);
  const [userPublishedArticles, setUserPublishedArticles] = useState<any[]>([]);
  const [userTrendingArticles, setUserTrendingArticles] = useState<any[]>([]);
  const [profileSyncTick, setProfileSyncTick] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const { articles: liveArticles, loading } = useLiveArticles();


  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleProfileSync = () => {
      setProfileSyncTick((prev) => prev + 1);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("dj_profile_updated", handleProfileSync);
      window.addEventListener("dj_articles_updated", handleProfileSync);
      // NOTE: Do NOT listen to the native "storage" event here.
      // That event fires in OTHER browser tabs when localStorage changes,
      // causing unrelated tabs to re-render — the cross-tab reload bug.
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("dj_profile_updated", handleProfileSync);
        window.removeEventListener("dj_articles_updated", handleProfileSync);
      }
    };
  }, []);

  useEffect(() => {
    try {
      const getArticleTimestamp = (item: any): number => {
        if (!item) return 0;
        if (item.publishedAt) {
          const t = new Date(item.publishedAt).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        if (item.published_at) {
          const t = new Date(item.published_at).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        if (item.createdAt) {
          const t = new Date(item.createdAt).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        if (item.created_at) {
          const t = new Date(item.created_at).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        if (item.date && item.date !== "Just now" && item.date !== "Today" && item.date !== "Just published") {
          const t = new Date(item.date).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        if (item.updatedAt) {
          const t = new Date(item.updatedAt).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        if (item.updated_at) {
          const t = new Date(item.updated_at).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        if (typeof item.id === "number") return item.id;
        if (typeof item.id === "string") {
          const num = parseInt(item.id.replace(/[^0-9]/g, ""), 10);
          if (!isNaN(num) && num > 0) return num;
        }
        return 0;
      };

      // 1. Home Page A+ Section (Carousel Main Story)
      let aPlusPublished = (Array.isArray(liveArticles) ? liveArticles : []).filter((p) => {
        if (!p || (p.status || "").toLowerCase() !== "published") return false;
        return isHomePageAPlus(p);
      });

      aPlusPublished.sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

      const formattedAPlus = aPlusPublished.map((post, index) => {
        const cat = (post.category || "BUSINESS").toUpperCase();
        const postSlug = (post.title || "")
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
        
        const rawName = (post.authorName || (post as any).author_name || post.author || "Rushdhi MR").trim();
        const authorEmail = post.authorEmail || (post as any).author_email;
        const authorAvatar = post.authorAvatar || (post as any).author_avatar;
        const resolvedAvatar = resolveUserAvatar({
          name: rawName,
          email: authorEmail,
          avatar: authorAvatar
        });

        const validImg = post.imageUrl || post.image || (post as any).image_url || "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&h=800&fit=crop";

        return {
          id: `user-pub-${post.id || index}`,
          category: cat,
          title: post.title,
          excerpt: post.summary || post.description || (post.content || "").replace(/<[^>]*>?/gm, "").slice(0, 160) + "...",
          author: rawName,
          authorAvatar: authorAvatar || resolvedAvatar,
          authorEmail: authorEmail,
          date: post.date || "Just now",
          readTime: post.readDuration || "4 MIN READ",
          image: validImg,
          href: `/article/${postSlug}`
        };
      });
      setUserPublishedArticles(formattedAPlus);

      // 2. Trending Now Section
      let trendingPublished = (Array.isArray(liveArticles) ? liveArticles : []).filter((p) => {
        if (!p || (p.status || "").toLowerCase() !== "published") return false;
        return isTrendingNow(p);
      });

      trendingPublished.sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

      const formattedTrending = trendingPublished.map((post, index) => {
        const cat = (post.category || "NEWS").toUpperCase();
        const postSlug = (post.title || "")
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");

        const displayDate = post.date || (post.updated_at ? new Date(post.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : (post.published_at ? new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Just now"));

        return {
          number: `0${index + 1}`.slice(-2),
          category: cat,
          title: post.title,
          time: displayDate,
          image: post.imageUrl || post.image || (post as any).image_url || "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=200&h=140&fit=crop",
          hasVideo: false,
          href: `/article/${postSlug}`
        };
      });
      setUserTrendingArticles(formattedTrending);

      // Signal GlobalPageLoader that this component's data is ready.
      // We dispatch here — inside the effect that processes liveArticles — so
      // the skeleton is only dismissed AFTER userPublishedArticles and
      // userTrendingArticles have been set in this same synchronous execution.
      // Only fire once loading is complete (liveArticles is non-empty or server
      // returned an empty result). The `loading` variable is from the closure.
      if (!loading) {
        heroDataInitialized.current = true;
        dispatchPageDataReady();
      }
    } catch (e) {
      console.warn("Error reading published articles for Hero:", e);
      // Even on error, dismiss the skeleton if fetch is done
      if (!loading) {
        heroDataInitialized.current = true;
        dispatchPageDataReady();
      }
    }
  }, [liveArticles, profileSyncTick, loading]);



  // Use only real DB articles — no hardcoded fallback while loading.
  // While loading is true, allCarouselArticles will be [] which keeps the
  // skeleton visible (GlobalPageLoader hasn't received data-ready yet).
  const allCarouselArticles = userPublishedArticles.length > 0 ? userPublishedArticles.slice(0, 6) : [];


  const handlePrevSlide = () => {
    if (allCarouselArticles.length <= 1) return;
    setCurrentSlide((prev) => (prev === 0 ? allCarouselArticles.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    if (allCarouselArticles.length <= 1) return;
    setCurrentSlide((prev) => (prev === allCarouselArticles.length - 1 ? 0 : prev + 1));
  };

  // Auto-play: advance every 3 seconds, pause on hover
  useEffect(() => {
    if (allCarouselArticles.length <= 1) return;
    const timer = setInterval(() => {
      if (!isPaused.current) {
        setCurrentSlide((prev) => (prev === allCarouselArticles.length - 1 ? 0 : prev + 1));
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [allCarouselArticles.length]);

  if (allCarouselArticles.length === 0) {
    return null;
  }

  const activeArticle = allCarouselArticles[currentSlide] || allCarouselArticles[0];
  if (!activeArticle) {
    return null;
  }

  const trendingList = userTrendingArticles.length > 0
    ? userTrendingArticles.slice(0, 4)
    : userPublishedArticles.slice(1, 5).map((post, index) => ({
        number: `0${index + 1}`.slice(-2),
        category: post.category,
        title: post.title,
        time: post.date,
        image: post.image,
        hasVideo: false,
        href: post.href
      }));

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 pb-0 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-stretch">
        
        {/* LEFT CARD: FEATURED ARTICLE CAROUSEL (~67% GRID WIDTH, FIXED HEIGHT FOR EXACT SAME IMAGE SIZE) */}
        <div
          className="lg:col-span-8 bg-white border border-gray-200 rounded-none flex flex-col lg:flex-row items-stretch min-h-[320px] h-auto lg:h-[355px] xl:h-[370px] overflow-hidden"
          onMouseEnter={() => { isPaused.current = true; }}
          onMouseLeave={() => { isPaused.current = false; }}
        >
          
          {/* WIDESCREEN RECTANGLE IMAGE (Exact Same Size & Aspect Ratio Across All Slides) */}
          <div className="lg:w-[56%] xl:w-[58%] w-full h-[260px] sm:h-[300px] lg:h-full relative flex-shrink-0 group overflow-hidden bg-gray-900">
            <Link href={activeArticle.href} className="block w-full h-full relative">
              <img
                src={activeArticle.image}
                alt={activeArticle.title}
                onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=750&fit=crop"; }}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 rounded-none"
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-10">
                <span className="bg-[#D31220] text-white text-[10px] font-poppins font-normal uppercase px-2.5 py-0.5 tracking-wider">
                  {activeArticle.category}
                </span>
                <span className="bg-black/80 text-white text-[10px] font-poppins font-normal uppercase px-2.5 py-0.5 tracking-wider">
                  {activeArticle.readTime}
                </span>
              </div>
            </Link>
          </div>

          {/* RIGHT TEXT DETAILS (Fixed Card Height Matching Image Height) */}
          <div className="w-full lg:w-[44%] xl:w-[42%] p-3.5 sm:p-4 xl:p-4.5 flex flex-col justify-between h-auto lg:h-full bg-white min-w-0">
            <div className="w-full">
              {/* Category Subtitle */}
              <span className="text-[#D31220] font-black text-[11px] tracking-wider uppercase mb-1 block font-sans">
                {activeArticle.category}
              </span>

              {/* Main Title - FULL UNTRUNCATED TITLE */}
              <h1 className="text-base sm:text-lg lg:text-[17.5px] xl:text-[19px] font-bold leading-snug mb-2 text-gray-900 font-serif whitespace-normal break-words line-clamp-2 sm:line-clamp-3">
                <Link href={activeArticle.href} className="hover:text-[#D31220] transition-colors block">
                  {activeArticle.title}
                </Link>
              </h1>

              {/* Excerpt - FULL UNTRUNCATED DESCRIPTION */}
              <p className="text-gray-600 text-xs sm:text-[12.5px] xl:text-[13px] leading-relaxed mb-2.5 font-sans whitespace-normal break-words line-clamp-2 sm:line-clamp-3">
                {activeArticle.excerpt}
              </p>

              {/* Author Row */}
              {(() => {
                const authorName = activeArticle.author || "Rushdhi MR";
                const authorEmail = (activeArticle as any).authorEmail || (activeArticle as any).author_email;
                const authorAvatar = (activeArticle as any).authorAvatar;

                const liveAvatar = resolveUserAvatar({
                  name: authorName,
                  email: authorEmail,
                  avatar: authorAvatar
                });

                return (
                  <div className="flex items-center gap-2 mb-2" suppressHydrationWarning>
                    <div className="w-5.5 h-5.5 rounded-full overflow-hidden bg-[#1E293B] text-white flex items-center justify-center font-bold text-[9.5px] flex-shrink-0" suppressHydrationWarning>
                      {liveAvatar && liveAvatar.length > 5 ? (
                        <img
                          src={liveAvatar}
                          alt={authorName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/author_bluesuit.jpg";
                          }}
                          suppressHydrationWarning
                        />
                      ) : (
                        <span>{(authorName || "RM").slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10.5px] font-sans flex-wrap" suppressHydrationWarning>
                      <span className="font-bold text-gray-900">
                        By {authorName}
                      </span>
                      <span className="text-gray-400 font-medium ml-1">
                        • {activeArticle.date}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Bottom Control Bar: Dots & Nav Arrows */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto w-full">
              {/* Carousel Dots */}
              <div className="flex items-center gap-1.5">
                {allCarouselArticles.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      currentSlide === idx 
                        ? "w-2.5 h-2.5 bg-[#D31220]" 
                        : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Nav Arrows (< and >) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevSlide}
                  className="w-8 h-8 border border-gray-200 rounded-none flex items-center justify-center text-gray-700 hover:border-gray-400 hover:text-black transition-colors cursor-pointer bg-white shadow-sm"
                  aria-label="Previous slide"
                >
                  <ChevronLeft size={16} strokeWidth={2.2} />
                </button>
                <button
                  onClick={handleNextSlide}
                  className="w-8 h-8 border border-gray-200 rounded-none flex items-center justify-center text-gray-700 hover:border-gray-400 hover:text-black transition-colors cursor-pointer bg-white shadow-sm"
                  aria-label="Next slide"
                >
                  <ChevronRight size={16} strokeWidth={2.2} />
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT CARD: TRENDING NOW BOX (~33% GRID WIDTH, MATCHES LEFT CARD EXACT HEIGHT) */}
        <div className="w-full lg:col-span-4 bg-white border border-gray-200 rounded-none p-3 sm:p-3.5 xl:p-4 flex flex-col justify-between min-h-[320px] h-auto lg:h-[355px] xl:h-[370px] overflow-hidden">
          <div className="flex flex-col justify-between h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-4 bg-[#D31220]" />
                <h2 className="text-xs sm:text-sm font-extrabold text-gray-900 tracking-tight uppercase font-sans">
                  Trending Now
                </h2>
              </div>
            </div>

            {/* List */}
            <div className="space-y-1.5 lg:space-y-1.5 xl:space-y-2 flex-1 flex flex-col justify-between">
              {trendingList.map((item, idx) => (
                <div 
                  key={`trending-item-${idx}-${item.title || item.href}`}
                  className="flex items-center gap-3 p-1.5 rounded hover:bg-gray-50 transition-colors group cursor-pointer"
                >
                  {/* Item Image */}
                  <div className="relative w-14 h-11 lg:w-14 lg:h-11 xl:w-16 xl:h-12 flex-shrink-0 bg-gray-100 overflow-hidden border border-gray-200">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      onError={(e) => {
                        const fallbacks = [
                          "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=200&h=140&fit=crop",
                          "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=200&h=140&fit=crop",
                          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=140&fit=crop",
                          "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=200&h=140&fit=crop"
                        ];
                        const fallback = fallbacks[idx % fallbacks.length];
                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10.5px] lg:text-[10px] xl:text-[11px] font-extrabold text-[#D31220] uppercase tracking-wider">
                        {item.category}
                      </span>
                      <span className="text-[10px] lg:text-[9.5px] xl:text-[10px] text-gray-400">• {item.time}</span>
                    </div>
                    <Link href={item.href} className="text-[13.5px] sm:text-sm lg:text-[12.5px] xl:text-[13.5px] font-bold text-gray-900 group-hover:text-[#D31220] transition-colors line-clamp-2 leading-snug block font-serif">
                      {item.title}
                    </Link>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>

      {/* SECTION DIVIDER LINE MATCHING CONTENT WIDTH */}
      <div className="border-b border-gray-200 mt-8 mb-2 w-full" />
    </section>
  );
}

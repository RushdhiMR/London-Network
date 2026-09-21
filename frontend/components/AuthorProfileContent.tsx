"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLiveArticles, useLiveAdSlots, formatAdDimensions, isDuplicateAdImage } from "@/lib/articlesSync";
import { useAuth } from "@/lib/auth-context";
import { getUserProfile, getAuthorAvatarByNameOrEmail, getAuthorFullProfileByNameOrEmail, resolveUserAvatar } from "@/lib/userProfiles";
import { dispatchPageDataReady } from "@/components/GlobalPageLoader";

interface ArticleItem {
  category: string;
  href: string;
  title: string;
  desc: string;
  date: string;
  image: string;
  authorName?: string;
  authorAvatar?: string;
}

interface SidebarItem {
  rank: number;
  href: string;
  title: string;
  views: string;
}

interface AuthorProfileContentProps {
  slug: string;
  author: {
    name: string;
    role: string;
    avatar: string;
    bio: string;
  };
  initialArticles: ArticleItem[];
  mostReadSidebar: SidebarItem[];
}

export default function AuthorProfileContent({
  slug,
  author,
  initialArticles,
  mostReadSidebar,
}: AuthorProfileContentProps) {
  const [authorProfile, setAuthorProfile] = useState(author);
  const [articlesList, setArticlesList] = useState<ArticleItem[]>([]);
  const [mostReadItems, setMostReadItems] = useState<SidebarItem[]>(mostReadSidebar);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [profileVersion, setProfileVersion] = useState(0);
  const { articles: liveArticles } = useLiveArticles();
  const { adSlots } = useLiveAdSlots();
  const auth = useAuth();

  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfileVersion((v) => v + 1);
    };
    window.addEventListener("dj_profile_updated", handleProfileUpdate);
    window.addEventListener("dj_auth_change", handleProfileUpdate);
    window.addEventListener("dj_articles_updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("dj_profile_updated", handleProfileUpdate);
      window.removeEventListener("dj_auth_change", handleProfileUpdate);
      window.removeEventListener("dj_articles_updated", handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    try {
      const slugClean = slug.toLowerCase().replace(/-/g, " ").trim();

      // 1. Establish baseline from author prop passed by server/route (or database lookup)
      let finalName = author.name || "Author";
      let finalAvatar = author.avatar;
      let finalRole = author.role || "JOURNALIST";
      let finalBio = author.bio;

      // 2. Look up live profile data from user profiles database (by slug or email)
      const isRushdhiPage = slugClean.includes("rushdhi") || slug === "rushdhi" || slug === "rushdhi-mr";
      const savedProfile = isRushdhiPage
        ? (getUserProfile("rushdhiwriter@gmail.com") || getUserProfile("writer@digitaljournal.com") || getAuthorFullProfileByNameOrEmail("rushdhi"))
        : (getUserProfile(slugClean) || getAuthorFullProfileByNameOrEmail(slugClean));

      if (savedProfile) {
        if (savedProfile.name && !savedProfile.name.toLowerCase().includes("reader")) finalName = savedProfile.name;
        if (savedProfile.role && !savedProfile.role.toLowerCase().includes("reader")) finalRole = savedProfile.role;
        if (savedProfile.bio && !savedProfile.bio.toLowerCase().includes("avid reader")) finalBio = savedProfile.bio;
        if (savedProfile.avatar && savedProfile.avatar.length > 5 && !savedProfile.avatar.includes("cart") && !savedProfile.avatar.includes("admin_profile")) {
          finalAvatar = savedProfile.avatar;
        }
      }

      // Check author avatar resolution from auth session or writer stores
      const resolvedAvatar =
        (savedProfile?.avatar && !savedProfile.avatar.includes("cart") && !savedProfile.avatar.includes("admin_profile") ? savedProfile.avatar : null) ||
        (auth.user && auth.user.avatar && !auth.user.avatar.includes("cart") && (auth.user.name === finalName || isRushdhiPage) ? auth.user.avatar : null) ||
        getAuthorAvatarByNameOrEmail(finalName, isRushdhiPage ? "rushdhiwriter@gmail.com" : undefined);

      if (resolvedAvatar && resolvedAvatar.length > 5 && !resolvedAvatar.includes("cart") && !resolvedAvatar.includes("admin_profile")) {
        finalAvatar = resolvedAvatar;
      }

      setAuthorProfile({
        name: finalName,
        role: finalRole,
        avatar: finalAvatar,
        bio: finalBio,
      });

      // 3. Filter published articles by THIS SPECIFIC AUTHOR ONLY
      let publishedByAuthor: any[] = [];

      if (Array.isArray(liveArticles) && liveArticles.length > 0) {
        try {
          publishedByAuthor = liveArticles.filter((post) => {
            const st = (post.status || "Published").toLowerCase();
            if (st !== "published" && st !== "approved") return false;

            const pName = (post.authorName || (post as any).author_name || (post as any).author || "").toLowerCase().trim();
            const pEmail = (post.authorEmail || (post as any).author_email || "").toLowerCase().trim();
            const targetName = finalName.toLowerCase().trim();

            if (isRushdhiPage) {
              return pName === "rushdhi" || pName === "rushdhi mr" || pName === "rushdhi mr." || (pEmail.length > 0 && pEmail.includes("rushdhi"));
            } else {
              return pName === targetName || (pName.length > 3 && pName === slugClean);
            }
          });
        } catch (e) { }
      }

      let mappedArticles: ArticleItem[] = [];

      if (publishedByAuthor.length > 0) {
        mappedArticles = publishedByAuthor.map((post) => {
          const cat = (post.category || "BUSINESS").toLowerCase();
          const articleSlug = (post.title || "")
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");

          const itemWriterName = finalName;

          const itemWriterAvatar = resolveUserAvatar({
            name: finalName,
            email: post.authorEmail,
            avatar: finalAvatar || post.authorAvatar
          });

          return {
            category: (post.category || "BUSINESS").toUpperCase(),
            href: `/${cat}/${articleSlug}`,
            title: post.title,
            desc: post.summary || (post.content || "").replace(/<[^>]*>?/gm, "").slice(0, 160) + "...",
            date: post.date ? post.date.toUpperCase() : "AUG 2026",
            image: post.imageUrl || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=350&fit=crop",
            authorName: itemWriterName,
            authorAvatar: itemWriterAvatar,
          };
        });
      } else {
        // Fallback initial articles with Target Author Name and Target Author Image
        mappedArticles = initialArticles.map((art) => {
          const itemAvatar = resolveUserAvatar({
            name: finalName,
            avatar: finalAvatar
          });
          return {
            ...art,
            authorName: finalName,
            authorAvatar: itemAvatar,
          };
        });
      }

      setArticlesList(mappedArticles);

      // 4. Compute MOST READ stories for THIS AUTHOR (sorted by views descending, top views at top)
      const getArticleReads = (a: any): number => {
        if (!a) return 0;
        const v = a.reads_count ?? a.views ?? a.reads ?? (typeof a.views === "string" ? parseInt(a.views, 10) : 0) ?? 0;
        const num = typeof v === "number" ? v : parseInt(String(v).replace(/[^0-9]/g, ""), 10);
        return isNaN(num) ? 0 : num;
      };

      const candidateArticles = publishedByAuthor.length > 0 ? [...publishedByAuthor] : [...initialArticles];
      
      // Sort in strict descending order of view count: Highest views at top (Rank 1), lowest at bottom
      candidateArticles.sort((a, b) => getArticleReads(b) - getArticleReads(a));

      const computedMostRead: SidebarItem[] = candidateArticles.slice(0, 5).map((post, idx) => {
        const cat = (post.category || (post as any).category_name || "news").toLowerCase();
        const articleSlug = (post.slug || post.title || "")
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
        const count = getArticleReads(post);
        const viewText = `${count.toLocaleString()} ${count === 1 ? 'view' : 'views'}`;
        const href = post.href || `/${cat}/${articleSlug}${post.id ? `?id=${post.id}` : ''}`;

        return {
          rank: idx + 1,
          href,
          title: post.title,
          views: viewText
        };
      });

      if (computedMostRead.length > 0) {
        setMostReadItems(computedMostRead);
      } else {
        setMostReadItems(mostReadSidebar);
      }

      setIsLoaded(true);
    } catch (e) {
      console.warn("Could not load dynamic author profile and published articles:", e);
      setIsLoaded(true);
    }
  }, [slug, author, initialArticles, liveArticles]);

  useEffect(() => {
    if (isLoaded) {
      dispatchPageDataReady();
    }
  }, [isLoaded]);

  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      try {
        const detail = e.detail || (e.key === "dj_user_profile" && e.newValue ? JSON.parse(e.newValue) : null);
        if (detail && detail.avatar && detail.avatar.length > 5 && !detail.avatar.includes("cart")) {
          const slugClean = slug.toLowerCase().replace(/-/g, " ").trim();
          const matchesRushdhi = (slugClean.includes("rushdhi") || slug.includes("rushdhi")) &&
            ((detail.email && detail.email.toLowerCase().includes("rushdhi")) || (detail.name && detail.name.toLowerCase().includes("rushdhi")));
          const matchesName = detail.name && detail.name.toLowerCase().trim() === authorProfile.name.toLowerCase().trim();

          if (matchesRushdhi || matchesName) {
            setAuthorProfile((prev) => ({
              ...prev,
              avatar: detail.avatar,
              name: detail.name || prev.name,
              bio: detail.bio || prev.bio
            }));
          }
        }
      } catch (err) { }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("dj_profile_updated", handleProfileUpdate);
      window.addEventListener("storage", handleProfileUpdate);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("dj_profile_updated", handleProfileUpdate);
        window.removeEventListener("storage", handleProfileUpdate);
      }
    };
  }, [slug, authorProfile.name]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(articlesList.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedArticles = articlesList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 280, behavior: "smooth" });
      }
    }
  };

  return (
    <main className="min-h-screen bg-white font-standard-sans">
      <Header />

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-10">

        {/* Author / Writer Bio Header Card */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 mb-8 border-b border-zinc-200 py-2">
          {/* Writer Profile Image */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-[#1E293B] text-white flex items-center justify-center font-bold text-2xl flex-shrink-0 border-2 border-[#BF1E2D] shadow-md">
            {authorProfile.avatar && authorProfile.avatar.trim().length > 0 ? (
              <img
                src={authorProfile.avatar}
                alt={authorProfile.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/author_bluesuit.jpg";
                }}
              />
            ) : (
              <span>{(authorProfile.name || "AU").slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          <div className="flex flex-col text-center sm:text-left flex-1">
            {/* Writer Name */}
            <h1 className="font-serif text-[32px] sm:text-[36px] font-extrabold text-slate-900 leading-tight mb-1">
              {authorProfile.name}
            </h1>
            <span className="text-[11px] font-extrabold text-[#BF1E2D] uppercase tracking-widest mb-3">
              {authorProfile.role}
            </span>
            <p className="text-[14px] text-slate-600 leading-relaxed max-w-3xl font-sans">
              {authorProfile.bio}
            </p>
          </div>
        </div>

        {/* Section Title: PUBLISHED STORIES BY WRITER */}
        <div className="border-b-2 border-slate-900 pb-2 mb-8 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">
            PUBLISHED STORIES BY {authorProfile.name.toUpperCase()} ({articlesList.length})
          </h2>
        </div>

        {/* 8 Cols / 4 Cols Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* Left Column: Author Articles List */}
          <div className="lg:col-span-8 space-y-8">
            {paginatedArticles.length > 0 ? (
              paginatedArticles.map((article, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-5 pb-8 border-b border-zinc-100 last:border-none group cursor-pointer">
                  {/* Thumbnail Image */}
                  <Link href={article.href} className="relative w-full sm:w-[220px] h-[180px] sm:h-[140px] flex-shrink-0 overflow-hidden bg-gray-100 rounded-lg border border-zinc-200 block">
                    <img
                      src={article.image && article.image.trim().length > 0 ? article.image : "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&h=350&fit=crop"}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&h=350&fit=crop";
                      }}
                    />
                  </Link>

                  {/* Article Info */}
                  <div className="flex flex-col flex-1">
                    <span className="text-[10.5px] font-bold text-[#1D9BF0] uppercase tracking-wider mb-1">
                      {article.category}
                    </span>
                    <Link href={article.href} className="font-serif text-[18px] md:text-[21px] font-bold leading-snug text-slate-900 group-hover:text-[#BF1E2D] transition-colors mb-2">
                      {article.title}
                    </Link>
                    <p className="text-[13px] text-slate-600 leading-relaxed font-sans line-clamp-2 mb-3">
                      {article.desc}
                    </p>

                    {/* Writer Name & Writer Image Byline */}
                    {(() => {
                      const cardAuthorName = article.authorName || authorProfile.name;
                      const displayItemAvatar =
                        authorProfile.avatar ||
                        resolveUserAvatar({
                          name: cardAuthorName,
                          avatar: article.authorAvatar
                        });

                      return (
                        <div className="flex items-center gap-2.5 mt-auto pt-1">
                          {/* Writer Profile Image Thumbnail */}
                          <div className="w-7 h-7 rounded-full overflow-hidden border border-zinc-300 flex-shrink-0 bg-slate-200 shadow-xs flex items-center justify-center text-[9px] font-bold text-slate-700">
                            {displayItemAvatar && displayItemAvatar.trim().length > 0 ? (
                              <img
                                src={displayItemAvatar}
                                alt={cardAuthorName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/author_bluesuit.jpg";
                                }}
                              />
                            ) : (
                              <span>{(cardAuthorName || "AU").slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          {/* Writer Name & Publication Date */}
                          <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700 font-sans">
                            <span>By</span>
                            <span className="font-bold text-slate-900 hover:text-[#BF1E2D] transition-colors">
                              {cardAuthorName}
                            </span>
                            <span className="text-slate-400 font-normal">•</span>
                            <span className="text-slate-500 font-normal uppercase">{article.date}</span>
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
                <p className="text-zinc-700 font-sans text-sm font-semibold mb-1">
                  No published stories yet by {authorProfile.name}.
                </p>
                <p className="text-zinc-400 font-sans text-xs">
                  Articles submitted for review will appear here once approved by Admin and published.
                </p>
              </div>
            )}

            {/* Dynamic Interactive Pagination Controls (10 items per page) */}
            {articlesList.length > 0 && (
              <div className="flex items-center justify-center gap-2 pt-8 font-sans text-[12px] flex-wrap">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 border font-bold rounded transition-colors ${currentPage === 1
                      ? "border-zinc-200 text-zinc-400 cursor-not-allowed bg-zinc-50"
                      : "border-zinc-300 text-slate-800 hover:border-[#BF1E2D] hover:text-[#BF1E2D] cursor-pointer bg-white"
                    }`}
                >
                  PREV
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-9 h-9 font-bold flex items-center justify-center rounded border transition-colors cursor-pointer ${currentPage === pageNum
                        ? "border-[#BF1E2D] bg-[#BF1E2D] text-white shadow-sm"
                        : "border-zinc-200 bg-white text-slate-700 hover:border-[#BF1E2D] hover:text-[#BF1E2D]"
                      }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 border font-bold rounded transition-colors ${currentPage === totalPages
                      ? "border-zinc-200 text-zinc-400 cursor-not-allowed bg-zinc-50"
                      : "border-zinc-300 text-slate-800 hover:border-[#BF1E2D] hover:text-[#BF1E2D] cursor-pointer bg-white"
                    }`}
                >
                  NEXT
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Sidebar (MOST READ + Ad Banner) */}
          <div className="lg:col-span-4 lg:pl-2 space-y-8">

            {/* MOST READ Card Widget */}
            <div className="border border-zinc-200 rounded-xl p-6 bg-white shadow-xs">
              <div className="flex items-center gap-2 pb-4 mb-4 border-b border-zinc-200">
                <span className="text-[#1D9BF0]">📈</span>
                <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">
                  MOST READ
                </h3>
              </div>

              <div className="space-y-4">
                {mostReadItems.map((item, idx) => (
                  <div key={`mostread-${idx}-${item.rank || item.title}`} className="flex gap-3 items-start border-b border-zinc-100 pb-3 last:border-none group cursor-pointer">
                    <span className="text-[20px] font-serif font-bold text-zinc-300 group-hover:text-[#BF1E2D] leading-none pt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex flex-col">
                      <Link href={item.href} className="font-serif text-[12.5px] font-bold text-slate-900 leading-snug hover:text-[#BF1E2D] transition-colors mb-1 block">
                        {item.title}
                      </Link>
                      <span className="text-[10px] text-zinc-400 font-sans">{item.views}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sponsored Editorial Ad Card (Slot 6) */}
            {(() => {
              const authorAdSlot = adSlots.find(s => s.id === "slot-6" || s.categoryGroup === "AUTHOR" || s.title.includes("Author Profile"));
              if (!authorAdSlot || !authorAdSlot.isActive) return null;
              const authorDimensions = formatAdDimensions(authorAdSlot.dimensions || "300X250");
              const hasAuthorImage =
                authorAdSlot.imageUrl &&
                authorAdSlot.imageUrl.trim() !== "" &&
                !isDuplicateAdImage(authorAdSlot.imageUrl, authorAdSlot.id, adSlots);
              const isExternal = (authorAdSlot.actionType || "").toLowerCase().includes("external") || (authorAdSlot.targetUrl || "").startsWith("http");

              if (hasAuthorImage) {
                return (
                  <a
                    href={authorAdSlot.targetUrl || "#"}
                    target={isExternal ? "_blank" : "_self"}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="relative w-full aspect-[4/3] bg-zinc-900 rounded-xl overflow-hidden shadow-md flex items-end p-6 cursor-pointer group block"
                  >
                    <img
                      src={authorAdSlot.imageUrl}
                      alt={authorAdSlot.title || "Sponsor Ad"}
                      className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>

                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase text-white border border-white/10 rounded-xs">
                      Advertisement
                    </div>

                    <div className="relative z-10 text-white font-serif">
                      <p className="text-[20px] font-bold tracking-[2px] uppercase leading-tight mb-1">
                        {authorAdSlot.title ? authorAdSlot.title.replace(/^Author Profile Pages —\s*/i, "").replace(/Ad Box/i, "").trim() || "SPONSORED" : "SPONSORED"}
                      </p>
                      <p className="text-[10px] uppercase tracking-[1px] text-zinc-300 font-sans">
                        {authorAdSlot.description || "Official Partner Sponsor"}
                      </p>
                    </div>
                  </a>
                );
              }

              return (
                <div className="relative w-full aspect-[4/3] bg-[#111827] border border-dashed border-gray-700 rounded-xl overflow-hidden shadow-md flex flex-col items-center justify-center p-6 text-center">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#D31220] font-bold mb-2">
                    ADVERTISEMENT
                  </span>
                  <span className="text-white font-mono font-bold text-base tracking-widest">
                    {authorDimensions}
                  </span>
                  <span className="text-[11px] font-mono text-gray-400 mt-2">
                    Size: {authorDimensions} px
                  </span>
                </div>
              );
            })()}

          </div>

        </div>

      </div>

      <Footer />
    </main>
  );
}

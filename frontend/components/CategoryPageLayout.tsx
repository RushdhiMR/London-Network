"use client";

import { useRef, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { useLiveArticles, articleMatchesCategory } from '@/lib/articlesSync';

interface Article {
  title: string;
  image: string;
  date: string;
  description?: string;
}

interface Guide {
  title: string;
  description: string;
  author: string;
}

interface CategoryPageLayoutProps {
  categoryName: string;
  categoryColor: string; // e.g. "bg-[#FFE9D6]"
  infoBoxText: string;
  infoBoxSubtext?: string;
  featured: {
    category: string;
    title: string;
    description: string;
    image: string;
    author: string;
    date: string;
  };
  secondaryArticles: Article[];
  guidesTitle: string;
  guidesDescription: string;
  guides: Guide[];
  newsTitle: string;
  newsDescription: string;
  newsArticles: Article[];
}

export default function CategoryPageLayout({
  categoryName,
  categoryColor,
  infoBoxText,
  infoBoxSubtext,
  featured,
  secondaryArticles,
  guidesTitle,
  guidesDescription,
  guides,
  newsTitle,
  newsDescription,
  newsArticles
}: CategoryPageLayoutProps) {
  const newsSectionRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 27;

  const { articles: liveArticles = [] } = useLiveArticles();

  // Find all published live articles that match this category or subcategory
  const cleanTarget = (categoryName || "").toLowerCase().replace(/[^a-z0-9]/g, "");

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

  const matchingLive = (Array.isArray(liveArticles) ? liveArticles : []).filter((art: any) => {
    if (!art) return false;
    const st = (art.status || "").toLowerCase().trim();
    if (st !== "published" && st !== "approved") return false;
    return articleMatchesCategory(art, cleanTarget || categoryName);
  }).sort((a: any, b: any) => {
    const timeA = getArticleTimestamp(a);
    const timeB = getArticleTimestamp(b);
    if (timeA !== timeB) return timeB - timeA;
    const aId = Number(a.id) || 0;
    const bId = Number(b.id) || 0;
    return bId - aId;
  });

  const resolveLiveAuthorName = (rawAuthor?: string) => {
    if (!rawAuthor) return "Staff Journalist";
    if (rawAuthor.toLowerCase().includes("administrator") || rawAuthor.toLowerCase().includes("admin") || rawAuthor.toLowerCase() === "editor") {
      return "Rushdhi Riyaj";
    }
    return rawAuthor;
  };

  const activeFeatured = matchingLive.length > 0
    ? {
        category: (matchingLive[0].category || categoryName).toUpperCase(),
        title: matchingLive[0].title,
        description: matchingLive[0].summary || matchingLive[0].description || (matchingLive[0].content ? matchingLive[0].content.replace(/<[^>]+>/g, "").slice(0, 180) + "..." : featured.description),
        image: matchingLive[0].imageUrl || matchingLive[0].image || (matchingLive[0] as any).image_url || featured.image,
        author: resolveLiveAuthorName(matchingLive[0].authorName || (matchingLive[0] as any).author_name || (matchingLive[0] as any).author) || featured.author,
        date: matchingLive[0].date || (matchingLive[0].published_at ? new Date(matchingLive[0].published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : featured.date)
      }
    : featured;

  // The older articles (relative to the brand new featured hero article) show top-to-bottom in order newest to oldest:
  const liveSecondaryFormatted: Article[] = matchingLive.slice(1, 5).map((a: any) => ({
    title: a.title,
    image: a.imageUrl || a.image || a.image_url || "/ai_hero.png",
    date: a.date ? `By ${resolveLiveAuthorName(a.authorName || a.author_name || a.author)} • ${a.date}` : (a.published_at ? `By ${resolveLiveAuthorName(a.authorName || a.author_name || a.author)} • ${new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "July 2026"),
    description: a.summary || a.description || (a.content ? a.content.replace(/<[^>]+>/g, "").slice(0, 140) + "..." : "")
  }));

  const sideBoxArticles = [
    ...liveSecondaryFormatted,
    ...secondaryArticles.filter(sa => !liveSecondaryFormatted.some(la => la.title.toLowerCase().trim() === sa.title.toLowerCase().trim()))
  ].slice(0, 4);

  const activeSecondaryArticles = sideBoxArticles;

  const liveFormattedArticles: Article[] = matchingLive.map((a: any) => ({
    title: a.title,
    image: a.imageUrl || a.image || a.image_url || "/ai_hero.png",
    date: a.date ? `By ${resolveLiveAuthorName(a.authorName || a.author_name || a.author)} • ${a.date}` : `By ${resolveLiveAuthorName(a.authorName || a.author_name || a.author)} • Jul 2026`,
    description: a.summary || a.description || (a.content ? a.content.replace(/<[^>]+>/g, "").slice(0, 140) + "..." : "")
  }));

  // Combine live articles with existing newsArticles (deduplicated by title)
  const combinedNewsArticles = [
    ...liveFormattedArticles,
    ...newsArticles.filter(na => !liveFormattedArticles.some(la => la.title.toLowerCase().trim() === na.title.toLowerCase().trim()))
  ];

  const finalNewsTitle = (() => {
    const raw = (newsTitle || '').trim();
    if (!raw) {
      return categoryName ? `${categoryName} More News` : 'More News';
    }
    if (raw.toLowerCase().endsWith('more news')) {
      return raw;
    }
    if (raw.toLowerCase().endsWith(' news')) {
      return raw.slice(0, -5).trim() + ' More News';
    }
    if (raw.toLowerCase().endsWith(' dispatches')) {
      return raw.slice(0, -11).trim() + ' More News';
    }
    if (raw.toLowerCase() === 'news') {
      return categoryName ? `${categoryName} More News` : 'More News';
    }
    return `${raw} More News`;
  })();

  const finalGuidesTitle =
    guidesTitle.trim().toLowerCase() === 'guides' && categoryName && categoryName.trim().toLowerCase() !== 'guides'
      ? `${categoryName} Guides`
      : guidesTitle;

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    if (newsSectionRef.current) {
      newsSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const getPageNumbers = () => {
    if (currentPage <= 3) {
      return [1, 2, 3, "...", totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  const displayedNewsArticles = combinedNewsArticles.map((art) => {
    if (currentPage === 1) return art;
    return {
      ...art,
      title: `${art.title} (Page ${currentPage})`,
      date: `Page ${currentPage} • ${art.date.includes('•') ? art.date.split('•')[1].trim() : art.date}`
    };
  });

  const getArticleSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/'s/g, 's')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const getArticleHref = (title: string, overrideCategory?: string) => {
    const artSlug = getArticleSlug(title);
    const liveMatch = (Array.isArray(liveArticles) ? liveArticles : []).find(
      (a: any) => a.title && a.title.toLowerCase().trim() === title.toLowerCase().trim()
    );
    // Check both 'category' (local storage) and 'category_name' (server DB field)
    const articleMainCat = liveMatch?.category || liveMatch?.category_name || "";
    const mainCat = (overrideCategory || articleMainCat || categoryName || "news")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-');

    const params = new URLSearchParams();
    // If this category page is NOT the article's main category, it means the user
    // is viewing this article via a subcategory match — pass current page as ?sub
    if (categoryName && categoryName.toLowerCase().replace(/[^a-z0-9]/g, '') !== mainCat.replace(/[^a-z0-9]/g, '')) {
      params.set('sub', categoryName.trim());
    } else if (liveMatch?.subcategories?.[0]) {
      params.set('sub', liveMatch.subcategories[0]);
    }
    if (liveMatch?.id) {
      params.set('id', String(liveMatch.id));
    }

    const queryStr = params.toString();
    return `/${mainCat}/${artSlug}${queryStr ? `?${queryStr}` : ''}`;
  };

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        
        {/* HERO SECTION + CATEGORY INFO BOX */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 items-stretch">
          {/* Left Column (8 cols): Big Featured Image with Title, Excerpt & Byline Below */}
          <div className="lg:col-span-8 flex flex-col group">
            <Link href={getArticleHref(activeFeatured.title)} className="block">
              <div className="relative w-full aspect-[16/11] md:aspect-[16/10.5] max-h-[500px] min-h-[370px] md:min-h-[445px] overflow-hidden bg-white mb-4 rounded-sm flex items-center justify-center">
                <img
                  src={activeFeatured.image}
                  alt={activeFeatured.title}
                  onError={(e) => { e.currentTarget.src = "/ai_hero.png"; }}
                  className="w-full h-full object-cover group-hover:opacity-95 transition-opacity mx-auto block"
                />
              </div>
              <h2 className="text-[22px] md:text-[25px] font-bold leading-snug text-black group-hover:text-[#BF1E2D] transition-colors mb-2 font-standard-sans">
                {activeFeatured.title}
              </h2>
            </Link>
            <p className="text-[13px] md:text-[13.5px] text-zinc-700 leading-relaxed font-sans mb-3">
              {activeFeatured.description}
            </p>
            <p className="text-[11.5px] text-zinc-500 font-sans">
              By <Link href={`/author/${activeFeatured.author.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="underline hover:text-[#BF1E2D] cursor-pointer text-black font-normal">{activeFeatured.author}</Link> {activeFeatured.date}
            </p>
          </div>

          {/* Right Column (4 cols): Category Header + Break + Articles Box */}
          <div className="lg:col-span-4 flex flex-col justify-start">
            {/* Category Heading with Underline */}
            <div className="border-b-2 border-black pb-2 mb-4">
              <h1 className="text-[28px] md:text-[32px] font-bold leading-[1.05] tracking-tight text-black font-standard-sans">
                {categoryName}
              </h1>
            </div>

            {/* Articles Box / Section - Plain Background */}
            <div className="w-full bg-transparent flex flex-col justify-start text-black font-standard-sans">
              {/* 3 Articles inside the Section */}
              <div className="space-y-4 flex flex-col justify-start">
                {sideBoxArticles.map((article, idx) => (
                  <Link
                    key={idx}
                    href={getArticleHref(article.title)}
                    className="group/side flex gap-4 items-start pb-4 border-b border-zinc-200 last:border-b-0 last:pb-0 cursor-pointer"
                  >
                    {article.image && (
                      <div className="relative w-[110px] h-[88px] shrink-0 overflow-hidden bg-zinc-100 rounded-xs">
                        <img
                          src={article.image}
                          alt={article.title}
                          onError={(e) => { e.currentTarget.src = "/ai_hero.png"; }}
                          className="w-full h-full object-cover group-hover/side:opacity-90 transition-opacity"
                        />
                      </div>
                    )}
                    <div className="flex flex-col justify-start min-w-0">
                      <h3 className="text-[15px] md:text-[15.5px] font-normal leading-[1.35] text-black group-hover/side:text-[#BF1E2D] transition-colors line-clamp-2 mb-1.5 font-sans">
                        {article.title}
                      </h3>
                      <p className="text-[12px] text-zinc-500 font-sans">
                        {article.date || "Latest Update"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FULL WIDTH: Category News Feed */}
        <div ref={newsSectionRef} className="pt-8 mt-8 border-t border-gray-200 font-standard-sans">
          <div className="mb-2">
            <h2 className="text-[28px] md:text-[34px] font-bold text-[#BF1E2D] tracking-tight leading-none">
              {finalNewsTitle} {currentPage > 1 && <span className="text-zinc-400 font-normal text-sm lowercase">(page {currentPage} of {totalPages})</span>}
            </h2>
            <p className="text-[13px] md:text-[14px] text-zinc-800 font-normal mt-2 leading-relaxed font-sans">
              {newsDescription}
            </p>
          </div>

          {/* Separator line with thick black bar */}
          <div className="relative w-full h-[1px] bg-zinc-200 mt-3 mb-8">
            <div className="absolute top-0 left-0 w-[70px] h-[3.5px] bg-black" />
          </div>

          <div className="space-y-8 max-w-[1000px]">
            {displayedNewsArticles.map((article, index) => {
              // Extract author and date if combined in string e.g. "By Sarah Miller • 8 hours ago"
              let authorName = "London BigBen Staff";
              let dateStr = article.date;
              
              if (article.date.startsWith("By ")) {
                const parts = article.date.replace(/^By\s+/, '').split('•');
                authorName = parts[0].trim();
                dateStr = parts.slice(1).join('•').trim() || "";
              }

              const articleHref = getArticleHref(article.title);

              return (
                <article key={index} className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start pb-8 border-b border-zinc-100 last:border-b-0 last:pb-0 group">
                  <Link href={articleHref} className="relative w-full sm:w-[220px] md:w-[240px] aspect-[16/10] flex-shrink-0 overflow-hidden bg-gray-100 block">
                    <img
                      src={article.image}
                      alt={article.title}
                      onError={(e) => { e.currentTarget.src = "/ai_hero.png"; }}
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    />
                  </Link>
                  <div className="flex flex-col flex-grow">
                    <Link href={articleHref} className="block">
                      <h3 className="text-[17px] md:text-[18px] font-bold leading-[1.25] text-black group-hover:text-[#BF1E2D] transition-colors mb-2">
                        {article.title}
                      </h3>
                    </Link>
                    <p className="text-[13px] md:text-[13.5px] text-zinc-700 leading-relaxed mb-2.5 font-sans">
                      {article.description}
                    </p>
                    <div className="text-[11.5px] text-zinc-500 font-sans">
                      By <Link href={`/author/${authorName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="underline hover:text-[#BF1E2D] cursor-pointer text-black font-semibold">{authorName}</Link> {dateStr && `• ${dateStr}`}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Category News Feed Pagination */}
          <div className="flex items-center gap-2 mt-10 pt-4 border-t border-gray-100 text-xs font-bold text-gray-500 uppercase select-none">
            {currentPage > 1 && (
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                className="hover:bg-gray-100 px-3 py-2 cursor-pointer transition-colors text-gray-700 font-bold mr-2"
              >
                Previous Page
              </button>
            )}

            {getPageNumbers().map((page, idx) => (
              typeof page === 'number' ? (
                <button
                  key={idx}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 cursor-pointer transition-colors ${
                    currentPage === page
                      ? 'bg-[#CC3333] text-white font-bold'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {page}
                </button>
              ) : (
                <span key={idx} className="px-2 py-2 text-gray-400">
                  {page}
                </span>
              )
            ))}

            {currentPage < totalPages && (
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                className="hover:bg-gray-100 px-4 py-2 cursor-pointer ml-4 transition-colors text-gray-700 font-bold"
              >
                Next Page
              </button>
            )}
          </div>
        </div>

      </section>

      <Footer />
    </main>
  );
}

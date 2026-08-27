"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Filter, Sparkles, ArrowRight, Tag, Clock, User, CheckCircle2, TrendingUp, BookOpen, Users, SlidersHorizontal, X, ArrowUpDown } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllSearchableArticles, searchArticlesByQuery, SearchableArticle } from "@/lib/searchArticles";
import { useLiveArticles } from "@/lib/articlesSync";
import { resolveUserAvatar, getAuthorAvatarByNameOrEmail, getAuthorFullProfileByNameOrEmail, getUserProfile } from "@/lib/userProfiles";

const POPULAR_SEARCH_TAGS = [
  "Business",
  "Artificial Intelligence",
  "Technology",
  "Startups",
  "Markets",
  "China",
  "Canada",
  "World",
  "Environment",
  "Innovation",
  "Politics"
];

const SEARCH_CATEGORIES = [
  "All",
  "Business",
  "Technology",
  "News",
  "Innovation",
  "Industry Insights",
  "World",
  "Markets",
  "Life Style",
  "Politics"
];

interface AuthorMatch {
  name: string;
  slug: string;
  role: string;
  avatar: string;
  bio: string;
  articleCount: number;
}

const KNOWN_AUTHORS: Record<string, { role: string; bio: string; avatar?: string }> = {
  "Rushdhi": {
    role: "WRITER",
    bio: "Rushdhi is a journalist for London BigBen covering business strategy, software architecture, emerging technology, and digital transformation.",
    avatar: "/author_bluesuit.jpg"
  },
  "Muba": {
    role: "SENIOR WRITER",
    bio: "Reports on industry disruptions, macroeconomic trends, lifestyle features, and breaking developments.",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=250&h=250&fit=crop"
  },
  "April Hicke": {
    role: "TECH ANALYST",
    bio: "Reports on biotechnology, scientific research, open science initiatives, and artificial intelligence adoption.",
    avatar: "/author_glasses.jpg"
  },
  "Jennifer Friesen": {
    role: "ASSOCIATE EDITOR",
    bio: "London BigBen's associate editor and Calgary Bureau lead covering energy, technology, and policy.",
    avatar: "/author_woman.jpg"
  },
  "Pramod Jain": {
    role: "ENERGY COLUMNIST",
    bio: "Covers clean technology, energy transition initiatives, and infrastructure projects across North America.",
    avatar: "/author_energy.jpg"
  },
  "Chris Hogg": {
    role: "EXECUTIVE EDITOR",
    bio: "Specializing in digital transformation, financial technology, and executive leadership strategies.",
    avatar: "/author_beard.jpg"
  },
  "Dr. Tim Sandle": {
    role: "SENIOR EDITOR",
    bio: "London-based science journalist covering biotechnology, microbiology, AI in healthcare, and digital transformation.",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=250&h=250&fit=crop"
  },
  "Sarah Miller": {
    role: "REGULATORY CORRESPONDENT",
    bio: "Covers international data privacy regulations, cross-border compliance, and digital rights.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&h=250&fit=crop"
  },
  "David Chen": {
    role: "TECH CORRESPONDENT",
    bio: "Covers open-source software, cloud infrastructure, and quantum computing preview clusters.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&h=250&fit=crop"
  },
  "Lisa Chen": {
    role: "DATA INFRASTRUCTURE REPORTER",
    bio: "Covers next-generation data routing, enterprise AI balance nodes, and telecommunications.",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250&h=250&fit=crop"
  }
};

function SearchResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") || "";

  const [inputQuery, setInputQuery] = useState(rawQuery);
  const [mounted, setMounted] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "articles" | "authors" | "trending">("all");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedAuthor, setSelectedAuthor] = useState("All");
  const [sortBy, setSortBy] = useState<"relevant" | "latest" | "trending">("relevant");
  const [allArticles, setAllArticles] = useState<SearchableArticle[]>([]);
  const [profileVersion, setProfileVersion] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { articles: liveArticles } = useLiveArticles();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfileVersion((v) => v + 1);
      const list = getAllSearchableArticles();
      setAllArticles(list);
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
    setInputQuery(rawQuery);
  }, [rawQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const list = getAllSearchableArticles();
    setAllArticles(list);
  }, [liveArticles]);

  // Extract unique authors across all published articles (strictly authors/journalists, excluding readers and admins)
  const availableAuthors = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    const excludedRoles = ["reader", "admin", "administrator", "co-admin", "system", "staff writer", "staff journalist", "editor", "guest", "unknown"];

    const getCanonical = (name: string) => {
      const clean = name.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
      if (clean.includes("rushdhi")) return "rushdhi";
      if (clean.includes("sarahmitchell") || clean.includes("sarahmiller")) return "sarahmiller";
      return clean;
    };

    allArticles.forEach((art) => {
      const auth = (art.author || "").trim();
      const lowerAuth = auth.toLowerCase();
      if (auth && !excludedRoles.includes(lowerAuth)) {
        const canonical = getCanonical(auth);
        if (canonical && !seen.has(canonical)) {
          seen.add(canonical);
          list.push(auth);
        }
      }
    });

    Object.keys(KNOWN_AUTHORS).forEach((a) => {
      const lowerA = a.toLowerCase();
      if (!excludedRoles.includes(lowerA)) {
        const canonical = getCanonical(a);
        if (canonical && !seen.has(canonical)) {
          seen.add(canonical);
          list.push(a);
        }
      }
    });

    return list.sort((a, b) => a.localeCompare(b));
  }, [allArticles]);

  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    let list = searchArticlesByQuery(allArticles, rawQuery, selectedCategory);

    // Filter by specific Author
    if (selectedAuthor !== "All") {
      list = list.filter((art) => (art.author || "").toLowerCase().trim() === selectedAuthor.toLowerCase().trim());
    }

    // Filter by Content Type
    if (filterType === "trending") {
      list = list.filter((art) => {
        const lowerTitle = art.title.toLowerCase();
        const lowerCategory = art.category.toLowerCase();
        const tags = (art.tags || []).join(" ").toLowerCase();
        return (
          lowerCategory.includes("business") ||
          lowerCategory.includes("tech") ||
          tags.includes("ai") ||
          tags.includes("market") ||
          lowerTitle.includes("ai") ||
          lowerTitle.includes("meta") ||
          lowerTitle.includes("market")
        );
      });
    }

    // Sorting
    if (sortBy === "latest") {
      list = [...list].sort((a, b) => {
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        return idB - idA;
      });
    } else if (sortBy === "trending") {
      list = [...list].sort((a, b) => {
        const scoreA = (a.title.length % 7) + (a.tags?.length || 0);
        const scoreB = (b.title.length % 7) + (b.tags?.length || 0);
        return scoreB - scoreA;
      });
    }

    return list;
  }, [allArticles, rawQuery, selectedCategory, selectedAuthor, filterType, sortBy]);

  // Matching Authors for Author Profile Cards (Strictly journalists/writers, excluding Reader/Admin)
  const matchingAuthors = useMemo<AuthorMatch[]>(() => {
    const q = rawQuery.trim().toLowerCase();
    const results: AuthorMatch[] = [];
    const seenNames = new Set<string>();

    availableAuthors.forEach((authorName) => {
      const lowerName = authorName.toLowerCase().trim();
      if (!lowerName) return;

      // Group/deduplicate variants (e.g. "rushdhi mr" vs "rushdhi")
      const canonicalKey = lowerName.startsWith("rushdhi") ? "rushdhi" : lowerName;
      if (seenNames.has(canonicalKey)) return;
      seenNames.add(canonicalKey);

      const info = KNOWN_AUTHORS[authorName] || {
        role: "JOURNALIST",
        bio: `${authorName} writes and reports for London BigBen.`
      };

      const roleLower = (info.role || "").toLowerCase();
      // Exclude Readers or pure Admins from author matching
      if (roleLower.includes("reader") || roleLower === "admin" || roleLower === "administrator") {
        return;
      }

      // If a specific author is selected in dropdown, match ONLY that exact author
      if (selectedAuthor !== "All") {
        if (selectedAuthor.toLowerCase() !== lowerName && !lowerName.includes(selectedAuthor.toLowerCase())) {
          return;
        }
      } else if (q) {
        // If searching with a text query, verify the author matches the query
        const matchesQuery = lowerName.includes(q) || (info.bio || "").toLowerCase().includes(q) || (info.role || "").toLowerCase().includes(q);
        if (!matchesQuery) {
          return;
        }
      }

      // Retrieve the writer's saved profile details (name, avatar, bio, role)
      const isRushdhi = canonicalKey === "rushdhi" || lowerName.includes("rushdhi");
      const writerProfile = isRushdhi
        ? (getUserProfile("rushdhiwriter@gmail.com") || getUserProfile("writer@digitaljournal.com") || getAuthorFullProfileByNameOrEmail("rushdhi"))
        : (getUserProfile(authorName) || getAuthorFullProfileByNameOrEmail(authorName));

      const resolvedDisplayName = (writerProfile?.name && !writerProfile.name.toLowerCase().includes("reader") ? writerProfile.name : undefined) || authorName;
      const resolvedRole = (writerProfile?.role && !writerProfile.role.toLowerCase().includes("reader") ? writerProfile.role : undefined) || info.role || "JOURNALIST";
      const resolvedBio = (writerProfile?.bio && !writerProfile.bio.toLowerCase().includes("avid reader") ? writerProfile.bio : undefined) || info.bio || `${resolvedDisplayName} writes and reports for London BigBen.`;

      // Look up real custom avatar from author profile database
      const customAvatar =
        (writerProfile?.avatar && !writerProfile.avatar.includes("admin_profile") && !writerProfile.avatar.includes("cart") && (!isRushdhi || !writerProfile.avatar.includes("author_woman")) ? writerProfile.avatar : null) ||
        getAuthorAvatarByNameOrEmail(resolvedDisplayName, isRushdhi ? "rushdhiwriter@gmail.com" : undefined);

      const liveArticleWithAvatar = (Array.isArray(liveArticles) ? liveArticles : []).find(
        (a: any) =>
          (a.authorName || a.author_name || a.author || "").toLowerCase().trim() === lowerName &&
          (a.authorAvatar || a.author_avatar) &&
          (a.authorAvatar || a.author_avatar).length > 5 &&
          !(a.authorAvatar || a.author_avatar).includes("cart") &&
          !(a.authorAvatar || a.author_avatar).includes("admin_profile") &&
          (!isRushdhi || !(a.authorAvatar || a.author_avatar).includes("author_woman"))
      );

      const resolvedLiveAvatar =
        customAvatar ||
        (liveArticleWithAvatar?.authorAvatar || liveArticleWithAvatar?.author_avatar) ||
        (info.avatar && !info.avatar.includes("admin_profile") ? info.avatar : null) ||
        resolveUserAvatar({ name: resolvedDisplayName, role: "Writer" }) ||
        "/author_bluesuit.jpg";

      const count = allArticles.filter((a) => {
        const artAuth = (a.author || "").toLowerCase().trim();
        return artAuth === lowerName || (canonicalKey === "rushdhi" && artAuth.includes("rushdhi"));
      }).length;

      const slug = authorName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      results.push({
        name: resolvedDisplayName,
        slug,
        role: resolvedRole,
        avatar: resolvedLiveAvatar,
        bio: resolvedBio,
        articleCount: count
      });
    });

    return results;
  }, [availableAuthors, rawQuery, selectedAuthor, allArticles, liveArticles, mounted, profileVersion]);

  // Live real-time suggestions computed from user typing
  const searchSuggestions = useMemo(() => {
    const q = inputQuery.trim().toLowerCase();
    if (!q) return { articles: [], authors: [], topics: [] };

    const matchingArticles = searchArticlesByQuery(allArticles, q).slice(0, 5);

    const matchingAuthorsList = matchingAuthors.filter(a =>
      (a?.name || "").toLowerCase().includes(q) || (a?.role || "").toLowerCase().includes(q)
    ).slice(0, 3);

    const matchingTopics = POPULAR_SEARCH_TAGS.filter(t =>
      (t || "").toLowerCase().includes(q) && (t || "").toLowerCase() !== q
    ).slice(0, 4);

    return {
      articles: matchingArticles,
      authors: matchingAuthorsList,
      topics: matchingTopics,
    };
  }, [inputQuery, allArticles, matchingAuthors]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputQuery.trim();
    setIsFocused(false);
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  const handleResetFilters = () => {
    setFilterType("all");
    setSelectedCategory("All");
    setSelectedAuthor("All");
    setSortBy("relevant");
  };

  const isAnyFilterActive = filterType !== "all" || selectedCategory !== "All" || selectedAuthor !== "All" || sortBy !== "relevant";

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-10 font-sans min-h-[65vh]">
      {/* SEARCH HEADER & INLINE SEARCH BAR */}
      <div className="border-b border-zinc-200 pb-8 mb-8 text-center">
        <div className="max-w-3xl mx-auto mb-6 text-center">
          <h1 className="text-[28px] md:text-[36px] font-serif font-bold text-zinc-900 leading-tight">
            Search News &amp; Articles
          </h1>
          <p className="text-[14px] text-zinc-500 mt-1.5 font-normal max-w-xl mx-auto">
            {rawQuery ? (
              <>
                Showing results for &ldquo;<span className="font-bold text-zinc-900">{rawQuery}</span>&rdquo; &bull;{" "}
                <span className="font-semibold text-[#BF1E2D]">{filteredArticles.length}</span> {filteredArticles.length === 1 ? "article" : "articles"} found
                {matchingAuthors.length > 0 && ` &bull; ${matchingAuthors.length} author${matchingAuthors.length === 1 ? "" : "s"}`}
              </>
            ) : (
              "Search across all breaking news, business analysis, technology, journalists, and insights."
            )}
          </p>
        </div>

        {/* INLINE SEARCH INPUT FORM WITH LIVE INSTANT SUGGESTIONS DROPDOWN */}
        <div ref={searchContainerRef} className="relative max-w-3xl mx-auto mb-6 text-left">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              placeholder="Search news, topics, companies, authors..."
              value={inputQuery}
              onFocus={() => setIsFocused(true)}
              onChange={(e) => {
                setInputQuery(e.target.value);
                setIsFocused(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsFocused(false);
                }
              }}
              className="w-full pl-5 pr-28 py-3.5 text-[15px] border-2 border-zinc-200 rounded-2xl focus:outline-none focus:border-[#BF1E2D] bg-zinc-50/70 focus:bg-white text-zinc-900 placeholder-zinc-400 transition-all shadow-xs"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 bg-[#BF1E2D] hover:bg-red-700 text-white font-bold text-xs px-5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shadow-xs"
            >
              <Search size={14} strokeWidth={2.5} />
              <span>Search</span>
            </button>
          </form>

          {/* LIVE INSTANT SUGGESTIONS DROPDOWN */}
          {isFocused && inputQuery.trim().length > 0 && (searchSuggestions.articles.length > 0 || searchSuggestions.authors.length > 0 || searchSuggestions.topics.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-2xl z-[1000] overflow-hidden text-left font-sans animate-in fade-in slide-in-from-top-1 duration-150 ring-1 ring-black/5">
              
              {/* Header count summary */}
              <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase text-[#BF1E2D] tracking-wider flex items-center gap-1">
                  <Sparkles size={12} />
                  Live Suggestions
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">Press Enter to view all results</span>
              </div>

              {/* Topics Pills */}
              {searchSuggestions.topics.length > 0 && (
                <div className="p-3 bg-zinc-50/50 border-b border-zinc-100 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider mr-1">
                    Related Topics:
                  </span>
                  {searchSuggestions.topics.map((top) => (
                    <button
                      key={top}
                      type="button"
                      onClick={() => {
                        setInputQuery(top);
                        setIsFocused(false);
                        router.push(`/search?q=${encodeURIComponent(top)}`);
                      }}
                      className="text-[11px] font-bold text-zinc-700 bg-white hover:bg-red-50 hover:text-[#BF1E2D] px-2.5 py-1 rounded-lg border border-zinc-200 transition-colors cursor-pointer shadow-2xs"
                    >
                      #{top}
                    </button>
                  ))}
                </div>
              )}

              {/* Suggested Authors */}
              {searchSuggestions.authors.length > 0 && (
                <div className="p-2 border-b border-zinc-100 bg-white">
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">
                    Authors &amp; Journalists
                  </div>
                  <div className="divide-y divide-zinc-50">
                    {searchSuggestions.authors.map((auth) => (
                      <Link
                        key={auth.slug}
                        href={`/author/${auth.slug}`}
                        onClick={() => setIsFocused(false)}
                        className="flex items-center gap-3 p-2 hover:bg-red-50/40 rounded-xl transition-colors group cursor-pointer"
                      >
                        <img
                          src={auth.avatar}
                          alt={auth.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-200"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] font-bold text-zinc-900 group-hover:text-[#BF1E2D] transition-colors truncate">
                              {auth.name}
                            </span>
                            <span className="text-[9.5px] font-bold text-[#BF1E2D] bg-red-50 px-1.5 py-0.5 rounded">
                              {auth.role}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-zinc-500 truncate">
                            {auth.bio}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Articles */}
              {searchSuggestions.articles.length > 0 && (
                <div className="divide-y divide-zinc-100 max-h-[340px] overflow-y-auto">
                  <div className="px-4 pt-2.5 pb-1 text-[10px] font-extrabold uppercase text-zinc-400 tracking-wider">
                    Matching Articles
                  </div>
                  {searchSuggestions.articles.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setIsFocused(false)}
                      className="flex items-center gap-3.5 p-3 hover:bg-red-50/40 transition-colors group cursor-pointer"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-12 h-12 rounded-lg object-cover bg-zinc-100 shrink-0 border border-zinc-200"
                        onError={(e) => {
                          e.currentTarget.src = "/argentina_vs_switzerland.png";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#BF1E2D] bg-red-50 px-1.5 py-0.5 rounded">
                            {item.category}
                          </span>
                          {item.readDuration && (
                            <span className="text-[10px] text-zinc-400 font-mono">
                              • {item.readDuration}
                            </span>
                          )}
                        </div>
                        <h4 className="text-[12.5px] font-bold text-zinc-900 leading-snug truncate group-hover:text-[#BF1E2D] transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Bottom Action: View all results */}
              <div className="p-2.5 bg-zinc-50 border-t border-zinc-100 text-center">
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="w-full py-1.5 px-4 text-[12px] font-bold text-[#BF1E2D] hover:text-red-700 hover:bg-red-100/50 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>See all results for &ldquo;{inputQuery}&rdquo;</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PRIMARY FILTER TABS: All, Articles, Authors, Trending */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-none flex-wrap">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === "all"
                ? "bg-zinc-900 text-white shadow-sm"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
            }`}
          >
            <Sparkles size={14} />
            <span>All Results</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType("articles")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === "articles"
                ? "bg-zinc-900 text-white shadow-sm"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
            }`}
          >
            <BookOpen size={14} />
            <span>Articles ({filteredArticles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType("authors")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === "authors"
                ? "bg-zinc-900 text-white shadow-sm"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
            }`}
          >
            <Users size={14} />
            <span>Authors &amp; Journalists ({matchingAuthors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType("trending")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === "trending"
                ? "bg-[#BF1E2D] text-white shadow-sm"
                : "bg-zinc-100 text-zinc-600 hover:bg-red-50 hover:text-[#BF1E2D]"
            }`}
          >
            <TrendingUp size={14} />
            <span>Trending Stories</span>
          </button>
        </div>
      </div>

      {/* MATCHING AUTHORS SECTION (Shown in 'authors' view or when matching author on 'all' view) */}
      {(filterType === "authors" || (filterType === "all" && matchingAuthors.length > 0 && rawQuery.trim())) && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-200">
            <h2 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
              <Users size={18} className="text-[#BF1E2D]" />
              <span>Matching Authors &amp; Journalists ({matchingAuthors.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchingAuthors.map((author) => (
              <div
                key={author.slug}
                className="border border-zinc-200 rounded-2xl p-5 bg-white shadow-2xs hover:shadow-md hover:border-zinc-300 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start gap-4 mb-3">
                  <div className="relative shrink-0">
                    <img
                      src={author.avatar}
                      alt={author.name}
                      suppressHydrationWarning
                      onError={(e) => {
                        e.currentTarget.src = "/author_bluesuit.jpg";
                      }}
                      className="w-14 h-14 rounded-full object-cover border border-zinc-200"
                    />
                    <CheckCircle2 size={16} className="text-[#1D9BF0] fill-white absolute -bottom-1 -right-1" />
                  </div>
                  <div>
                    <Link
                      href={`/author/${author.slug}`}
                      suppressHydrationWarning
                      className="font-serif text-base font-bold text-zinc-900 hover:text-[#BF1E2D] transition-colors leading-tight block"
                    >
                      {author.name}
                    </Link>
                    <span suppressHydrationWarning className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block mt-0.5">
                      {author.role}
                    </span>
                    <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {author.articleCount} published {author.articleCount === 1 ? "article" : "articles"}
                    </span>
                  </div>
                </div>

                <p suppressHydrationWarning className="text-xs text-zinc-600 line-clamp-2 leading-relaxed mb-4">
                  {author.bio}
                </p>

                <Link
                  href={`/author/${author.slug}`}
                  className="w-full py-2 px-3 bg-zinc-100 hover:bg-[#BF1E2D] hover:text-white text-zinc-800 font-bold text-xs rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1 mt-auto"
                >
                  <span>View Full Profile &amp; Articles</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ARTICLES RESULTS GRID (When not exclusively in 'authors' view) */}
      {filterType !== "authors" && (
        <>
          {filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredArticles.map((art) => (
                <article
                  key={art.id}
                  className="flex flex-col border border-zinc-200/90 rounded-none overflow-hidden hover:shadow-md hover:border-zinc-300 transition-all bg-white group"
                >
                  {/* Card Image */}
                  <Link href={art.href} className="aspect-video w-full overflow-hidden bg-zinc-100 block relative rounded-none">
                    <img
                      src={art.image}
                      alt={art.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 rounded-none"
                      onError={(e) => {
                        e.currentTarget.src = "/argentina_vs_switzerland.png";
                      }}
                    />
                    <span className="absolute top-3 left-3 bg-[#BF1E2D] text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-none shadow-xs">
                      {art.category}
                    </span>
                  </Link>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <Link
                        href={art.href}
                        className="text-[17px] font-serif font-bold leading-snug text-zinc-900 group-hover:text-[#BF1E2D] transition-colors block mb-2.5 line-clamp-2"
                      >
                        {art.title}
                      </Link>
                      <p className="text-[13px] text-zinc-600 leading-relaxed mb-4 line-clamp-3">
                        {art.description}
                      </p>
                    </div>

                    {/* Card Footer: Metadata */}
                    <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-[11.5px] text-zinc-400 font-medium mt-auto">
                      {art.author ? (
                        <Link
                          href={`/author/${art.author.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                          className="flex items-center gap-1.5 text-zinc-600 font-semibold truncate max-w-[170px] hover:text-[#BF1E2D] transition-colors"
                        >
                          <User size={12} className="text-zinc-400 shrink-0" />
                          <span className="truncate">{art.author}</span>
                        </Link>
                      ) : (
                        <span className="flex items-center gap-1.5 text-zinc-500 font-semibold truncate max-w-[170px]">
                          <User size={12} className="text-zinc-400 shrink-0" />
                          <span>Staff Writer</span>
                        </span>
                      )}

                      {art.readDuration && (
                        <span className="flex items-center gap-1 font-mono text-zinc-400 shrink-0">
                          <Clock size={11} />
                          {art.readDuration}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            /* EMPTY SEARCH STATE WITH SUGGESTED TOPICS */
            <div className="text-center py-16 px-4 bg-zinc-50/70 border border-zinc-200 rounded-3xl max-w-2xl mx-auto my-6">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#BF1E2D] mx-auto flex items-center justify-center mb-4">
                <Search size={26} strokeWidth={2.2} />
              </div>
              <h3 className="text-lg font-serif font-bold text-zinc-900 mb-1">
                No articles found matching &ldquo;{rawQuery}&rdquo;
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto mb-6">
                We couldn&apos;t find any articles matching your search filters. Try adjusting your filters, selecting a different category, or browsing our trending topics.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto mb-6">
                {POPULAR_SEARCH_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => router.push(`/search?q=${encodeURIComponent(tag)}`)}
                    className="text-xs font-bold text-zinc-700 bg-white border border-zinc-200 hover:border-[#BF1E2D] hover:text-[#BF1E2D] px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-center gap-3">
                {isAnyFilterActive && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 px-4 py-2 rounded-xl hover:bg-zinc-100 cursor-pointer"
                  >
                    <X size={13} />
                    <span>Clear All Filters</span>
                  </button>
                )}
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#BF1E2D] hover:underline"
                >
                  <span>Return to Homepage</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <Suspense
        fallback={
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-20 text-center font-sans min-h-[60vh]">
            <p className="text-[15px] text-zinc-500">Loading search results...</p>
          </div>
        }
      >
        <SearchResultsContent />
      </Suspense>
      <Footer />
    </main>
  );
}

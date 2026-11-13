"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Mail, Link2, Bell, ChevronRight, Award, BookOpen, ShieldCheck, Check, Calendar } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLiveArticles } from "@/lib/articlesSync";
import { useAuth } from "@/lib/auth-context";
import { getUserProfile, getAuthorAvatarByNameOrEmail, getAuthorFullProfileByNameOrEmail, resolveUserAvatar } from "@/lib/userProfiles";
import { dispatchPageDataReady } from "@/components/GlobalPageLoader";

export interface ArticleItem {
  category: string;
  href: string;
  title: string;
  desc: string;
  date: string;
  image: string;
  authorName?: string;
  authorAvatar?: string;
}

export interface SidebarItem {
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
    location?: string;
    email?: string;
    city?: string;
    country?: string;
    articlesCount?: number;
    yearsOfExperience?: number;
    articleViews?: string;
    coverageAreas?: string[];
    aboutTheJournalist?: string;
    journalisticApproach?: string;
    joinedDate?: string;
    expertise?: string[];
    expertiseRatings?: Record<string, number>;
  };
  initialArticles: ArticleItem[];
  mostReadSidebar?: SidebarItem[];
}

interface WriterCardItem {
  name: string;
  role: string;
  articlesCount: number;
  avatar: string;
  slug: string;
}

export default function AuthorProfileContent({
  slug,
  author,
  initialArticles,
}: AuthorProfileContentProps) {
  const router = useRouter();
  const [authorProfile, setAuthorProfile] = useState(author);
  const [articlesList, setArticlesList] = useState<ArticleItem[]>(initialArticles);
  const [visibleCount, setVisibleCount] = useState(6);
  const [activeTab, setActiveTab] = useState<"articles" | "about" | "coverage" | "awards">("articles");

  const handleTabChange = (tabId: "articles" | "about" | "coverage" | "awards") => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      window.history.replaceState({}, "", url.toString());
    }
  };
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followToast, setFollowToast] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [moreWriters, setMoreWriters] = useState<WriterCardItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncTick, setSyncTick] = useState(0);
  const { articles: liveArticles } = useLiveArticles();
  const auth = useAuth();

  useEffect(() => {
    const handleSync = () => {
      setSyncTick((prev) => prev + 1);
    };
    window.addEventListener("dj_articles_updated", handleSync);
    window.addEventListener("dj_profile_updated", handleSync);
    window.addEventListener("dj_auth_change", handleSync);
    return () => {
      window.removeEventListener("dj_articles_updated", handleSync);
      window.removeEventListener("dj_profile_updated", handleSync);
      window.removeEventListener("dj_auth_change", handleSync);
    };
  }, []);

  // Support direct URL navigation/linking to tabs (e.g. ?tab=coverage or #coverage)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      const hash = window.location.hash.replace("#", "");
      const target = tabParam || hash;
      if (target && ["articles", "about", "coverage", "awards"].includes(target)) {
        setActiveTab(target as any);
      }
    }
  }, []);

  // Check initial follow state and handle pending follow if user just signed in
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`followed_author_${slug}`) === "true";
      setIsFollowing(stored);
    } catch (e) {}

    if (auth.authenticated && auth.user?.email) {
      const checkFollowStatus = async () => {
        try {
          // Check for pending follow saved before redirecting to login
          const pendingStr = localStorage.getItem("pending_follow_author");
          if (pendingStr) {
            try {
              const pending = JSON.parse(pendingStr);
              if (pending?.slug === slug) {
                localStorage.removeItem("pending_follow_author");
                await executeFollow(true);
                return;
              }
            } catch (err) {}
          }

          const userEmail = auth.user?.email || "";
          if (!userEmail) return;

          const res = await fetch(`/api/author/follow?authorSlug=${encodeURIComponent(slug)}&email=${encodeURIComponent(userEmail)}`);
          if (res.ok) {
            const data = await res.json();
            if (typeof data.isFollowing === "boolean") {
              setIsFollowing(data.isFollowing);
              localStorage.setItem(`followed_author_${slug}`, String(data.isFollowing));
            }
          }
        } catch (err) {}
      };
      checkFollowStatus();
    }
  }, [slug, auth.authenticated, auth.user?.email]);

  const executeFollow = async (targetState: boolean) => {
    setFollowLoading(true);
    setIsFollowing(targetState);
    try {
      localStorage.setItem(`followed_author_${slug}`, String(targetState));
    } catch (e) {}

    try {
      const res = await fetch("/api/author/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorSlug: slug,
          authorName: authorProfile.name,
          followerEmail: auth.user?.email,
          action: targetState ? "follow" : "unfollow"
        })
      });

      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
        localStorage.setItem(`followed_author_${slug}`, String(data.isFollowing));
        setFollowToast({
          message: data.isFollowing
            ? `✓ You are now following ${authorProfile.name}! You will be notified whenever they publish a new article.`
            : `Unfollowed ${authorProfile.name}. Notifications turned off.`,
          type: data.isFollowing ? "success" : "info"
        });
      }
    } catch (err) {
      console.warn("Follow author network notice:", err);
    } finally {
      setFollowLoading(false);
      setTimeout(() => {
        setFollowToast(null);
      }, 5000);
    }
  };

  const handleFollowClick = () => {
    // If not signed in, prompt/redirect to login with return redirect
    if (!auth.authenticated || !auth.user) {
      try {
        localStorage.setItem("pending_follow_author", JSON.stringify({ slug, name: authorProfile.name }));
        localStorage.setItem("dj_toast", `Please sign in to follow ${authorProfile.name} and receive notifications for their articles.`);
      } catch (e) {}
      router.push(`/login?redirect=${encodeURIComponent(`/author/${slug}`)}`);
      return;
    }

    // Toggle follow state for authenticated reader
    executeFollow(!isFollowing);
  };

  useEffect(() => {
    try {
      const slugClean = slug.toLowerCase().replace(/-/g, " ").trim();

      // 1. Establish baseline from author prop
      let finalName = author.name || "Author";
      let finalAvatar = author.avatar;
      let finalRole = author.role || "POLITICAL CORRESPONDENT";
      let finalBio = author.bio;
      let finalLocation = author.location || "London, United Kingdom";
      let finalEmail = author.email || `${slug.replace(/-/g, ".")}@londonbigben.com`;
      let finalCoverage = author.coverageAreas || [
        "UK Politics", "Parliament", "Government Policy",
        "International Relations", "EU-UK Relations", "Elections",
        "Defence and Security", "Trade", "Brexit", "Diplomacy"
      ];

      // 2. Look up live profile data from user profiles database
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
        if (savedProfile.email) finalEmail = savedProfile.email;
      }

      const resolvedAvatar =
        (savedProfile?.avatar && !savedProfile.avatar.includes("cart") && !savedProfile.avatar.includes("admin_profile") ? savedProfile.avatar : null) ||
        (auth.user && auth.user.avatar && !auth.user.avatar.includes("cart") && (auth.user.name === finalName || isRushdhiPage) ? auth.user.avatar : null) ||
        getAuthorAvatarByNameOrEmail(finalName, isRushdhiPage ? "rushdhiwriter@gmail.com" : undefined);

      if (resolvedAvatar && resolvedAvatar.length > 5 && !resolvedAvatar.includes("cart") && !resolvedAvatar.includes("admin_profile")) {
        finalAvatar = resolvedAvatar;
      }

      // 3. Filter published articles by THIS SPECIFIC AUTHOR from live articles database
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
          const cat = (post.category || "POLITICS").toLowerCase();
          const articleSlug = (post.title || "")
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");

          const displayDate = post.date || (post.updated_at ? new Date(post.updated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : (post.published_at ? new Date(post.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "October 2026"));

          return {
            category: (post.category || "POLITICS").toUpperCase(),
            href: `/${cat}/${articleSlug}`,
            title: post.title,
            desc: post.summary || (post.content || "").replace(/<[^>]*>?/gm, "").slice(0, 160) + "...",
            date: displayDate,
            image: post.imageUrl || post.image || "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=350&fit=crop",
            authorName: finalName,
            authorAvatar: finalAvatar,
          };
        });

        // Merge with initial articles if live articles count is fewer than 6
        if (mappedArticles.length < 6) {
          const remainingInitial = initialArticles.slice(0, 6 - mappedArticles.length);
          mappedArticles = [...mappedArticles, ...remainingInitial];
        }
      } else {
        mappedArticles = initialArticles;
      }

      setArticlesList(mappedArticles);

      // Helper to extract reads/views count from any article object
      const getArticleReads = (a: any): number => {
        if (!a) return 0;
        const v = (a as any).reads_count ?? (a as any).views ?? (a as any).reads ?? (typeof (a as any).views === "string" ? parseInt((a as any).views, 10) : 0) ?? 0;
        const num = typeof v === "number" ? v : parseInt(String(v).replace(/[^0-9]/g, ""), 10);
        return isNaN(num) ? 0 : num;
      };

      const formatViewsCount = (count: number): string => {
        if (count >= 1000000) {
          return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
        }
        if (count >= 1000) {
          return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
        }
        return count.toLocaleString();
      };

      // 4. Automatically compute Article Count & Total Article Views
      let finalArticlesCount: number;
      let finalViews: string;

      if (publishedByAuthor.length > 0) {
        finalArticlesCount = publishedByAuthor.length;
        const totalViews = publishedByAuthor.reduce((sum, art) => sum + getArticleReads(art), 0);
        finalViews = formatViewsCount(totalViews);
      } else if (slugClean.includes("sarah")) {
        finalArticlesCount = mappedArticles.length > 0 ? mappedArticles.length : 526;
        finalViews = "18.4M";
      } else {
        finalArticlesCount = mappedArticles.length;
        const totalViews = mappedArticles.reduce((sum, art) => sum + getArticleReads(art), 0);
        finalViews = totalViews > 0 ? formatViewsCount(totalViews) : "0";
      }

      // 5. Automatically load Years of Experience and Areas of Coverage from author account or profile
      let finalYears = 0;
      if (savedProfile?.yearsOfExperience !== undefined && savedProfile?.yearsOfExperience !== null && savedProfile?.yearsOfExperience !== "") {
        finalYears = Number(savedProfile.yearsOfExperience);
      } else if (savedProfile?.years_of_experience !== undefined && savedProfile?.years_of_experience !== null && savedProfile?.years_of_experience !== "") {
        finalYears = Number(savedProfile.years_of_experience);
      } else if (auth.user && (auth.user.name === finalName || isRushdhiPage) && ((auth.user as any).yearsOfExperience || (auth.user as any).years_of_experience)) {
        finalYears = Number((auth.user as any).yearsOfExperience || (auth.user as any).years_of_experience);
      } else if (author.yearsOfExperience !== undefined && author.yearsOfExperience !== null) {
        finalYears = Number(author.yearsOfExperience);
      } else if (slugClean.includes("sarah")) {
        finalYears = 12;
      }

      const normalizeCoverage = (raw: any): string[] | null => {
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map((s) => (typeof s === "object" && s?.topic ? String(s.topic) : String(s || "")).trim()).filter(Boolean);
        }
        if (typeof raw === "string" && raw.trim()) return raw.split(",").map((s) => s.trim()).filter(Boolean);
        return null;
      };

      const savedCov = normalizeCoverage((savedProfile as any)?.coverageAreas ?? (savedProfile as any)?.coverage_areas);
      const authCov = (auth.user && (auth.user.name === finalName || isRushdhiPage))
        ? normalizeCoverage((auth.user as any).coverageAreas ?? (auth.user as any).coverage_areas)
        : null;

      const savedExp = normalizeCoverage((savedProfile as any)?.expertise);
      const authExp = (auth.user && (auth.user.name === finalName || isRushdhiPage))
        ? normalizeCoverage((auth.user as any).expertise)
        : null;
      const initialExpertise = savedExp || authExp || (author as any).expertise || null;

      const savedRatings = (savedProfile as any)?.expertiseRatings || (savedProfile as any)?.expertise_ratings;
      const authRatings = (auth.user && (auth.user.name === finalName || isRushdhiPage))
        ? ((auth.user as any).expertiseRatings || (auth.user as any).expertise_ratings)
        : undefined;
      const initialRatings = savedRatings || authRatings || (author as any).expertiseRatings || undefined;

      const savedCity = (savedProfile as any)?.city;
      const authCity = (auth.user && (auth.user.name === finalName || isRushdhiPage)) ? (auth.user as any).city : undefined;
      const initialCity = savedCity || authCity || (author as any).city || undefined;

      const savedCountry = (savedProfile as any)?.country;
      const authCountry = (auth.user && (auth.user.name === finalName || isRushdhiPage)) ? (auth.user as any).country : undefined;
      const initialCountry = savedCountry || authCountry || (author as any).country || undefined;

      if (savedCov && savedCov.length > 0) {
        finalCoverage = savedCov;
      } else if (authCov && authCov.length > 0) {
        finalCoverage = authCov;
      } else if (initialExpertise && initialExpertise.length > 0) {
        finalCoverage = initialExpertise;
      }

      const savedAboutJ = (savedProfile as any)?.aboutTheJournalist ?? (savedProfile as any)?.about_the_journalist;
      const authAboutJ = (auth.user && (auth.user.name === finalName || isRushdhiPage))
        ? ((auth.user as any).aboutTheJournalist ?? (auth.user as any).about_the_journalist)
        : undefined;
      const finalAboutJ = savedAboutJ || authAboutJ || author.aboutTheJournalist || "";

      const savedApproachJ = (savedProfile as any)?.journalisticApproach ?? (savedProfile as any)?.journalistic_approach;
      const authApproachJ = (auth.user && (auth.user.name === finalName || isRushdhiPage))
        ? ((auth.user as any).journalisticApproach ?? (auth.user as any).journalistic_approach)
        : undefined;
      const finalApproachJ = savedApproachJ || authApproachJ || author.journalisticApproach || "";

      setAuthorProfile({
        name: finalName,
        role: finalRole,
        avatar: finalAvatar,
        bio: finalBio,
        location: finalLocation,
        city: initialCity,
        country: initialCountry,
        email: finalEmail,
        coverageAreas: finalCoverage,
        articlesCount: finalArticlesCount,
        yearsOfExperience: finalYears,
        articleViews: finalViews,
        aboutTheJournalist: finalAboutJ,
        journalisticApproach: finalApproachJ,
        joinedDate: author.joinedDate || "March 2018",
        expertise: initialExpertise,
        expertiseRatings: initialRatings,
      });

      // Also hydrate latest experience, coverage areas, about, approach, joined date, bio & avatar from backend DB API for any visitor
      const lookupParam = finalEmail ? `email=${encodeURIComponent(finalEmail)}` : `name=${encodeURIComponent(finalName)}`;
      fetch(`/api/auth/profile?${lookupParam}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && data.user) {
            const dbUser = data.user;
            const dbExp = dbUser.yearsOfExperience ?? dbUser.years_of_experience;
            const dbCov = normalizeCoverage(dbUser.coverageAreas ?? dbUser.coverage_areas);
            const dbExpSlots = normalizeCoverage(dbUser.expertise);
            const dbRatings = dbUser.expertiseRatings ?? dbUser.expertise_ratings;
            const dbAbout = dbUser.aboutTheJournalist ?? dbUser.about_the_journalist;
            const dbApproach = dbUser.journalisticApproach ?? dbUser.journalistic_approach;
            const dbCity = dbUser.city;
            const dbCountry = dbUser.country;
            const dbLocation = dbUser.location || (dbCity && dbCountry ? `${dbCity}, ${dbCountry}` : (dbCity || dbCountry));
            let formattedJoined: string | undefined;
            if (dbUser.created_at) {
              try {
                const d = new Date(dbUser.created_at);
                if (!isNaN(d.getTime())) {
                  formattedJoined = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
                }
              } catch {}
            }
            setAuthorProfile((prev) => ({
              ...prev,
              ...(dbUser.name && !dbUser.name.toLowerCase().includes("reader") ? { name: dbUser.name } : {}),
              ...(dbUser.bio && !dbUser.bio.toLowerCase().includes("avid reader") ? { bio: dbUser.bio } : {}),
              ...(dbUser.avatar && dbUser.avatar.length > 5 && !dbUser.avatar.includes("cart") && !dbUser.avatar.includes("admin_profile") ? { avatar: dbUser.avatar } : {}),
              ...(dbExp !== undefined && dbExp !== null && dbExp !== "" ? { yearsOfExperience: Number(dbExp) } : {}),
              ...(dbCov && dbCov.length > 0 ? { coverageAreas: dbCov } : {}),
              ...(dbExpSlots && dbExpSlots.length > 0 ? { expertise: dbExpSlots } : {}),
              ...(dbRatings && typeof dbRatings === "object" ? { expertiseRatings: dbRatings } : {}),
              ...(dbCity ? { city: dbCity } : {}),
              ...(dbCountry ? { country: dbCountry } : {}),
              ...(dbLocation ? { location: dbLocation } : {}),
              ...(dbAbout ? { aboutTheJournalist: dbAbout } : {}),
              ...(dbApproach ? { journalisticApproach: dbApproach } : {}),
              ...(formattedJoined ? { joinedDate: formattedJoined } : {}),
            }));
          }
        })
        .catch(() => {});

      setIsLoaded(true);
    } catch (e) {
      console.warn("Could not load dynamic author profile and published articles:", e);
      setIsLoaded(true);
    }
  }, [slug, author, initialArticles, liveArticles, syncTick]);

  useEffect(() => {
    let active = true;
    async function loadRegisteredWriters() {
      try {
        const [writersRes, teamRes] = await Promise.all([
          fetch("/api/auth/profile?list=writers", { cache: "no-store" }).catch(() => null),
          fetch("/api/team", { cache: "no-store" }).catch(() => null),
        ]);

        const writersData = writersRes && writersRes.ok ? await writersRes.json() : null;
        const teamData = teamRes && teamRes.ok ? await teamRes.json() : null;

        const mergedMap = new Map<string, WriterCardItem>();

        const countArticlesFor = (wName: string, wEmail?: string, serverCount = 0) => {
          if (!Array.isArray(liveArticles) || liveArticles.length === 0) return serverCount;
          const cleanN = wName.toLowerCase().trim();
          const cleanE = (wEmail || "").toLowerCase().trim();
          const localCount = liveArticles.filter((post: any) => {
            const st = (post.status || "Published").toLowerCase();
            if (st !== "published" && st !== "approved") return false;
            const pName = (post.authorName || post.author_name || post.author || "").toLowerCase().trim();
            const pEmail = (post.authorEmail || post.author_email || "").toLowerCase().trim();
            return (cleanE && pEmail === cleanE) || (cleanN && pName === cleanN);
          }).length;
          return Math.max(localCount, serverCount);
        };

        const addCandidate = (item: { name: string; slug: string; role: string; avatar?: string; email?: string; articlesCount?: number }) => {
          const cleanName = (item.name || "").trim();
          const cleanSlug = (item.slug || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")).trim();
          if (!cleanName || !cleanSlug) return;
          if (cleanSlug === slug || cleanName.toLowerCase() === authorProfile.name.toLowerCase()) return;

          const resolvedAv =
            (item.avatar && item.avatar.length > 5 && !item.avatar.includes("cart") ? item.avatar : null) ||
            resolveUserAvatar({ name: cleanName, email: item.email }) ||
            getAuthorAvatarByNameOrEmail(cleanName, item.email) ||
            "/author_bluesuit.jpg";

          const key = cleanSlug;
          const existing = mergedMap.get(key);
          const artCount = countArticlesFor(cleanName, item.email, item.articlesCount || 0);

          if (!existing) {
            mergedMap.set(key, {
              name: cleanName,
              slug: cleanSlug,
              role: item.role || "Staff Journalist",
              avatar: resolvedAv,
              articlesCount: artCount,
            });
          } else {
            mergedMap.set(key, {
              ...existing,
              role: item.role && item.role !== "Staff Journalist" ? item.role : existing.role,
              avatar: existing.avatar !== "/author_bluesuit.jpg" ? existing.avatar : resolvedAv,
              articlesCount: Math.max(existing.articlesCount, artCount),
            });
          }
        };

        if (writersData?.success && Array.isArray(writersData.writers)) {
          writersData.writers.forEach((w: any) => addCandidate(w));
        }

        if (teamData?.success && Array.isArray(teamData.team)) {
          teamData.team.forEach((t: any) =>
            addCandidate({
              name: t.name,
              slug: t.slug,
              role: t.role,
              avatar: t.image || t.fallbackImage,
              email: t.email,
              articlesCount: 0,
            })
          );
        }

        const list = Array.from(mergedMap.values())
          .sort((a, b) => b.articlesCount - a.articlesCount)
          .slice(0, 8);

        if (active) {
          setMoreWriters(list);
        }
      } catch (err) {
        console.warn("Failed to load registered writers:", err);
      }
    }
    loadRegisteredWriters();
    return () => {
      active = false;
    };
  }, [slug, authorProfile.name, liveArticles]);

  useEffect(() => {
    if (isLoaded) {
      dispatchPageDataReady();
    }
  }, [isLoaded]);

  const slugClean = (slug || "").toLowerCase().replace(/-/g, " ").trim();
  const visibleArticles = articlesList.slice(0, visibleCount);
  const hasMore = visibleCount < articlesList.length;

  const authorCoverageCards = useMemo(() => {
    const isSarah = (authorProfile.name || "").toLowerCase().includes("sarah") || slugClean.includes("sarah");
    if (isSarah) {
      return [
        {
          name: "UK Politics",
          category: "POLITICS",
          desc: "Government policy, political leadership, elections and national governance.",
          image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=380&fit=crop",
          count: 186,
          href: "/politics",
        },
        {
          name: "Parliament",
          category: "POLITICS",
          desc: "Parliamentary debates, legislation and the work of MPs and the House of Commons and Lords.",
          image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&h=380&fit=crop",
          count: 142,
          href: "/politics",
        },
        {
          name: "Government Policy",
          category: "POLITICS",
          desc: "Policy reform, public services, regulation and political strategy.",
          image: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600&h=380&fit=crop",
          count: 128,
          href: "/politics",
        },
        {
          name: "EU-UK Relations",
          category: "POLITICS",
          desc: "Post-Brexit developments, trade, cooperation and political negotiations.",
          image: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=600&h=380&fit=crop",
          count: 128,
          href: "/politics",
        },
        {
          name: "International Relations",
          category: "POLITICS",
          desc: "Global diplomacy, foreign policy and international partnerships.",
          image: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=600&h=380&fit=crop",
          count: 110,
          href: "/politics",
        },
        {
          name: "Defence and Security",
          category: "POLITICS",
          desc: "National security, defence policy, NATO, military strategy and international security.",
          image: "https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=600&h=380&fit=crop",
          count: 76,
          href: "/politics",
        },
        {
          name: "Trade and Economy",
          category: "ECONOMY",
          desc: "Trade agreements, economic policy and the impact of global markets on UK politics.",
          image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=380&fit=crop",
          count: 64,
          href: "/economy",
        },
        {
          name: "Elections",
          category: "POLITICS",
          desc: "General elections, local elections, political campaigns and voter trends.",
          image: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=600&h=380&fit=crop",
          count: 64,
          href: "/politics",
        },
        {
          name: "Diplomacy",
          category: "POLITICS",
          desc: "Bilateral relations, international summits and diplomatic engagements.",
          image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&h=380&fit=crop",
          count: 52,
          href: "/politics",
        },
        {
          name: "European Affairs",
          category: "WORLD",
          desc: "EU policy, European institutions and regional political developments.",
          image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&h=380&fit=crop",
          count: 46,
          href: "/world",
        },
      ];
    }

    const CATEGORY_META: Record<string, { image: string; desc: string }> = {
      politics: {
        image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=380&fit=crop",
        desc: "Government policy, political leadership, elections and national governance.",
      },
      economy: {
        image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=380&fit=crop",
        desc: "Trade agreements, economic policy and the impact of global markets.",
      },
      business: {
        image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=380&fit=crop",
        desc: "Corporate developments, enterprise strategy and boardroom governance.",
      },
      technology: {
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=380&fit=crop",
        desc: "Enterprise software, artificial intelligence and digital infrastructure.",
      },
      markets: {
        image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=380&fit=crop",
        desc: "Equities, foreign exchange, global bond markets and capital flows.",
      },
      sports: {
        image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&h=380&fit=crop",
        desc: "Premier league, global athletics and sporting championship coverage.",
      },
      lifestyle: {
        image: "https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=600&h=380&fit=crop",
        desc: "Culture, culinary trends, modern urban living and leisure journalism.",
      },
      entertainment: {
        image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=380&fit=crop",
        desc: "Film, arts, broadcast media, and contemporary popular culture reporting.",
      },
      health: {
        image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&h=380&fit=crop",
        desc: "Healthcare systems, biomedical research, medical policy and wellbeing.",
      },
      research: {
        image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&h=380&fit=crop",
        desc: "Scientific analysis, investigative academic research, and policy forecasts.",
      },
      interview: {
        image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=380&fit=crop",
        desc: "Exclusive conversations with industry executives and thought leaders.",
      },
      world: {
        image: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=600&h=380&fit=crop",
        desc: "Global diplomacy, cross-border reporting and international partnerships.",
      },
      ufo: {
        image: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&h=380&fit=crop",
        desc: "Unidentified aerial phenomena, aerospace investigations, and defense intelligence.",
      },
      asia: {
        image: "https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=600&h=380&fit=crop",
        desc: "Regional geopolitical dynamics, economic manufacturing, and cross-border trade.",
      },
      europe: {
        image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=600&h=380&fit=crop",
        desc: "EU policy, European institutions and regional political developments.",
      },
      britain: {
        image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=380&fit=crop",
        desc: "British governance, domestic reforms, and nationwide public policy.",
      },
      "united states": {
        image: "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=600&h=380&fit=crop",
        desc: "US domestic policy, federal elections, Washington politics and bilateral diplomacy.",
      },
      "middle east": {
        image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&h=380&fit=crop",
        desc: "Middle Eastern diplomacy, regional stability, energy resources and governance.",
      },
      africa: {
        image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=600&h=380&fit=crop",
        desc: "Pan-African trade, emerging technological hubs and economic growth.",
      },
      china: {
        image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=600&h=380&fit=crop",
        desc: "China macroeconomic updates, foreign policy, and technological manufacturing.",
      },
    };

    // Calculate categories where this author has written articles
    const categoryCounts: Record<string, { count: number; firstImage?: string }> = {};
    articlesList.forEach((art) => {
      const rawCat = (art.category || "").trim();
      if (!rawCat) return;
      const key = rawCat.toLowerCase();
      if (!categoryCounts[key]) {
        categoryCounts[key] = { count: 0, firstImage: art.image };
      }
      categoryCounts[key].count += 1;
      if (!categoryCounts[key].firstImage && art.image) {
        categoryCounts[key].firstImage = art.image;
      }
    });

    const writtenCategories = Object.keys(categoryCounts);

    if (writtenCategories.length > 0) {
      return writtenCategories.map((catKey) => {
        const data = categoryCounts[catKey];
        const meta = CATEGORY_META[catKey];
        const displayName = catKey === "ufo"
          ? "UFO"
          : catKey.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

        const image = data.firstImage || meta?.image || "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=380&fit=crop";
        const desc = meta?.desc || `Dedicated investigative reporting, daily updates, and specialized coverage in ${displayName.toLowerCase()}.`;

        return {
          name: displayName,
          category: catKey.toUpperCase(),
          desc,
          image,
          count: data.count,
          href: `/${catKey}`,
        };
      });
    }

    // Fallback: If author has not written articles yet, show registered coverage areas / expertise
    const fallbackAreas = (authorProfile.coverageAreas && authorProfile.coverageAreas.length > 0)
      ? authorProfile.coverageAreas
      : (authorProfile.expertise && authorProfile.expertise.length > 0)
        ? authorProfile.expertise
        : ["Politics", "Business", "Technology", "Economy", "Markets", "Lifestyle"];

    return fallbackAreas.map((area) => {
      const key = area.toLowerCase().replace(/[^a-z0-9]/g, "");
      const metaMatch = Object.entries(CATEGORY_META).find(([k]) => key.includes(k) || k.includes(key));
      const meta = metaMatch ? metaMatch[1] : undefined;
      const image = meta?.image || "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=380&fit=crop";
      const desc = meta?.desc || `Dedicated investigative reporting, daily updates, and specialized coverage in ${area.toLowerCase()}.`;

      return {
        name: area,
        category: area.toUpperCase(),
        desc,
        image,
        count: 0,
        href: `/${metaMatch ? metaMatch[0] : "news"}`,
      };
    });
  }, [authorProfile, articlesList, slugClean]);

  const authorRegionsOfFocus = useMemo(() => {
    const isSarah = (authorProfile.name || "").toLowerCase().includes("sarah") || slugClean.includes("sarah");

    // Strictly the 7 regions from Image 2
    const image2RegionDefs = [
      { id: "britain", name: "Britain", label: "United Kingdom", color: "#D31220", aliases: ["britain", "uk", "united kingdom", "london", "england", "scotland", "wales", "westminster"] },
      { id: "europe", name: "Europe", label: "Europe", color: "#2563EB", aliases: ["europe", "european", "eu", "france", "germany", "brussels", "italy", "spain"] },
      { id: "unitedStates", name: "United States", label: "United States", color: "#F59E0B", aliases: ["united states", "us", "usa", "america", "washington", "new york"] },
      { id: "china", name: "China", label: "China", color: "#10B981", aliases: ["china", "chinese", "beijing", "shanghai"] },
      { id: "middleEast", name: "Middle East", label: "Middle East", color: "#9333EA", aliases: ["middle east", "middle-east", "gulf", "saudi", "dubai", "uae", "qatar", "israel", "iran", "yemen"] },
      { id: "africa", name: "Africa", label: "Africa", color: "#EA580C", aliases: ["africa", "african", "cairo", "egypt", "nigeria", "kenya", "south africa"] },
      { id: "asia", name: "Asia", label: "Asia", color: "#059669", aliases: ["asia", "asian", "japan", "tokyo", "korea", "india", "singapore"] },
    ];

    if (isSarah) {
      return [
        { id: "britain", name: "United Kingdom", level: "Primary focus", color: "#D31220", active: true, count: 186 },
        { id: "europe", name: "Europe", level: "Regular coverage", color: "#2563EB", active: true, count: 128 },
        { id: "unitedStates", name: "United States", level: "Regular coverage", color: "#F59E0B", active: true, count: 84 },
        { id: "china", name: "China", level: "Regular coverage", color: "#10B981", active: true, count: 62 },
        { id: "middleEast", name: "Middle East", level: "Occasional coverage", color: "#9333EA", active: true, count: 48 },
        { id: "asia", name: "Asia", level: "Occasional coverage", color: "#059669", active: true, count: 35 },
        { id: "africa", name: "Africa", level: "Ongoing coverage", color: "#EA580C", active: true, count: 24 },
      ];
    }

    const regionCounts: Record<string, number> = {};
    image2RegionDefs.forEach((r) => {
      regionCounts[r.id] = 0;
    });

    articlesList.forEach((art) => {
      const rawCat = (art.category || "").toLowerCase();
      const rawSubs = Array.isArray((art as any).subcategories)
        ? (art as any).subcategories.join(" ").toLowerCase()
        : typeof (art as any).subcategory === "string"
          ? (art as any).subcategory.toLowerCase()
          : "";
      const titleAndSummary = ((art.title || "") + " " + (art.desc || "")).toLowerCase();
      const fullText = `${rawCat} ${rawSubs} ${titleAndSummary}`;

      image2RegionDefs.forEach((r) => {
        const isMatch = r.aliases.some((alias) => fullText.includes(alias));
        if (isMatch) {
          regionCounts[r.id] += 1;
        }
      });
    });

    const maxCount = Math.max(...Object.values(regionCounts), 0);

    return image2RegionDefs.map((r) => {
      const count = regionCounts[r.id];
      const hasCoverage = count > 0;
      let level = "No published coverage";

      if (hasCoverage) {
        if (count === maxCount && count >= 2) {
          level = "Primary focus";
        } else if (count >= 2) {
          level = "Regular coverage";
        } else {
          level = "Occasional coverage";
        }
      } else {
        level = "Ongoing coverage";
      }

      return {
        id: r.id,
        name: r.name,
        level,
        color: r.color,
        active: hasCoverage,
        count,
      };
    });
  }, [authorProfile, articlesList, slugClean]);

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans">
      <Header />

      {/* BREADCRUMB NAVIGATION */}
      <nav className="max-w-[1400px] mx-auto px-4 md:px-8 pt-5 pb-3 text-xs text-slate-500 font-sans flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span className="text-slate-300">&gt;</span>
        <Link href="/team" className="hover:text-black transition-colors">Our Team</Link>
        <span className="text-slate-300">&gt;</span>
        {activeTab === "about" ? (
          <>
            <button
              type="button"
              onClick={() => handleTabChange("articles")}
              className="hover:text-black transition-colors cursor-pointer"
            >
              {authorProfile.name}
            </button>
            <span className="text-slate-300">&gt;</span>
            <span className="text-slate-900 font-medium">About</span>
          </>
        ) : activeTab === "coverage" ? (
          <>
            <button
              type="button"
              onClick={() => handleTabChange("articles")}
              className="hover:text-black transition-colors cursor-pointer"
            >
              {authorProfile.name}
            </button>
            <span className="text-slate-300">&gt;</span>
            <span className="text-slate-900 font-medium">Coverage Areas</span>
          </>
        ) : activeTab === "awards" ? (
          <>
            <button
              type="button"
              onClick={() => handleTabChange("articles")}
              className="hover:text-black transition-colors cursor-pointer"
            >
              {authorProfile.name}
            </button>
            <span className="text-slate-300">&gt;</span>
            <span className="text-slate-900 font-medium">Awards & Recognition</span>
          </>
        ) : (
          <span className="text-slate-900 font-medium">{authorProfile.name}</span>
        )}
      </nav>

      {/* AUTHOR BIO & STATS HERO SECTION */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-8 pt-2 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (Headshot + Details & Socials) ~ 8 cols */}
          <div className="lg:col-span-8 flex flex-col sm:flex-row gap-6 items-start">
            
            {/* Author Headshot Photo */}
            <div className="w-full sm:w-[210px] md:w-[230px] h-[250px] sm:h-[260px] rounded-xl overflow-hidden bg-slate-100 border border-slate-200/90 flex-shrink-0 shadow-xs">
              <img
                src={authorProfile.avatar}
                alt={authorProfile.name}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  e.currentTarget.src = "/author_bluesuit.jpg";
                }}
              />
            </div>

            {/* Author Details */}
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold text-[#D31220] uppercase tracking-wider block mb-1">
                {authorProfile.role || "POLITICAL CORRESPONDENT"}
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 leading-tight mb-1">
                {authorProfile.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-sans font-medium mb-3">
                {authorProfile.role ? authorProfile.role.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : "Political Correspondent"} | London BigBen Network
              </p>

              {/* Location & Email */}
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 mb-3 font-sans">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{authorProfile.location || "London, United Kingdom"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <a href={`mailto:${authorProfile.email || "sarah.mitchell@londonbigben.com"}`} className="hover:text-[#D31220] transition-colors">
                    {authorProfile.email || "sarah.mitchell@londonbigben.com"}
                  </a>
                </div>
              </div>

              {/* Bio */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans mb-4">
                {authorProfile.bio}
              </p>

              {/* Social Icons */}
              <div className="flex items-center gap-2">
                {/* X (Twitter) */}
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:opacity-85 transition-opacity cursor-pointer"
                  title="X (Twitter)"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>

                {/* LinkedIn */}
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-[#0A66C2] text-white flex items-center justify-center hover:opacity-85 transition-opacity cursor-pointer"
                  title="LinkedIn"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.46 1.46 0 1 0 0-2.92 1.46 1.46 0 0 0 0 2.92M7.86 18.5V10.13H5.07V18.5h2.79z"/>
                  </svg>
                </a>

                {/* Personal Link / Website */}
                <a
                  href="#"
                  className="w-8 h-8 rounded-full border border-slate-300 bg-white text-slate-700 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Personal Link"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>
          </div>

          {/* Right Column (Stats Box + Areas of Coverage) ~ 4 cols */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Stats Box */}
            <div className="bg-[#F8F9FA] border border-slate-200/90 rounded-2xl p-4 sm:p-5">
              <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
                <div className="px-1 sm:px-2">
                  <span className="block text-2xl font-bold text-slate-900 font-sans">
                    {authorProfile.articlesCount || 526}
                  </span>
                  <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
                    Articles
                  </span>
                </div>
                <div className="px-1 sm:px-2">
                  <span className="block text-2xl font-bold text-slate-900 font-sans">
                    {authorProfile.yearsOfExperience || 12}
                  </span>
                  <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
                    Years of Experience
                  </span>
                </div>
                <div className="px-1 sm:px-2">
                  <span className="block text-2xl font-bold text-slate-900 font-sans">
                    {authorProfile.articleViews || "18.4M"}
                  </span>
                  <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
                    Article Views
                  </span>
                </div>
              </div>
            </div>

            {/* Areas of Coverage */}
            <div>
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2 font-sans">
                AREAS OF COVERAGE
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(authorProfile.coverageAreas || [
                  "UK Politics", "Parliament", "Government Policy",
                  "International Relations", "EU-UK Relations", "Elections",
                  "Defence and Security", "Trade", "Brexit", "Diplomacy"
                ]).map((area, i) => (
                  <span
                    key={i}
                    onClick={() => handleTabChange("coverage")}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-full text-xs font-medium border border-slate-200/70 transition-colors cursor-pointer"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* HORIZONTAL NAVIGATION TABS */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 border-b border-slate-200 mb-8">
        <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar">
          {[
            { id: "articles", label: "Latest Articles" },
            { id: "about", label: "About" },
            { id: "coverage", label: "Coverage Areas" },
            { id: "awards", label: "Awards & Recognition" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`pb-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap relative ${
                activeTab === tab.id
                  ? "text-[#D31220] border-b-2 border-[#D31220]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* LEFT COLUMN (~68% WIDTH) */}
          <div className="lg:col-span-8">
            
            {activeTab === "articles" && (
              <div>
                {/* Section Header */}
                <div className="flex items-center justify-between pb-3 mb-6 border-b border-slate-200">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
                    LATEST ARTICLES BY {authorProfile.name.toUpperCase()}
                  </h2>
                </div>

                {/* 3-Column Articles Grid */}
                {visibleArticles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-8">
                    {visibleArticles.map((article, idx) => (
                      <div key={idx} className="group flex flex-col cursor-pointer">
                        {/* Thumbnail Image */}
                        <Link
                          href={article.href}
                          className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-slate-100 border border-slate-200 mb-2.5 block"
                        >
                          <img
                            src={article.image}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=350&fit=crop";
                            }}
                          />
                        </Link>

                        {/* Category Tag */}
                        <span className="text-[10.5px] font-bold text-[#D31220] uppercase tracking-wider block mb-1">
                          {article.category}
                        </span>

                        {/* Headline */}
                        <Link
                          href={article.href}
                          className="font-serif font-bold text-[14px] sm:text-[14.5px] leading-snug text-slate-900 group-hover:text-[#D31220] transition-colors line-clamp-2 mb-1.5 block"
                        >
                          {article.title}
                        </Link>

                        {/* Publication Date */}
                        <span className="text-[11.5px] text-slate-400 font-sans mt-auto">
                          {article.date}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
                    <p className="text-zinc-700 font-sans text-sm font-semibold mb-1">
                      No published stories yet by {authorProfile.name}.
                    </p>
                  </div>
                )}

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex items-center justify-center pt-2 pb-6">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 6)}
                      className="px-8 py-2.5 bg-white hover:bg-[#BF1E2D] text-slate-800 hover:text-white border border-slate-300 hover:border-[#BF1E2D] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs rounded-lg"
                    >
                      Load More Articles
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-8">
                {/* ABOUT [AUTHOR NAME] */}
                <div>
                  <div className="pb-3 mb-5 border-b border-slate-200">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
                      ABOUT {authorProfile.name.toUpperCase()}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    <div className="md:col-span-7 text-[13.5px] text-slate-700 leading-[1.7] space-y-4 font-sans">
                      {authorProfile.aboutTheJournalist && authorProfile.aboutTheJournalist.trim() ? (
                        authorProfile.aboutTheJournalist
                          .split(/\n+/)
                          .map((p) => p.trim())
                          .filter(Boolean)
                          .map((para, i) => <p key={i}>{para}</p>)
                      ) : (
                        <>
                          <p>{authorProfile.bio}</p>
                          <p>
                            With extensive experience in journalism, {authorProfile.name} reports from major news desks and capitals, providing in-depth analysis and on-the-ground reporting on key developments shaping the UK and the wider world.
                          </p>
                          <p>
                            Their work combines accurate reporting, clear analysis, and a focus on the impact of policy decisions on people, businesses, and global stability, regularly interviewing leaders and policy experts to bring readers reliable insights.
                          </p>
                        </>
                      )}
                    </div>

                    <div className="md:col-span-5">
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        <img
                          src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=700&q=80&fit=crop"
                          alt={`${authorProfile.name} editorial desk`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* JOURNALISTIC APPROACH */}
                <div className="pt-6 border-t border-slate-200">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-sans mb-4">
                    JOURNALISTIC APPROACH
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    <div className="md:col-span-7 text-[13.5px] text-slate-700 leading-[1.7] font-sans">
                      <p>
                        {authorProfile.journalisticApproach && authorProfile.journalisticApproach.trim()
                          ? authorProfile.journalisticApproach
                          : `${authorProfile.name} believes in independent, fact-based journalism and is committed to presenting complex issues in a clear, balanced, and accessible way, focusing on verified information and context-driven reporting.`}
                      </p>
                    </div>

                    <div className="md:col-span-5">
                      <div className="bg-[#F8F9FA] border border-slate-200/80 rounded-lg p-5">
                        <span className="block text-slate-400 text-2xl leading-none font-serif mb-1">&ldquo;</span>
                        <p className="text-[13px] italic text-slate-700 leading-relaxed font-serif">
                          My goal is to make important news clear, accurate, and relevant to people&apos;s lives.
                        </p>
                        <p className="text-xs text-slate-500 mt-2.5 font-sans">
                          &mdash; {authorProfile.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "coverage" && (
              <div className="space-y-6">
                <div className="pb-3 border-b border-slate-200">
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wider font-sans">
                    COVERAGE AREAS
                  </h2>
                  <p className="text-xs text-slate-500 font-sans mt-1 leading-relaxed">
                    {(authorProfile.name || "").toLowerCase().includes("sarah") || slugClean.includes("sarah")
                      ? "Sarah Mitchell focuses on key political developments in the UK, Europe and global affairs, with in-depth reporting, analysis and exclusive interviews."
                      : `${authorProfile.name} focuses on in-depth reporting, analysis and exclusive coverage across these specialized beats and categories.`}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                  {authorCoverageCards.map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.href}
                      className="group bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all flex flex-col cursor-pointer"
                    >
                      {/* Image Header */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=380&fit=crop";
                          }}
                        />
                      </div>

                      {/* Card Content */}
                      <div className="p-3 flex flex-col flex-1">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight mb-1.5 group-hover:text-[#D31220] transition-colors">
                          {item.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-snug line-clamp-3 mb-3">
                          {item.desc}
                        </p>

                        {/* Article Count & Arrow */}
                        <div className="mt-auto pt-2 flex items-center justify-between text-[11px] font-medium text-slate-600">
                          <span>
                            {item.count} {item.count === 1 ? "Article" : "Articles"}
                          </span>
                          <span className="text-slate-400 group-hover:text-[#D31220] group-hover:translate-x-0.5 transition-all font-bold">
                            &rarr;
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "awards" && (
              <div className="space-y-6">
                <div className="pb-3 border-b border-slate-200">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
                    AWARDS & EDITORIAL RECOGNITION
                  </h2>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      year: "2025",
                      title: "London BigBen Network Editorial Excellence Award",
                      organization: "Press Standards Board",
                      desc: "Awarded for exceptional investigative reporting on cross-border regulatory compliance and economic reform."
                    },
                    {
                      year: "2024",
                      title: "British Press Awards — Nominee, Political Correspondent of the Year",
                      organization: "Society of Editors",
                      desc: "Recognized for incisive multi-source coverage of Westminster policy deliberations and diplomatic negotiations."
                    },
                    {
                      year: "2022",
                      title: "European Fellowship for Investigative Journalism",
                      organization: "International Media Institute",
                      desc: "Honored for groundbreaking reporting on international trade agreements and supply chain governance."
                    }
                  ].map((award, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-50 text-[#D31220] flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#D31220]">{award.year}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500 font-medium">{award.organization}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                          {award.title}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {award.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT SIDEBAR (~32% WIDTH) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* FOLLOW AUTHOR CARD */}
            <div className="border border-slate-200 rounded-xl p-5 bg-[#FAFBFB] shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 font-sans">
                FOLLOW {authorProfile.name.toUpperCase()}
              </h3>
              <p className="text-xs text-slate-500 mb-4 font-sans leading-relaxed">
                {isFollowing
                  ? `You are receiving instant notifications whenever ${authorProfile.name} publishes new articles.`
                  : `Get notified each time ${authorProfile.name} publishes new articles.`}
              </p>

              {followToast && (
                <div className={`mb-3 p-2.5 rounded-lg text-xs font-medium flex items-start gap-2 animate-in fade-in ${
                  followToast.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{followToast.message}</span>
                </div>
              )}

              <button
                onClick={handleFollowClick}
                disabled={followLoading}
                className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-75 ${
                  isFollowing
                    ? "bg-slate-800 text-white hover:bg-slate-900"
                    : "bg-[#BF1E2D] hover:bg-[#a61a27] text-white"
                }`}
              >
                {followLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isFollowing ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    <span>Follow</span>
                  </>
                )}
              </button>

              {!auth.authenticated && (
                <p className="text-[10px] text-slate-400 text-center mt-2.5 font-sans">
                  Sign in required to receive author notifications
                </p>
              )}
            </div>

            {activeTab === "about" ? (
              <>
                {/* WRITER DETAILS CARD */}
                <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans pb-3 mb-3 border-b border-slate-100">
                    WRITER DETAILS
                  </h3>
                  <div className="space-y-3 text-xs text-slate-600 font-sans">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {authorProfile.location ||
                          (authorProfile.city && authorProfile.country
                            ? `${authorProfile.city}, ${authorProfile.country}`
                            : authorProfile.city || authorProfile.country) ||
                          "London, United Kingdom"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a
                        href={`mailto:${authorProfile.email || "sarah.mitchell@londonbigben.com"}`}
                        className="hover:text-[#BF1E2D] transition-colors truncate"
                      >
                        {authorProfile.email || "sarah.mitchell@londonbigben.com"}
                      </a>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Joined</span>
                      <span className="ml-auto text-slate-700 font-medium">
                        {authorProfile.joinedDate || "March 2018"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* EXPERTISE CARD */}
                {(() => {
                  const defaultExpertise = [
                    { topic: "UK Politics", rating: 95 },
                    { topic: "Parliamentary Affairs", rating: 90 },
                    { topic: "International Relations", rating: 85 },
                    { topic: "EU-UK Relations", rating: 80 },
                    { topic: "Policy Analysis", rating: 85 },
                    { topic: "Political Interviews", rating: 90 },
                  ];

                  const rawExpertiseSlots = (authorProfile.expertise && authorProfile.expertise.length > 0)
                    ? authorProfile.expertise
                    : (authorProfile.coverageAreas && authorProfile.coverageAreas.length > 0)
                      ? authorProfile.coverageAreas
                      : defaultExpertise.map((d) => d.topic);

                  const resolvedExpertiseList = rawExpertiseSlots.slice(0, 6).map((topic, idx) => {
                    const adminRating = authorProfile.expertiseRatings?.[topic];
                    const rating = adminRating !== undefined && !isNaN(Number(adminRating))
                      ? Number(adminRating)
                      : defaultExpertise[idx % defaultExpertise.length]?.rating ?? 85;
                    return { topic, rating };
                  });

                  return (
                    <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans pb-3 mb-3 border-b border-slate-100">
                        EXPERTISE
                      </h3>
                      <div className="space-y-3">
                        {resolvedExpertiseList.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-xs font-sans">
                            <span className="text-slate-700 truncate w-[44%] font-medium">{item.topic}</span>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#BF1E2D] rounded-full transition-all duration-300"
                                style={{ width: `${item.rating}%` }}
                              />
                            </div>
                            <span className="text-slate-500 font-medium w-8 text-right font-mono">{item.rating}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : activeTab === "coverage" ? (
              /* REGIONS OF FOCUS CARD (WORLD MAP + EXACT IMAGE 2 REGIONS ONLY) */
              <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans pb-3 mb-4 border-b border-slate-100">
                  REGIONS OF FOCUS
                </h3>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* World Map Illustration */}
                  <div className="w-full sm:w-[52%] bg-slate-50/60 border border-slate-100 rounded-xl p-2.5 flex items-center justify-center shrink-0">
                    <svg
                      viewBox="0 0 580 290"
                      className="w-full h-auto max-h-[160px]"
                    >
                      {/* Canada & Greenland (Neutral Slate) */}
                      <path
                        d="M 35,45 L 55,25 L 85,20 L 125,22 L 165,30 L 195,48 L 185,75 L 140,82 L 80,82 L 65,90 L 45,78 Z M 205,15 L 245,18 L 240,48 L 215,50 Z"
                        fill="#CBD5E1"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />

                      {/* 1. United States (Amber #F59E0B if active) */}
                      <path
                        d="M 65,90 L 80,82 L 140,82 L 175,85 L 180,105 L 175,130 L 155,138 L 140,150 L 115,150 L 105,138 L 90,138 L 78,128 L 65,115 Z M 25,48 L 45,45 L 42,75 L 22,68 Z"
                        fill={authorRegionsOfFocus.some(r => r.id === "unitedStates" && r.active) ? "#F59E0B" : "#CBD5E1"}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        className="transition-colors duration-300"
                      />

                      {/* Central & South America (Neutral Slate) */}
                      <path
                        d="M 105,150 L 120,155 L 138,170 L 165,165 L 195,182 L 210,215 L 185,275 L 165,270 L 148,225 L 135,190 Z"
                        fill="#CBD5E1"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />

                      {/* 2. Europe (Royal Blue #2563EB if active) */}
                      <path
                        d="M 275,75 L 305,65 L 335,68 L 345,92 L 325,120 L 298,125 L 282,120 L 275,108 L 285,95 Z M 305,42 L 325,38 L 330,68 L 315,70 Z"
                        fill={authorRegionsOfFocus.some(r => r.id === "europe" && r.active) ? "#2563EB" : "#CBD5E1"}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        className="transition-colors duration-300"
                      />

                      {/* 3. Britain / United Kingdom (Crimson Red #D31220 if active) */}
                      <path
                        d="M 262,80 C 267,76 272,80 270,88 C 268,95 272,102 266,106 C 260,103 258,95 262,88 Z M 254,88 C 257,85 259,89 257,94 C 254,96 251,92 254,88 Z"
                        fill={authorRegionsOfFocus.some(r => r.id === "britain" && r.active) ? "#D31220" : "#CBD5E1"}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        className="transition-colors duration-300"
                      />

                      {/* 4. Africa (Orange #EA580C if active) */}
                      <path
                        d="M 262,132 L 315,128 L 345,152 L 345,182 L 322,255 L 292,255 L 260,200 L 255,160 Z M 350,220 L 360,225 L 355,250 L 345,245 Z"
                        fill={authorRegionsOfFocus.some(r => r.id === "africa" && r.active) ? "#EA580C" : "#CBD5E1"}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        className="transition-colors duration-300"
                      />

                      {/* 5. Middle East (Purple #9333EA if active) */}
                      <path
                        d="M 342,125 L 372,120 L 388,138 L 382,172 L 360,172 L 345,152 Z"
                        fill={authorRegionsOfFocus.some(r => r.id === "middleEast" && r.active) ? "#9333EA" : "#CBD5E1"}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        className="transition-colors duration-300"
                      />

                      {/* 6. China (Emerald Green #10B981 if active) */}
                      <path
                        d="M 410,100 L 465,95 L 485,120 L 475,155 L 435,160 L 415,138 Z"
                        fill={authorRegionsOfFocus.some(r => r.id === "china" && r.active) ? "#10B981" : "#CBD5E1"}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        className="transition-colors duration-300"
                      />

                      {/* 7. Asia (Green #059669 if active) */}
                      <path
                        d="M 345,68 L 440,55 L 525,65 L 520,110 L 490,140 L 440,138 L 415,180 L 388,138 L 372,120 L 345,92 Z M 528,105 L 538,108 L 532,135 L 522,128 Z M 435,182 L 478,188 L 510,218 L 455,228 Z"
                        fill={authorRegionsOfFocus.some(r => r.id === "asia" && r.active) ? "#059669" : "#CBD5E1"}
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        className="transition-colors duration-300"
                      />

                      {/* Australia & Oceania (Neutral Slate) */}
                      <path
                        d="M 470,220 L 535,215 L 548,252 L 492,265 L 465,242 Z M 552,255 L 560,260 L 555,280 L 548,272 Z"
                        fill="#CBD5E1"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>

                  {/* Regions List - strictly only the 7 regions from Image 2 */}
                  <div className="w-full sm:w-[48%] space-y-2">
                    {authorRegionsOfFocus.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-sans">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block leading-tight truncate">
                            {item.name}
                          </span>
                          <span className="text-[10.5px] text-slate-500 block leading-tight">
                            {item.level}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* MORE WRITERS CARD */
              <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
                    MORE WRITERS
                  </h3>
                </div>

                <div className="divide-y divide-slate-100">
                  {moreWriters.map((w, idx) => (
                    <Link
                      key={idx}
                      href={`/author/${w.slug}`}
                      className="flex items-center justify-between py-3 group hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={w.avatar}
                          alt={w.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = "/author_bluesuit.jpg";
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-[#D31220] transition-colors truncate">
                            {w.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {w.role}
                          </p>
                          <p className="text-[10px] text-slate-400 font-sans">
                            {w.articlesCount} Articles
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 shrink-0 ml-2 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
}

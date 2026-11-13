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
                      viewBox="0 32 800 270"
                      className="w-full h-auto max-h-[160px]"
                    >
                      {/* Neutral / Inactive Continents (Canada, Greenland, South America, Australia, New Zealand) */}
                      <path
                        d="M 795.8,231.2 L 796.8,232.2 L 794.2,232.2 L 795.8,231.2 Z M 0.0,229.0 L 797.2,230.5 L 800.0,229.0 L 0.0,229.0 Z M 380.7,162.9 L 380.7,165.7 L 373.4,165.7 L 373.5,169.7 L 370.8,170.6 L 371.3,172.9 L 362.1,173.4 L 367.2,172.6 L 374.7,164.1 L 380.7,162.9 Z M 127.0,125.9 L 116.8,122.3 L 115.9,119.4 L 110.0,115.4 L 111.1,112.1 L 98.9,103.7 L 94.6,105.7 L 86.7,102.6 L 86.7,79.9 L 96.7,82.0 L 111.6,78.6 L 113.1,79.7 L 115.2,77.8 L 120.5,80.5 L 123.5,78.7 L 123.8,80.7 L 130.1,79.6 L 143.9,82.0 L 146.9,83.3 L 143.8,84.5 L 147.8,85.1 L 155.7,84.3 L 158.0,85.9 L 160.5,84.6 L 158.2,83.5 L 159.6,82.6 L 164.1,82.2 L 174.5,85.2 L 181.2,84.8 L 181.0,83.3 L 183.0,82.8 L 186.4,83.7 L 186.4,86.1 L 190.6,81.5 L 185.6,78.9 L 185.8,75.9 L 188.4,73.9 L 193.6,75.5 L 196.6,78.6 L 194.6,79.9 L 198.8,80.4 L 198.8,83.1 L 201.7,81.0 L 204.4,82.7 L 203.7,84.6 L 205.9,86.3 L 209.8,82.3 L 210.0,79.4 L 219.4,81.3 L 217.9,83.9 L 219.1,86.5 L 214.8,88.3 L 209.4,87.9 L 205.9,92.3 L 198.4,95.0 L 198.3,96.5 L 195.7,96.8 L 190.6,101.3 L 189.6,105.6 L 192.9,105.9 L 194.9,109.6 L 217.2,113.6 L 217.5,117.5 L 222.4,121.6 L 225.3,118.9 L 222.6,114.6 L 229.9,110.8 L 225.5,105.9 L 228.1,103.6 L 226.4,98.0 L 235.9,97.7 L 245.4,100.9 L 246.0,105.6 L 249.7,107.2 L 256.5,102.5 L 263.6,109.8 L 262.7,111.2 L 272.6,114.7 L 276.1,117.5 L 276.3,119.7 L 266.6,123.5 L 252.5,123.5 L 242.0,130.0 L 255.4,125.4 L 257.4,126.4 L 255.3,127.6 L 256.7,131.1 L 263.3,131.7 L 265.5,129.6 L 267.1,131.7 L 264.4,132.9 L 253.1,135.9 L 253.0,134.3 L 256.8,132.8 L 250.8,133.1 L 249.4,129.5 L 246.1,128.8 L 241.1,133.3 L 233.6,133.4 L 216.8,139.4 L 215.2,138.8 L 217.5,136.0 L 216.6,132.7 L 203.6,127.2 L 196.4,127.5 L 189.3,125.1 L 127.0,125.9 Z M 213.3,97.7 L 218.1,96.7 L 215.4,98.4 L 213.3,97.7 Z M 222.7,71.4 L 220.3,69.9 L 221.4,68.7 L 226.5,69.0 L 230.6,71.4 L 222.7,71.4 Z M 221.5,98.6 L 223.9,98.4 L 223.0,99.6 L 221.5,98.6 Z M 192.0,65.1 L 190.8,66.3 L 184.8,65.3 L 189.2,63.1 L 192.0,65.1 Z M 191.5,57.4 L 185.7,56.4 L 191.5,57.4 Z M 185.0,53.4 L 187.6,54.5 L 183.8,56.3 L 180.8,53.0 L 185.0,53.4 Z M 204.1,66.9 L 194.6,65.6 L 191.3,61.1 L 184.2,59.8 L 185.0,58.5 L 196.4,59.7 L 201.8,63.2 L 219.7,62.9 L 222.1,64.1 L 221.2,66.1 L 204.1,66.9 Z M 152.7,55.3 L 155.9,55.8 L 155.1,56.8 L 147.7,56.7 L 152.7,55.3 Z M 153.4,53.2 L 156.3,53.9 L 149.9,54.5 L 153.4,53.2 Z M 276.4,121.4 L 273.8,124.3 L 281.2,125.4 L 280.5,126.8 L 282.0,126.5 L 283.0,128.6 L 282.1,130.3 L 279.6,130.0 L 279.5,128.2 L 276.9,129.9 L 268.3,128.5 L 272.5,122.5 L 276.4,121.4 Z M 213.6,91.5 L 222.0,94.8 L 215.3,93.9 L 209.9,96.3 L 206.2,95.2 L 209.1,89.9 L 213.6,91.5 Z M 225.0,72.7 L 227.1,71.6 L 235.3,75.5 L 239.5,74.9 L 247.1,77.7 L 251.2,81.2 L 247.1,82.4 L 262.6,87.2 L 261.9,88.9 L 258.0,91.7 L 251.7,88.3 L 248.9,88.6 L 248.6,90.0 L 256.3,95.5 L 255.5,97.2 L 247.1,94.7 L 253.0,98.9 L 242.2,96.7 L 233.7,92.5 L 227.3,93.6 L 225.4,92.7 L 226.9,91.0 L 235.6,90.6 L 238.6,86.1 L 237.1,84.1 L 229.2,82.0 L 230.6,81.3 L 224.5,78.6 L 219.3,79.8 L 202.9,78.0 L 201.1,77.1 L 203.4,75.8 L 200.3,75.8 L 199.5,73.0 L 203.5,69.3 L 209.3,68.6 L 207.6,70.4 L 209.4,72.2 L 211.4,69.9 L 217.1,68.7 L 220.9,71.7 L 220.6,73.5 L 225.0,72.7 Z M 190.0,67.6 L 198.9,68.4 L 190.5,73.6 L 188.0,73.5 L 186.6,69.6 L 190.0,67.6 Z M 127.0,61.7 L 135.3,57.4 L 141.8,57.0 L 139.8,60.4 L 127.0,61.7 Z M 105.1,115.9 L 107.2,115.8 L 106.6,118.1 L 108.5,119.7 L 104.3,117.2 L 105.1,115.9 Z M 165.6,51.6 L 175.9,53.2 L 178.5,56.1 L 166.3,54.6 L 168.4,53.6 L 165.6,51.6 Z M 125.5,126.8 L 114.6,122.9 L 120.5,123.4 L 125.5,126.8 Z M 129.9,66.7 L 143.3,69.5 L 126.5,76.7 L 120.2,74.0 L 124.6,68.9 L 122.4,67.2 L 129.9,66.7 Z M 160.4,62.5 L 164.7,62.2 L 163.7,65.1 L 150.6,66.8 L 147.0,65.9 L 151.6,64.6 L 138.4,64.4 L 143.5,60.6 L 157.6,63.7 L 154.4,60.8 L 156.5,59.6 L 160.4,62.5 Z M 163.3,70.7 L 165.8,71.8 L 167.9,76.4 L 175.6,79.0 L 171.7,80.4 L 172.4,82.4 L 164.5,81.2 L 148.2,82.9 L 139.2,79.2 L 150.2,78.1 L 138.0,77.6 L 136.8,76.7 L 142.0,75.6 L 134.7,74.9 L 138.1,71.7 L 144.0,70.0 L 146.3,70.5 L 145.2,71.9 L 150.1,71.0 L 153.2,72.4 L 155.7,71.0 L 159.6,74.6 L 160.7,73.5 L 159.1,70.6 L 163.3,70.7 Z M 176.8,71.7 L 174.4,69.8 L 177.0,68.5 L 183.6,68.7 L 182.1,70.9 L 185.5,72.1 L 185.1,74.6 L 179.3,75.4 L 172.2,72.2 L 176.8,71.7 Z M 163.1,69.2 L 167.8,69.7 L 165.8,71.5 L 163.1,69.2 Z M 181.1,59.9 L 182.8,61.3 L 181.9,65.1 L 172.2,63.4 L 172.1,61.0 L 181.1,59.9 Z M 186.6,47.2 L 190.4,45.9 L 189.5,45.1 L 194.6,44.9 L 204.9,48.2 L 209.3,51.5 L 202.1,54.9 L 193.6,54.7 L 191.2,53.4 L 193.0,51.3 L 186.5,50.2 L 185.1,48.7 L 186.6,47.2 Z M 196.5,42.7 L 262.6,42.3 L 251.7,43.3 L 249.7,44.1 L 254.5,44.0 L 241.8,49.9 L 229.1,51.5 L 232.2,51.9 L 230.6,52.5 L 232.5,54.1 L 222.8,58.3 L 226.9,59.7 L 221.0,61.5 L 201.1,60.6 L 200.9,59.1 L 205.0,58.4 L 203.9,56.1 L 211.2,57.3 L 204.5,54.6 L 210.9,51.4 L 206.8,48.4 L 218.1,47.7 L 205.3,47.5 L 196.5,42.7 Z M 232.9,85.7 L 228.9,86.6 L 228.4,85.3 L 231.3,83.6 L 232.9,85.7 Z M 186.1,80.4 L 187.4,81.4 L 186.1,82.3 L 178.2,80.7 L 181.7,78.7 L 186.1,80.4 Z M 256.6,124.2 L 262.7,125.7 L 256.6,124.2 Z M 257.7,129.6 L 262.2,130.7 L 260.3,131.6 L 257.7,129.6 Z M 713.3,208.9 L 728.1,214.0 L 727.1,216.0 L 734.9,220.8 L 728.7,220.1 L 721.7,216.3 L 717.0,218.9 L 713.4,218.6 L 713.3,208.9 Z M 739.2,210.4 L 739.6,212.1 L 734.8,209.1 L 739.2,210.4 Z M 736.2,213.7 L 729.6,213.5 L 738.1,211.2 L 736.2,213.7 Z M 743.9,212.9 L 746.4,215.1 L 743.9,212.9 Z M 247.5,291.2 L 249.4,293.7 L 255.4,295.4 L 247.5,295.8 L 247.5,291.2 Z M 271.9,251.2 L 270.0,258.2 L 272.8,259.6 L 273.8,262.3 L 268.4,265.5 L 261.5,265.7 L 261.9,268.9 L 260.6,269.5 L 255.3,269.6 L 255.6,271.3 L 259.0,272.2 L 255.2,273.9 L 254.3,276.7 L 250.5,277.7 L 249.8,279.0 L 254.1,280.8 L 246.4,287.5 L 248.6,290.7 L 240.2,290.0 L 236.9,284.7 L 239.3,282.7 L 241.7,276.2 L 239.7,271.7 L 242.6,265.2 L 242.0,261.9 L 244.9,257.8 L 243.3,253.1 L 248.2,245.9 L 248.0,242.1 L 252.7,237.9 L 256.9,239.4 L 260.3,238.2 L 271.6,243.1 L 269.7,246.2 L 276.2,246.7 L 279.7,243.7 L 280.8,245.9 L 271.9,251.2 Z M 247.5,291.2 L 247.5,295.8 L 251.2,295.8 L 248.6,297.3 L 242.2,296.2 L 234.1,291.6 L 242.0,294.1 L 243.9,291.8 L 247.5,291.2 Z M 245.4,231.3 L 249.3,239.5 L 251.1,239.7 L 248.0,242.1 L 248.2,245.9 L 243.3,253.1 L 244.9,257.8 L 242.0,261.9 L 242.6,265.2 L 239.7,271.7 L 241.7,276.2 L 239.3,282.7 L 236.9,284.7 L 240.2,290.0 L 247.6,290.6 L 242.6,291.8 L 241.3,293.7 L 233.5,290.5 L 232.0,283.5 L 235.3,280.2 L 231.9,279.7 L 234.8,275.0 L 237.2,275.6 L 238.4,271.9 L 234.8,273.4 L 237.3,266.4 L 236.5,262.8 L 241.3,254.8 L 243.6,232.5 L 245.4,231.3 Z M 240.6,175.4 L 240.7,177.9 L 234.5,177.5 L 239.3,177.0 L 237.4,175.1 L 240.6,175.4 Z M 240.7,177.9 L 240.9,175.1 L 248.2,177.1 L 240.7,177.9 Z M 224.5,164.3 L 227.1,164.6 L 224.5,164.3 Z M 227.1,163.9 L 228.5,165.7 L 227.1,163.9 Z M 226.2,166.8 L 227.7,169.1 L 226.2,166.8 Z M 264.0,289.7 L 271.7,289.1 L 264.0,289.7 Z M 296.1,42.3 L 353.7,42.3 L 329.1,42.3 L 349.1,42.3 L 351.0,43.2 L 348.5,45.3 L 365.0,42.6 L 372.9,44.8 L 355.5,48.6 L 360.6,48.8 L 356.2,53.4 L 356.3,57.0 L 358.9,59.0 L 351.8,60.1 L 355.9,61.8 L 356.4,64.3 L 354.1,64.6 L 356.9,67.1 L 352.0,67.4 L 354.6,68.5 L 353.9,69.5 L 347.6,70.0 L 350.4,73.2 L 344.9,72.8 L 350.8,75.1 L 351.7,77.3 L 347.7,77.8 L 343.2,75.2 L 344.0,77.1 L 341.4,78.5 L 350.3,78.7 L 311.5,90.6 L 308.5,95.3 L 304.8,97.2 L 305.7,99.0 L 303.6,103.1 L 300.5,103.2 L 292.7,101.4 L 285.3,95.0 L 280.1,86.3 L 285.6,82.4 L 287.0,79.3 L 281.2,81.0 L 278.5,80.1 L 279.2,76.9 L 285.8,77.6 L 275.9,74.6 L 278.4,72.0 L 269.8,63.5 L 263.9,61.8 L 247.8,61.9 L 241.3,59.0 L 251.6,57.8 L 237.1,55.7 L 237.4,54.4 L 254.0,51.3 L 254.8,50.1 L 248.8,48.8 L 261.7,44.7 L 260.8,43.1 L 296.4,42.3 L 301.1,43.5 L 296.1,42.3 Z M 553.2,283.4 L 556.8,284.6 L 552.8,285.6 L 553.2,283.4 Z M 677.7,218.2 L 683.0,217.5 L 677.7,218.2 Z M 139.7,155.0 L 153.3,157.0 L 163.3,156.3 L 169.0,160.3 L 175.6,160.1 L 180.0,165.0 L 184.1,165.8 L 182.9,172.0 L 186.0,176.0 L 190.2,177.8 L 196.9,176.7 L 200.9,173.0 L 207.0,173.6 L 204.8,177.6 L 197.8,178.3 L 196.8,179.2 L 199.0,181.0 L 196.1,181.0 L 195.0,183.3 L 189.6,180.8 L 178.4,180.0 L 166.7,176.0 L 164.4,170.6 L 150.6,160.8 L 148.6,157.2 L 144.9,156.2 L 145.2,158.9 L 156.9,169.7 L 155.5,170.6 L 150.7,167.5 L 150.4,165.5 L 144.3,162.8 L 146.3,161.5 L 139.7,155.0 Z M 271.9,251.2 L 280.5,254.2 L 281.4,257.1 L 277.9,259.0 L 271.5,258.2 L 270.2,257.3 L 271.9,251.2 Z M 281.4,257.1 L 280.5,254.2 L 271.9,251.2 L 280.8,244.6 L 278.6,244.0 L 279.3,241.3 L 276.9,241.2 L 276.0,238.7 L 271.3,238.3 L 272.2,232.3 L 270.6,229.4 L 266.3,229.3 L 265.5,225.6 L 254.7,222.2 L 254.8,219.5 L 244.2,221.6 L 243.4,219.1 L 237.3,219.1 L 235.6,216.2 L 238.0,212.8 L 244.7,211.4 L 245.7,206.7 L 244.4,204.2 L 246.2,203.5 L 244.9,202.5 L 249.9,202.0 L 254.3,203.8 L 259.2,201.7 L 256.0,199.0 L 265.0,197.3 L 267.7,199.1 L 267.5,202.3 L 269.9,203.1 L 275.6,201.3 L 282.4,201.8 L 286.0,198.8 L 288.9,202.4 L 287.3,204.7 L 292.0,205.3 L 292.0,206.8 L 293.7,205.9 L 300.2,207.3 L 300.9,209.0 L 311.2,209.3 L 321.7,213.1 L 321.9,218.4 L 314.1,224.5 L 312.7,231.8 L 309.0,238.1 L 294.1,242.7 L 291.4,248.7 L 281.4,257.1 Z M 245.5,221.3 L 254.8,219.5 L 254.7,222.2 L 265.5,225.6 L 266.3,229.3 L 270.6,229.4 L 272.2,232.3 L 271.4,235.0 L 262.7,234.5 L 260.7,238.6 L 256.9,239.4 L 252.7,237.9 L 249.3,239.5 L 245.4,231.3 L 247.4,223.7 L 245.5,221.3 Z M 244.7,211.4 L 238.0,212.8 L 235.6,216.2 L 239.6,220.0 L 243.4,219.1 L 243.2,221.4 L 245.5,221.3 L 247.4,223.7 L 245.9,227.3 L 246.8,229.7 L 243.6,232.5 L 231.1,226.9 L 219.1,212.0 L 221.5,210.1 L 221.2,211.6 L 224.0,212.4 L 233.1,205.1 L 237.6,208.4 L 244.3,209.0 L 242.9,210.6 L 244.7,211.4 Z M 251.4,203.1 L 244.9,202.5 L 246.2,203.5 L 244.4,204.2 L 245.7,206.7 L 244.7,211.4 L 242.9,210.6 L 244.3,209.0 L 237.6,208.4 L 233.1,205.1 L 224.5,202.5 L 228.6,199.3 L 226.9,194.3 L 227.8,192.3 L 233.5,188.5 L 241.3,186.5 L 237.1,191.4 L 240.1,194.6 L 250.4,195.9 L 249.3,200.8 L 251.4,203.1 Z M 228.1,192.1 L 226.9,194.3 L 224.2,191.6 L 221.3,194.2 L 215.6,192.8 L 216.6,190.8 L 228.1,192.1 Z M 216.6,190.8 L 215.6,192.8 L 209.0,188.8 L 214.1,188.7 L 216.6,190.8 Z M 214.1,188.7 L 209.5,188.5 L 205.2,185.7 L 215.2,182.6 L 214.1,188.7 Z M 215.2,182.6 L 206.7,185.6 L 201.4,183.5 L 205.3,181.2 L 215.2,182.6 Z M 201.4,183.5 L 204.9,185.0 L 200.4,184.8 L 201.4,183.5 Z M 195.0,183.3 L 196.1,181.0 L 199.0,181.0 L 196.8,179.2 L 197.8,178.3 L 201.9,178.3 L 201.7,181.2 L 203.9,181.5 L 199.8,184.5 L 195.0,183.3 Z M 201.9,178.3 L 204.2,177.5 L 202.4,181.2 L 201.9,178.3 Z M 265.0,197.3 L 256.0,199.0 L 259.2,201.7 L 252.6,203.9 L 249.3,200.8 L 250.4,195.9 L 240.1,194.6 L 237.1,191.4 L 241.5,187.5 L 239.8,190.3 L 241.6,191.4 L 241.3,188.7 L 244.6,186.9 L 248.5,189.3 L 262.5,189.0 L 261.4,190.2 L 267.2,192.6 L 263.5,196.2 L 265.0,197.3 Z M 274.4,202.2 L 267.5,202.3 L 267.7,199.1 L 263.5,196.2 L 266.0,194.5 L 265.4,193.4 L 268.7,193.1 L 273.0,196.1 L 271.0,199.0 L 274.4,202.2 Z M 278.8,201.6 L 274.4,202.2 L 271.3,197.9 L 273.0,196.1 L 280.1,196.5 L 278.8,201.6 Z M 285.2,198.8 L 282.4,201.8 L 278.8,201.6 L 280.1,196.5 L 285.2,198.8 Z M 232.5,205.2 L 232.1,207.3 L 225.2,211.8 L 221.2,211.6 L 222.7,208.9 L 220.1,208.3 L 220.1,206.6 L 222.0,203.9 L 224.8,203.0 L 232.5,205.2 Z M 252.7,177.2 L 253.7,178.0 L 250.7,178.1 L 252.7,177.2 Z M 227.6,177.3 L 230.7,178.2 L 227.6,177.3 Z M 217.2,170.0 L 225.9,171.0 L 235.2,174.5 L 227.2,175.2 L 228.7,174.3 L 225.1,172.5 L 218.2,170.8 L 211.2,172.0 L 217.2,170.0 Z M 478.7,156.7 L 477.6,156.9 L 478.2,155.0 L 478.7,156.7 Z M 771.6,228.8 L 773.0,229.6 L 771.6,228.8 Z M 770.6,228.4 L 770.3,226.9 L 770.6,228.4 Z M 768.4,236.7 L 771.4,238.4 L 769.3,238.4 L 764.5,235.2 L 768.4,236.7 Z M 760.3,220.6 L 758.5,220.2 L 760.3,220.6 Z M 759.3,219.3 L 756.8,217.4 L 759.3,219.3 Z M 757.4,219.7 L 754.9,218.7 L 757.4,219.7 Z M 754.8,216.9 L 751.6,216.0 L 754.8,216.9 Z M 749.2,215.4 L 747.8,215.1 L 749.2,215.4 Z M 793.1,267.8 L 791.1,270.0 L 788.1,269.9 L 789.4,268.5 L 786.3,266.2 L 788.2,263.2 L 783.6,258.3 L 787.4,259.6 L 791.0,263.5 L 796.7,263.7 L 793.1,267.8 Z M 777.0,274.0 L 784.0,268.6 L 787.2,270.1 L 783.8,273.7 L 784.6,274.6 L 781.0,275.3 L 776.3,279.7 L 770.0,278.2 L 777.0,274.0 Z M 728.2,269.1 L 729.7,271.3 L 726.4,274.2 L 721.6,269.7 L 728.2,269.1 Z M 680.3,254.5 L 674.8,257.3 L 666.4,257.4 L 662.3,259.2 L 655.6,257.8 L 657.3,254.5 L 651.9,244.6 L 653.9,244.9 L 652.0,241.9 L 652.8,238.9 L 668.6,234.6 L 679.3,226.3 L 688.0,227.4 L 690.3,223.7 L 694.6,223.1 L 692.9,221.8 L 694.1,221.6 L 703.3,222.7 L 704.3,223.4 L 701.1,227.4 L 711.6,231.5 L 714.9,227.5 L 716.7,220.9 L 719.8,226.7 L 723.1,227.4 L 725.3,233.5 L 735.0,238.8 L 739.7,243.3 L 741.3,247.8 L 739.8,253.5 L 733.3,263.2 L 725.2,266.0 L 722.3,264.0 L 719.1,265.6 L 712.5,264.3 L 710.2,261.0 L 706.9,260.2 L 707.1,258.1 L 704.1,259.6 L 706.2,255.6 L 702.2,258.9 L 698.4,255.2 L 691.8,253.3 L 680.3,254.5 Z M 656.6,196.9 L 656.3,198.6 L 653.8,198.3 L 656.6,196.9 Z M 270.7,235.3 L 271.3,238.3 L 276.0,238.7 L 276.9,241.2 L 279.3,241.3 L 278.3,245.4 L 276.2,246.7 L 269.7,246.2 L 271.6,243.1 L 260.7,238.6 L 262.7,234.5 L 270.7,235.3 Z M 472.7,150.6 L 476.8,149.7 L 472.7,150.6 Z M 508.8,188.0 L 508.7,190.9 L 506.2,193.1 L 497.1,191.3 L 494.6,189.3 L 495.9,187.9 L 499.1,189.5 L 508.8,188.0 Z M 445.8,139.0 L 444.6,137.7 L 445.9,136.6 L 448.4,137.6 L 445.8,139.0 Z M 262.9,189.0 L 264.6,190.0 L 262.3,190.0 L 262.9,189.0 Z"
                        fill="#CBD5E1"
                        stroke="#FFFFFF"
                        strokeWidth="0.8"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />

                      {/* 1. United States (Amber #F59E0B if active) */}
                      <path
                        d="M 127.0,125.9 L 189.3,125.1 L 196.4,127.5 L 203.6,127.2 L 216.6,132.7 L 216.2,139.4 L 233.6,133.4 L 241.1,133.3 L 246.1,128.8 L 249.4,129.5 L 251.2,133.7 L 243.0,136.8 L 244.5,139.4 L 236.2,140.7 L 240.1,140.7 L 235.7,141.0 L 233.5,144.2 L 232.2,143.2 L 233.2,145.1 L 231.2,147.1 L 230.3,143.8 L 230.4,145.6 L 228.9,145.4 L 231.7,149.9 L 219.3,156.8 L 222.1,164.2 L 221.4,166.8 L 218.4,165.8 L 214.0,159.2 L 208.0,158.5 L 201.8,158.6 L 201.3,160.5 L 189.6,160.0 L 184.1,162.6 L 183.3,165.8 L 180.0,165.0 L 175.6,160.1 L 169.0,160.3 L 163.3,156.3 L 153.3,157.0 L 139.7,155.0 L 131.9,151.5 L 123.6,141.8 L 124.7,132.4 L 122.9,127.4 L 126.4,127.7 L 127.6,129.5 L 127.0,125.9 Z M 54.7,174.8 L 56.0,175.7 L 53.5,176.4 L 54.7,174.8 Z M 53.3,173.8 L 51.8,173.5 L 53.3,173.8 Z M 51.6,173.1 L 50.4,173.2 L 51.6,173.1 Z M 30.1,102.4 L 31.8,102.6 L 30.7,103.8 L 27.9,102.8 L 30.1,102.4 Z M 59.5,107.7 L 61.9,108.5 L 56.6,109.8 L 59.5,107.7 Z M 86.7,79.9 L 86.7,102.6 L 94.6,105.7 L 98.9,103.7 L 111.1,112.1 L 109.9,114.4 L 102.0,107.4 L 83.2,103.1 L 73.1,101.3 L 70.6,101.8 L 71.1,103.3 L 62.8,105.1 L 65.3,100.4 L 57.7,104.7 L 59.4,105.8 L 57.3,107.3 L 47.9,111.9 L 33.5,114.8 L 49.5,108.6 L 51.0,105.6 L 40.1,106.2 L 40.3,104.1 L 32.6,102.1 L 30.8,99.9 L 31.7,98.6 L 34.3,96.1 L 42.7,94.7 L 41.1,93.2 L 42.7,92.2 L 33.4,93.0 L 26.4,90.1 L 34.5,87.9 L 40.7,89.0 L 29.4,83.4 L 30.7,82.0 L 52.0,75.4 L 57.0,77.2 L 86.7,79.9 Z M 18.4,94.6 L 25.1,95.8 L 18.4,94.6 Z"
                        fill={authorRegionsOfFocus.some(r => r.id === "unitedStates" && r.active) ? "#F59E0B" : "#CBD5E1"}
                        stroke="#FFFFFF"
                        strokeWidth="0.8"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        className="transition-colors duration-300"
                      />

                      {/* 2. Europe (Royal Blue #2563EB if active) */}
                      <path
                        d="M 433.7,50.3 L 437.8,49.1 L 447.9,52.7 L 442.3,54.0 L 438.0,59.6 L 435.4,59.7 L 430.6,57.8 L 432.6,56.7 L 424.9,53.0 L 423.2,50.4 L 429.3,49.2 L 433.7,50.3 Z M 469.1,80.3 L 463.5,81.5 L 464.5,79.7 L 461.6,78.7 L 455.0,82.6 L 447.2,80.7 L 444.5,81.5 L 444.2,83.2 L 440.0,82.8 L 426.5,96.2 L 428.1,100.4 L 424.5,105.8 L 423.0,104.4 L 418.6,107.0 L 412.6,106.4 L 411.1,98.8 L 423.4,93.0 L 432.8,84.8 L 442.6,79.6 L 462.6,75.9 L 469.5,77.9 L 466.7,78.6 L 469.1,80.3 Z M 460.9,49.1 L 451.2,51.3 L 438.6,48.2 L 450.9,47.0 L 460.9,49.1 Z M 454.9,56.3 L 446.1,56.9 L 447.6,56.0 L 446.3,55.0 L 450.9,54.4 L 454.9,56.3 Z M 413.7,125.0 L 418.0,125.8 L 413.4,130.2 L 416.5,135.7 L 404.1,138.2 L 395.8,136.2 L 397.3,131.5 L 389.8,126.5 L 396.4,126.5 L 395.7,124.4 L 397.8,125.2 L 405.6,121.7 L 413.7,125.0 Z M 419.4,137.7 L 420.9,137.0 L 420.5,139.9 L 419.4,137.7 Z M 424.5,105.8 L 428.1,100.4 L 426.5,96.2 L 428.0,94.0 L 430.2,94.0 L 430.1,92.2 L 437.3,84.3 L 444.2,83.2 L 445.9,81.4 L 452.3,84.4 L 453.1,89.3 L 449.3,90.0 L 447.5,93.1 L 439.7,97.0 L 438.0,100.3 L 441.7,103.1 L 437.4,106.1 L 435.3,111.7 L 428.8,113.2 L 424.5,105.8 Z M 462.6,111.5 L 468.6,112.8 L 468.3,114.3 L 472.7,117.3 L 469.6,117.9 L 470.6,119.8 L 467.9,121.4 L 452.3,120.9 L 452.2,116.2 L 456.7,115.4 L 462.6,111.5 Z M 470.6,119.8 L 475.0,119.4 L 478.6,122.8 L 489.0,124.7 L 488.3,128.0 L 477.8,132.0 L 470.4,130.2 L 463.7,132.8 L 464.1,130.7 L 466.7,130.7 L 463.7,127.5 L 449.1,127.0 L 453.2,123.1 L 452.3,120.9 L 467.9,121.4 L 470.6,119.8 Z M 452.2,116.2 L 452.9,118.6 L 451.6,119.1 L 453.4,122.6 L 450.6,125.8 L 435.9,123.1 L 431.3,118.1 L 431.4,116.5 L 439.2,114.3 L 452.2,116.2 Z M 437.7,127.5 L 435.6,130.2 L 432.5,130.7 L 421.1,129.5 L 428.7,128.8 L 430.2,126.1 L 437.7,127.5 Z M 449.1,127.0 L 450.5,128.0 L 444.9,131.3 L 441.0,132.0 L 436.0,129.9 L 437.7,127.5 L 449.1,127.0 Z M 459.2,127.3 L 463.7,127.5 L 466.7,130.7 L 462.7,132.5 L 462.5,130.0 L 459.2,127.3 Z M 462.7,132.5 L 465.8,132.8 L 463.5,135.7 L 453.6,135.7 L 444.9,131.3 L 451.4,127.6 L 459.2,127.3 L 462.5,130.0 L 462.7,132.5 Z M 458.9,112.7 L 456.7,115.4 L 452.2,116.2 L 446.8,111.8 L 455.2,111.1 L 458.9,112.7 Z M 460.6,108.8 L 462.6,111.5 L 458.9,112.7 L 455.2,111.1 L 446.8,111.8 L 450.1,108.2 L 451.8,109.8 L 455.9,107.7 L 460.6,108.8 Z M 462.2,104.4 L 460.6,108.8 L 454.0,108.1 L 451.9,105.1 L 462.2,104.4 Z M 431.4,116.5 L 433.4,121.8 L 427.2,123.4 L 430.2,126.1 L 428.7,128.8 L 416.6,128.5 L 418.0,125.8 L 413.7,125.0 L 413.3,120.3 L 415.2,119.6 L 415.8,116.6 L 419.6,116.0 L 418.9,114.0 L 431.4,116.5 Z M 450.3,134.8 L 463.5,135.7 L 462.2,138.8 L 451.0,140.0 L 450.3,134.8 Z M 458.4,150.4 L 452.3,150.4 L 458.4,150.4 Z M 451.0,140.0 L 459.1,139.6 L 452.7,141.1 L 454.2,142.1 L 453.1,142.4 L 450.7,141.5 L 453.4,146.4 L 451.4,145.9 L 451.5,148.5 L 450.0,148.5 L 444.8,143.0 L 446.7,140.8 L 451.0,140.0 Z M 446.7,140.8 L 444.4,142.8 L 442.9,138.4 L 444.6,137.7 L 446.7,140.8 Z M 436.8,130.6 L 443.1,132.9 L 435.0,133.7 L 441.0,137.9 L 430.3,133.1 L 436.8,130.6 Z M 421.3,128.7 L 423.2,129.9 L 422.1,130.9 L 413.4,131.0 L 415.0,128.6 L 421.3,128.7 Z M 413.4,123.7 L 412.6,124.8 L 413.4,123.7 Z M 413.7,122.4 L 412.6,124.8 L 405.6,121.7 L 413.7,122.4 Z M 415.3,117.1 L 413.7,122.4 L 407.4,121.3 L 410.5,117.8 L 415.3,117.1 Z M 379.9,139.0 L 385.8,139.9 L 383.3,143.0 L 384.4,145.6 L 382.5,147.8 L 380.2,147.7 L 380.4,145.3 L 378.8,144.5 L 379.9,139.0 Z M 383.4,147.3 L 383.3,143.0 L 385.8,139.9 L 379.9,139.0 L 379.1,136.9 L 382.3,135.6 L 406.6,137.9 L 404.7,140.2 L 401.8,140.5 L 399.4,143.5 L 400.2,144.5 L 395.2,148.0 L 388.1,149.3 L 383.4,147.3 Z M 423.2,129.9 L 430.7,130.6 L 431.0,132.3 L 427.4,132.7 L 427.2,134.1 L 440.7,142.6 L 437.5,141.5 L 437.9,144.2 L 434.9,145.9 L 435.8,144.1 L 434.3,142.2 L 426.9,139.3 L 422.7,135.3 L 416.5,135.7 L 415.2,131.5 L 423.2,129.9 Z M 432.8,145.5 L 434.5,145.4 L 433.6,148.1 L 427.6,146.4 L 432.8,145.5 Z M 419.4,140.7 L 421.8,141.4 L 421.5,143.7 L 418.7,143.8 L 418.1,140.6 L 419.4,140.7 Z M 422.1,114.0 L 418.9,114.0 L 418.0,110.7 L 423.5,108.2 L 422.8,110.0 L 424.3,110.9 L 421.4,113.0 L 422.1,114.0 Z M 427.5,111.6 L 426.9,114.4 L 424.5,113.2 L 427.5,111.6 Z M 367.8,88.2 L 367.2,89.8 L 369.8,91.4 L 358.5,95.3 L 349.4,94.2 L 351.6,93.2 L 346.8,92.0 L 350.6,90.8 L 345.9,90.2 L 347.4,88.6 L 354.3,89.9 L 367.8,88.2 Z M 430.7,130.6 L 436.8,130.6 L 434.1,132.5 L 430.5,132.4 L 430.7,130.6 Z M 463.5,81.5 L 463.2,83.4 L 466.6,85.1 L 464.6,87.0 L 467.1,89.8 L 465.7,91.8 L 467.7,93.6 L 466.7,95.2 L 470.0,96.8 L 469.2,97.9 L 462.4,102.2 L 450.8,103.6 L 447.4,101.7 L 447.9,96.0 L 456.4,91.5 L 452.4,88.3 L 452.3,84.4 L 445.9,81.4 L 455.0,82.6 L 461.6,78.7 L 464.5,79.7 L 463.5,81.5 Z M 450.1,125.7 L 448.6,127.2 L 439.7,128.2 L 437.5,126.9 L 441.2,124.9 L 450.1,125.7 Z M 433.4,121.8 L 441.9,124.9 L 437.7,126.6 L 430.2,126.1 L 427.2,123.4 L 433.4,121.8 Z M 441.2,137.6 L 435.5,132.9 L 443.0,133.6 L 443.2,136.0 L 441.2,137.6 Z M 449.7,138.2 L 451.0,140.0 L 445.8,140.4 L 446.1,138.7 L 449.7,138.2 Z M 441.8,131.7 L 444.9,131.3 L 450.5,134.1 L 451.1,136.6 L 447.9,138.3 L 443.6,136.6 L 441.8,131.7 Z M 444.6,137.7 L 443.0,139.0 L 441.0,137.9 L 442.7,136.0 L 444.6,137.7 Z"
                        fill={authorRegionsOfFocus.some(r => r.id === "europe" && r.active) ? "#2563EB" : "#CBD5E1"}
                        stroke="#FFFFFF"
                        strokeWidth="0.8"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        className="transition-colors duration-300"
                      />

                      {/* 3. Britain (Crimson Red #D31220 if active) */}
                      <path
                        d="M 386.2,116.3 L 384.9,119.5 L 377.8,120.4 L 379.6,118.3 L 378.5,116.2 L 383.2,113.7 L 383.2,115.9 L 386.2,116.3 Z M 386.2,116.3 L 383.2,115.9 L 383.2,113.7 L 387.4,114.9 L 386.2,116.3 Z M 393.1,117.2 L 388.8,112.3 L 387.6,113.3 L 386.3,110.2 L 388.9,106.3 L 393.3,106.3 L 390.9,108.6 L 395.6,108.3 L 393.1,111.9 L 395.4,112.1 L 401.0,118.2 L 403.7,118.5 L 403.2,121.4 L 401.2,122.5 L 388.3,124.0 L 392.4,121.2 L 388.3,120.0 L 390.6,119.4 L 389.8,117.0 L 393.1,117.2 Z"
                        fill={authorRegionsOfFocus.some(r => r.id === "britain" && r.active) ? "#D31220" : "#CBD5E1"}
                        stroke="#FFFFFF"
                        strokeWidth="0.8"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        className="transition-colors duration-300"
                      />

                      {/* 4. Africa (Orange #EA580C if active) */}
                      <path
                        d="M 475.3,206.4 L 487.1,211.9 L 486.2,214.6 L 489.6,220.4 L 476.8,222.2 L 475.0,219.0 L 468.3,217.4 L 465.2,211.7 L 468.3,210.0 L 467.6,206.7 L 475.3,206.4 Z M 465.2,211.7 L 468.3,217.4 L 463.9,217.7 L 463.1,222.6 L 465.8,223.2 L 466.0,224.8 L 460.4,222.3 L 449.2,221.5 L 448.3,215.8 L 438.8,217.0 L 436.3,213.7 L 427.1,213.6 L 435.6,210.2 L 439.2,205.6 L 441.2,198.8 L 443.3,197.5 L 449.8,199.0 L 460.8,197.2 L 468.5,199.8 L 469.3,201.7 L 464.7,208.4 L 465.2,211.7 Z M 492.4,207.5 L 491.1,200.9 L 493.6,198.7 L 499.9,197.6 L 508.7,190.9 L 508.8,188.0 L 513.6,187.1 L 508.0,197.1 L 492.4,207.5 Z M 487.1,211.9 L 475.3,206.4 L 477.9,202.2 L 475.6,198.7 L 478.4,196.8 L 484.7,199.7 L 493.0,199.2 L 491.1,200.9 L 492.4,207.5 L 487.1,211.9 Z M 454.6,192.8 L 452.1,191.7 L 448.7,186.2 L 451.2,181.5 L 453.1,181.7 L 453.0,174.9 L 455.6,174.9 L 455.6,171.8 L 481.9,171.8 L 483.3,177.1 L 485.4,178.0 L 481.9,179.6 L 480.6,184.8 L 476.1,189.2 L 475.5,192.1 L 472.8,186.7 L 469.7,190.4 L 455.7,189.7 L 453.1,192.2 L 454.6,192.8 Z M 453.0,175.6 L 453.1,181.7 L 451.2,181.5 L 448.7,186.2 L 450.8,188.4 L 437.1,193.8 L 434.0,194.0 L 431.0,190.8 L 434.4,190.1 L 430.1,183.5 L 433.9,180.1 L 435.3,174.3 L 433.0,170.5 L 435.2,169.6 L 453.0,175.6 Z M 436.3,248.6 L 444.2,248.4 L 444.2,242.5 L 446.4,245.8 L 448.0,245.6 L 451.8,243.3 L 457.0,243.6 L 465.4,238.3 L 469.3,238.6 L 471.0,241.9 L 470.7,244.2 L 468.2,245.6 L 473.0,245.6 L 471.6,248.8 L 461.0,256.2 L 444.6,258.8 L 440.8,257.7 L 440.5,253.6 L 436.3,248.6 Z M 464.4,249.2 L 460.0,250.7 L 462.5,251.8 L 464.4,249.2 Z M 464.4,249.2 L 462.5,251.8 L 460.0,250.7 L 464.4,249.2 Z M 469.3,238.6 L 462.3,237.4 L 456.1,231.6 L 460.1,231.9 L 467.3,228.2 L 473.0,230.0 L 472.6,235.5 L 469.3,238.6 Z M 465.4,238.3 L 457.0,243.6 L 451.8,243.3 L 448.0,245.6 L 446.4,245.8 L 444.2,242.5 L 444.2,237.9 L 446.4,237.9 L 446.5,232.4 L 456.1,231.6 L 465.4,238.3 Z M 444.2,242.5 L 444.2,248.4 L 436.3,248.6 L 433.8,246.2 L 431.7,238.3 L 426.1,230.9 L 455.7,231.3 L 446.5,232.4 L 446.4,237.9 L 444.2,237.9 L 444.2,242.5 Z M 362.9,184.7 L 360.8,183.0 L 364.2,180.4 L 367.6,180.2 L 373.0,183.2 L 374.5,186.0 L 362.9,186.5 L 362.6,185.4 L 369.2,184.8 L 362.9,184.7 Z M 374.4,186.4 L 373.0,183.2 L 374.1,182.0 L 387.7,181.8 L 385.7,167.2 L 389.1,167.2 L 407.0,176.4 L 409.5,176.2 L 408.1,181.7 L 391.1,184.9 L 388.0,189.6 L 382.2,189.8 L 379.7,186.6 L 374.4,186.4 Z M 362.1,173.4 L 371.3,172.9 L 370.8,170.6 L 373.5,169.7 L 373.4,165.7 L 380.7,165.7 L 380.7,163.3 L 389.1,167.2 L 385.7,167.2 L 387.7,181.8 L 373.0,183.2 L 367.6,180.2 L 363.4,180.9 L 363.8,174.8 L 362.1,173.4 Z M 406.0,195.7 L 404.1,195.9 L 403.7,191.4 L 401.7,189.4 L 405.5,186.8 L 408.4,189.0 L 406.0,195.7 Z M 433.0,170.5 L 435.3,174.3 L 433.9,180.1 L 430.1,183.5 L 432.4,185.1 L 431.5,186.4 L 429.1,184.7 L 420.0,185.9 L 412.1,184.3 L 409.1,184.8 L 408.0,187.6 L 402.3,185.8 L 400.7,183.4 L 408.1,181.7 L 409.5,176.2 L 426.7,169.5 L 433.0,170.5 Z M 406.0,195.7 L 409.7,184.5 L 420.0,185.9 L 429.1,184.7 L 432.4,187.0 L 426.1,194.6 L 420.5,195.4 L 418.9,197.9 L 413.1,198.7 L 409.6,195.7 L 406.0,195.7 Z M 432.2,185.8 L 434.4,190.1 L 431.0,190.8 L 434.3,193.6 L 432.2,198.0 L 435.4,202.4 L 421.4,201.6 L 418.9,198.3 L 420.5,195.4 L 426.1,194.6 L 432.2,185.8 Z M 402.0,188.6 L 404.1,195.9 L 402.4,196.2 L 399.9,189.1 L 402.0,188.6 Z M 400.1,188.6 L 402.4,196.2 L 393.7,197.6 L 393.5,188.7 L 400.1,188.6 Z M 382.2,189.8 L 393.7,190.7 L 393.7,197.6 L 382.9,198.5 L 383.2,196.5 L 380.9,195.4 L 382.2,189.8 Z M 369.6,186.2 L 379.7,186.6 L 382.6,192.2 L 379.5,194.1 L 375.3,190.0 L 370.6,191.8 L 366.4,188.6 L 369.6,186.2 Z M 362.9,186.5 L 369.6,186.2 L 366.4,188.6 L 362.9,186.5 Z M 381.2,193.6 L 382.9,198.5 L 374.6,194.9 L 378.3,192.3 L 379.5,194.1 L 381.2,193.6 Z M 370.6,191.8 L 375.3,190.0 L 377.3,192.5 L 374.6,194.9 L 370.6,191.8 Z M 388.0,189.6 L 390.5,185.3 L 397.6,182.6 L 400.8,182.7 L 402.3,185.8 L 404.8,186.2 L 402.8,188.5 L 393.5,188.7 L 393.7,190.7 L 388.0,189.6 Z M 460.8,197.2 L 449.8,199.0 L 443.3,197.5 L 435.6,201.6 L 432.1,196.9 L 434.0,194.0 L 439.9,193.3 L 450.8,188.4 L 452.1,191.7 L 460.8,197.2 Z M 441.0,199.8 L 439.2,205.6 L 435.0,210.7 L 432.4,212.4 L 426.5,212.5 L 424.7,210.9 L 427.9,207.9 L 431.8,208.0 L 431.7,203.2 L 429.1,201.6 L 435.4,202.4 L 438.1,199.5 L 441.0,199.8 Z M 425.1,201.6 L 431.7,203.2 L 432.1,207.0 L 431.1,208.7 L 425.5,209.1 L 426.3,210.1 L 424.7,210.9 L 419.5,206.6 L 421.1,203.5 L 425.1,203.4 L 425.1,201.6 Z M 421.4,201.6 L 425.1,201.6 L 425.1,203.4 L 421.1,203.5 L 421.4,201.6 Z M 468.3,217.4 L 473.8,219.4 L 472.6,225.5 L 473.8,225.9 L 467.1,227.1 L 460.1,231.9 L 451.6,231.3 L 448.6,229.1 L 448.7,224.2 L 453.4,224.3 L 453.1,221.3 L 466.0,224.8 L 465.8,223.2 L 463.1,222.6 L 463.2,218.6 L 468.3,217.4 Z M 472.8,218.7 L 476.2,220.1 L 476.8,225.3 L 479.3,226.8 L 477.9,230.2 L 476.6,226.8 L 472.6,225.5 L 474.4,220.7 L 472.8,218.7 Z M 476.8,222.2 L 489.6,220.4 L 490.6,227.0 L 487.7,230.0 L 477.3,234.7 L 478.8,241.5 L 471.3,245.6 L 469.3,238.6 L 472.6,235.5 L 473.0,230.0 L 467.4,228.8 L 467.1,227.1 L 475.7,226.4 L 477.9,230.2 L 479.3,226.8 L 476.8,225.3 L 476.8,222.2 Z M 471.3,245.6 L 469.5,246.5 L 468.2,245.1 L 469.6,243.9 L 471.3,245.6 Z M 428.9,212.1 L 427.1,213.6 L 426.5,212.5 L 428.9,212.1 Z M 427.4,214.1 L 436.3,213.7 L 438.8,217.0 L 448.3,215.8 L 449.2,221.5 L 453.4,221.7 L 453.4,224.3 L 448.7,224.2 L 448.6,229.1 L 451.6,231.3 L 426.1,230.9 L 430.5,221.8 L 427.4,214.1 Z M 467.7,208.6 L 468.3,210.0 L 465.2,211.7 L 464.5,209.2 L 467.7,208.6 Z M 510.1,223.6 L 512.2,227.8 L 510.4,228.5 L 504.7,242.8 L 497.9,242.8 L 496.1,238.3 L 498.6,235.2 L 498.8,229.3 L 502.9,228.6 L 510.1,223.6 Z M 362.9,184.7 L 369.2,184.8 L 362.9,184.7 Z M 421.1,158.6 L 416.7,152.4 L 418.7,147.6 L 424.5,147.3 L 422.6,152.0 L 425.4,155.3 L 421.1,158.6 Z M 380.7,163.3 L 380.7,161.0 L 397.1,155.4 L 395.2,150.6 L 397.3,149.7 L 418.7,147.6 L 416.7,152.4 L 421.8,160.1 L 420.7,165.4 L 426.7,169.5 L 407.0,176.4 L 380.7,163.3 Z M 481.0,183.5 L 481.9,179.6 L 485.4,178.0 L 487.3,181.2 L 495.7,186.1 L 488.9,183.3 L 481.0,183.5 Z M 395.2,150.6 L 397.1,155.4 L 380.7,161.0 L 380.5,163.8 L 374.7,164.1 L 367.2,172.6 L 362.2,172.7 L 367.9,165.1 L 378.7,159.2 L 379.3,154.9 L 386.8,149.6 L 395.2,150.6 Z M 481.9,171.8 L 455.6,171.8 L 455.1,157.4 L 476.1,157.1 L 477.6,159.9 L 475.4,162.9 L 471.8,159.5 L 478.9,170.1 L 481.9,171.8 Z M 455.6,171.8 L 455.6,174.9 L 453.0,175.6 L 435.2,169.6 L 431.4,171.1 L 422.9,168.1 L 420.7,165.4 L 421.1,158.6 L 425.5,154.0 L 442.4,158.7 L 446.3,154.7 L 455.4,156.0 L 455.6,171.8 Z M 506.2,193.1 L 499.9,197.6 L 487.9,199.9 L 480.4,198.4 L 473.2,193.4 L 481.0,183.5 L 484.2,182.6 L 492.4,184.9 L 494.1,186.3 L 492.8,188.5 L 497.1,191.3 L 506.2,193.1 Z M 494.1,186.3 L 496.3,186.5 L 495.1,188.7 L 492.8,188.5 L 494.1,186.3 Z M 475.3,206.4 L 465.7,207.0 L 469.3,201.7 L 468.5,199.8 L 475.6,198.7 L 477.9,202.2 L 475.3,206.4 Z M 467.6,206.7 L 468.3,208.4 L 464.5,209.2 L 467.6,206.7 Z M 468.5,199.8 L 462.2,198.5 L 453.1,192.2 L 457.3,189.5 L 459.5,190.9 L 469.7,190.4 L 472.0,188.5 L 471.3,187.2 L 473.8,186.8 L 475.5,192.1 L 473.2,193.4 L 478.4,196.8 L 474.2,199.4 L 468.5,199.8 Z"
                        fill={authorRegionsOfFocus.some(r => r.id === "africa" && r.active) ? "#EA580C" : "#CBD5E1"}
                        stroke="#FFFFFF"
                        strokeWidth="0.8"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        className="transition-colors duration-300"
                      />

                      {/* 5. Middle East (Purple #9333EA if active) */}
                      <path
                        d="M 479.4,154.7 L 477.7,156.1 L 477.6,159.9 L 476.1,157.1 L 478.0,154.1 L 479.4,154.7 Z M 479.6,153.8 L 478.1,154.1 L 478.9,152.7 L 481.0,151.6 L 479.6,153.8 Z M 479.0,155.2 L 486.2,153.6 L 487.1,155.6 L 482.2,156.7 L 484.4,158.3 L 480.2,160.4 L 477.6,159.9 L 479.0,155.2 Z M 514.6,168.3 L 520.0,168.5 L 524.6,165.5 L 525.3,167.3 L 522.2,171.1 L 515.6,170.3 L 514.6,168.3 Z M 512.9,167.5 L 514.0,165.4 L 514.7,166.8 L 512.9,167.5 Z M 506.6,159.2 L 507.6,161.5 L 503.5,160.6 L 506.6,159.2 Z M 487.1,155.6 L 486.2,153.6 L 491.1,151.9 L 491.8,148.6 L 495.1,146.8 L 499.5,147.2 L 502.4,149.7 L 500.9,152.6 L 505.2,155.1 L 507.9,159.3 L 499.4,160.5 L 487.1,155.6 Z M 522.7,170.7 L 525.3,167.3 L 532.9,171.4 L 528.5,174.6 L 528.2,176.6 L 518.0,180.1 L 515.6,176.5 L 522.2,174.9 L 523.7,171.8 L 522.7,170.7 Z M 525.0,166.0 L 525.2,164.9 L 525.0,166.0 Z M 507.9,159.3 L 505.2,155.1 L 500.9,152.6 L 502.4,149.7 L 498.3,145.8 L 498.0,143.3 L 502.5,144.5 L 506.8,143.0 L 509.3,146.5 L 516.1,148.0 L 527.4,145.7 L 535.8,148.4 L 534.5,154.2 L 537.3,157.9 L 535.3,159.4 L 540.7,164.3 L 536.7,167.0 L 527.5,166.0 L 526.6,164.0 L 518.9,164.3 L 514.5,162.6 L 511.4,158.9 L 507.9,159.3 Z M 479.4,154.7 L 481.4,152.2 L 479.8,150.2 L 481.6,147.8 L 494.1,147.1 L 491.8,148.6 L 491.1,151.9 L 481.9,155.3 L 479.4,154.7 Z M 499.5,147.2 L 481.6,147.8 L 480.3,149.5 L 480.4,148.1 L 477.1,147.8 L 466.0,148.9 L 461.4,148.1 L 458.2,143.2 L 474.5,138.7 L 485.2,140.6 L 494.7,139.5 L 499.5,142.8 L 498.0,143.3 L 499.5,147.2 Z M 458.0,139.1 L 464.4,140.0 L 458.6,142.0 L 458.0,139.1 Z M 515.6,176.5 L 518.0,180.1 L 508.2,184.1 L 496.6,186.2 L 494.7,182.3 L 496.4,178.7 L 504.4,179.6 L 509.1,177.1 L 515.6,176.5 Z M 477.7,160.2 L 484.4,158.3 L 482.2,156.7 L 489.8,156.0 L 499.4,160.5 L 507.6,161.5 L 515.6,170.3 L 523.7,171.8 L 522.2,174.9 L 509.1,177.1 L 504.4,179.6 L 496.4,178.7 L 495.1,180.5 L 487.0,172.9 L 485.5,169.2 L 477.0,162.3 L 477.7,160.2 Z M 472.7,150.6 L 475.6,150.9 L 472.7,150.6 Z"
                        fill={authorRegionsOfFocus.some(r => r.id === "middleEast" && r.active) ? "#9333EA" : "#CBD5E1"}
                        stroke="#FFFFFF"
                        strokeWidth="0.8"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        className="transition-colors duration-300"
                      />

                      {/* 6. China (Emerald Green #10B981 if active) */}
                      <path
                        d="M 643.3,177.7 L 641.4,175.9 L 646.7,175.4 L 643.3,177.7 Z M 578.4,138.2 L 579.7,136.7 L 577.7,133.5 L 583.2,132.4 L 584.8,129.0 L 589.3,129.7 L 590.6,126.9 L 595.0,125.3 L 602.2,129.9 L 602.1,132.8 L 611.8,134.7 L 614.1,137.5 L 633.3,139.5 L 642.8,137.9 L 648.5,135.6 L 647.4,134.4 L 648.6,133.2 L 665.9,130.2 L 662.4,127.6 L 656.6,127.5 L 659.3,124.2 L 665.1,123.7 L 668.3,120.1 L 667.1,118.5 L 671.7,117.2 L 679.9,118.4 L 683.7,124.4 L 687.6,125.0 L 691.1,128.2 L 700.1,126.9 L 695.8,133.1 L 691.2,133.4 L 690.3,138.1 L 688.9,137.0 L 684.9,139.7 L 681.9,139.1 L 669.0,144.2 L 671.5,141.6 L 670.3,140.6 L 661.2,144.5 L 666.0,147.2 L 671.9,146.7 L 664.8,151.0 L 670.9,156.4 L 669.5,158.0 L 671.3,159.4 L 670.4,162.0 L 663.7,167.8 L 646.2,172.8 L 645.4,174.4 L 634.1,169.7 L 625.9,171.3 L 626.2,173.1 L 620.5,171.7 L 621.2,170.4 L 619.2,168.6 L 616.9,168.9 L 619.3,163.1 L 613.9,161.7 L 613.6,160.0 L 597.4,163.5 L 597.2,162.2 L 590.7,162.0 L 575.0,156.7 L 575.4,152.0 L 569.3,149.4 L 563.7,143.3 L 578.4,138.2 Z M 670.6,168.1 L 668.3,171.9 L 666.9,169.4 L 670.0,166.7 L 670.6,168.1 Z"
                        fill={authorRegionsOfFocus.some(r => r.id === "china" && r.active) ? "#10B981" : "#CBD5E1"}
                        stroke="#FFFFFF"
                        strokeWidth="0.8"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        className="transition-colors duration-300"
                      />

                      {/* 7. Asia (Green #059669 if active) */}
                      <path
                        d="M 594.1,125.5 L 590.6,126.9 L 589.3,129.7 L 584.8,129.0 L 583.2,132.4 L 577.7,133.5 L 579.7,136.7 L 578.4,138.2 L 564.9,136.5 L 563.3,137.9 L 558.2,137.5 L 552.5,141.1 L 548.3,140.3 L 546.9,137.0 L 544.2,135.7 L 537.8,136.1 L 530.0,132.3 L 524.3,133.4 L 524.4,140.0 L 520.2,138.2 L 516.7,139.2 L 516.7,137.4 L 511.8,134.1 L 517.9,132.9 L 517.9,129.9 L 509.1,130.8 L 503.3,127.0 L 505.7,123.1 L 507.9,124.2 L 512.8,120.6 L 523.8,122.7 L 536.3,122.4 L 533.3,120.1 L 537.1,118.1 L 535.5,116.7 L 536.5,116.0 L 553.5,113.2 L 563.2,117.0 L 570.9,115.0 L 577.9,122.3 L 585.3,121.9 L 594.1,125.5 Z M 524.4,140.0 L 524.3,133.4 L 530.0,132.3 L 537.8,136.1 L 544.2,135.7 L 546.9,137.0 L 548.3,140.3 L 552.5,141.1 L 557.7,138.3 L 556.5,139.6 L 562.3,140.8 L 559.5,142.1 L 554.1,141.0 L 550.4,143.0 L 552.0,145.5 L 550.7,147.2 L 530.3,137.4 L 524.4,140.0 Z M 713.3,208.9 L 713.4,218.6 L 705.8,217.5 L 708.2,215.9 L 706.5,213.0 L 695.5,211.1 L 693.3,209.2 L 697.1,208.3 L 690.0,206.4 L 697.7,206.2 L 698.7,209.1 L 701.0,210.0 L 705.4,207.5 L 713.3,208.9 Z M 677.7,218.2 L 674.4,220.2 L 677.7,218.2 Z M 698.2,215.2 L 698.9,213.1 L 698.2,215.2 Z M 662.0,198.9 L 660.7,200.2 L 664.4,203.7 L 661.8,203.8 L 658.1,211.0 L 644.9,209.4 L 642.4,205.7 L 643.7,202.0 L 645.6,203.9 L 654.7,202.9 L 657.5,198.6 L 662.0,198.9 Z M 687.5,209.2 L 690.7,210.7 L 684.2,210.0 L 687.5,209.2 Z M 681.9,210.6 L 680.0,209.7 L 681.9,210.6 Z M 684.3,201.8 L 686.0,203.3 L 684.7,206.3 L 683.1,203.5 L 684.3,201.8 Z M 673.2,203.7 L 677.9,202.6 L 676.5,204.4 L 667.1,204.6 L 666.8,205.8 L 668.7,207.1 L 674.1,205.9 L 670.0,207.8 L 673.7,212.9 L 670.0,211.8 L 668.8,208.9 L 667.3,209.3 L 667.6,213.2 L 665.3,213.0 L 665.6,210.2 L 663.9,209.2 L 666.7,204.2 L 673.2,203.7 Z M 667.3,220.3 L 664.4,219.2 L 667.3,220.3 Z M 669.6,217.7 L 673.1,217.0 L 669.6,217.7 Z M 662.8,217.4 L 659.4,218.4 L 662.8,217.4 Z M 641.1,214.5 L 657.1,217.4 L 636.6,215.9 L 634.1,215.2 L 635.7,213.8 L 641.1,214.5 Z M 631.9,206.6 L 635.8,209.5 L 635.2,213.7 L 632.7,213.7 L 625.3,209.2 L 611.8,196.9 L 616.6,197.2 L 631.9,206.6 Z M 608.4,45.7 L 613.2,44.9 L 617.5,46.7 L 622.6,50.0 L 622.1,53.0 L 607.4,51.2 L 602.6,48.1 L 608.4,45.7 Z M 628.5,51.7 L 634.2,53.5 L 633.5,54.8 L 621.0,56.1 L 625.0,51.8 L 628.5,51.7 Z M 708.5,61.7 L 722.4,63.4 L 720.7,65.6 L 708.8,66.2 L 704.4,64.3 L 705.6,62.2 L 708.5,61.7 Z M 729.4,64.0 L 735.0,64.8 L 728.8,65.7 L 724.7,64.6 L 729.4,64.0 Z M 710.8,69.8 L 715.7,68.4 L 719.1,70.3 L 710.8,69.8 Z M 499.7,47.2 L 514.5,46.9 L 505.7,49.2 L 503.3,48.4 L 504.6,47.3 L 499.7,47.2 Z M 450.5,115.3 L 443.7,115.1 L 447.3,113.6 L 450.5,115.3 Z M 518.9,68.7 L 524.2,66.2 L 523.6,64.8 L 535.9,61.3 L 551.5,59.2 L 553.0,60.4 L 529.9,67.1 L 523.2,72.6 L 523.6,74.9 L 527.9,77.2 L 519.3,77.0 L 514.7,75.1 L 514.3,73.6 L 520.9,69.1 L 518.9,68.7 Z M 717.6,116.6 L 721.5,125.9 L 718.2,125.3 L 716.8,128.0 L 718.9,131.3 L 717.2,130.1 L 715.8,131.6 L 714.8,117.4 L 716.9,116.5 L 716.0,115.5 L 717.6,116.6 Z M 690.6,138.4 L 691.2,133.4 L 695.8,133.1 L 700.1,126.9 L 691.1,128.2 L 687.6,125.0 L 683.7,124.4 L 677.9,117.7 L 668.9,117.5 L 665.1,123.7 L 662.0,124.9 L 654.1,123.5 L 641.1,125.3 L 637.5,123.4 L 627.2,123.0 L 626.8,121.5 L 619.7,119.9 L 616.1,124.5 L 605.0,122.4 L 594.1,125.5 L 585.3,121.9 L 577.9,122.3 L 570.9,115.0 L 563.2,117.0 L 553.5,113.2 L 536.5,116.0 L 535.5,116.7 L 537.1,118.1 L 533.3,120.1 L 536.3,122.4 L 523.8,122.7 L 512.8,120.6 L 507.9,124.2 L 505.7,123.1 L 503.3,127.0 L 509.1,130.8 L 503.7,134.1 L 508.0,139.1 L 505.3,140.2 L 481.5,132.9 L 487.0,129.6 L 485.0,128.6 L 488.3,128.0 L 489.0,124.7 L 478.6,122.8 L 475.0,119.4 L 470.6,119.8 L 469.6,117.9 L 472.7,117.3 L 468.3,114.3 L 468.6,112.8 L 462.6,111.5 L 460.6,108.8 L 460.9,106.1 L 464.7,103.2 L 462.4,102.2 L 470.0,96.8 L 466.7,95.2 L 467.7,93.6 L 465.7,91.8 L 467.1,89.8 L 464.6,87.0 L 466.6,85.1 L 463.2,83.4 L 463.5,81.5 L 471.4,79.3 L 489.5,84.5 L 491.4,87.3 L 488.9,88.6 L 473.7,87.7 L 477.4,89.5 L 477.7,93.1 L 482.3,94.5 L 481.2,92.3 L 482.6,91.4 L 488.0,92.9 L 489.9,92.3 L 488.4,90.5 L 493.5,88.1 L 497.7,89.1 L 499.0,87.4 L 496.6,82.8 L 502.8,83.7 L 504.0,85.1 L 501.2,85.4 L 501.2,86.8 L 503.0,87.6 L 519.4,82.1 L 521.0,82.2 L 518.9,83.8 L 530.7,82.0 L 533.2,83.6 L 535.7,81.9 L 533.4,80.4 L 534.6,79.5 L 552.2,84.1 L 553.7,82.7 L 548.7,80.5 L 548.2,76.3 L 555.4,70.8 L 561.3,71.5 L 561.8,73.1 L 559.7,75.3 L 561.8,78.0 L 561.3,81.7 L 563.7,83.2 L 558.4,88.5 L 560.9,88.9 L 566.8,84.9 L 565.5,83.4 L 566.5,81.7 L 563.6,80.1 L 565.3,77.4 L 562.4,75.2 L 566.4,73.3 L 565.9,71.3 L 568.2,72.8 L 567.3,75.5 L 569.7,76.0 L 568.7,74.0 L 572.4,72.9 L 581.1,74.4 L 578.9,69.0 L 592.9,68.2 L 591.1,66.7 L 593.7,64.7 L 623.9,60.8 L 626.6,58.1 L 631.9,56.8 L 635.7,57.8 L 632.7,58.6 L 637.7,59.1 L 638.3,60.6 L 646.8,59.9 L 653.6,62.5 L 653.1,64.1 L 643.1,67.5 L 651.2,68.1 L 652.3,69.9 L 664.0,69.2 L 664.5,70.5 L 682.2,69.3 L 685.8,70.8 L 686.8,72.6 L 685.5,73.7 L 691.8,77.0 L 693.9,74.1 L 710.8,75.1 L 709.2,72.5 L 712.2,71.3 L 732.2,73.1 L 739.9,76.8 L 753.3,76.8 L 755.2,77.9 L 754.9,79.8 L 757.6,80.6 L 773.0,80.2 L 776.8,82.5 L 779.6,81.7 L 777.8,80.0 L 778.8,78.8 L 796.9,80.7 L 0.0,81.8 L 11.3,86.3 L 12.6,88.5 L 12.1,86.7 L 18.1,87.0 L 22.4,89.3 L 16.6,90.7 L 15.7,93.5 L 3.6,90.8 L 2.9,89.0 L 0.3,89.6 L 1.3,90.7 L 0.0,91.8 L 800.0,91.8 L 794.2,92.7 L 798.6,96.5 L 798.3,98.1 L 786.0,99.6 L 778.5,103.5 L 775.3,102.0 L 763.4,103.6 L 760.0,107.1 L 762.6,108.5 L 762.4,111.5 L 759.3,113.4 L 760.3,114.3 L 756.4,115.3 L 755.6,117.6 L 752.3,118.1 L 748.4,122.0 L 745.4,113.2 L 746.5,110.3 L 763.7,100.7 L 765.5,97.5 L 755.8,102.1 L 754.0,99.3 L 748.3,100.1 L 742.7,103.8 L 744.5,105.2 L 736.1,105.9 L 736.3,104.4 L 732.9,104.0 L 716.0,105.4 L 700.3,114.5 L 707.0,116.5 L 710.9,115.6 L 714.1,117.8 L 711.2,126.9 L 699.7,136.3 L 690.6,138.4 Z M 0.0,75.0 L 5.4,75.7 L 0.0,76.9 L 797.6,77.0 L 0.0,75.0 Z M 474.3,131.6 L 481.2,132.5 L 475.3,134.5 L 472.1,132.8 L 474.3,131.6 Z M 628.0,186.8 L 628.9,183.8 L 636.7,183.2 L 639.1,184.8 L 638.9,186.6 L 635.1,187.8 L 636.1,188.7 L 630.0,189.2 L 628.0,186.8 Z M 633.8,183.7 L 628.9,183.8 L 628.0,186.8 L 622.4,185.0 L 620.5,191.3 L 627.0,195.8 L 624.8,196.5 L 618.1,192.6 L 621.3,187.3 L 618.2,182.4 L 619.8,180.8 L 616.4,177.3 L 622.5,174.3 L 625.1,175.8 L 624.6,178.8 L 629.3,177.5 L 632.7,178.9 L 634.6,181.7 L 633.8,183.7 Z M 638.6,183.8 L 633.8,183.7 L 634.6,181.7 L 631.0,177.6 L 624.6,178.8 L 625.1,175.8 L 622.5,174.3 L 626.2,173.1 L 627.0,171.1 L 629.3,173.8 L 632.1,173.8 L 632.9,175.1 L 630.9,176.1 L 638.5,181.2 L 638.6,183.8 Z M 622.5,174.3 L 616.4,177.3 L 619.8,180.8 L 618.2,182.4 L 621.3,187.3 L 619.0,190.2 L 618.9,185.4 L 615.9,179.6 L 609.3,181.0 L 609.6,177.7 L 605.1,172.7 L 611.4,164.6 L 615.9,163.8 L 617.6,161.8 L 619.3,165.7 L 616.9,168.9 L 619.2,168.6 L 621.2,170.4 L 620.5,171.7 L 624.8,172.1 L 622.5,174.3 Z M 631.9,189.4 L 638.9,186.6 L 639.0,182.3 L 630.9,176.1 L 632.9,175.1 L 632.1,173.8 L 629.3,173.8 L 627.0,171.1 L 634.1,169.7 L 640.1,172.5 L 634.8,176.4 L 642.0,182.2 L 643.0,185.0 L 642.7,187.6 L 633.7,192.2 L 631.9,189.4 Z M 690.3,138.1 L 683.4,142.7 L 684.9,145.1 L 677.1,145.6 L 678.6,143.4 L 676.1,142.4 L 678.0,141.3 L 688.9,137.0 L 690.3,138.1 Z M 680.4,146.2 L 685.2,144.7 L 687.7,149.8 L 681.1,151.9 L 680.3,148.0 L 681.9,147.7 L 680.4,146.2 Z M 595.0,125.3 L 605.0,122.4 L 616.1,124.5 L 619.7,119.9 L 626.8,121.5 L 627.2,123.0 L 637.5,123.4 L 641.1,125.3 L 659.3,124.2 L 657.2,128.3 L 662.4,127.6 L 666.2,129.6 L 652.1,133.7 L 648.6,133.2 L 647.4,134.4 L 648.5,135.6 L 645.4,137.2 L 633.3,139.5 L 614.1,137.5 L 611.8,134.7 L 602.1,132.8 L 602.2,129.9 L 595.0,125.3 Z M 616.3,161.9 L 615.9,163.8 L 611.4,164.6 L 605.9,171.8 L 604.8,169.3 L 602.6,169.5 L 605.3,167.2 L 596.8,164.8 L 596.0,165.9 L 597.6,166.8 L 595.7,167.9 L 597.1,168.3 L 597.5,172.3 L 593.3,172.6 L 592.2,174.7 L 578.5,181.2 L 577.5,189.6 L 572.3,193.2 L 563.4,181.1 L 561.4,172.8 L 556.6,173.6 L 551.5,169.2 L 557.9,168.1 L 554.5,164.1 L 559.5,162.5 L 567.2,155.4 L 563.9,152.0 L 573.0,150.0 L 575.4,152.0 L 575.0,156.7 L 580.2,158.8 L 578.0,161.1 L 585.1,163.4 L 595.7,164.9 L 597.2,162.2 L 599.4,164.4 L 604.5,164.2 L 603.8,162.7 L 613.6,160.0 L 613.9,161.7 L 616.3,161.9 Z M 605.9,171.8 L 605.3,173.9 L 603.2,170.6 L 597.8,171.7 L 595.7,167.9 L 597.6,166.8 L 596.0,165.9 L 596.8,164.8 L 605.3,167.2 L 602.6,169.5 L 604.8,169.3 L 605.9,171.8 Z M 603.8,162.7 L 604.5,164.2 L 597.4,163.8 L 600.0,161.9 L 603.8,162.7 Z M 595.8,162.6 L 595.7,164.9 L 593.8,164.9 L 578.0,161.1 L 581.2,158.4 L 595.8,162.6 Z M 573.0,150.0 L 563.9,152.0 L 567.2,155.4 L 559.5,162.5 L 554.5,164.1 L 557.9,168.1 L 551.5,169.2 L 547.5,166.5 L 536.7,167.0 L 540.7,164.3 L 535.3,159.4 L 547.4,159.3 L 548.7,157.0 L 554.0,156.0 L 559.7,148.3 L 567.0,147.3 L 573.0,150.0 Z M 547.8,146.9 L 553.8,147.2 L 557.3,144.9 L 559.7,147.9 L 567.0,147.3 L 559.7,148.3 L 554.0,156.0 L 548.7,157.0 L 547.4,159.3 L 539.0,160.2 L 535.3,159.4 L 537.3,157.9 L 534.5,154.2 L 536.0,149.8 L 540.0,150.2 L 543.9,147.3 L 547.8,146.9 Z M 550.7,147.2 L 552.0,145.5 L 550.4,143.0 L 557.0,140.6 L 557.8,141.9 L 554.4,143.1 L 563.7,143.3 L 566.6,146.8 L 559.7,147.9 L 557.3,144.9 L 550.7,147.2 Z M 557.7,138.3 L 564.9,136.5 L 578.4,138.2 L 559.5,143.6 L 554.4,143.1 L 562.3,140.8 L 556.5,139.6 L 557.7,138.3 Z M 516.7,139.2 L 520.2,138.2 L 526.9,140.0 L 530.3,137.4 L 547.8,146.9 L 538.3,150.4 L 527.4,145.7 L 519.8,147.2 L 519.7,144.1 L 517.1,142.3 L 517.6,140.8 L 521.6,140.6 L 519.4,138.6 L 517.4,140.3 L 516.7,139.2 Z M 503.3,144.4 L 497.0,141.9 L 496.9,140.4 L 501.2,140.9 L 503.3,144.4 Z M 581.7,193.8 L 581.4,195.4 L 578.5,196.1 L 577.1,192.8 L 578.1,190.4 L 581.7,193.8 Z M 503.1,139.0 L 506.3,140.3 L 508.0,139.1 L 512.0,141.9 L 510.2,142.0 L 508.6,145.2 L 506.8,143.0 L 503.3,144.4 L 499.9,140.1 L 503.3,140.4 L 503.1,139.0 Z M 502.5,144.5 L 499.5,142.8 L 502.5,144.5 Z M 488.8,136.2 L 501.0,137.9 L 503.6,140.2 L 492.3,139.6 L 492.1,137.6 L 488.8,136.2 Z M 668.5,186.1 L 667.4,184.9 L 670.1,185.5 L 668.5,186.1 Z M 672.4,190.1 L 675.7,188.3 L 673.3,191.6 L 672.4,190.1 Z M 680.8,192.5 L 681.2,194.3 L 680.4,195.7 L 678.6,194.9 L 678.7,196.7 L 674.7,193.4 L 670.9,194.3 L 678.7,190.5 L 680.8,192.5 Z M 663.3,191.1 L 660.4,192.6 L 665.6,188.1 L 663.3,191.1 Z M 671.9,177.7 L 670.5,183.6 L 675.4,184.4 L 675.7,186.3 L 668.1,184.3 L 668.9,183.3 L 666.5,182.0 L 668.3,177.2 L 671.9,177.7 Z M 671.2,188.0 L 673.6,188.4 L 671.1,189.5 L 671.2,188.0 Z M 678.9,186.9 L 679.5,188.5 L 677.8,188.1 L 677.3,189.9 L 676.2,186.3 L 678.9,186.9 Z M 622.4,195.4 L 628.8,196.8 L 631.6,203.1 L 625.3,200.9 L 622.4,195.4 Z M 662.0,198.9 L 657.5,198.6 L 654.7,202.9 L 645.6,203.9 L 643.7,202.0 L 647.0,202.3 L 653.8,198.3 L 656.3,198.6 L 659.4,194.7 L 664.8,197.0 L 662.0,198.9 Z M 715.3,143.7 L 711.7,150.6 L 701.8,153.4 L 700.2,151.6 L 691.1,152.7 L 693.3,154.0 L 690.4,157.5 L 687.6,153.7 L 694.7,150.1 L 701.5,150.0 L 703.8,147.0 L 708.6,146.1 L 711.8,140.2 L 714.2,139.9 L 715.3,143.7 Z M 721.4,135.3 L 722.9,134.5 L 723.4,136.5 L 718.2,138.8 L 714.7,137.6 L 713.5,139.5 L 711.0,139.5 L 710.7,137.8 L 714.2,136.3 L 715.5,132.3 L 721.4,135.3 Z M 694.2,153.4 L 697.6,151.9 L 699.5,152.9 L 695.6,154.7 L 694.2,153.4 Z"
                        fill={authorRegionsOfFocus.some(r => r.id === "asia" && r.active) ? "#059669" : "#CBD5E1"}
                        stroke="#FFFFFF"
                        strokeWidth="0.8"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        className="transition-colors duration-300"
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

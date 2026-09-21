"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "dj_writer_submitted_articles";
const SYNC_EVENT_NAME = "dj_articles_updated";

export interface ArticleItem {
  id: string | number;
  title: string;
  subheading?: string;
  summary?: string;
  content?: string;
  category?: string;
  category_name?: string;
  placement?: string;
  imageUrl?: string;
  image?: string;
  status: string; // "Published" | "Pending review" | "Draft" | "Rejected"
  date?: string;
  reads?: number;
  tags?: string[];
  readDuration?: string;
  authorEmail?: string;
  authorName?: string;
  authorAvatar?: string;
  authorBio?: string;
  seo?: any;
  slug?: string;
  is_featured?: boolean;
  is_editors_pick?: boolean;
  [key: string]: any;
}

export interface AdSlotItem {
  id: string;
  dimensions: string;
  title: string;
  description: string;
  categoryGroup: "HOMEPAGE" | "CATEGORY" | "AUTHOR";
  imageUrl: string;
  actionType: string;
  targetUrl: string;
  isActive: boolean;
}

export const DEFAULT_AD_SLOTS: AdSlotItem[] = [
  {
    id: "slot-1",
    dimensions: "728X250",
    title: "Homepage — Mid Leaderboard Banner (Slot 2)",
    description: "Full-width banner between Technology & Markets sections",
    categoryGroup: "HOMEPAGE",
    imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=300&fit=crop",
    actionType: "External Link (URL)",
    targetUrl: "https://www.top-scholarships.com/",
    isActive: true
  },
  {
    id: "slot-2",
    dimensions: "728X250",
    title: "Homepage — Bottom Leaderboard Banner (Slot 3)",
    description: "Full-width banner between Lifestyle & Bottom Category Grid",
    categoryGroup: "HOMEPAGE",
    imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=300&fit=crop",
    actionType: "External Link (URL)",
    targetUrl: "https://www.amazon.com/",
    isActive: true
  },
  {
    id: "slot-3",
    dimensions: "300X250",
    title: "Homepage — Business Section Top-Right Ad Box",
    description: "Square 300x250 ad box inside the Business section top-right",
    categoryGroup: "HOMEPAGE",
    imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=300&fit=crop",
    actionType: "External Link (URL)",
    targetUrl: "https://www.pepsi.com/",
    isActive: true
  },
  {
    id: "slot-4",
    dimensions: "300X250",
    title: "Category Pages — Sidebar Top Ad Box",
    description: "Right sidebar top box on Category news feeds (Politics, Tech, etc.)",
    categoryGroup: "CATEGORY",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=300&fit=crop",
    actionType: "External Link (URL)",
    targetUrl: "https://www.nvidia.com/en-in/",
    isActive: true
  },
  {
    id: "slot-5",
    dimensions: "300X600",
    title: "Category Pages — Sidebar Bottom Tall Ad Box",
    description: "Vertical 300x600 tall skyscraper ad box on category sidebars",
    categoryGroup: "CATEGORY",
    imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&h=300&fit=crop",
    actionType: "External Link (URL)",
    targetUrl: "https://www.tesla.com/",
    isActive: true
  },
  {
    id: "slot-6",
    dimensions: "300X250",
    title: "Author Profile Pages — Sidebar Ad Box",
    description: "Medium 300x250 sponsor box displayed on author profile pages",
    categoryGroup: "AUTHOR",
    imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=300&fit=crop",
    actionType: "External Link (URL)",
    targetUrl: "https://in.louisvuitton.com/eng-in/homepage",
    isActive: true
  }
];

const AD_STORAGE_KEY = "dj_site_ad_slots";
const AD_SYNC_EVENT = "dj_ad_slots_updated";

export function useLiveAdSlots() {
  const [adSlots, setAdSlots] = useState<AdSlotItem[]>(DEFAULT_AD_SLOTS);

  const loadSlots = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(AD_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAdSlots(parsed);
          return;
        }
      }
    } catch (e) {}
    setAdSlots(DEFAULT_AD_SLOTS);
  }, []);

  useEffect(() => {
    loadSlots();
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === null || e.key === AD_STORAGE_KEY) loadSlots();
    };
    window.addEventListener(AD_SYNC_EVENT, loadSlots);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener(AD_SYNC_EVENT, loadSlots);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loadSlots]);

  const saveAdSlots = useCallback((newSlots: AdSlotItem[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(AD_STORAGE_KEY, JSON.stringify(newSlots));
      window.dispatchEvent(new Event(AD_SYNC_EVENT));
    } catch (e) {}
    setAdSlots(newSlots);
  }, []);

  return { adSlots, saveAdSlots };
}

export function formatAdDimensions(dim: string): string {
  if (!dim) return "";
  return dim.toUpperCase().replace(/\s+/g, "");
}

export function isDuplicateAdImage(url: string, currentSlotId?: string, allSlots?: AdSlotItem[] | any): boolean {
  if (!url || !allSlots || !Array.isArray(allSlots)) return false;
  const cleanUrl = url.trim().toLowerCase();
  const duplicate = allSlots.find(
    (s: any) => s.id !== currentSlotId && s.isActive && (s.imageUrl || "").trim().toLowerCase() === cleanUrl
  );
  return Boolean(duplicate);
}

export function isHomePageAPlus(post: any): boolean {
  if (!post) return false;
  const pl = (typeof post === "string" ? post : (post.placement || "")).toLowerCase().trim();
  if (pl.includes("section 2") || pl.includes("a+ 2") || pl.includes("a+2")) return false;
  if (pl.includes("trending") || pl.includes("editor") || pl.includes("latest") || pl.includes("category")) return false;
  return (
    pl === "home page a+ section" ||
    pl === "home page a+" ||
    pl === "a+ section" ||
    pl === "featured story" ||
    pl.includes("home page a+") ||
    (post.is_featured === true && (pl === "" || pl === "featured story" || pl === "home page a+ section"))
  );
}

export function isTrendingNow(post: any): boolean {
  if (!post) return false;
  const pl = (typeof post === "string" ? post : (post.placement || "")).toLowerCase().trim();
  if (pl.includes("section 2") || pl.includes("a+ 2") || pl.includes("a+2") || pl.includes("home page a+")) return false;
  if (pl.includes("editor") || pl.includes("latest") || pl.includes("category")) return false;
  return (
    pl === "trending now section" ||
    pl === "trending now" ||
    pl === "trending" ||
    pl.includes("trending")
  );
}

export function isEditorsPick(post: any): boolean {
  if (!post) return false;
  const pl = (typeof post === "string" ? post : (post.placement || "")).toLowerCase().trim();
  if (pl.includes("section 2") || pl.includes("a+ 2") || pl.includes("a+2") || pl.includes("home page a+") || pl.includes("trending") || pl.includes("latest") || pl.includes("category")) return false;
  return (
    pl === "editor's picks section" ||
    pl === "editor's pick" ||
    pl === "editor's picks" ||
    pl === "editors pick" ||
    pl === "editors picks" ||
    pl.includes("editor") ||
    (post.is_editors_pick === true && (pl === "" || pl.includes("editor")))
  );
}

export function isLatestNews(post: any): boolean {
  if (!post) return false;
  const pl = (typeof post === "string" ? post : (post.placement || "")).toLowerCase().trim();
  if (pl.includes("section 2") || pl.includes("a+ 2") || pl.includes("a+2") || pl.includes("home page a+") || pl.includes("trending") || pl.includes("editor") || pl.includes("category")) return false;
  return (
    pl === "latest news section" ||
    pl === "latest news" ||
    pl === "latest" ||
    pl.includes("latest")
  );
}

export function isHomePageAPlus2(post: any): boolean {
  if (!post) return false;
  const pl = (typeof post === "string" ? post : (post.placement || "")).toLowerCase().trim();
  if (pl.includes("trending") || pl.includes("editor") || pl.includes("latest") || pl.includes("category")) return false;
  return (
    pl === "home page a+ section 2" ||
    pl === "a+ section 2" ||
    pl === "a+2" ||
    pl.includes("a+ section 2") ||
    pl.includes("section 2") ||
    pl === "middle dark spotlight banner"
  );
}

export function isCategorySectionOnly(post: any): boolean {
  if (!post) return true;
  const pl = (typeof post === "string" ? post : (post.placement || "")).toLowerCase().trim();
  if (
    pl === "standard post" ||
    pl === "category section only" ||
    pl === "category_only" ||
    pl === "category only" ||
    pl === "standard" ||
    pl === "none" ||
    pl === ""
  ) {
    return true;
  }
  return (
    !isHomePageAPlus(post) &&
    !isTrendingNow(post) &&
    !isEditorsPick(post) &&
    !isLatestNews(post) &&
    !isHomePageAPlus2(post)
  );
}

export function isTopPlacementArticle(post: any): boolean {
  return !isCategorySectionOnly(post);
}

export function getArticleSubcategories(post: any): string[] {
  if (!post) return [];
  const subs = post.subcategories || post.subCategories || post.sub_categories || [];
  if (Array.isArray(subs)) {
    return subs.map((s: any) => String(s || "").trim()).filter(Boolean);
  }
  if (typeof subs === "string") {
    try {
      const parsed = JSON.parse(subs);
      if (Array.isArray(parsed)) {
        return parsed.map((s: any) => String(s || "").trim()).filter(Boolean);
      }
    } catch (e) {}
    return subs.split(",").map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
}

export function normalizeCategoryKey(name: string): string {
  if (!name) return "";
  const cleaned = name.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  if (cleaned.includes("tech")) return "technology";
  if (cleaned.includes("biz") || cleaned.includes("business")) return "business";
  if (cleaned.includes("sport")) return "sports";
  if (cleaned.includes("econom")) return "economy";
  if (cleaned.includes("market")) return "markets";
  if (cleaned.includes("politic")) return "politics";
  if (cleaned.includes("health") || cleaned.includes("medic")) return "health";
  if (cleaned.includes("research") || cleaned.includes("innovat") || cleaned.includes("insight")) return "research";
  if (cleaned.includes("lifestyle") || cleaned.includes("life")) return "lifestyle";
  if (cleaned.includes("entertain") || cleaned.includes("art")) return "entertainment";
  if (cleaned.includes("china")) return "china";
  if (cleaned.includes("unitedstates") || cleaned === "us" || cleaned === "usa" || cleaned.includes("america")) return "unitedstates";
  if (cleaned.includes("europe")) return "europe";
  if (cleaned.includes("britain") || cleaned.includes("uk")) return "britain";
  if (cleaned.includes("middleeast")) return "middleeast";
  if (cleaned.includes("africa")) return "africa";
  if (cleaned.includes("asia")) return "asia";
  if (cleaned.includes("world")) return "world";
  return cleaned;
}

export function articleBelongsToCategory(post: any, targetCategory: string): boolean {
  if (!post || !targetCategory) return false;
  const cleanTarget = targetCategory.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  if (!cleanTarget) return false;

  // 1. Direct match with Main Category
  const catRaw = String(post.category || post.category_name || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  if (catRaw === cleanTarget || catRaw.includes(cleanTarget) || cleanTarget.includes(catRaw)) {
    return true;
  }

  // 2. Direct match with selected Subcategories
  const subs = getArticleSubcategories(post);
  for (const sub of subs) {
    const cleanSub = String(sub).toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    if (cleanSub === cleanTarget || cleanSub.includes(cleanTarget) || cleanTarget.includes(cleanSub)) {
      return true;
    }
  }

  // 3. Match normalized category keys
  const targetNorm = normalizeCategoryKey(targetCategory);
  const catNorm = normalizeCategoryKey(post.category || post.category_name || "");
  if (targetNorm && catNorm && targetNorm === catNorm) {
    return true;
  }

  for (const sub of subs) {
    const subNorm = normalizeCategoryKey(sub);
    if (targetNorm && subNorm && targetNorm === subNorm) {
      return true;
    }
  }

  // 4. World region matching: Articles with world region subcategories belong to the World category
  const worldRegions = ["china", "unitedstates", "europe", "britain", "middleeast", "africa", "asia"];
  if (targetNorm === "world" || cleanTarget === "world") {
    if (worldRegions.includes(catNorm)) return true;
    for (const sub of subs) {
      const subNorm = normalizeCategoryKey(sub);
      if (worldRegions.includes(subNorm)) return true;
    }
  }

  return false;
}

export function articleMatchesCategory(post: any, categoryOrSub: string): boolean {
  return articleBelongsToCategory(post, categoryOrSub);
}

export function articleMatchesMainCategory(post: any, targetCategory: string): boolean {
  if (!post || !targetCategory) return false;
  const cleanTarget = targetCategory.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  if (!cleanTarget) return false;

  const catRaw = String(post.category || post.category_name || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  if (catRaw === cleanTarget || catRaw.includes(cleanTarget) || cleanTarget.includes(catRaw)) {
    return true;
  }

  const targetNorm = normalizeCategoryKey(targetCategory);
  const catNorm = normalizeCategoryKey(post.category || post.category_name || "");
  if (targetNorm && catNorm && targetNorm === catNorm) {
    return true;
  }

  return false;
}

function notifyLocalChange() {
  if (typeof window !== "undefined") {
    // Only dispatch within the current tab — do NOT use BroadcastChannel
    // to avoid triggering re-renders/reloads in other open tabs.
    window.dispatchEvent(new Event(SYNC_EVENT_NAME));
  }
}

export function isArticleDeleted(post: any): boolean {
  if (typeof window === "undefined") return false;
  try {
    const deletedStr = localStorage.getItem("dj_deleted_articles");
    if (!deletedStr) return false;
    const deletedList: string[] = JSON.parse(deletedStr);
    const pId = String(post.id || "");
    const pTitle = (post.title || "").trim().toLowerCase();
    const pSlug = (post.slug || pTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-'));

    return deletedList.some(d => d === pId || d === pTitle || d === pSlug);
  } catch (e) {
    return false;
  }
}

export function resolveArticleImageUrl(url?: string): string {
  if (!url) return "";
  let clean = String(url).trim();
  if (clean.includes("f005.backblazeb2.com/file/LondonNetwork/")) {
    clean = clean.replace(/https?:\/\/f005\.backblazeb2\.com\/file\/LondonNetwork\//g, "https://LondonNetwork.s3.us-east-005.backblazeb2.com/");
  }
  return clean;
}

export function getCachedArticles(): ArticleItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(a => !isArticleDeleted(a)).map(a => {
          const resolvedImg = resolveArticleImageUrl(a.imageUrl || a.image || a.image_url || "");
          return {
            ...a,
            imageUrl: resolvedImg || a.imageUrl,
            image: resolvedImg || a.image,
            image_url: resolvedImg || a.image_url,
          };
        });
      }
    }
  } catch (e) {}
  return [];
}

export function setCachedArticles(articles: ArticleItem[], notify = true) {
  if (typeof window === "undefined") return;
  try {
    const filtered = articles.filter(a => !isArticleDeleted(a));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    if (notify) {
      notifyLocalChange();
    }
  } catch (e) {}
}

let activeArticlesFetchPromise: Promise<ArticleItem[]> | null = null;
let lastArticlesFetchTime = 0;
const ARTICLES_FETCH_CACHE_TTL_MS = 6000;

export async function fetchArticlesFromServer(): Promise<ArticleItem[]> {
  const now = Date.now();
  // Skip TTL cache on the very first call (page load/reload) so stale localStorage
  // data is never returned instead of fresh server data.
  const isFirstLoad = lastArticlesFetchTime === 0;
  if (!isFirstLoad && now - lastArticlesFetchTime < ARTICLES_FETCH_CACHE_TTL_MS) {
    return getCachedArticles();
  }
  if (activeArticlesFetchPromise) {
    return activeArticlesFetchPromise;
  }

  activeArticlesFetchPromise = (async () => {
    try {
      const res = await fetch("/api/articles", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.articles)) {
          const activeArticles = data.articles.filter((a: any) => !isArticleDeleted(a));
          const localCached = getCachedArticles();
          const mergedMap = new Map<string, ArticleItem>();
          
          activeArticles.forEach((a: any) => {
            const resolvedImg = resolveArticleImageUrl(a.imageUrl || a.image || a.image_url || "");
            const itemWithCleanImg: ArticleItem = {
              ...a,
              imageUrl: resolvedImg || a.imageUrl,
              image: resolvedImg || a.image,
              image_url: resolvedImg || a.image_url,
            };
            mergedMap.set(String(a.id), itemWithCleanImg);
          });

          localCached.forEach((a: any) => {
            if (!mergedMap.has(String(a.id))) {
              // Only retain local unpublished drafts or pending reviews
              if (a.status === "Draft" || a.status === "Pending review") {
                const resolvedImg = resolveArticleImageUrl(a.imageUrl || a.image || a.image_url || "");
                mergedMap.set(String(a.id), {
                  ...a,
                  imageUrl: resolvedImg || a.imageUrl,
                  image: resolvedImg || a.image,
                  image_url: resolvedImg || a.image_url,
                });
              }
            } else {
              // Server database is the single source of truth for published articles
              const serverVersion = mergedMap.get(String(a.id))!;
              const mergedSubcategories = (Array.isArray(serverVersion.subcategories) && serverVersion.subcategories.length > 0)
                ? serverVersion.subcategories
                : (Array.isArray(a.subcategories) && a.subcategories.length > 0 ? a.subcategories : (a.subCategories || []));
              mergedMap.set(String(a.id), { ...serverVersion, subcategories: mergedSubcategories });
            }
          });

          const combined = Array.from(mergedMap.values());
          setCachedArticles(combined, false);
          lastArticlesFetchTime = Date.now();
          return combined;
        }
      }
    } catch (e) {
      console.warn("[articlesSync] Could not fetch articles from server:", e);
    } finally {
      activeArticlesFetchPromise = null;
    }
    return getCachedArticles();
  })();


  return activeArticlesFetchPromise;
}

export async function saveArticleToServer(article: ArticleItem): Promise<ArticleItem[]> {
  const isPendingOrPublished = article.status === "Pending review" || article.status === "Published";
  const nowIso = new Date().toISOString();
  const articleWithTimestamps: ArticleItem = {
    ...article,
    rejectionReason: isPendingOrPublished ? undefined : article.rejectionReason,
    rejection_reason: isPendingOrPublished ? undefined : (article as any).rejection_reason,
    rejectedAt: isPendingOrPublished ? undefined : (article as any).rejectedAt,
    updated_at: nowIso,
    updatedAt: nowIso,
    ...(article.status === "Published" ? {
      published_at: nowIso,
      publishedAt: nowIso,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } : {})
  };

  const cleanTitleKey = (t: string) => (t || "")
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B']/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const origTitleKey = cleanTitleKey((article as any).original_title || (article as any).previousTitle || "");

  // Always update local cache first so local drafts/pending reviews are preserved
  const cached = getCachedArticles();
  const idx = cached.findIndex((a) => 
    String(a.id) === String(article.id) || 
    (cleanTitleKey(a.title) && cleanTitleKey(article.title) && cleanTitleKey(a.title) === cleanTitleKey(article.title)) ||
    (origTitleKey && cleanTitleKey(a.title) === origTitleKey)
  );
  let updated: ArticleItem[];
  if (idx >= 0) {
    updated = [...cached];
    updated[idx] = { ...updated[idx], ...articleWithTimestamps };
  } else {
    updated = [articleWithTimestamps, ...cached];
  }
  setCachedArticles(updated, true);

  // Synchronize submitted articles storage immediately
  if (typeof window !== "undefined") {
    try {
      const subsStr = localStorage.getItem(STORAGE_KEY);
      let subsList: any[] = subsStr ? JSON.parse(subsStr) : [];
      if (!Array.isArray(subsList)) subsList = [];
      const sIdx = subsList.findIndex((p: any) => 
        String(p.id) === String(article.id) || 
        (cleanTitleKey(p.title) && cleanTitleKey(article.title) && cleanTitleKey(p.title) === cleanTitleKey(article.title)) ||
        (origTitleKey && cleanTitleKey(p.title) === origTitleKey)
      );
      if (sIdx >= 0) {
        subsList[sIdx] = { ...subsList[sIdx], ...articleWithTimestamps };
      } else {
        subsList.unshift(articleWithTimestamps);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subsList));
      window.dispatchEvent(new Event(SYNC_EVENT_NAME));
      window.dispatchEvent(new Event("dj_articles_updated"));
    } catch (e) {}
  }

  try {
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(articleWithTimestamps)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.articles && Array.isArray(data.articles)) {
        const serverList = data.articles;
        const mergedMap = new Map<string, ArticleItem>();

        serverList.forEach((item: any) => {
          const titleKey = cleanTitleKey(item.title);
          if (titleKey) mergedMap.set(`t_${titleKey}`, item);
          mergedMap.set(String(item.id), item);
        });

        const artIdKey = String(articleWithTimestamps.id);
        const artTitleKey = cleanTitleKey(articleWithTimestamps.title);
        if (artIdKey) mergedMap.set(artIdKey, articleWithTimestamps);
        if (artTitleKey) mergedMap.set(`t_${artTitleKey}`, articleWithTimestamps);
        if (origTitleKey) mergedMap.set(`t_${origTitleKey}`, articleWithTimestamps);

        updated.forEach((item) => {
          const titleKey = cleanTitleKey(item.title);
          const isCurrentSaved = String(item.id) === artIdKey || (titleKey && titleKey === artTitleKey) || (origTitleKey && titleKey === origTitleKey);
          const serverMatch = (titleKey && mergedMap.get(`t_${titleKey}`)) || (origTitleKey && mergedMap.get(`t_${origTitleKey}`)) || mergedMap.get(String(item.id));
          if (serverMatch) {
            const merged = isCurrentSaved ? { ...serverMatch, ...articleWithTimestamps, id: serverMatch.id || articleWithTimestamps.id } : { ...serverMatch, ...item, id: serverMatch.id };
            mergedMap.set(String(serverMatch.id), merged);
            if (titleKey) mergedMap.set(`t_${titleKey}`, merged);
          } else {
            mergedMap.set(String(item.id), isCurrentSaved ? articleWithTimestamps : item);
          }
        });

        const mergedList: ArticleItem[] = [];
        const seen = new Set<string>();
        for (const [k, item] of mergedMap.entries()) {
          if (k.startsWith("t_")) continue;
          const tKey = cleanTitleKey(item.title);
          const idKey = String(item.id);
          if ((!tKey || !seen.has(tKey)) && !seen.has(idKey)) {
            if (tKey) seen.add(tKey);
            seen.add(idKey);
            mergedList.push(item);
          }
        }
        setCachedArticles(mergedList, true);
        return mergedList;
      }
    }
  } catch (e) {
    console.error("[articlesSync] Error saving article to server:", e);
  }

  return updated;
}

export async function updateArticleStatusOnServer(id: string | number, status: string): Promise<ArticleItem[]> {
  const nowIso = new Date().toISOString();
  try {
    const res = await fetch("/api/articles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status,
        updated_at: nowIso,
        updatedAt: nowIso,
        ...(status === "Published" ? {
          published_at: nowIso,
          publishedAt: nowIso,
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        } : {})
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.articles) {
        setCachedArticles(data.articles);
        return data.articles;
      }
    }
  } catch (e) {
    console.error("[articlesSync] Error updating status on server:", e);
  }

  const cached = getCachedArticles();
  const updated = cached.map((a) => (String(a.id) === String(id) ? {
    ...a,
    status,
    updated_at: nowIso,
    updatedAt: nowIso,
    ...(status === "Published" ? {
      published_at: nowIso,
      publishedAt: nowIso,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } : {})
  } : a));
  setCachedArticles(updated);
  return updated;
}

export async function moveArticleToTrashOnServer(id: string | number, title?: string, slug?: string): Promise<ArticleItem[]> {
  if (typeof window !== "undefined") {
    try {
      const subsStr = localStorage.getItem(STORAGE_KEY);
      if (subsStr) {
        const parsed: any[] = JSON.parse(subsStr);
        const updated = parsed.map(a => 
          (String(a.id) === String(id) || (title && (a.title || "").trim().toLowerCase() === title.trim().toLowerCase()))
            ? { ...a, status: "Trash", original_status: a.status || "Draft" }
            : a
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }

      const trashedStr = localStorage.getItem("dj_trashed_articles");
      const trashedList: any[] = trashedStr ? JSON.parse(trashedStr) : [];
      const cached = getCachedArticles();
      const target = cached.find(a => String(a.id) === String(id) || (title && a.title === title));
      if (target) {
        const trashedItem = { ...target, status: "Trash", original_status: target.status || "Draft" };
        const nextTrashed = [trashedItem, ...trashedList.filter(t => String(t.id) !== String(id) && t.title !== title)];
        localStorage.setItem("dj_trashed_articles", JSON.stringify(nextTrashed));
      }
    } catch (e) {}
  }

  try {
    const res = await fetch(`/api/articles?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });
    if (res && res.ok) {
      const data = await res.json();
      if (data && data.articles) {
        setCachedArticles(data.articles, false);
        return data.articles;
      }
    }
  } catch (e) {
    console.warn("[articlesSync] Notice: Moved to Trash locally:", e);
  }

  const cached = getCachedArticles();
  const updated = cached.map((a) => (String(a.id) === String(id) || (title && a.title === title) ? { ...a, status: "Trash" } : a));
  setCachedArticles(updated, false);
  return updated;
}

export const deleteArticleOnServer = moveArticleToTrashOnServer;

export async function deletePermanentlyOnServer(id: string | number, title?: string, slug?: string): Promise<ArticleItem[]> {
  if (typeof window !== "undefined") {
    try {
      const deletedStr = localStorage.getItem("dj_deleted_articles");
      const deletedList: string[] = deletedStr ? JSON.parse(deletedStr) : [];
      const keys = [String(id)];
      if (title) keys.push(title.trim().toLowerCase());
      if (slug) keys.push(slug.trim().toLowerCase());
      
      keys.forEach(k => {
        if (k && !deletedList.includes(k)) deletedList.push(k);
      });
      localStorage.setItem("dj_deleted_articles", JSON.stringify(deletedList));

      const subsStr = localStorage.getItem(STORAGE_KEY);
      if (subsStr) {
        const parsed: any[] = JSON.parse(subsStr);
        const filtered = parsed.filter(a => String(a.id) !== String(id) && (title ? (a.title || "").trim().toLowerCase() !== title.trim().toLowerCase() : true));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }

      const trashedStr = localStorage.getItem("dj_trashed_articles");
      if (trashedStr) {
        const parsed: any[] = JSON.parse(trashedStr);
        const filtered = parsed.filter(a => String(a.id) !== String(id) && (title ? (a.title || "").trim().toLowerCase() !== title.trim().toLowerCase() : true));
        localStorage.setItem("dj_trashed_articles", JSON.stringify(filtered));
      }
    } catch (e) {}
  }

  try {
    const res = await fetch(`/api/articles?id=${encodeURIComponent(id)}&permanent=true`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });
    if (res && res.ok) {
      const data = await res.json();
      if (data && data.articles) {
        const filtered = data.articles.filter((a: any) => !isArticleDeleted(a));
        setCachedArticles(filtered, false);
        return filtered;
      }
    }
  } catch (e) {
    console.warn("[articlesSync] Permanent delete handled locally:", e);
  }

  const cached = getCachedArticles();
  const updated = cached.filter((a) => String(a.id) !== String(id) && !isArticleDeleted(a));
  setCachedArticles(updated, false);
  return updated;
}

export function useLiveArticles() {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const fresh = await fetchArticlesFromServer();
    setArticles(fresh);
    setLoading(false);
  }, []);

  useEffect(() => {
    // On mount: always fetch fresh data from the server first.
    // Do NOT pre-populate from localStorage cache — that would show stale data
    // before the real server response arrives.
    fetchArticlesFromServer().then((fresh) => {
      setArticles(Array.isArray(fresh) ? fresh : []);
      setLoading(false);
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dj_page_data_ready"));
        }
      }, 50);
    }).catch(() => {
      // On fetch failure, fall back to cache so page isn't blank
      const cached = getCachedArticles();
      setArticles(cached);
      setLoading(false);
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dj_page_data_ready"));
        }
      }, 50);
    });

    // Listen for in-tab write events triggered by admin/writer actions
    // (e.g. publishing, editing). These dispatch a window event — NOT a
    // cross-tab storage event — so they are safe to listen to.
    const handleSync = () => {
      fetchArticlesFromServer().then((fresh) => {
        setArticles(Array.isArray(fresh) ? fresh : []);
      }).catch(() => {});
    };

    // NOTE: We intentionally do NOT listen to the native "storage" event here.
    // That event fires when OTHER browser tabs modify localStorage, which would
    // cause unrelated tabs to re-fetch/re-render — the cross-tab reload bug.

    if (typeof window !== "undefined") {
      window.addEventListener(SYNC_EVENT_NAME, handleSync);
      window.addEventListener("dj_articles_updated", handleSync);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(SYNC_EVENT_NAME, handleSync);
        window.removeEventListener("dj_articles_updated", handleSync);
      }
    };
  }, []);

  return { articles, loading, refresh };
}

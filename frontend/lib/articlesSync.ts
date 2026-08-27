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

export function isTopPlacementArticle(post: any): boolean {
  if (!post) return false;
  const pl = (post.placement || "").toLowerCase();
  return (
    pl.includes("a+") ||
    pl.includes("trending") ||
    pl.includes("editor") ||
    pl.includes("latest") ||
    post.is_featured === true ||
    post.is_editors_pick === true
  );
}

export function getArticleSubcategories(post: any): string[] {
  if (!post) return [];
  const subs = post.subcategories || post.subCategories || [];
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
  if (cleaned === "tech" || cleaned === "technology") return "technology";
  if (cleaned === "biz" || cleaned === "business") return "business";
  if (cleaned === "sport" || cleaned === "sports") return "sports";
  if (cleaned === "economy" || cleaned === "economic" || cleaned === "economics") return "economy";
  if (cleaned === "market" || cleaned === "markets") return "markets";
  if (cleaned === "politic" || cleaned === "politics") return "politics";
  if (cleaned === "health" || cleaned === "healthcare") return "health";
  if (cleaned === "research" || cleaned === "innovation" || cleaned === "researchinnovation" || cleaned === "insights") return "research";
  if (cleaned === "lifestyle" || cleaned === "life") return "lifestyle";
  if (cleaned === "entertainment" || cleaned === "arts" || cleaned === "art") return "entertainment";
  if (cleaned === "unitedstates" || cleaned === "us" || cleaned === "usa") return "unitedstates";
  if (cleaned === "middleeast") return "middleeast";
  return cleaned;
}

export function articleMatchesCategory(post: any, categoryOrSub: string): boolean {
  if (!post || !categoryOrSub) return false;
  const targetKey = normalizeCategoryKey(categoryOrSub);
  if (!targetKey) return false;

  const catKey = normalizeCategoryKey(post.category || post.category_name || "");
  const subsKeys = getArticleSubcategories(post).map(s => normalizeCategoryKey(s)).filter(Boolean);

  // 1. Direct match with Article's Main Category
  if (catKey === targetKey) return true;

  // 2. Direct match with any of Article's Selected Sub-Categories
  if (subsKeys.includes(targetKey)) return true;

  // 3. World category hierarchy
  const WORLD_REGIONS = ["china", "unitedstates", "europe", "britain", "middleeast", "africa", "asia"];
  if (targetKey === "world") {
    if (catKey === "world" || WORLD_REGIONS.includes(catKey)) return true;
    if (subsKeys.some(s => s === "world" || WORLD_REGIONS.includes(s))) return true;
    return false;
  }

  if (WORLD_REGIONS.includes(targetKey)) {
    return catKey === targetKey || subsKeys.includes(targetKey);
  }

  return false;
}

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel("dj_articles_channel");
  } catch (e) {}
}

function notifyLocalChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SYNC_EVENT_NAME));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: "ARTICLES_UPDATED" });
    }
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

export function getCachedArticles(): ArticleItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(a => !isArticleDeleted(a));
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
  if (now - lastArticlesFetchTime < ARTICLES_FETCH_CACHE_TTL_MS) {
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
          activeArticles.forEach((a: any) => mergedMap.set(String(a.id), a));
          localCached.forEach((a: any) => {
            if (!mergedMap.has(String(a.id))) {
              mergedMap.set(String(a.id), a);
            } else {
              mergedMap.set(String(a.id), { ...mergedMap.get(String(a.id))!, ...a });
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
  // Always update local cache first so local drafts/pending reviews are preserved
  const cached = getCachedArticles();
  const idx = cached.findIndex((a) => String(a.id) === String(article.id) || (a.title && article.title && a.title.trim().toLowerCase() === article.title.trim().toLowerCase()));
  let updated: ArticleItem[];
  if (idx >= 0) {
    updated = [...cached];
    updated[idx] = { ...updated[idx], ...article };
  } else {
    updated = [article, ...cached];
  }
  setCachedArticles(updated, false);

  try {
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(article)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.articles && Array.isArray(data.articles)) {
        const serverList = data.articles;
        const mergedMap = new Map<string, ArticleItem>();
        updated.forEach((item) => mergedMap.set(String(item.id), item));
        serverList.forEach((item: any) => mergedMap.set(String(item.id), { ...mergedMap.get(String(item.id)), ...item }));
        const mergedList = Array.from(mergedMap.values());
        setCachedArticles(mergedList, false);
        return mergedList;
      }
    }
  } catch (e) {
    console.error("[articlesSync] Error saving article to server:", e);
  }

  return updated;
}

export async function updateArticleStatusOnServer(id: string | number, status: string): Promise<ArticleItem[]> {
  try {
    const res = await fetch("/api/articles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status })
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
  const updated = cached.map((a) => (String(a.id) === String(id) ? { ...a, status } : a));
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
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const fresh = await fetchArticlesFromServer();
    setArticles(fresh);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Populate client cache immediately on client mount
    const cached = getCachedArticles();
    if (cached.length > 0) {
      setArticles(cached);
    }

    // Initial fetch from server
    fetchArticlesFromServer().then((fresh) => {
      if (Array.isArray(fresh) && fresh.length > 0) {
        setArticles(fresh);
      }
    });

    // Event listeners for user action updates
    const handleSync = () => {
      setArticles(getCachedArticles());
    };

    if (typeof window !== "undefined") {
      window.addEventListener(SYNC_EVENT_NAME, handleSync);
    }

    if (broadcastChannel) {
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === "ARTICLES_UPDATED") {
          setArticles(getCachedArticles());
        }
      };
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      }
    };
  }, []);

  return { articles, loading, refresh };
}

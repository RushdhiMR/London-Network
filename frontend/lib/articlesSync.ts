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

export function articleMatchesCategory(post: any, categoryOrSub: string): boolean {
  if (!post || !categoryOrSub) return false;
  const target = categoryOrSub.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cat = (post.category || post.category_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const subs: string[] = getArticleSubcategories(post).map((s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const tags: string[] = (Array.isArray(post?.tags) ? (post.tags as any[]) : []).map((t: any) => String(t || "").toLowerCase().replace(/[^a-z0-9]/g, ""));

  if (target === "world") {
    const WORLD_REGIONS = ["china", "unitedstates", "europe", "britain", "middleeast", "africa", "asia"];
    if (cat === "world" || WORLD_REGIONS.some((r: string) => cat === r || cat.includes(r))) return true;
    if (subs.some((s: string) => s === "world" || WORLD_REGIONS.some((r: string) => s === r || s.includes(r)))) return true;
    if (tags.some((t: string) => t === "world" || WORLD_REGIONS.some((r: string) => t === r || t.includes(r)))) return true;
  }

  if (target === "sports" || target === "sport") {
    if (cat.includes("sport") || subs.some(s => s.includes("sport")) || tags.some(t => t.includes("sport"))) return true;
  }

  if (target === "research" || target === "innovation" || target === "researchinnovation") {
    if (cat.includes("research") || cat.includes("innovat") || subs.some(s => s.includes("research") || s.includes("innovat")) || tags.some(t => t.includes("research") || t.includes("innovat"))) return true;
  }

  if (target === "economy" || target === "economics") {
    if (cat.includes("econom") || subs.some(s => s.includes("econom")) || tags.some(t => t.includes("econom"))) return true;
  }

  if (target === "health" || target === "healthcare" || target === "wellness") {
    if (cat.includes("health") || cat.includes("medic") || cat.includes("well") || subs.some(s => s.includes("health") || s.includes("medic")) || tags.some(t => t.includes("health") || t.includes("medic"))) return true;
  }

  return (
    cat === target ||
    cat.includes(target) ||
    target.includes(cat) ||
    subs.some((s: string) => s === target || s.includes(target) || target.includes(s)) ||
    tags.some((t: string) => t === target || t.includes(target) || target.includes(t))
  );
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

export async function fetchArticlesFromServer(): Promise<ArticleItem[]> {
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
        return combined;
      }
    }
  } catch (e) {
    console.warn("[articlesSync] Could not fetch articles from server:", e);
  }
  return getCachedArticles();
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

export function useLiveArticles(pollingIntervalMs = 30000) {
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const fresh = await fetchArticlesFromServer();
    setArticles(fresh);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Immediate load from local cache
    const initial = getCachedArticles();
    if (initial.length > 0) {
      setArticles(initial);
      setLoading(false);
    }

    // Initial server fetch
    refresh();

    // Polling interval for live sync across browsers
    const timer = setInterval(() => {
      refresh();
    }, pollingIntervalMs);

    // Event listeners
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
      clearInterval(timer);
      if (typeof window !== "undefined") {
        window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      }
    };
  }, [refresh, pollingIntervalMs]);

  return { articles, loading, refresh };
}

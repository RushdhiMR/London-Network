"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomCategoryGrid from "@/components/BottomCategoryGrid";
import { CheckCircle2, Bookmark, Share2, ArrowLeft, Send, Trash2, ThumbsUp, Heart, Reply, CornerDownRight, Smile, Plus, X, Image as ImageIcon, Edit3 } from "lucide-react";
import { generateAutoSEO } from "@/lib/seo";
import { getCategoryData } from "@/lib/categoryData";
import { getUserProfile, getAuthorAvatarByNameOrEmail, getAuthorFullProfileByNameOrEmail, resolveUserAvatar, safeSaveBookmarksToStorage, safeGetBookmarksFromStorage } from "@/lib/userProfiles";
import { useLiveArticles, useLiveAdSlots, formatAdDimensions, isDuplicateAdImage, isTrendingNow, articleBelongsToCategory, articleMatchesMainCategory } from "@/lib/articlesSync";
import { useAuth } from "@/lib/auth-context";
import { dispatchPageDataReady } from "@/components/GlobalPageLoader";

interface ArticleReply {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  visitorId?: string;
  role?: string;
  isArticleAuthor?: boolean;
  text: string;
  image?: string;
  createdAt: string;
  likes: number;
  reactions?: Record<string, number>;
  likedBy?: string[];
  userReactions?: Record<string, boolean>;
  isEdited?: boolean;
}

interface ArticleComment {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  visitorId?: string;
  role?: string;
  isArticleAuthor?: boolean;
  text: string;
  image?: string;
  createdAt: string;
  likes: number;
  reactions?: Record<string, number>;
  likedBy?: string[];
  userReactions?: Record<string, boolean>;
  replies?: ArticleReply[];
  isEdited?: boolean;
}

interface ArticleSection {
  heading: string;
  paragraphs: string[];
}

interface ArticleData {
  title: string;
  authorName: string;
  authorAvatar: string;
  authorEmail?: string;
  authorBio: string;
  date: string;
  image: string;
  caption: string;
  credit?: string;
  sections: ArticleSection[];
  category?: string;
  subcategories?: string[];
  tags?: string[];
  rawContent?: string;
  keyPoints?: string[];
  key_points?: string[];
}

interface SidebarItem {
  title: string;
  date: string;
  image: string;
  href: string;
}

interface ArticlePageContentProps {
  category: string;
  subcategory: string;
  parent: { name: string; color: string; desc: string };
  subName: string;
  newsData: ArticleData | null;
  sidebarPicks: SidebarItem[];
}

const DEFAULT_ARTICLE_TRENDING_TOPICS = [
  "UK Economy",
  "Prime Minister",
  "EU-UK Relations",
  "Defence Policy",
  "Immigration",
  "Parliament"
];

function formatCategorySlug(cat?: string | null): string {
  if (!cat) return "news";
  return cat.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || "news";
}

function cleanCreditName(str: string): string {
  let c = str.trim()
    .replace(/^\(?(?:photo\s+courtesy\s+of\s+|courtesy\s+of\s+|photo:?\s*|image:?\s*)/i, "")
    .replace(/[\(\)]/g, "")
    .trim();
  if (c.toUpperCase() === "LONDON BIGBEN") return "London BigBen";
  if (c.toUpperCase() === "GETTY IMAGES") return "Getty Images";
  if (c.toUpperCase() === "AFP/FILE" || c.toUpperCase() === "AFP / FILE") return "AFP/File";
  if (c.toUpperCase() === "REUTERS") return "Reuters";
  if (c.toUpperCase() === "AP PHOTO" || c.toUpperCase() === "AP") return "AP Photo";
  return c;
}

function parseCaptionAndCredit(rawCaption: string, rawCredit?: string) {
  if (rawCredit && rawCredit.trim()) {
    const cleanCredit = cleanCreditName(rawCredit);
    return {
      caption: rawCaption.trim(),
      credit: cleanCredit
    };
  }

  const str = (rawCaption || "").trim();
  if (!str) {
    return { caption: "", credit: "" };
  }

  const pipeMatch = str.match(/^(.*?)\s*\|\s*(?:Image|Photo):\s*(.+)$/i);
  if (pipeMatch) {
    return {
      caption: pipeMatch[1].trim(),
      credit: cleanCreditName(pipeMatch[2])
    };
  }

  const bracketMatch = str.match(/\((?:photo:?\s*|image:?\s*|photo courtesy of\s*)?([^)]+)\)$/i);
  if (bracketMatch) {
    const creditText = cleanCreditName(bracketMatch[1]);
    const cleanCaption = str.replace(bracketMatch[0], "").trim();
    return {
      caption: cleanCaption || str,
      credit: creditText
    };
  }

  const dashMatch = str.match(/—\s*(?:photo\s+courtesy\s+of|courtesy\s+of|photo|image)\s*[:\s]+(.+)$/i);
  if (dashMatch) {
    const creditText = cleanCreditName(dashMatch[1]);
    const cleanCaption = str.replace(dashMatch[0], "").trim();
    return {
      caption: cleanCaption || str,
      credit: creditText
    };
  }

  return {
    caption: str,
    credit: ""
  };
}

function processContentLinks(html: string): string {
  if (!html) return "";
  let clean = html;

  return clean.replace(/<a\b([^>]*)>/gi, (match, attrs) => {
    let newAttrs = attrs;
    if (!/target\s*=/i.test(newAttrs)) {
      newAttrs += ' target="_blank"';
    } else {
      newAttrs = newAttrs.replace(/target=["'][^"']*["']/gi, 'target="_blank"');
    }
    if (!/rel\s*=/i.test(newAttrs)) {
      newAttrs += ' rel="noopener noreferrer"';
    } else {
      newAttrs = newAttrs.replace(/rel=["'][^"']*["']/gi, 'rel="noopener noreferrer"');
    }
    // Enforce red color for hyperlink
    if (/style\s*=/i.test(newAttrs)) {
      newAttrs = newAttrs.replace(/style=(["'])(.*?)\1/i, (m: string, quote: string, styleVal: string) => {
        let updatedStyle = styleVal.replace(/color\s*:\s*[^;]+;?/gi, '').trim();
        if (updatedStyle && !updatedStyle.endsWith(';')) updatedStyle += ';';
        updatedStyle += ' color: #BF1E2D;';
        return `style=${quote}${updatedStyle}${quote}`;
      });
    } else {
      newAttrs += ' style="color: #BF1E2D;"';
    }
    return `<a${newAttrs}>`;
  });
}

function resolveArticleTags(article: any): string[] {
  if (!article) return [];
  const sources = [
    article.tags,
    article.hashtags,
    article.hash_tags,
    article.hashTags
  ];
  if (Array.isArray(article)) sources.unshift(article);

  for (const s of sources) {
    if (!s) continue;
    if (Array.isArray(s) && s.length > 0) {
      const list = s
        .flatMap((item: any) => typeof item === "string" ? item.split(/[\s,]+/) : [])
        .map((t: string) => t.replace(/^#+/, "").trim())
        .filter(Boolean);
      if (list.length > 0) return Array.from(new Set(list));
    }
    if (typeof s === "string" && s.trim().length > 0) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list = parsed
            .flatMap((item: any) => typeof item === "string" ? item.split(/[\s,]+/) : [])
            .map((t: string) => t.replace(/^#+/, "").trim())
            .filter(Boolean);
          if (list.length > 0) return Array.from(new Set(list));
        }
      } catch (e) {}
      const list = s
        .split(/[\s,]+/)
        .map((t: string) => t.replace(/^#+/, "").trim())
        .filter(Boolean);
      if (list.length > 0) return Array.from(new Set(list));
    }
  }
  return [];
}

function simplifyKeyPoint(raw: string): string {
  if (!raw) return "";

  let s = String(raw)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/^[a-z0-9\s_-]*\(photo:[^)]*\)\s*/i, "")
    .replace(/^\([A-Za-z\s]+\)\s*/, "")
    .replace(/^[0-9]+[\.\)]\s*/, "")
    .replace(/^[•\-\*]\s*/, "")
    .replace(/\s*,\s*/g, ", ")
    .replace(/"\s*([^"]+?)\s*"/g, '"$1"')
    .replace(/\s+/g, " ")
    .trim();

  // Reject questions or conversational rhetoric
  if (s.endsWith("?") || /^(so\b|why\b|how\b|what\b|who\b|where\b|when\b|is\b|are\b|was\b|were\b|can\b|could\b|do\b|does\b|did\b)/i.test(s)) {
    return "";
  }

  // Reject sentence fragments that start with conjunctions or prepositions
  if (/^(and\b|or\b|but\b|in war\b|for that\b|because\b|which\b|that\b|while\b|whereas\b|meanwhile\b|moreover\b|furthermore\b|additionally\b)/i.test(s)) {
    return "";
  }

  // Trim subordinate clauses to keep it short & simple (e.g. ", which left...", ", citing...")
  const trimmed = s.split(/;\s*|,\s*(?:which|who|where|whose|citing|leaving|leading to|sparking)\b/i)[0].trim();
  if (trimmed.length >= 30) {
    s = trimmed;
  }

  // Cap length to ~75-80 chars cleanly at comma or word boundary
  if (s.length > 80) {
    const sub = s.slice(0, 80);
    const lastComma = sub.lastIndexOf(",");
    if (lastComma >= 35) {
      s = sub.slice(0, lastComma).trim();
    } else {
      const lastSpace = sub.lastIndexOf(" ");
      if (lastSpace >= 35) {
        s = sub.slice(0, lastSpace).trim();
      }
    }
  }

  // Strip trailing punctuation
  s = s.replace(/[,:\-\.]+$/, "").trim();

  if (s) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }

  return s.length >= 25 ? s : "";
}

function resolveKeyPoints(article: any): string[] {
  if (!article) return [];

  const candidates: string[] = [];

  const explicit = article.key_points || article.keyPoints;
  if (Array.isArray(explicit) && explicit.length > 0) {
    for (const p of explicit) {
      const clean = simplifyKeyPoint(String(p));
      if (clean && !candidates.some(c => c.toLowerCase().slice(0, 20) === clean.toLowerCase().slice(0, 20))) {
        candidates.push(clean);
        if (candidates.length >= 6) break;
      }
    }
    if (candidates.length >= 4) {
      return candidates.slice(0, 6);
    }
  }

  let sourceText = (article.rawContent || article.content || "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/Reference:\s*https?:\/\/\S+/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Strip leading photo/credit artifacts e.g. "flood (PHOTO: J)"
  sourceText = sourceText.replace(/^[a-z0-9\s_-]*\(photo:[^)]*\)\s*/i, "");

  if (!sourceText && Array.isArray(article.sections) && article.sections.length > 0) {
    sourceText = article.sections
      .map((s: any) => `${s.heading || ""} ${(s.paragraphs || []).join(" ")}`)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Check <li> tags first
  if (candidates.length < 6 && (article.rawContent || article.content)) {
    const liMatches = (article.rawContent || article.content).match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    if (liMatches && liMatches.length >= 3) {
      for (const li of liMatches) {
        const clean = simplifyKeyPoint(li);
        if (clean && !candidates.some(c => c.toLowerCase().slice(0, 20) === clean.toLowerCase().slice(0, 20))) {
          candidates.push(clean);
          if (candidates.length >= 6) break;
        }
      }
    }
  }

  // Split into sentences
  if (candidates.length < 6 && sourceText) {
    const rawSentences = sourceText
      .split(/(?<=[.?!])\s+/)
      .map((s: string) => s.trim())
      .filter((s: string) => {
        if (s.length < 25 || s.length > 220) return false;
        if (/^https?:\/\//i.test(s)) return false;
        if (/^(photo|image|source|credit|read more|click here|reference):/i.test(s)) return false;
        return true;
      });

    for (const raw of rawSentences) {
      const clean = simplifyKeyPoint(raw);
      if (clean && !candidates.some(c => c.toLowerCase().slice(0, 20) === clean.toLowerCase().slice(0, 20))) {
        candidates.push(clean);
        if (candidates.length >= 6) break;
      }
    }
  }

  // Fallbacks using summary / caption
  if (candidates.length < 4) {
    const extraSources = [article.summary, article.caption, article.description, article.subheading]
      .filter(Boolean)
      .join(". ");

    if (extraSources) {
      const extraSentences = extraSources
        .split(/(?<=[.?!])\s+/)
        .map((s: string) => s.trim().replace(/\.$/, ""))
        .filter((s: string) => s.length >= 20 && s.length <= 160);

      for (const s of extraSentences) {
        const clean = simplifyKeyPoint(s);
        if (clean && !candidates.some(c => c.toLowerCase().slice(0, 20) === clean.toLowerCase().slice(0, 20))) {
          candidates.push(clean);
          if (candidates.length >= 6) break;
        }
      }
    }
  }

  // Default contextual fallbacks if still < 4
  if (candidates.length < 4) {
    const title = simplifyKeyPoint(article.title || "Key Update") || "Key update from official report";
    const category = (article.category || "General").trim();
    const defaults = [
      title,
      `Key developments reported across the ${category.toLowerCase()} sector`,
      `Authorities and specialists are actively monitoring outcomes`,
      `Further official statements expected as situation develops`
    ];
    for (const d of defaults) {
      if (!candidates.some(c => c.toLowerCase().slice(0, 15) === d.toLowerCase().slice(0, 15))) {
        candidates.push(d);
        if (candidates.length >= 4) break;
      }
    }
  }

  return candidates.slice(0, 6);
}

function parseHtmlToParagraphs(html: string): string[] {
  if (!html) return [];
  
  const cleanHtml = html
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<img[^>]*\/?>/gi, "")
    .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  if (/<p[^>]*>/i.test(cleanHtml) || /<div[^>]*>/i.test(cleanHtml)) {
    const blocks = cleanHtml
      .split(/<\/(?:p|div|h1|h2|h3|h4|h5|h6|li|blockquote)>/gi)
      .map((block) => block.replace(/<br\s*\/?>/gi, " ").trim())
      .filter((block) => block.replace(/<[^>]+>/g, "").trim().length > 0);

    if (blocks.length > 0) {
      return blocks;
    }
  }

  return cleanHtml
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);
}

function ArticlePageContentInner({
  category,
  subcategory,
  parent,
  subName,
  newsData,
  sidebarPicks,
}: ArticlePageContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginHref = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
  const registerHref = pathname ? `/register?redirect=${encodeURIComponent(pathname)}` : "/register";

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isArticleResolved, setIsArticleResolved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };
  const { adSlots } = useLiveAdSlots();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const resolveCleanAuthor = (rawName?: string, rawAvatar?: string, rawEmail?: string, fallbackBio?: string) => {
    let name = (rawName || "").trim();
    if (!name || name.toLowerCase() === "system administrator" || name.toLowerCase() === "administrator" || name.toLowerCase() === "admin" || name.toLowerCase() === "editor") {
      name = "Rushdhi";
    }

    const isRushdhi = name.toLowerCase().includes("rushdhi") || (rawEmail && rawEmail.toLowerCase().includes("rushdhi"));
    const writerProfile = typeof window !== "undefined" && isMounted
      ? (isRushdhi
        ? (getUserProfile("rushdhiwriter@gmail.com") || getUserProfile("writer@digitaljournal.com") || getAuthorFullProfileByNameOrEmail("rushdhi"))
        : (getUserProfile(rawEmail) || getUserProfile(name) || getAuthorFullProfileByNameOrEmail(name, rawEmail)))
      : null;

    if (writerProfile?.name && !writerProfile.name.toLowerCase().includes("reader")) {
      name = writerProfile.name;
    }

    let avatar = "";
    // 1. Lookup custom uploaded avatar from writer profile
    if (writerProfile?.avatar && writerProfile.avatar.length > 5 && !writerProfile.avatar.includes("cart") && !writerProfile.avatar.includes("admin_profile")) {
      avatar = writerProfile.avatar;
    }

    // 2. Lookup custom uploaded avatar from author profile database by name or email
    if (!avatar && typeof window !== "undefined" && isMounted) {
      const accountAvatar = getAuthorAvatarByNameOrEmail(name, isRushdhi ? "rushdhiwriter@gmail.com" : rawEmail || "");
      if (accountAvatar && accountAvatar.length > 5 && !accountAvatar.includes("cart") && !accountAvatar.includes("admin_profile")) {
        avatar = accountAvatar;
      }
    }

    // 3. Direct database author avatar if not generic placeholder
    if (!avatar && rawAvatar && rawAvatar.length > 5 && !rawAvatar.includes("cart") && !rawAvatar.includes("admin_profile") && !rawAvatar.startsWith("data:image/svg")) {
      avatar = rawAvatar;
    }

    // 4. Fallback based on known staff names
    if (!avatar) {
      const lower = name.toLowerCase();
      if (lower.includes("jennifer") || lower.includes("friesen")) avatar = "/author_woman.jpg";
      else if (lower.includes("april") || lower.includes("hicke")) avatar = "/author_glasses.jpg";
      else if (lower.includes("pramod") || lower.includes("jain")) avatar = "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=250&h=250&fit=crop";
      else if (lower.includes("chris") || lower.includes("hogg")) avatar = "/author_beard.jpg";
      else avatar = "/author_bluesuit.jpg";
    }

    // 5. Author Bio: Priority from author's saved profile settings, then fallback / article bio
    let bio = "";
    if (writerProfile?.bio && !writerProfile.bio.toLowerCase().includes("avid reader") && writerProfile.bio.trim().length > 0) {
      bio = writerProfile.bio.trim();
    } else if (fallbackBio && fallbackBio.trim().length > 0) {
      bio = fallbackBio.trim();
    } else if (newsData?.authorBio && newsData.authorBio.trim().length > 0) {
      bio = newsData.authorBio.trim();
    } else {
      bio = `${name} is a journalist for London BigBen.`;
    }

    return { name, avatar, bio };
  };

  const initialAuthor = resolveCleanAuthor(newsData?.authorName, newsData?.authorAvatar, newsData?.authorEmail, newsData?.authorBio);
  const [activeNewsData, setActiveNewsData] = useState<ArticleData>({
    ...(newsData || {}),
    title: newsData?.title || "",
    authorName: initialAuthor.name,
    authorAvatar: initialAuthor.avatar,
    authorBio: initialAuthor.bio || newsData?.authorBio || "",
    category: (newsData?.category && newsData.category.toLowerCase() !== "article" ? newsData.category : "") || (parent?.name && parent.name.toLowerCase() !== "article" ? parent.name : "") || (category && category.toLowerCase() !== "article" ? category : "") || "NEWS",
    subcategories: newsData?.subcategories || (subName ? [subName] : []),
    tags: resolveArticleTags(newsData),
    date: newsData?.date || "",
    image: newsData?.image || "",
    caption: newsData?.caption || "",
    sections: newsData?.sections || []
  });
  const { articles: liveArticles, loading: liveArticlesLoading } = useLiveArticles();

  // Article Section Trending Topics (6 slots) synced with Admin
  const [articleTrendingTopics, setArticleTrendingTopics] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("article_trending_topics");
        if (saved && saved.trim()) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter((t: any) => typeof t === "string" && t.trim() !== "").slice(0, 6);
          }
        }
      } catch (e) {}
    }
    return DEFAULT_ARTICLE_TRENDING_TOPICS;
  });

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem("article_trending_topics");
        if (saved && saved.trim()) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setArticleTrendingTopics(parsed.filter((t: any) => typeof t === "string" && t.trim() !== "").slice(0, 6));
          }
        }
      } catch (e) {}
    };
    window.addEventListener("article_trending_topics_change", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("article_trending_topics_change", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Reset resolution state on route or article prop changes so previous article never flashes
  useEffect(() => {
    setIsArticleResolved(false);
    if (newsData) {
      const authInfo = resolveCleanAuthor(newsData.authorName, newsData.authorAvatar, newsData.authorEmail, newsData.authorBio);
      setActiveNewsData({
        ...newsData,
        authorName: authInfo.name,
        authorAvatar: authInfo.avatar,
        authorBio: authInfo.bio || newsData.authorBio,
        category: (newsData.category && newsData.category.toLowerCase() !== "article" ? newsData.category : "") || (parent?.name && parent.name.toLowerCase() !== "article" ? parent.name : "") || (category && category.toLowerCase() !== "article" ? category : "") || "NEWS",
        subcategories: newsData.subcategories || (subName ? [subName] : []),
        tags: resolveArticleTags(newsData)
      });
    }
  }, [pathname, subcategory, newsData]);

  // "More News" articles: Linked with Latest News
  const moreNewsArticles = useMemo(() => {
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
      if (item.updated_at || item.updatedAt) {
        const t = new Date(item.updated_at || item.updatedAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return 0;
    };

    const currentId = String((activeNewsData as any)?.id || (newsData as any)?.id || "");
    const currentTitle = (activeNewsData?.title || newsData?.title || "").trim().toLowerCase();

    const published = (Array.isArray(liveArticles) ? liveArticles : []).filter((p) => {
      if (!p || (p.status || "").toLowerCase() !== "published") return false;
      if (String(p.id) === currentId) return false;
      if ((p.title || "").trim().toLowerCase() === currentTitle) return false;
      return true;
    });

    // Always sort strictly by most recent published timestamp first across overall categories
    const sorted = [...published].sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

    return sorted.slice(0, 4).map((post, index) => {
      const cat = (post.category || post.category_name || "NEWS").toUpperCase();
      const catSlug = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const postSlug = (post.slug || post.title || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      const displayDate = post.date || (post.updated_at ? new Date(post.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : (post.published_at ? new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Just published"));

      return {
        number: `0${index + 1}`.slice(-2),
        category: cat,
        title: post.title,
        time: displayDate,
        image: post.imageUrl || post.image || (post as any).image_url || "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=600&h=400&fit=crop",
        href: `/article/${post.slug || postSlug}`
      };
    });
  }, [liveArticles, activeNewsData, newsData]);

  const trendingArticles = moreNewsArticles;

  // "Up next" articles: Recent articles from the clicked article's category only
  const upNextArticles = useMemo(() => {
    const getTimestamp = (item: any): number => {
      if (!item) return 0;
      const d = item.updated_at || item.published_at || item.createdAt || item.date;
      if (!d) return 0;
      const parsed = new Date(d).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };

    const currentId = String((activeNewsData as any)?.id || (newsData as any)?.id || "");
    const currentTitle = (activeNewsData?.title || newsData?.title || "").trim().toLowerCase();

    const targetCat = (
      (activeNewsData?.category && activeNewsData.category.toLowerCase() !== "article" ? activeNewsData.category : "") ||
      (newsData?.category && newsData.category.toLowerCase() !== "article" ? newsData.category : "") ||
      (category && category.toLowerCase() !== "article" ? category : "") ||
      (parent?.name && parent.name.toLowerCase() !== "article" ? parent.name : "") ||
      ""
    ).trim();

    const published = (Array.isArray(liveArticles) ? liveArticles : []).filter((p) => {
      if (!p || (p.status || "").toLowerCase() !== "published") return false;
      if (String(p.id) === currentId) return false;
      if ((p.title || "").trim().toLowerCase() === currentTitle) return false;
      return true;
    });

    let matchingPosts: any[] = [];
    if (targetCat) {
      const mainMatches = published.filter((p) => articleMatchesMainCategory(p, targetCat));
      const subMatches = published.filter((p) => !articleMatchesMainCategory(p, targetCat) && articleBelongsToCategory(p, targetCat));
      mainMatches.sort((a, b) => getTimestamp(b) - getTimestamp(a));
      subMatches.sort((a, b) => getTimestamp(b) - getTimestamp(a));
      matchingPosts = [...mainMatches, ...subMatches];
    } else {
      published.sort((a, b) => getTimestamp(b) - getTimestamp(a));
      matchingPosts = published;
    }

    return matchingPosts.slice(0, 6).map((post) => {
      const cat = (post.category || post.category_name || "world").toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
      const postSlug = (post.slug || post.title || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      const content = post.content || post.rawContent || post.summary || "";
      const words = content.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
      const minutes = Math.max(3, Math.min(10, Math.ceil(words / 180)));

      return {
        id: String(post.id),
        title: post.title,
        readTime: `${minutes} MIN READ`,
        image: post.imageUrl || post.image || (post as any).image_url || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&h=400&fit=crop",
        href: `/article/${post.slug || postSlug}`
      };
    });
  }, [liveArticles, activeNewsData, newsData, category, parent]);



  const keyPointsList = useMemo(() => {
    return resolveKeyPoints(activeNewsData);
  }, [activeNewsData]);

  // Related News (4), Most Read (5), and Latest in Category (5) for the right sidebar
  const { relatedNewsArticles, mostReadArticles, latestInCategoryArticles, targetCat: sidebarTargetCat } = useMemo(() => {
    const currentId = String((activeNewsData as any)?.id || (newsData as any)?.id || "");
    const currentTitle = (activeNewsData?.title || newsData?.title || "").trim().toLowerCase();

    const getViews = (a: any, index: number): number => {
      if (a?.views && typeof a.views === "number" && a.views > 0) return a.views;
      if (a?.reads_count && typeof a.reads_count === "number" && a.reads_count > 0) return a.reads_count;
      if (a?.viewsCount && typeof a.viewsCount === "number" && a.viewsCount > 0) return a.viewsCount;
      const seed = typeof a?.id === "number" ? a.id : (parseInt(String(a?.id || "").replace(/\D/g, ""), 10) || (index + 1) * 37);
      return Math.max(45, (seed * 17) % 350 + 55);
    };

    const targetCat = (
      (activeNewsData?.category && activeNewsData.category.toLowerCase() !== "article" ? activeNewsData.category : "") ||
      (newsData?.category && newsData.category.toLowerCase() !== "article" ? newsData.category : "") ||
      (category && category.toLowerCase() !== "article" ? category : "") ||
      (parent?.name && parent.name.toLowerCase() !== "article" ? parent.name : "") ||
      ""
    ).trim();

    const published = (Array.isArray(liveArticles) ? liveArticles : []).filter((p) => {
      if (!p || (p.status || "").toLowerCase() !== "published") return false;
      if (String(p.id) === currentId) return false;
      if ((p.title || "").trim().toLowerCase() === currentTitle) return false;
      return true;
    });

    const formatSidebarDate = (post: any): string => {
      if (post.date && post.date !== "Just now" && post.date !== "Today") {
        if (/^[A-Za-z]{3}\s+\d{1,2},\s+\d{4}$/.test(post.date.trim())) {
          return post.date.trim();
        }
        const d = new Date(post.date);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
      }
      const rawDate = post.published_at || post.publishedAt || post.createdAt || post.updated_at;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
      }
      return post.date || "Recently";
    };

    const mapPost = (post: any) => {
      const postSlug = (post.slug || post.title || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      const cat = (post.category && post.category.toLowerCase() !== "article" ? post.category : post.category_name) || targetCat || "NEWS";
      return {
        id: String(post.id),
        title: post.title,
        category: cat.toUpperCase(),
        date: formatSidebarDate(post),
        image: post.imageUrl || post.image || (post as any).image_url || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=150&fit=crop",
        href: `/article/${post.slug || postSlug}`
      };
    };

    if (published.length === 0 && Array.isArray(sidebarPicks) && sidebarPicks.length > 0) {
      const picks = sidebarPicks.map((sp, idx) => ({
        id: String(idx),
        title: sp.title,
        category: targetCat ? targetCat.toUpperCase() : "NEWS",
        date: sp.date,
        image: sp.image,
        href: sp.href
      }));
      return {
        relatedNewsArticles: picks.slice(0, 4),
        mostReadArticles: picks.slice(0, 5),
        latestInCategoryArticles: picks.slice(0, 5),
        targetCat
      };
    }

    let relatedMatches: any[] = [];
    if (targetCat && targetCat.toLowerCase() !== "article") {
      relatedMatches = published.filter(p => articleBelongsToCategory(p, targetCat));
    }
    if (relatedMatches.length < 4) {
      const remainder = published.filter(p => !relatedMatches.some(m => String(m.id) === String(p.id)));
      relatedMatches = [...relatedMatches, ...remainder];
    }
    const relatedNewsArticles = relatedMatches.slice(0, 4).map(mapPost);

    const sortedByViews = [...published].sort((a, b) => getViews(b, 0) - getViews(a, 0));
    const mostReadArticles = sortedByViews.slice(0, 5).map(mapPost);

    // Track all article IDs and titles already shown above in the sidebar or active article
    const shownIds = new Set<string>();
    const shownTitles = new Set<string>();

    if (currentId) shownIds.add(currentId);
    if (currentTitle) shownTitles.add(currentTitle);

    relatedNewsArticles.forEach((a) => {
      if (a.id) shownIds.add(String(a.id));
      if (a.title) shownTitles.add(a.title.trim().toLowerCase());
    });

    mostReadArticles.forEach((a) => {
      if (a.id) shownIds.add(String(a.id));
      if (a.title) shownTitles.add(a.title.trim().toLowerCase());
    });

    const getPostTime = (p: any): number => {
      const raw = p.published_at || p.publishedAt || p.createdAt || p.date || p.updated_at;
      if (!raw) return 0;
      const t = new Date(raw).getTime();
      return isNaN(t) ? 0 : t;
    };

    const latestSorted = [...published].sort((a, b) => getPostTime(b) - getPostTime(a));

    let catMatches = targetCat && targetCat.toLowerCase() !== "article"
      ? latestSorted.filter(
          (p) =>
            articleBelongsToCategory(p, targetCat) &&
            !shownIds.has(String(p.id)) &&
            !shownTitles.has((p.title || "").trim().toLowerCase())
        )
      : [];

    if (catMatches.length < 5) {
      const remainder = latestSorted.filter(
        (p) =>
          !shownIds.has(String(p.id)) &&
          !shownTitles.has((p.title || "").trim().toLowerCase()) &&
          !catMatches.some((m) => String(m.id) === String(p.id))
      );
      catMatches = [...catMatches, ...remainder];
    }

    const latestInCategoryArticles = catMatches.slice(0, 5).map(mapPost);

    return { relatedNewsArticles, mostReadArticles, latestInCategoryArticles, targetCat };
  }, [liveArticles, activeNewsData, newsData, category, parent, sidebarPicks]);

  const { prevArticle, nextArticle } = useMemo(() => {
    const currentId = String((activeNewsData as any)?.id || (newsData as any)?.id || "");
    const currentTitle = (activeNewsData?.title || newsData?.title || "").trim().toLowerCase();

    // 1. Collect all article IDs and titles shown on other panels in the article section
    const shownOnOtherPanelsIds = new Set<string>();
    const shownOnOtherPanelsTitles = new Set<string>();

    if (currentId) shownOnOtherPanelsIds.add(currentId);
    if (currentTitle) shownOnOtherPanelsTitles.add(currentTitle);

    relatedNewsArticles.forEach((a) => {
      if (a.id) shownOnOtherPanelsIds.add(String(a.id));
      if (a.title) shownOnOtherPanelsTitles.add(a.title.trim().toLowerCase());
    });

    mostReadArticles.forEach((a) => {
      if (a.id) shownOnOtherPanelsIds.add(String(a.id));
      if (a.title) shownOnOtherPanelsTitles.add(a.title.trim().toLowerCase());
    });

    latestInCategoryArticles.forEach((a) => {
      if (a.id) shownOnOtherPanelsIds.add(String(a.id));
      if (a.title) shownOnOtherPanelsTitles.add(a.title.trim().toLowerCase());
    });

    const targetCat = (
      (activeNewsData?.category && activeNewsData.category.toLowerCase() !== "article" ? activeNewsData.category : "") ||
      (newsData?.category && newsData.category.toLowerCase() !== "article" ? newsData.category : "") ||
      (category && category.toLowerCase() !== "article" ? category : "") ||
      (parent?.name && parent.name.toLowerCase() !== "article" ? parent.name : "") ||
      sidebarTargetCat ||
      ""
    ).trim();

    const getPostTime = (p: any): number => {
      const raw = p.published_at || p.publishedAt || p.createdAt || p.date || p.updated_at;
      if (!raw) return 0;
      const t = new Date(raw).getTime();
      if (!isNaN(t) && t > 0) return t;
      if (typeof p.id === "number") return p.id;
      const num = parseInt(String(p.id).replace(/\D/g, ""), 10);
      return isNaN(num) ? 0 : num;
    };

    const formatNavArticle = (post: any) => {
      if (!post) return null;
      const postSlug = (post.slug || post.title || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      return {
        id: String(post.id),
        title: post.title,
        image: post.imageUrl || post.image || (post as any).image_url || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=150&fit=crop",
        href: `/article/${post.slug || postSlug}`
      };
    };

    // Filter published articles
    const published = (Array.isArray(liveArticles) ? liveArticles : []).filter(
      (p) => p && (p.status || "").toLowerCase() === "published"
    );

    // 2. Select only articles added in that category, sorted in their natural added order (newest to oldest)
    const categoryArticles = published
      .filter((p) => !targetCat || targetCat.toLowerCase() === "article" || targetCat.toLowerCase() === "news" || articleBelongsToCategory(p, targetCat))
      .sort((a, b) => {
        const timeA = getPostTime(a);
        const timeB = getPostTime(b);
        if (timeA !== timeB) return timeB - timeA;
        const aId = Number(a.id) || 0;
        const bId = Number(b.id) || 0;
        return bId - aId;
      });

    // Current article index in the category order
    const currentIdx = categoryArticles.findIndex(
      (p) => String(p.id) === currentId || (p.title || "").trim().toLowerCase() === currentTitle
    );

    // 3. Exclude any article that is ALREADY on other panels in the article section
    const isAvailable = (p: any): boolean => {
      if (!p) return false;
      const pid = String(p.id);
      const ptitle = (p.title || "").trim().toLowerCase();
      if (shownOnOtherPanelsIds.has(pid)) return false;
      if (shownOnOtherPanelsTitles.has(ptitle)) return false;
      return true;
    };

    // Pick according to the category order
    const beforeAvailable = currentIdx !== -1
      ? categoryArticles.slice(0, currentIdx).filter(isAvailable)
      : [];

    const afterAvailable = currentIdx !== -1
      ? categoryArticles.slice(currentIdx + 1).filter(isAvailable)
      : [];

    const allAvailable = categoryArticles.filter(isAvailable);

    let prevSelected: any = null;
    let nextSelected: any = null;

    if (beforeAvailable.length > 0 && afterAvailable.length > 0) {
      prevSelected = beforeAvailable[beforeAvailable.length - 1];
      nextSelected = afterAvailable[0];
    } else if (afterAvailable.length >= 2) {
      prevSelected = afterAvailable[0];
      nextSelected = afterAvailable[1];
    } else if (beforeAvailable.length >= 2) {
      prevSelected = beforeAvailable[beforeAvailable.length - 1];
      nextSelected = beforeAvailable[beforeAvailable.length - 2];
    } else if (allAvailable.length >= 2) {
      prevSelected = allAvailable[0];
      nextSelected = allAvailable[1];
    } else if (allAvailable.length === 1) {
      prevSelected = allAvailable[0];
    }

    // Fallback: If category has fewer than 2 available articles, pull from category static articles without duplicates
    if (!prevSelected || !nextSelected) {
      try {
        const catSlug = (targetCat || "politics").toLowerCase().replace(/[^a-z0-9]/g, "");
        const catData = getCategoryData(catSlug);
        const staticList = [
          ...(catData?.newsArticles || []),
          ...(catData?.secondaryArticles || []),
          ...(catData?.featured ? [catData.featured] : [])
        ];

        for (const sa of staticList) {
          const saTitle = (sa.title || "").trim();
          const saClean = saTitle.toLowerCase();
          if (
            saTitle &&
            !shownOnOtherPanelsTitles.has(saClean) &&
            (!prevSelected || (prevSelected.title || "").trim().toLowerCase() !== saClean) &&
            (!nextSelected || (nextSelected.title || "").trim().toLowerCase() !== saClean)
          ) {
            const formatted = {
              id: `cat-fallback-${saClean.slice(0, 20)}`,
              title: saTitle,
              image: sa.image || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=300&h=200&fit=crop",
              href: `/article/${saClean.replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-")}`
            };

            if (!prevSelected) {
              prevSelected = formatted;
            } else if (!nextSelected) {
              nextSelected = formatted;
              break;
            }
          }
        }
      } catch (e) {}
    }

    return {
      prevArticle: prevSelected ? formatNavArticle(prevSelected) : null,
      nextArticle: nextSelected ? formatNavArticle(nextSelected) : null
    };
  }, [liveArticles, activeNewsData, newsData, sidebarPicks, relatedNewsArticles, mostReadArticles, latestInCategoryArticles, sidebarTargetCat]);

  const popularSidebarArticles = mostReadArticles;

  useEffect(() => {
    // Only run the match once live articles have been fetched (not still loading)
    if (liveArticlesLoading) return;
    try {
        const searchId = searchParams?.get("id") || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("id") : null);
        const currentTitle = (newsData?.title || "").trim().toLowerCase();
        const currentPath = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
        const pathSegments = currentPath.split("/").filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1] || "";
        const clean = (str?: string) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const cleanLastSegment = clean(lastSegment);
        const cleanCurrentTitle = clean(currentTitle);

        const matched = liveArticles.find((p) => {
          if (!p) return false;
          // 1. Direct ID match from URL param
          if (searchId && (String(p.id) === String(searchId) || p.slug === searchId)) return true;

          const pCleanSlug = clean(p.slug);
          const pCleanTitle = clean(p.title);

          // 2. Exact slug or title match on URL's last segment
          if (cleanLastSegment && (pCleanSlug === cleanLastSegment || pCleanTitle === cleanLastSegment)) {
            return true;
          }

          // 3. Exact ID match on URL's last segment
          if (lastSegment && String(p.id) === lastSegment) {
            return true;
          }

          // 4. Exact title matching
          if (cleanCurrentTitle && pCleanTitle && (pCleanTitle === cleanCurrentTitle || (cleanCurrentTitle.length > 15 && pCleanTitle.includes(cleanCurrentTitle)))) {
            return true;
          }

          // 5. Slug prefix or inclusion matching
          if (cleanLastSegment && pCleanSlug && (pCleanSlug.includes(cleanLastSegment) || cleanLastSegment.includes(pCleanSlug))) {
            return true;
          }

          if (cleanLastSegment && pCleanTitle && (pCleanTitle.includes(cleanLastSegment) || cleanLastSegment.includes(pCleanTitle))) {
            return true;
          }

          return false;
        });

        if (matched) {
          const realName = matched.authorName || (matched as any).author_name || (matched as any).author || "Staff Journalist";
          const realAvatar = matched.authorAvatar || (matched as any).author_avatar || "";
          const realEmail = matched.authorEmail || (matched as any).author_email || "";
          const resolved = resolveCleanAuthor(realName, realAvatar, realEmail);
          let realAuthorBio = matched.authorBio || (matched as any).author_bio || `${resolved.name} is a journalist for London BigBen.`;

          let paragraphs: string[] = [];
          if (matched.content) {
            paragraphs = parseHtmlToParagraphs(matched.content);
          }
          if (paragraphs.length === 0) {
            paragraphs = [matched.summary || matched.title];
          }

          const rawCategory = matched.category || matched.category_name || (newsData?.category && newsData.category.toLowerCase() !== "article" ? newsData.category : "") || (parent?.name && parent.name.toLowerCase() !== "article" ? parent.name : "") || (category && category.toLowerCase() !== "article" ? category : "") || "NEWS";
          const rawSubcategories = Array.isArray(matched.subcategories) && matched.subcategories.length > 0
            ? matched.subcategories
            : (Array.isArray(matched.subCategories) && matched.subCategories.length > 0 ? matched.subCategories : (subName ? [subName] : []));

          setActiveNewsData({
            title: matched.title,
            authorName: resolved.name,
            authorAvatar: resolved.avatar,
            authorEmail: realEmail,
            authorBio: realAuthorBio,
            date: matched.date || newsData?.date || "July 2026",
            image: matched.imageUrl || matched.image || newsData?.image || "",
            caption: matched.subheading || matched.summary || newsData?.caption || "",
            category: rawCategory,
            subcategories: rawSubcategories,
            tags: (() => {
              const fromMatched = resolveArticleTags(matched);
              if (fromMatched.length > 0) return fromMatched;
              const fromNews = resolveArticleTags(newsData);
              return fromNews.length > 0 ? fromNews : [];
            })(),
            rawContent: matched.content || "",
            keyPoints: (matched as any).key_points || (matched as any).keyPoints,
            sections: [
              {
                heading: "",
                paragraphs
              }
            ]
          });
        }
        // Mark as resolved whether or not a live match was found
        setIsArticleResolved(true);
    } catch (err) {
      console.warn("Dynamic article page content sync notice:", err);
      setIsArticleResolved(true);
    }
  }, [liveArticles, liveArticlesLoading, newsData, searchParams, pathname]);

  // Signal GlobalPageLoader to hide skeleton once article data is resolved
  useEffect(() => {
    if (isArticleResolved) {
      dispatchPageDataReady();
    }
  }, [isArticleResolved]);

  // Clean address bar: strip unnecessary query strings (?id=50, ?sub=...) for a clear, readable route path
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      const cleanPath = window.location.pathname;
      window.history.replaceState(null, "", cleanPath);
    }
  }, []);

  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      try {
        const detail = e?.detail || (e?.key === "dj_user_profile" && e?.newValue ? JSON.parse(e.newValue) : null);
        if (detail) {
          const currentAuthor = activeNewsData.authorName.toLowerCase().trim();
          const isRushdhi = currentAuthor.includes("rushdhi") && 
            ((detail.email && detail.email.toLowerCase().includes("rushdhi")) || (detail.name && detail.name.toLowerCase().includes("rushdhi")));
          const isMatch = detail.name && detail.name.toLowerCase().trim() === currentAuthor;

          if (isRushdhi || isMatch) {
            setActiveNewsData((prev) => ({
              ...prev,
              ...(detail.avatar && detail.avatar.length > 5 && !detail.avatar.includes("cart") ? { authorAvatar: detail.avatar } : {}),
              ...(detail.bio && detail.bio.trim().length > 0 ? { authorBio: detail.bio.trim() } : {})
            }));
          }
        }
      } catch (err) {}
    };

    if (typeof window !== "undefined") {
      window.addEventListener("dj_profile_updated", handleProfileUpdate);
      window.addEventListener("dj_auth_change", handleProfileUpdate);
      // NOTE: Do NOT listen to the native "storage" event — it fires in OTHER
      // browser tabs and causes cross-tab reloads.
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("dj_profile_updated", handleProfileUpdate);
        window.removeEventListener("dj_auth_change", handleProfileUpdate);
      }
    };
  }, [activeNewsData.authorName]);

  const auth = useAuth();

  // Track article view in real time:
  // - Unregistered person: Every visit increments view count by 1 (including repeated visits).
  // - Registered account: Exactly 1 view per account for this article, no matter how many times they revisit.
  const didRecordView = useRef<string | null>(null);
  const canonicalArticleKey = (pathname || subcategory || newsData?.title || "").trim().toLowerCase();

  useEffect(() => {
    // Wait until auth has completed loading to avoid false guest tracking on logged-in users
    if (auth.loading) return;
    if (!canonicalArticleKey || typeof window === "undefined") return;

    const activeEmail = auth.user?.email ? auth.user.email.trim().toLowerCase() : null;
    const currentVisitKey = activeEmail
      ? `${canonicalArticleKey}_${activeEmail}`
      : `${canonicalArticleKey}_guest`;

    // 1. In-memory component ref check: during this component's mount/render lifecycle,
    // only record once for this article visit.
    if (didRecordView.current === currentVisitKey) return;

    // 2. Short-window throttle (2.5s) in sessionStorage to guard against React Strict Mode's
    // rapid double-mount in dev mode (which mounts twice within ~50ms).
    // A genuine revisit (navigating away and back, or page reload after reading) happens after >2.5s.
    const ssKey = `ln_view_recorded_${currentVisitKey}`;
    const lastRecorded = typeof window !== "undefined" ? sessionStorage.getItem(ssKey) : null;
    const now = Date.now();
    if (lastRecorded && now - parseInt(lastRecorded, 10) < 2500) {
      return;
    }

    didRecordView.current = currentVisitKey;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(ssKey, String(now));
      } catch (e) {}
    }

    const targetTitle = (activeNewsData?.title || newsData?.title || "").trim();
    const targetSlug = String((activeNewsData as any)?.slug || subcategory || "").trim();
    const targetId = (activeNewsData as any)?.id;

    fetch("/api/articles/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: targetTitle,
        slug: targetSlug,
        articleId: targetId,
        userIdentifier: activeEmail,
      }),
    })
      .then((res) => (res.ok ? res.json().catch(() => null) : null))
      .then(async (data) => {
        if (data && data.success && typeof data.reads === "number") {
          try {
            const { getCachedArticles, setCachedArticles } = await import("@/lib/articlesSync");
            const cached = getCachedArticles();
            if (Array.isArray(cached) && cached.length > 0) {
              const updatedCache = cached.map((a: any) => {
                if (
                  ((activeNewsData as any).id && String(a.id) === String((activeNewsData as any).id)) ||
                  (a.title && a.title.trim().toLowerCase() === targetTitle.toLowerCase()) ||
                  (targetSlug && a.slug === targetSlug)
                ) {
                  return { ...a, reads: data.reads, views: data.reads, reads_count: data.reads };
                }
                return a;
              });
              setCachedArticles(updatedCache, false);
            }

            const raw = localStorage.getItem("dj_writer_submitted_articles");
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const updated = list.map((a: any) => {
                  if (
                    ((activeNewsData as any).id && String(a.id) === String((activeNewsData as any).id)) ||
                    (a.title && a.title.trim().toLowerCase() === targetTitle.toLowerCase()) ||
                    (targetSlug && a.slug === targetSlug)
                  ) {
                    return { ...a, reads: data.reads, views: data.reads, reads_count: data.reads };
                  }
                  return a;
                });
                localStorage.setItem("dj_writer_submitted_articles", JSON.stringify(updated));
              }
            }
            window.dispatchEvent(new Event("dj_articles_updated"));
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, [canonicalArticleKey, auth.loading, auth.user?.email]);

  const isAdmin = Boolean(
    isMounted && (
      auth.role === "admin" ||
      (auth.user && auth.user.role === "admin")
    )
  );

  const articleKey = (activeNewsData.title || newsData?.title || "article").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [showCommentsList, setShowCommentsList] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);

  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyGuestName, setReplyGuestName] = useState("");
  const [commentImage, setCommentImage] = useState<string>("");
  const [replyImage, setReplyImage] = useState<string>("");
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingReplyText, setEditingReplyText] = useState<string>("");
  const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏"];

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, isReply: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image file size should be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        if (isReply) {
          setReplyImage(reader.result);
        } else {
          setCommentImage(reader.result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const isUserArticleAuthor = (userEmail?: string, userName?: string): boolean => {
    const artAuthor = (activeNewsData.authorName || newsData?.authorName || "").toLowerCase().trim();
    const artEmail = (activeNewsData.authorEmail || newsData?.authorEmail || "").toLowerCase().trim();
    const uName = (userName || auth.user?.name || "").toLowerCase().trim();
    const uEmail = (userEmail || auth.user?.email || "").toLowerCase().trim();

    if (artEmail && uEmail && artEmail === uEmail) return true;
    if (artAuthor && uName && (artAuthor === uName || artAuthor.includes(uName) || uName.includes(artAuthor))) return true;

    if (typeof window !== "undefined") {
      try {
        const writerStr = localStorage.getItem("dj_writer_user");
        if (writerStr) {
          const w = JSON.parse(writerStr);
          const wName = (w.name || "").toLowerCase().trim();
          const wEmail = (w.email || "").toLowerCase().trim();
          if ((artEmail && wEmail === artEmail) || (artAuthor && (artAuthor === wName || artAuthor.includes(wName)))) {
            if ((uEmail && uEmail === wEmail) || (uName && uName === wName)) return true;
          }
        }
      } catch (e) {}
    }
    return false;
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`dj_article_comments_${articleKey}`);
      if (stored) {
        setComments(JSON.parse(stored));
      } else {
        setComments([]);
      }
    } catch (e) {}
  }, [articleKey]);

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.user) {
      router.push(loginHref);
      return;
    }
    if (!newCommentText.trim() && !commentImage) return;

    setIsPostingComment(true);
    const authorName = auth.user.name || "Reader";
    const authorAvatar = auth.user.avatar || "";
    const authorEmail = auth.user.email || "";
    const authorRole = auth.user.role || (isAdmin ? "admin" : "reader");
    const isAuthor = isUserArticleAuthor(authorEmail, authorName);
    const visitorId = typeof window !== "undefined" ? (localStorage.getItem("dj_visitor_id") || `vis_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`) : undefined;
    if (typeof window !== "undefined" && visitorId) {
      localStorage.setItem("dj_visitor_id", visitorId);
    }

    const newComment: ArticleComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: authorName,
      avatar: authorAvatar,
      email: authorEmail,
      visitorId: visitorId,
      role: authorRole,
      isArticleAuthor: isAuthor,
      text: newCommentText.trim(),
      image: commentImage || undefined,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      likes: 0,
      reactions: {},
      userReactions: {},
      replies: []
    };

    const updated = [newComment, ...comments];
    setComments(updated);
    try {
      localStorage.setItem(`dj_article_comments_${articleKey}`, JSON.stringify(updated));
    } catch (e) {}

    setNewCommentText("");
    setCommentImage("");
    setGuestName("");
    setIsPostingComment(false);
    setShowCommentsList(true);
    setCommentSuccess(true);
    setTimeout(() => setCommentSuccess(false), 3000);
  };

  const handlePostReply = (parentCommentId: string) => {
    if (!auth.user) {
      router.push(loginHref);
      return;
    }
    if (!replyText.trim() && !replyImage) return;

    const authorName = auth.user.name || "Reader";
    const authorAvatar = auth.user.avatar || "";
    const authorEmail = auth.user.email || "";
    const authorRole = auth.user.role || (isAdmin ? "admin" : "reader");
    const isAuthor = isUserArticleAuthor(authorEmail, authorName);
    const visitorId = typeof window !== "undefined" ? (localStorage.getItem("dj_visitor_id") || `vis_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`) : undefined;
    if (typeof window !== "undefined" && visitorId) {
      localStorage.setItem("dj_visitor_id", visitorId);
    }

    const newReply: ArticleReply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: authorName,
      avatar: authorAvatar,
      email: authorEmail,
      visitorId: visitorId,
      role: authorRole,
      isArticleAuthor: isAuthor,
      text: replyText.trim(),
      image: replyImage || undefined,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      likes: 0,
      reactions: {},
      userReactions: {}
    };

    const updated = comments.map((c) => {
      if (c.id === parentCommentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply]
        };
      }
      return c;
    });

    setComments(updated);
    try {
      localStorage.setItem(`dj_article_comments_${articleKey}`, JSON.stringify(updated));
    } catch (e) {}

    setReplyText("");
    setReplyImage("");
    setReplyGuestName("");
    setReplyingToId(null);
  };

  const getCurrentUserKey = (): string => {
    if (auth.user?.email) return `acc_${auth.user.email.toLowerCase().trim()}`;
    if (auth.user?.name) return `acc_${auth.user.name.toLowerCase().trim()}`;
    if (typeof window !== "undefined") {
      try {
        const writerStr = localStorage.getItem("dj_writer_user");
        if (writerStr) {
          const w = JSON.parse(writerStr);
          if (w.email) return `acc_${w.email.toLowerCase().trim()}`;
          if (w.name) return `acc_${w.name.toLowerCase().trim()}`;
        }
      } catch (e) {}

      try {
        const activeStr = localStorage.getItem("dj_active_user");
        if (activeStr) {
          const u = JSON.parse(activeStr);
          if (u.email) return `acc_${u.email.toLowerCase().trim()}`;
          if (u.name) return `acc_${u.name.toLowerCase().trim()}`;
        }
      } catch (e) {}

      let visitorId = localStorage.getItem("dj_visitor_client_id");
      if (!visitorId) {
        visitorId = `vis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem("dj_visitor_client_id", visitorId);
      }
      return visitorId;
    }
    return "guest_client";
  };

  const handleToggleReaction = (commentId: string, replyId?: string, emoji: string = "👍") => {
    const userKey = getCurrentUserKey();

    const updated = comments.map((c) => {
      if (replyId && c.id === commentId) {
        const updatedReplies = (c.replies || []).map((r) => {
          if (r.id === replyId) {
            let likedBy = Array.isArray(r.likedBy) ? [...r.likedBy] : [];
            if (!Array.isArray(r.likedBy) && (r.reactions?.["❤️"] || 0) > 0) {
              likedBy = Array.from({ length: r.reactions?.["❤️"] || 1 }, (_, i) => `prev_user_${i}`);
            }
            const reactions = { ...(r.reactions || {}) };
            const userReactions = { ...(r.userReactions || {}) };

            if (emoji === "❤️") {
              const alreadyLiked = likedBy.includes(userKey);
              let newLikedBy: string[];
              if (alreadyLiked) {
                // Remove this account's like
                newLikedBy = likedBy.filter((k) => k !== userKey);
                reactions["❤️"] = newLikedBy.length;
                userReactions["❤️"] = false;
              } else {
                // Add this account's unique like
                newLikedBy = [...likedBy, userKey];
                reactions["❤️"] = newLikedBy.length;
                userReactions["❤️"] = true;
              }

              const totalLikes = newLikedBy.length;
              return {
                ...r,
                likedBy: newLikedBy,
                likes: totalLikes,
                reactions,
                userReactions
              };
            } else {
              const isReacted = !!userReactions[emoji];
              if (isReacted) {
                userReactions[emoji] = false;
                reactions[emoji] = Math.max(0, (reactions[emoji] || 1) - 1);
              } else {
                userReactions[emoji] = true;
                reactions[emoji] = (reactions[emoji] || 0) + 1;
              }

              const totalLikes = Object.values(reactions).reduce((a, b) => a + b, 0);
              return {
                ...r,
                likes: totalLikes,
                reactions,
                userReactions
              };
            }
          }
          return r;
        });
        return { ...c, replies: updatedReplies };
      } else if (!replyId && c.id === commentId) {
        let likedBy = Array.isArray(c.likedBy) ? [...c.likedBy] : [];
        if (!Array.isArray(c.likedBy) && (c.reactions?.["❤️"] || 0) > 0) {
          likedBy = Array.from({ length: c.reactions?.["❤️"] || 1 }, (_, i) => `prev_user_${i}`);
        }
        const reactions = { ...(c.reactions || {}) };
        const userReactions = { ...(c.userReactions || {}) };

        if (emoji === "❤️") {
          const alreadyLiked = likedBy.includes(userKey);
          let newLikedBy: string[];
          if (alreadyLiked) {
            // Remove this account's like
            newLikedBy = likedBy.filter((k) => k !== userKey);
            reactions["❤️"] = newLikedBy.length;
            userReactions["❤️"] = false;
          } else {
            // Add this account's unique like
            newLikedBy = [...likedBy, userKey];
            reactions["❤️"] = newLikedBy.length;
            userReactions["❤️"] = true;
          }

          const totalLikes = newLikedBy.length;
          return {
            ...c,
            likedBy: newLikedBy,
            likes: totalLikes,
            reactions,
            userReactions
          };
        } else {
          const isReacted = !!userReactions[emoji];
          if (isReacted) {
            userReactions[emoji] = false;
            reactions[emoji] = Math.max(0, (reactions[emoji] || 1) - 1);
          } else {
            userReactions[emoji] = true;
            reactions[emoji] = (reactions[emoji] || 0) + 1;
          }

          const totalLikes = Object.values(reactions).reduce((a, b) => a + b, 0);
          return {
            ...c,
            likes: totalLikes,
            reactions,
            userReactions
          };
        }
      }
      return c;
    });

    setComments(updated);
    try {
      localStorage.setItem(`dj_article_comments_${articleKey}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const canManageComment = (item: { email?: string; name?: string; visitorId?: string }): boolean => {
    if (isAdmin) return true;
    const currentEmail = (auth.user?.email || "").toLowerCase().trim();
    const currentName = (auth.user?.name || "").toLowerCase().trim();

    if (currentEmail && item.email && item.email.toLowerCase().trim() === currentEmail) {
      return true;
    }
    if (currentName && item.name && item.name.toLowerCase().trim() === currentName) {
      return true;
    }

    if (typeof window !== "undefined") {
      const visitorId = localStorage.getItem("dj_visitor_id");
      if (visitorId && item.visitorId && item.visitorId === visitorId) {
        return true;
      }
    }
    return false;
  };

  const handleStartEditComment = (comment: ArticleComment) => {
    if (!canManageComment(comment)) return;
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text || "");
  };

  const handleSaveEditComment = (commentId: string) => {
    if (!editingCommentText.trim()) return;
    const updated = comments.map((c) => {
      if (c.id === commentId) {
        return {
          ...c,
          text: editingCommentText.trim(),
          isEdited: true
        };
      }
      return c;
    });
    setComments(updated);
    try {
      localStorage.setItem(`dj_article_comments_${articleKey}`, JSON.stringify(updated));
    } catch (e) {}
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleDeleteComment = (commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment || !canManageComment(comment)) return;
    if (!confirm("Are you sure you want to delete this comment?")) return;
    const updated = comments.filter((c) => c.id !== commentId);
    setComments(updated);
    try {
      localStorage.setItem(`dj_article_comments_${articleKey}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const handleStartEditReply = (reply: ArticleReply) => {
    if (!canManageComment(reply)) return;
    setEditingReplyId(reply.id);
    setEditingReplyText(reply.text || "");
  };

  const handleSaveEditReply = (commentId: string, replyId: string) => {
    if (!editingReplyText.trim()) return;
    const updated = comments.map((c) => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: (c.replies || []).map((r) => {
            if (r.id === replyId) {
              return {
                ...r,
                text: editingReplyText.trim(),
                isEdited: true
              };
            }
            return r;
          })
        };
      }
      return c;
    });
    setComments(updated);
    try {
      localStorage.setItem(`dj_article_comments_${articleKey}`, JSON.stringify(updated));
    } catch (e) {}
    setEditingReplyId(null);
    setEditingReplyText("");
  };

  const handleDeleteReply = (commentId: string, replyId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    const reply = comment?.replies?.find((r) => r.id === replyId);
    if (!reply || !canManageComment(reply)) return;
    if (!confirm("Are you sure you want to delete this reply?")) return;
    const updated = comments.map((c) => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: (c.replies || []).filter((r) => r.id !== replyId)
        };
      }
      return c;
    });
    setComments(updated);
    try {
      localStorage.setItem(`dj_article_comments_${articleKey}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const getUserBookmarkStorageKey = (): string | null => {
    if (!auth.user || !auth.user.email) return null;
    const sanitizedEmail = auth.user.email.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    return `dj_bookmarks_${sanitizedEmail}`;
  };

  useEffect(() => {
    const checkBookmarkStatus = () => {
      try {
        const key = getUserBookmarkStorageKey();
        if (!key) {
          setIsBookmarked(false);
          return;
        }
        const savedList = safeGetBookmarksFromStorage(key);
        let isFound = false;
        if (Array.isArray(savedList)) {
          const targetTitle = (activeNewsData?.title || newsData?.title || "").trim().toLowerCase();
          const targetId = String((activeNewsData as any)?.id || (newsData as any)?.id || "");
          isFound = savedList.some((item) => {
            if (!item) return false;
            if (targetId && item.id && String(item.id) === targetId) return true;
            const itemTitle = (item.title || "").trim().toLowerCase();
            return Boolean(itemTitle && targetTitle && itemTitle === targetTitle);
          });
        }
        setIsBookmarked(isFound);
      } catch {}
    };

    checkBookmarkStatus();
    if (typeof window !== "undefined") {
      window.addEventListener("dj_bookmarks_updated", checkBookmarkStatus);
      return () => {
        window.removeEventListener("dj_bookmarks_updated", checkBookmarkStatus);
      };
    }
  }, [activeNewsData?.title, (activeNewsData as any)?.id, auth.user]);

  const toggleBookmark = () => {
    if (!auth.authenticated || !auth.user) {
      // NON-LOGGED IN USER: Require Sign Up / Login!
      setIsAuthModalOpen(true);
      return;
    }

    // DISALLOW BOOKMARKING FOR WRITERS & ADMINS
    const role = (auth.user.role || "").toLowerCase();
    const isStaffOrAdmin = role === "writer" || role === "admin" || role === "co-admin";

    if (isStaffOrAdmin) {
      showToast("🚫 Bookmarking is available for Reader accounts only.");
      return;
    }

    try {
      const key = getUserBookmarkStorageKey();
      if (!key) {
        setIsAuthModalOpen(true);
        return;
      }
      const savedList: any[] = [...safeGetBookmarksFromStorage(key)];

      const targetTitle = (activeNewsData?.title || newsData?.title || "").trim().toLowerCase();
      const targetId = String((activeNewsData as any)?.id || (newsData as any)?.id || "");
      const existsIndex = savedList.findIndex((item) => {
        if (!item) return false;
        if (targetId && item.id && String(item.id) === targetId) return true;
        const itTitle = (item.title || "").trim().toLowerCase();
        return Boolean(itTitle && targetTitle && itTitle === targetTitle);
      });

      if (existsIndex >= 0) {
        // Remove bookmark from account
        savedList.splice(existsIndex, 1);
        safeSaveBookmarksToStorage(key, savedList);
        setIsBookmarked(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dj_bookmarks_updated"));
        }
        showToast("Article removed from your Saved Reading List.");
      } else {
        // Add bookmark to account
        const currentHref = typeof window !== "undefined" ? (window.location.pathname + window.location.search) : "/";
        const articleId = String((activeNewsData as any)?.id || (newsData as any)?.id || "");
        const articleTitle = activeNewsData?.title || newsData?.title || "Article";
        const articleCategory = (activeNewsData?.category || parent?.name || "POLITICS").toUpperCase();
        const articleDate = (activeNewsData?.date || newsData?.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })).split("•")[0].trim();

        let articleImage = activeNewsData?.image || newsData?.image || (activeNewsData as any)?.imageUrl || "";
        if (typeof articleImage === "string" && (articleImage.length > 500 || articleImage.startsWith("data:"))) {
          articleImage = "";
        }

        const newBookmark = {
          id: articleId,
          title: articleTitle,
          category: articleCategory,
          href: currentHref,
          date: articleDate,
          image: articleImage,
          savedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        };

        const filtered = savedList.filter((item) => {
          if (!item) return false;
          if (articleId && item.id && String(item.id) === articleId) return false;
          const itTitle = (item.title || "").trim().toLowerCase();
          if (articleTitle && itTitle && itTitle === articleTitle.trim().toLowerCase()) return false;
          return true;
        });
        filtered.unshift(newBookmark);
        safeSaveBookmarksToStorage(key, filtered);

        setIsBookmarked(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dj_bookmarks_updated"));
        }
        showToast("✓ Article saved to your personal account reading list!");
      }
    } catch (e) {
      console.warn("Bookmark toggle warning:", e);
      showToast("❌ Could not update saved reading list.");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const [authorLinkedinUrl, setAuthorLinkedinUrl] = useState<string>("https://www.linkedin.com");
  const [authorXUrl, setAuthorXUrl] = useState<string>("https://x.com");

  useEffect(() => {
    try {
      const activeUserStr = typeof window !== "undefined" ? (localStorage.getItem("dj_user") || localStorage.getItem("dj_writer_user")) : null;
      if (activeUserStr) {
        const activeUser = JSON.parse(activeUserStr);
        if (activeUser.linkedin && activeUser.linkedin.trim()) {
          setAuthorLinkedinUrl(activeUser.linkedin.trim());
        }
        if (activeUser.xTwitter && activeUser.xTwitter.trim()) {
          setAuthorXUrl(activeUser.xTwitter.trim());
        } else if (activeUser.twitter && activeUser.twitter.trim()) {
          setAuthorXUrl(activeUser.twitter.trim());
        }
        if (activeUser.linkedin && activeUser.linkedin.trim()) return;
      }

      const dbStr = typeof window !== "undefined" ? localStorage.getItem("dj_user_profiles_db") : null;
      if (dbStr) {
        const profiles = JSON.parse(dbStr);
        const targetAuthor = (activeNewsData?.authorName || newsData?.authorName || "").toLowerCase().trim();
        const match: any = Object.values(profiles).find(
          (p: any) => p.name && p.name.toLowerCase().trim() === targetAuthor
        );
        if (match?.linkedin && match.linkedin.trim()) {
          setAuthorLinkedinUrl(match.linkedin.trim());
        }
        if (match?.xTwitter && match.xTwitter.trim()) {
          setAuthorXUrl(match.xTwitter.trim());
        } else if (match?.twitter && match.twitter.trim()) {
          setAuthorXUrl(match.twitter.trim());
        }
      }
    } catch (e) {}
  }, [activeNewsData.authorName]);

  const autoSEO = generateAutoSEO({
    title: activeNewsData?.title || newsData?.title || "",
    content: (activeNewsData?.sections || newsData?.sections || []).flatMap((s) => s.paragraphs).join(" ") || "",
    category: activeNewsData?.category || category,
    subcategory,
    authorName: activeNewsData?.authorName || newsData?.authorName || "",
    imageUrl: activeNewsData?.image || newsData?.image || "",
    imageCaption: activeNewsData?.caption || newsData?.caption || "",
    publishedAt: activeNewsData?.date || newsData?.date || ""
  });

  return (
    <main className="min-h-screen bg-white font-standard-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(autoSEO.jsonLdSchema)
        }}
      />
      <Header showProgressBar={true} />

      {/* Show loading skeleton until live article data is resolved to prevent stale/old article flash */}
      {!isArticleResolved ? (
        <div className="max-w-[1240px] mx-auto px-4 md:px-6 pt-6 pb-16 font-sans" aria-hidden="true">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-48 mb-6" />
            <div className="h-8 bg-gray-100 rounded w-3/4 mb-3" />
            <div className="h-8 bg-gray-100 rounded w-1/2 mb-6" />
            <div className="h-[420px] bg-gray-100 rounded mb-6" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-100 rounded" />
              <div className="h-4 bg-gray-100 rounded w-5/6" />
              <div className="h-4 bg-gray-100 rounded w-4/6" />
            </div>
          </div>
        </div>
      ) : (
      <>

      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs font-bold py-2.5 px-6 rounded-full border border-zinc-700 shadow-2xl flex items-center justify-center gap-2 animate-bounce z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ARTICLE WRAPPER */}
      <div id="article-read-container" className="max-w-[1240px] mx-auto px-4 md:px-6 pt-6 pb-16 font-sans">
        
        {/* Top Utility Bar */}
        {(() => {
          const currentPath = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
          const currentTitle = (activeNewsData?.title || newsData?.title || "").trim().toLowerCase();
          const matchedArticle = (Array.isArray(liveArticles) ? liveArticles : []).find((p) => {
            if (!p || p.status !== "Published") return false;
            const pTitle = (p.title || "").trim().toLowerCase();
            const pSlug = pTitle.replace(/[^a-z0-9]+/g, "-");
            return (
              currentTitle.includes(pTitle) ||
              pTitle.includes(currentTitle) ||
              currentPath.includes(pSlug) ||
              (p.slug && currentPath.includes(p.slug.toLowerCase())) ||
              (p.id && currentPath.includes(String(p.id))) ||
              (currentTitle.length > 5 && pTitle.slice(0, 15) === currentTitle.slice(0, 15))
            );
          });

          const isInvalidCategory = (name?: string | null) => !name || name.trim().toLowerCase() === "news" || name.trim().toLowerCase() === "undefined";
          const resolveDisplayCategory = () => {
            if (matchedArticle?.category && !isInvalidCategory(matchedArticle.category)) return matchedArticle.category;
            if (matchedArticle?.category_name && !isInvalidCategory(matchedArticle.category_name)) return matchedArticle.category_name;
            if (activeNewsData?.category && !isInvalidCategory(activeNewsData.category)) return activeNewsData.category;
            if (newsData?.category && !isInvalidCategory(newsData.category)) return newsData.category;
            if (parent?.name && !isInvalidCategory(parent.name)) return parent.name;
            if (subName && !isInvalidCategory(subName)) return subName;
            if (subcategory && !isInvalidCategory(subcategory)) return subcategory.charAt(0).toUpperCase() + subcategory.slice(1);
            return "World";
          };

          const trueMainCategory = resolveDisplayCategory();
          const formatCategorySlug = (cat: string) => cat.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          const mainCategorySlug = formatCategorySlug(trueMainCategory);
          const mainCategoryHref = `/category/${mainCategorySlug}`;

          return (
            <div className="flex items-center justify-between py-2.5 mb-4 text-[12px] font-sans text-zinc-500 border-b border-zinc-100">
              <Link
                href={mainCategoryHref}
                className="flex items-center gap-1.5 hover:text-black font-semibold uppercase tracking-wider transition-colors"
              >
                <ArrowLeft size={14} />
                Back to {trueMainCategory}
              </Link>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    const cleanUrl = window.location.origin + window.location.pathname;
                    if (navigator.share) {
                      navigator.share({ title: activeNewsData?.title || newsData?.title || "", url: cleanUrl }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(cleanUrl);
                      showToast("Link copied to clipboard!");
                    }
                  }}
                  className="hover:text-black transition-colors cursor-pointer flex items-center gap-1"
                  title="Share article"
                >
                  <Share2 size={15} />
                </button>

                {/* Bookmark Icon Button */}
                <button
                  onClick={toggleBookmark}
                  className={`transition-colors cursor-pointer p-1 rounded hover:bg-zinc-100 flex items-center gap-1.5 ${
                    isBookmarked ? "text-[#BF1E2D] font-bold" : "text-zinc-500 hover:text-black"
                  }`}
                  title={isBookmarked ? "Remove from Saved Reading List" : "Save to Reader Reading List"}
                >
                  <Bookmark
                    size={18}
                    className={isBookmarked ? "fill-[#BF1E2D] text-[#BF1E2D]" : ""}
                  />
                  <span className="text-[11px] font-bold hidden sm:inline">
                    {isBookmarked ? "SAVED" : "SAVE"}
                  </span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Body Content Grid (2-Column Layout matching Preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-2 items-start">
          
          {/* Left Column: Main News content */}
          <div id="article-content-body" className="lg:col-span-8 flex flex-col">

            {/* Category Navigation Badge */}
            {(() => {
              const formatCategorySlug = (cat: string) => {
                return cat.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
              };

              const currentPath = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
              const currentTitle = (activeNewsData?.title || newsData?.title || "").trim().toLowerCase();
              const matchedArticle = (Array.isArray(liveArticles) ? liveArticles : []).find((p) => {
                if (!p || p.status !== "Published") return false;
                const pTitle = (p.title || "").trim().toLowerCase();
                const pSlug = pTitle.replace(/[^a-z0-9]+/g, "-");
                return (
                  currentTitle.includes(pTitle) ||
                  pTitle.includes(currentTitle) ||
                  currentPath.includes(pSlug) ||
                  (p.slug && currentPath.includes(p.slug.toLowerCase())) ||
                  (p.id && currentPath.includes(String(p.id))) ||
                  (currentTitle.length > 5 && pTitle.slice(0, 15) === currentTitle.slice(0, 15))
                );
              });

              const isInvalidCategory = (name?: string | null) => !name || name.trim().toLowerCase() === "news" || name.trim().toLowerCase() === "undefined";
              const resolveDisplayCategory = () => {
                if (matchedArticle?.category && !isInvalidCategory(matchedArticle.category)) return matchedArticle.category;
                if (matchedArticle?.category_name && !isInvalidCategory(matchedArticle.category_name)) return matchedArticle.category_name;
                if (activeNewsData?.category && !isInvalidCategory(activeNewsData.category)) return activeNewsData.category;
                if (newsData?.category && !isInvalidCategory(newsData.category)) return newsData.category;
                if (parent?.name && !isInvalidCategory(parent.name)) return parent.name;
                if (subName && !isInvalidCategory(subName)) return subName;
                if (subcategory && !isInvalidCategory(subcategory)) return subcategory.charAt(0).toUpperCase() + subcategory.slice(1);
                return "World";
              };

              const mainCategoryName = resolveDisplayCategory().trim();
              const mainCategorySlug = formatCategorySlug(mainCategoryName);
              const mainCategoryHref = `/category/${mainCategorySlug}`;

              const resolveSecondaryCategory = (): string => {
                const main = mainCategoryName.toLowerCase();
                if (subName && subName.trim() && subName.toLowerCase() !== main) {
                  return subName;
                }
                if (subcategory && subcategory.trim() && subcategory.toLowerCase() !== main) {
                  return subcategory.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                }
                if (activeNewsData?.subcategories && activeNewsData.subcategories.length > 0) {
                  const sc = activeNewsData.subcategories[0];
                  if (sc && sc.toLowerCase() !== main) return sc;
                }
                if (activeNewsData?.tags && activeNewsData.tags.length > 0) {
                  const tg = activeNewsData.tags[0];
                  if (tg && tg.toLowerCase() !== main) return tg;
                }
                return `${mainCategoryName.toUpperCase()} BRIEFING`;
              };

              const secondaryCategoryName = resolveSecondaryCategory().trim();

              return (
                <div className="mb-4 font-sans">
                  {/* Breadcrumb Navigation */}
                  <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-sans mb-3 flex-wrap">
                    <Link href="/" className="hover:text-[#BF1E2D] transition-colors">Home</Link>
                    <span className="text-slate-400">›</span>
                    <Link href={mainCategoryHref} className="hover:text-[#BF1E2D] transition-colors">{mainCategoryName}</Link>
                    {secondaryCategoryName && (
                      <>
                        <span className="text-slate-400">›</span>
                        <span className="text-slate-700 font-medium">{secondaryCategoryName}</span>
                      </>
                    )}
                  </nav>

                  {/* Dual Category Badges */}
                  <div className="flex items-center gap-2 mb-3.5">
                    <Link
                      href={mainCategoryHref}
                      className="inline-flex items-center bg-[#BF1E2D] text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-none hover:bg-[#a61724] transition-colors font-sans"
                    >
                      {mainCategoryName}
                    </Link>
                    {secondaryCategoryName && (
                      <span className="inline-flex items-center border border-slate-300 bg-white text-slate-800 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-none font-sans">
                        {secondaryCategoryName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Main Title - Classic Editorial Serif */}
            <h1 className="font-editorial-serif text-3xl sm:text-4xl lg:text-[42px] font-bold text-slate-900 leading-[1.18] mb-3.5 tracking-tight">
              {activeNewsData.title}
            </h1>

            {/* Subheadline / Deck - Upright Regular Editorial Serif */}
            {activeNewsData.caption && (
              <p className="font-editorial-serif text-lg sm:text-[20px] text-slate-700 font-normal leading-relaxed mb-6 not-italic">
                {activeNewsData.caption.split('.')[0] + '.'}
              </p>
            )}

            {/* Author Metadata Bar with GMT & 4 Circular Social Share Buttons */}
            {(() => {
              const cleanAuth = resolveCleanAuthor(activeNewsData.authorName, activeNewsData.authorAvatar, activeNewsData.authorEmail);
              const authorSlug = cleanAuth.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const mainCat = (activeNewsData?.category && activeNewsData.category.toLowerCase() !== "article" ? activeNewsData.category : "") || parent?.name || "News";

              let displayDate = (activeNewsData.date || "").trim();
              if (displayDate && !displayDate.includes("GMT")) {
                displayDate = `${displayDate} | 14:25 GMT`;
              } else if (!displayDate) {
                displayDate = "Recently | 14:25 GMT";
              }

              return (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-200 font-sans" suppressHydrationWarning>
                  {/* Left: Author Avatar & Name */}
                  <div className="flex items-center gap-3">
                    <Link href={`/author/${authorSlug}`} className="w-11 h-11 rounded-full overflow-hidden bg-[#1E293B] flex-shrink-0 border border-zinc-300 hover:opacity-80 transition-opacity flex items-center justify-center text-white font-bold text-sm" suppressHydrationWarning>
                      {cleanAuth.avatar && cleanAuth.avatar.length > 5 ? (
                        <img src={cleanAuth.avatar} alt={cleanAuth.name} className="w-full h-full object-cover" suppressHydrationWarning />
                      ) : (
                        <span suppressHydrationWarning>{(cleanAuth.name || "RM").slice(0, 2).toUpperCase()}</span>
                      )}
                    </Link>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[14px] font-bold text-black font-sans leading-tight">
                          By <Link href={`/author/${authorSlug}`} className="hover:text-[#BF1E2D] transition-colors">{cleanAuth.name}</Link>
                        </p>
                      </div>
                      <p className="text-[12px] text-zinc-500 font-sans mt-0.5 leading-tight">
                        {cleanAuth.bio && cleanAuth.bio.length < 50 ? cleanAuth.bio : `${mainCat} Correspondent | London BigBen Network`}
                      </p>
                    </div>
                  </div>

                  {/* Right: Date & 4 Circular Social Share Buttons */}
                  <div className="flex items-center gap-3.5 flex-wrap sm:flex-nowrap">
                    <p className="text-[12px] text-zinc-500 font-sans whitespace-nowrap">
                      {displayDate}
                    </p>

                    <div className="flex items-center gap-2 relative">
                      {/* Facebook */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        aria-label="Share on Facebook"
                        className="w-8 h-8 rounded-full bg-[#1877F2] hover:opacity-90 transition-opacity flex items-center justify-center text-white cursor-pointer"
                      >
                        <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </button>

                      {/* X / Twitter */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(activeNewsData.title)}&url=${encodeURIComponent(window.location.href)}`, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        aria-label="Share on X"
                        className="w-8 h-8 rounded-full bg-black hover:opacity-90 transition-opacity flex items-center justify-center text-white cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </button>

                      {/* LinkedIn */}
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        aria-label="Share on LinkedIn"
                        className="w-8 h-8 rounded-full bg-[#0A66C2] hover:opacity-90 transition-opacity flex items-center justify-center text-white cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                      </button>

                      {/* Copy Link */}
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        aria-label="Copy article link"
                        className="w-8 h-8 rounded-full bg-[#475569] hover:bg-[#334155] transition-colors flex items-center justify-center text-white cursor-pointer relative"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                        </svg>
                      </button>
                      {copiedLink && (
                        <span className="absolute -top-7 right-0 bg-black text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
                          Copied!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Featured Hero Thumbnail Image */}
            {(() => {
              let heroImage = activeNewsData.image;
              if (!heroImage && activeNewsData.rawContent) {
                const srcMatch = activeNewsData.rawContent.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (srcMatch) heroImage = srcMatch[1];
              }
              if (!heroImage) return null;

              const capInfo = parseCaptionAndCredit(activeNewsData.caption || "", (activeNewsData as any).credit || (activeNewsData as any).imageCredit);
              const displayCredit = capInfo.credit;

              return (
                <figure className="w-full mb-6 block">
                  <div className="w-full overflow-hidden bg-transparent">
                    <img
                      src={heroImage}
                      alt={activeNewsData.title || "Article Image"}
                      className="w-full h-auto aspect-[16/9] object-cover block mx-auto rounded-none border-0 shadow-none"
                    />
                  </div>
                  {(capInfo.caption || displayCredit) && (
                    <figcaption className="text-xs text-slate-500 font-poppins mt-2 text-left leading-normal">
                      {capInfo.caption && displayCredit
                        ? `${capInfo.caption} | Image: ${displayCredit}`
                        : capInfo.caption
                        ? capInfo.caption
                        : `Image: ${displayCredit}`}
                    </figcaption>
                  )}
                </figure>
              );
            })()}

            {/* News Body Content */}
            {activeNewsData.rawContent ? (
              <div className="prose prose-slate max-w-none text-zinc-900 leading-[1.8] font-poppins article-body-poppins text-[16px] md:text-[17px] flow-root [&_figure]:my-5 [&_figure]:max-w-full [&_figcaption]:text-xs [&_figcaption]:text-slate-500 [&_figcaption]:mt-1.5 [&_a]:text-[#BF1E2D] [&_a]:font-semibold [&_a]:underline hover:[&_a]:text-[#901320] [&_b]:font-bold [&_strong]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-[#BF1E2D] [&_blockquote]:pl-4 [&_blockquote]:py-2.5 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-slate-700 [&_blockquote]:bg-slate-50/80 [&_blockquote]:rounded-none [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6">
                {/* KEY POINTS Callout Box - Positioned on the right side next to lead text below the image */}
                {keyPointsList.length > 0 && (
                  <aside
                    aria-label="Key Points"
                    className="not-prose w-full my-4 md:my-1 md:float-right md:w-[290px] lg:w-[310px] xl:w-[325px] md:ml-6 md:mb-5 lg:-mr-12 bg-transparent border-0 shadow-none pt-1 pb-3 pl-1 pr-4 sm:pr-6 font-poppins clear-right"
                  >
                    <h3 className="text-xs font-bold text-[#BF1E2D] uppercase tracking-wider font-poppins mb-3.5">
                      KEY POINTS
                    </h3>
                    <ul className="space-y-4 sm:space-y-[18px] font-poppins list-none p-0 m-0">
                      {keyPointsList.map((pt: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 leading-snug p-0 m-0 font-poppins">
                          <span
                            style={{ borderRadius: "50%" }}
                            className="w-[22px] h-[22px] min-w-[22px] min-h-[22px] rounded-full bg-[#BF1E2D] text-white flex-shrink-0 flex items-center justify-center font-bold text-[11px] leading-none mt-0.5"
                          >
                            {i + 1}
                          </span>
                          <span className="text-slate-800 font-medium text-[13px] sm:text-[13.5px] leading-snug font-poppins">
                            {pt}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </aside>
                )}
                {(() => {
                  let rawHtml = activeNewsData.rawContent;
                  if (rawHtml.startsWith("<") && rawHtml.includes("&lt;")) {
                    rawHtml = rawHtml
                      .replace(/&lt;/g, "<")
                      .replace(/&gt;/g, ">")
                      .replace(/&quot;/g, '"')
                      .replace(/&#39;/g, "'")
                      .replace(/&amp;/g, "&");
                  }

                  // 1. Strip leading empty paragraphs, divs, brs before the image
                  rawHtml = rawHtml.replace(/^(\s*<(p|div)[^>]*>\s*(<br\s*\/?>|&nbsp;|\s*)*<\/\2>\s*)+/i, '');

                  // 2. Strip leading hero figure or image so it never shows two images
                  const divFigMatch = rawHtml.match(/^\s*<div[^>]*>\s*<figure[^>]*>[\s\S]*?<\/figure>[\s\S]*?<\/div>\s*/i);
                  if (divFigMatch) {
                    rawHtml = rawHtml.slice(divFigMatch[0].length).trim();
                  } else {
                    const figMatch = rawHtml.match(/^\s*<figure[^>]*>[\s\S]*?<\/figure>\s*/i);
                    if (figMatch) {
                      rawHtml = rawHtml.slice(figMatch[0].length).trim();
                    } else {
                      const pImgMatch = rawHtml.match(/^\s*<p[^>]*>\s*<img[^>]+src=["']([^"']+)["'][^>]*>\s*<\/p>\s*/i);
                      if (pImgMatch) {
                        rawHtml = rawHtml.slice(pImgMatch[0].length).trim();
                      } else {
                        const imgMatch = rawHtml.match(/^\s*<img[^>]+src=["']([^"']+)["'][^>]*>\s*/i);
                        if (imgMatch) {
                          rawHtml = rawHtml.slice(imgMatch[0].length).trim();
                        }
                      }
                    }
                  }

                  // 3. Strip any empty paragraphs, divs left behind after the image
                  rawHtml = rawHtml.replace(/^(\s*<(p|div)[^>]*>\s*(<br\s*\/?>|&nbsp;|\s*)*<\/\2>\s*)+/i, '');

                  // 4. If text starts with bare text (not an HTML tag), wrap first text paragraph in <p>
                  if (rawHtml && !rawHtml.startsWith('<')) {
                    const nextTag = rawHtml.indexOf('<');
                    if (nextTag !== -1) {
                      rawHtml = '<p>' + rawHtml.slice(0, nextTag) + '</p>' + rawHtml.slice(nextTag);
                    } else {
                      rawHtml = '<p>' + rawHtml + '</p>';
                    }
                  }

                  rawHtml = processContentLinks(rawHtml);

                  // Normalize any body figure captions into uniform "Caption | Image: Credit"
                  rawHtml = rawHtml.replace(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi, (_fullMatch, innerContent) => {
                    const spanMatches = Array.from(innerContent.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)).map((m: any) => m[1]);
                    let cap = "";
                    let cred = "";
                    if (spanMatches.length >= 2) {
                      cap = String(spanMatches[0]).replace(/<[^>]+>/g, "").trim();
                      cred = String(spanMatches[1]).replace(/<[^>]+>/g, "").trim();
                    } else if (spanMatches.length === 1) {
                      cap = String(spanMatches[0]).replace(/<[^>]+>/g, "").trim();
                    } else {
                      cap = innerContent.replace(/<[^>]+>/g, "").trim();
                    }

                    const parsed = parseCaptionAndCredit(cap, cred);
                    let finalText = "";
                    if (parsed.caption && parsed.credit) {
                      finalText = `${parsed.caption} | Image: ${parsed.credit}`;
                    } else if (parsed.caption) {
                      finalText = parsed.caption;
                    } else if (parsed.credit) {
                      finalText = `Image: ${parsed.credit}`;
                    }

                    return `<figcaption class="text-xs text-slate-500 font-poppins mt-2 text-left leading-normal">${finalText}</figcaption>`;
                  });

                  return <div className="font-poppins article-body-poppins space-y-4" dangerouslySetInnerHTML={{ __html: rawHtml }} />;
                })()}
              </div>
            ) : (
              /* Fallback for static legacy articles */
              <div className="font-poppins article-body-poppins text-[16px] md:text-[17px] text-zinc-900 leading-[1.8] tracking-normal mt-0 flow-root">
                {keyPointsList.length > 0 && (
                  <aside
                    aria-label="Key Points"
                    className="not-prose w-full my-4 md:my-1 md:float-right md:w-[290px] lg:w-[310px] xl:w-[325px] md:ml-6 md:mb-5 lg:-mr-12 bg-transparent border-0 shadow-none pt-1 pb-3 pl-1 pr-4 sm:pr-6 font-poppins clear-right"
                  >
                    <h3 className="text-xs font-bold text-[#BF1E2D] uppercase tracking-wider font-poppins mb-3.5">
                      KEY POINTS
                    </h3>
                    <ul className="space-y-4 sm:space-y-[18px] font-poppins list-none p-0 m-0">
                      {keyPointsList.map((pt: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 leading-snug p-0 m-0 font-poppins">
                          <span
                            style={{ borderRadius: "50%" }}
                            className="w-[22px] h-[22px] min-w-[22px] min-h-[22px] rounded-full bg-[#BF1E2D] text-white flex-shrink-0 flex items-center justify-center font-bold text-[11px] leading-none mt-0.5"
                          >
                            {i + 1}
                          </span>
                          <span className="text-slate-800 font-medium text-[13px] sm:text-[13.5px] leading-snug font-poppins">
                            {pt}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </aside>
                )}
                {activeNewsData.sections.map((sec, secIdx) => {
                  const cleanHeading = (sec.heading || "").trim();
                  const isOverview = cleanHeading.toLowerCase() === "overview" || cleanHeading.toLowerCase() === (activeNewsData.caption || "").toLowerCase().trim();

                  return (
                    <div key={secIdx} className="space-y-4 font-poppins">
                      {cleanHeading && !isOverview && (
                        <h2 className="font-poppins text-[22px] md:text-[24px] font-bold text-black mt-4 mb-2 leading-snug">
                          {sec.heading}
                        </h2>
                      )}
                      {sec.paragraphs.map((p, pIdx) => (
                        <div key={pIdx} className="space-y-5">
                          <p 
                            className="font-poppins text-zinc-900 [&_a]:text-[#BF1E2D] [&_a]:underline [&_a]:font-semibold hover:[&_a]:text-[#901320] transition-colors"
                            dangerouslySetInnerHTML={{ __html: processContentLinks(p) }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── 1. AUTHOR BIO CARD (Matching reference image design) ── */}
            {(() => {
              const cleanAuth = resolveCleanAuthor(activeNewsData.authorName, activeNewsData.authorAvatar, activeNewsData.authorEmail, activeNewsData.authorBio);
              const authorSlug = cleanAuth.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const authorCategory = (activeNewsData.category && activeNewsData.category.toLowerCase() !== "article" ? activeNewsData.category : "") || (newsData?.category && newsData.category.toLowerCase() !== "article" ? newsData.category : "") || "Political";
              const authorRole = (activeNewsData as any).authorRole || `${authorCategory} Correspondent`;
              const displayBio = cleanAuth.bio || `${cleanAuth.name} is a ${authorRole.toLowerCase()} covering UK government, Parliament, policy and international relations. She has reported on political developments across Europe for over a decade.`;

              return (
                <div className="mt-8 pt-6 border-t border-zinc-200 font-sans" suppressHydrationWarning>
                  <div className="flex items-start gap-4 sm:gap-5">
                    {/* Circular Avatar */}
                    <Link
                      href={`/author/${authorSlug}`}
                      className="w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 border border-slate-200 hover:opacity-90 transition-opacity flex items-center justify-center text-slate-700 font-bold text-base shadow-xs"
                    >
                      {cleanAuth.avatar && cleanAuth.avatar.length > 5 ? (
                        <img src={cleanAuth.avatar} alt={cleanAuth.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{(cleanAuth.name || "SM").slice(0, 2).toUpperCase()}</span>
                      )}
                    </Link>

                    {/* Author Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[13px] sm:text-[14px] text-slate-800 font-sans">
                            <span>By </span>
                            <Link
                              href={`/author/${authorSlug}`}
                              className="font-bold text-slate-900 hover:text-[#BF1E2D] hover:underline transition-colors"
                            >
                              {cleanAuth.name}
                            </Link>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-500 font-sans mt-0.5">
                            {authorRole} | London BigBen Network
                          </p>
                        </div>

                        {/* Top-Right Social Icons: X & LinkedIn */}
                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          {/* X / Twitter */}
                          <a
                            href={authorXUrl || "https://x.com"}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${cleanAuth.name} on X`}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black hover:opacity-80 transition-opacity flex items-center justify-center text-white cursor-pointer"
                          >
                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                          </a>

                          {/* LinkedIn */}
                          <a
                            href={authorLinkedinUrl || "https://www.linkedin.com"}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${cleanAuth.name} on LinkedIn`}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#0A66C2] hover:opacity-80 transition-opacity flex items-center justify-center text-white cursor-pointer"
                          >
                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white" viewBox="0 0 24 24">
                              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                            </svg>
                          </a>
                        </div>
                      </div>

                      {/* Bio text */}
                      <p className="text-xs sm:text-[12.5px] text-slate-600 font-sans leading-relaxed mt-2 line-clamp-3">
                        {displayBio}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── 2. TAGS ROW ── */}
            {(() => {
              const tagsList = (() => {
                let resolved = resolveArticleTags(activeNewsData);
                if (!resolved || resolved.length === 0) {
                  resolved = resolveArticleTags(newsData);
                }
                const cleanList = (resolved || [])
                  .map((t: string) => (t || "").replace(/^#+/, "").trim())
                  .filter(Boolean);

                if (cleanList.length < 4) {
                  const cat = (activeNewsData.category || "Politics").toLowerCase();
                  let defaults = ["UK Politics", "Government Policy", "Economic Growth", "Trade", "International Relations", "Prime Minister", "UK Economy"];
                  if (cat.includes("business") || cat.includes("economy") || cat.includes("market")) {
                    defaults = ["Economy", "Markets", "Global Trade", "Inflation", "Banking", "Investment", "UK Economy"];
                  } else if (cat.includes("tech")) {
                    defaults = ["Technology", "Artificial Intelligence", "Innovation", "Digital Economy", "Cybersecurity", "Startups"];
                  } else if (cat.includes("sport")) {
                    defaults = ["Sports", "Premier League", "Football", "Champions League", "Athletics", "UK Sport"];
                  }
                  for (const d of defaults) {
                    if (!cleanList.some(t => t.toLowerCase() === d.toLowerCase())) {
                      cleanList.push(d);
                    }
                    if (cleanList.length >= 7) break;
                  }
                }
                return cleanList;
              })();

              if (!tagsList || tagsList.length === 0) return null;

              return (
                <div className="mt-5 flex items-center gap-2 flex-wrap font-sans">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 font-sans mr-1 shrink-0">
                    TAGS
                  </span>
                  {tagsList.map((tag) => (
                    <Link
                      key={tag}
                      href={`/category/${formatCategorySlug(activeNewsData.category || "news")}?tag=${encodeURIComponent(tag)}`}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 transition-colors cursor-pointer"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              );
            })()}

            {/* ── 3. SHARE THIS ARTICLE ROW ── */}
            <div className="mt-4 flex items-center gap-2.5 flex-wrap font-sans">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900 font-sans mr-1 shrink-0">
                SHARE THIS ARTICLE
              </span>

              {/* Facebook */}
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank', 'noopener,noreferrer');
                  }
                }}
                aria-label="Share on Facebook"
                className="w-7 h-7 rounded-full bg-[#1877F2] hover:opacity-90 transition-opacity flex items-center justify-center text-white cursor-pointer shadow-2xs"
              >
                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>

              {/* X / Twitter */}
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(activeNewsData.title)}&url=${encodeURIComponent(window.location.href)}`, '_blank', 'noopener,noreferrer');
                  }
                }}
                aria-label="Share on X"
                className="w-7 h-7 rounded-full bg-black hover:opacity-90 transition-opacity flex items-center justify-center text-white cursor-pointer shadow-2xs"
              >
                <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>

              {/* LinkedIn */}
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank', 'noopener,noreferrer');
                  }
                }}
                aria-label="Share on LinkedIn"
                className="w-7 h-7 rounded-full bg-[#0A66C2] hover:opacity-90 transition-opacity flex items-center justify-center text-white cursor-pointer shadow-2xs"
              >
                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </button>

              {/* WhatsApp */}
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(activeNewsData.title + " " + window.location.href)}`, '_blank', 'noopener,noreferrer');
                  }
                }}
                aria-label="Share on WhatsApp"
                className="w-7 h-7 rounded-full bg-[#25D366] hover:opacity-90 transition-opacity flex items-center justify-center text-white cursor-pointer shadow-2xs"
              >
                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                  <path d="M12.031 2c-5.514 0-9.991 4.477-9.991 9.991 0 1.763.459 3.486 1.332 5.006L2 22l5.127-1.345a9.94 9.94 0 004.904 1.285h.004c5.513 0 9.99-4.477 9.99-9.991 0-5.514-4.477-9.991-9.994-9.991zm5.823 14.184c-.244.688-1.42 1.312-1.956 1.393-.518.077-1.189.11-3.418-.813-2.853-1.182-4.686-4.086-4.828-4.275-.141-.189-1.155-1.536-1.155-2.929 0-1.393.729-2.079.988-2.363.259-.284.566-.355.754-.355.188 0 .377.002.542.01.176.009.412-.067.644.49.244.59.833 2.033.906 2.182.073.149.122.324.024.519-.098.195-.147.316-.292.486-.145.17-.306.379-.437.509-.146.145-.298.303-.128.595.17.292.756 1.246 1.621 2.016 1.112.99 2.05 1.296 2.342 1.442.292.146.463.122.634-.073.17-.195.731-.852.926-1.144.195-.292.39-.244.658-.146.268.098 1.699.801 1.991.947.292.146.487.219.559.341.073.122.073.706-.171 1.394z"/>
                </svg>
              </button>

              {/* Email */}
              <a
                href={`mailto:?subject=${encodeURIComponent(activeNewsData.title)}&body=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                aria-label="Share via Email"
                className="w-7 h-7 rounded-full bg-[#EA4335] hover:opacity-90 transition-opacity flex items-center justify-center text-white cursor-pointer shadow-2xs"
              >
                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </a>

              {/* Copy Link */}
              <div className="relative">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  aria-label="Copy article link"
                  className="w-7 h-7 rounded-full bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center text-slate-700 cursor-pointer shadow-2xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                  </svg>
                </button>
                {copiedLink && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap z-10 font-sans">
                    Copied!
                  </span>
                )}
              </div>
            </div>

            {/* ── 4. PREVIOUS ARTICLE / NEXT ARTICLE NAVIGATION ROW ── */}
            {(prevArticle || nextArticle) && (
              <div className="my-6 py-3.5 border-y border-zinc-200 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center font-sans">
                {/* Previous Article */}
                {prevArticle ? (
                  <Link
                    href={prevArticle.href}
                    className="group flex items-center gap-3 text-left min-w-0"
                  >
                    <span className="text-zinc-400 group-hover:text-[#BF1E2D] transition-colors shrink-0 font-bold text-lg leading-none">
                      ‹
                    </span>
                    <div className="w-14 h-10 sm:w-16 sm:h-11 shrink-0 overflow-hidden bg-slate-100 border border-slate-200 rounded-none">
                      <img
                        src={prevArticle.image}
                        alt={prevArticle.title}
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=150&fit=crop";
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-sans mb-0.5">
                        PREVIOUS ARTICLE
                      </p>
                      <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-[#BF1E2D] transition-colors font-serif line-clamp-2 leading-snug">
                        {prevArticle.title}
                      </h4>
                    </div>
                  </Link>
                ) : (
                  <div className="hidden sm:block" />
                )}

                {/* Next Article */}
                {nextArticle && (
                  <Link
                    href={nextArticle.href}
                    className="group flex items-center justify-end gap-3 text-right min-w-0 sm:border-l sm:border-zinc-200 sm:pl-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-sans mb-0.5">
                        NEXT ARTICLE
                      </p>
                      <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-[#BF1E2D] transition-colors font-serif line-clamp-2 leading-snug">
                        {nextArticle.title}
                      </h4>
                    </div>
                    <div className="w-14 h-10 sm:w-16 sm:h-11 shrink-0 overflow-hidden bg-slate-100 border border-slate-200 rounded-none">
                      <img
                        src={nextArticle.image}
                        alt={nextArticle.title}
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=150&fit=crop";
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <span className="text-zinc-400 group-hover:text-[#BF1E2D] transition-colors shrink-0 font-bold text-lg leading-none">
                      ›
                    </span>
                  </Link>
                )}
              </div>
            )}

            {/* ── 5. NEWSLETTER SIGNUP CARD ── */}
            <div className="bg-[#F8FAFC] border border-slate-200/90 p-5 sm:p-6 my-6 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                <div className="md:col-span-6 lg:col-span-7">
                  <h3 className="font-serif font-bold text-base sm:text-lg lg:text-[19px] text-slate-900 leading-snug">
                    Get the latest {activeNewsData.category && activeNewsData.category.toLowerCase() !== "article" ? activeNewsData.category.toLowerCase() : "political"} news and analysis delivered to your inbox
                  </h3>
                </div>
                <div className="md:col-span-6 lg:col-span-5">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newsletterEmail.trim()) {
                        setNewsletterSubscribed(true);
                        setTimeout(() => {
                          setNewsletterSubscribed(false);
                          setNewsletterEmail("");
                        }, 4000);
                      }
                    }}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center gap-0">
                      <input
                        type="email"
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        placeholder="Enter your email address"
                        required
                        className="bg-white border border-slate-300 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#BF1E2D] flex-1 min-w-0 rounded-none h-9"
                      />
                      <button
                        type="submit"
                        className="bg-[#BF1E2D] hover:bg-[#901320] text-white font-bold text-xs px-4 py-2 uppercase tracking-wider transition-colors shrink-0 rounded-none h-9 cursor-pointer"
                      >
                        {newsletterSubscribed ? "Subscribed!" : "Subscribe"}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans leading-tight">
                      By subscribing, you agree to our{" "}
                      <Link href="/terms" className="underline hover:text-slate-800">
                        Privacy Policy
                      </Link>{" "}
                      and{" "}
                      <Link href="/terms" className="underline hover:text-slate-800">
                        Terms and Conditions
                      </Link>
                      .
                    </p>
                  </form>
                </div>
              </div>
            </div>

            {/* ── 6. RELATED CATEGORY NEWS (4-Column Card Grid) ── */}
            {relatedNewsArticles.length > 0 && (
              <div className="mt-8 mb-8 font-sans">
                <div className="flex items-center justify-between pb-2 mb-4 border-b border-zinc-200">
                  <div className="relative pb-2 -mb-[9px] border-b-2 border-[#BF1E2D]">
                    <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 uppercase tracking-wider font-sans">
                      RELATED {activeNewsData.category && activeNewsData.category.toLowerCase() !== "article" ? activeNewsData.category.toUpperCase() : "POLITICAL"} NEWS
                    </h3>
                  </div>
                  <Link
                    href={`/category/${formatCategorySlug(activeNewsData.category || "news")}`}
                    className="text-xs font-bold text-[#BF1E2D] hover:underline flex items-center gap-1 font-sans"
                  >
                    <span>View All {activeNewsData.category && activeNewsData.category.toLowerCase() !== "article" ? activeNewsData.category : "Politics"}</span>
                    <span>→</span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-4.5">
                  {relatedNewsArticles.map((item, idx) => (
                    <Link
                      key={`related-main-grid-${idx}-${item.id || item.href}`}
                      href={item.href}
                      className="group flex flex-col cursor-pointer"
                    >
                      <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100 rounded-none mb-2 border border-slate-100">
                        <img
                          src={item.image}
                          alt={item.title}
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&h=200&fit=crop";
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-[#BF1E2D] uppercase tracking-wider font-sans mb-1">
                        {item.category}
                      </span>
                      <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 group-hover:text-[#BF1E2D] font-serif line-clamp-2 leading-snug transition-colors mb-1">
                        {item.title}
                      </h4>
                      <p className="text-[10.5px] text-zinc-400 font-sans mt-auto">
                        {item.date}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Saved Stories Toggle Bar */}
            {(() => {
              const totalCommentsCount = comments.length + comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0);
              return (
                <>
                  {/* INTERACTIVE COMMENTS & OPINIONS SECTION */}
                  <div className="mt-8 pt-6 border-t border-zinc-200 font-sans">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-black uppercase tracking-wider font-standard-sans flex items-center gap-2">
                        <span>Comments</span>
                        <span className="text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-mono font-bold">
                          {totalCommentsCount}
                        </span>
                      </h3>
                      <div className="flex items-center gap-3">
                        {comments.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowCommentsList(!showCommentsList)}
                            className="text-xs font-bold text-[#BF1E2D] hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <span>{showCommentsList ? "Hide Comments" : `View Comments (${totalCommentsCount})`}</span>
                          </button>
                        )}
                        {isAdmin && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-mono">
                            🛡️ Admin Moderation
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Write Opinion / Comment Box */}
                    {!isMounted || !auth.user ? (
                      <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-6 sm:p-7 mb-8 text-center shadow-2xs">
                        <h4 className="text-sm font-bold text-slate-900 mb-1 font-standard-sans">
                          Sign in to Join the Conversation
                        </h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4 leading-relaxed font-sans">
                          Only verified London BigBen members can post opinions and join discussions. Sign in to your account or register to share your thoughts on this story.
                        </p>
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                          <Link
                            href={loginHref}
                            className="bg-[#BF1E2D] hover:bg-[#901320] text-white font-bold text-xs px-5 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Send size={12} />
                            <span>Sign In to Comment</span>
                          </Link>
                          <Link
                            href={registerHref}
                            className="text-xs font-bold text-slate-700 hover:text-[#BF1E2D] px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all shadow-2xs cursor-pointer"
                          >
                            Create Free Account
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handlePostComment} className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 mb-8 shadow-2xs">
                        <div className="mb-3">
                          <textarea
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            placeholder="Share your thoughts or opinion on this article..."
                            rows={3}
                            className="w-full p-3.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#BF1E2D] focus:ring-1 focus:ring-red-100 transition-all resize-y"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                              <div className="w-6 h-6 rounded-full bg-[#BF1E2D] text-white flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                {auth.user.avatar ? (
                                  <img src={auth.user.avatar} alt={auth.user.name} className="w-full h-full object-cover" />
                                ) : (
                                  auth.user.name?.charAt(0) || "U"
                                )}
                              </div>
                              <span>
                                Posting as <strong className="text-slate-900">{auth.user.name}</strong>
                                {isUserArticleAuthor(auth.user.email, auth.user.name) && (
                                  <span className="ml-1.5 text-[9px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-mono inline-flex items-center gap-0.5">
                                    ⭐ Author
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            {commentSuccess && (
                              <span className="text-xs font-bold text-emerald-600 animate-in fade-in">
                                ✓ Opinion posted!
                              </span>
                            )}
                            <button
                              type="submit"
                              disabled={!newCommentText.trim() || isPostingComment}
                              className="bg-[#BF1E2D] hover:bg-red-800 active:scale-95 text-white font-bold text-xs px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                              <Send size={13} />
                              <span>Post Opinion</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    )}

                    {/* Comments Feed List */}
                    {comments.length === 0 ? (
                      <div className="text-center py-6 text-zinc-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-zinc-200">
                        No opinions shared yet. Be the first to share your thoughts on this story!
                      </div>
                    ) : !showCommentsList ? (
                      <div className="text-center py-2">
                        <button
                          type="button"
                          onClick={() => setShowCommentsList(true)}
                          className="w-full py-3.5 px-4 bg-slate-50 hover:bg-slate-100 active:scale-[0.99] border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:border-slate-300"
                        >
                          <span>View Comments ({totalCommentsCount})</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((comment) => {
                          const isCommentAuthor = comment.isArticleAuthor || isUserArticleAuthor(comment.email, comment.name);
                          return (
                            <div
                              key={comment.id}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setActiveReactionPicker(activeReactionPicker === comment.id ? null : comment.id);
                              }}
                              className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 transition-all hover:border-slate-300 shadow-2xs group relative"
                            >
                              {/* Header: User Info & Badges */}
                              <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 overflow-hidden shrink-0">
                                    {comment.avatar ? (
                                      <img src={comment.avatar} alt={comment.name} className="w-full h-full object-cover" />
                                    ) : (
                                      comment.name.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center flex-wrap gap-1.5">
                                      <span className="text-xs font-bold text-slate-900">{comment.name}</span>
                                      {isCommentAuthor && (
                                        <span className="text-[9px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5 shadow-2xs">
                                          ⭐ Author
                                        </span>
                                      )}
                                      {!isCommentAuthor && comment.role === "admin" && (
                                        <span className="text-[9px] font-extrabold uppercase bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-mono">
                                          Admin
                                        </span>
                                      )}
                                      {!isCommentAuthor && comment.role === "writer" && (
                                        <span className="text-[9px] font-extrabold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-mono">
                                          Journalist
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-[10px] text-zinc-400 font-mono">{comment.createdAt}</p>
                                      {comment.isEdited && (
                                        <span className="text-[10px] text-zinc-400 italic">(edited)</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Author & Admin Action Buttons (Only for comment creator or admin) */}
                                {canManageComment(comment) && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditComment(comment)}
                                      title="Edit your comment"
                                      className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-semibold cursor-pointer transition-all border border-transparent hover:border-blue-200"
                                    >
                                      <Edit3 size={12} />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(comment.id)}
                                      title="Delete your comment"
                                      className="text-slate-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-semibold cursor-pointer transition-all border border-transparent hover:border-red-200"
                                    >
                                      <Trash2 size={12} />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Comment Body & Inline Edit Box */}
                              {editingCommentId === comment.id ? (
                                <div className="mt-2 mb-3 pl-10">
                                  <div className="bg-slate-50 p-3 rounded-xl border border-blue-200 shadow-2xs">
                                    <textarea
                                      value={editingCommentText}
                                      onChange={(e) => setEditingCommentText(e.target.value)}
                                      className="w-full text-xs sm:text-sm text-slate-800 p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#BF1E2D] resize-none"
                                      rows={3}
                                    />
                                    <div className="flex justify-end items-center gap-2 mt-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCommentId(null);
                                          setEditingCommentText("");
                                        }}
                                        className="px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveEditComment(comment.id)}
                                        disabled={!editingCommentText.trim()}
                                        className="bg-[#BF1E2D] hover:bg-red-800 text-white font-bold text-xs px-3.5 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-40"
                                      >
                                        Save Changes
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (() => {
                                const currentUserKey = getCurrentUserKey();
                                const isCommentLiked = Array.isArray(comment.likedBy) ? comment.likedBy.includes(currentUserKey) : !!comment.userReactions?.["❤️"];
                                const commentLikeCount = Array.isArray(comment.likedBy) ? comment.likedBy.length : (comment.reactions?.["❤️"] || 0);

                                return (
                                  <div className="flex items-start justify-between gap-3 pl-10 mb-2">
                                    <div className="flex-1">
                                      {comment.text && (
                                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                                          {comment.text}
                                        </p>
                                      )}
                                      {comment.image && (
                                        <div className="mt-2.5 max-w-sm rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                                          <img src={comment.image} alt="Attachment" className="w-full h-auto max-h-64 object-cover" />
                                        </div>
                                      )}
                                    </div>

                                    {/* Like Heart Button directly to the right side of comment (1 like per account) */}
                                    <div className="flex flex-col items-center shrink-0 -mt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleReaction(comment.id, undefined, "❤️")}
                                        className={`p-1.5 rounded-full hover:bg-red-50 transition-all cursor-pointer ${
                                          isCommentLiked
                                            ? "text-[#BF1E2D] scale-110"
                                            : "text-slate-400 hover:text-[#BF1E2D]"
                                        }`}
                                        title={isCommentLiked ? "Unlike" : "Like comment (1 like per account)"}
                                      >
                                        <Heart size={16} className={isCommentLiked ? "fill-[#BF1E2D]" : ""} />
                                      </button>
                                      {commentLikeCount > 0 && (
                                        <span className="text-[10px] font-bold text-slate-500 font-mono -mt-1">
                                          {commentLikeCount}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Action Row: React & Reply Button */}
                              <div className="relative pl-10 flex items-center flex-wrap gap-3 pt-1.5 border-t border-slate-100/90 text-xs">
                                {/* WhatsApp / Telegram Floating Emoji Reactions Bar */}
                                {activeReactionPicker === comment.id && (
                                  <div
                                    onMouseLeave={() => setActiveReactionPicker(null)}
                                    className="absolute -top-11 left-8 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-xl border border-slate-200/90 animate-in fade-in zoom-in-95 duration-150"
                                  >
                                    {QUICK_EMOJIS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                          handleToggleReaction(comment.id, undefined, emoji);
                                          setActiveReactionPicker(null);
                                        }}
                                        className={`text-[17px] p-1 hover:scale-135 active:scale-95 transition-all rounded-full hover:bg-slate-100 cursor-pointer ${
                                          comment.userReactions?.[emoji] ? "bg-red-50 scale-110" : ""
                                        }`}
                                        title={emoji}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {/* React Trigger Button */}
                                <button
                                  type="button"
                                  onClick={() => setActiveReactionPicker(activeReactionPicker === comment.id ? null : comment.id)}
                                  className="text-slate-500 hover:text-[#BF1E2D] font-semibold flex items-center gap-1 cursor-pointer transition-colors text-xs"
                                  title="Right-click comment or click here to react"
                                >
                                  <Smile size={14} />
                                  <span>React</span>
                                </button>

                                {/* Reply Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingToId(replyingToId === comment.id ? null : comment.id);
                                    setReplyText("");
                                  }}
                                  className="text-slate-500 hover:text-[#BF1E2D] font-semibold flex items-center gap-1 cursor-pointer transition-colors text-xs"
                                >
                                  <Reply size={13} />
                                  <span>Reply</span>
                                </button>

                                {/* WhatsApp / Instagram Style Reactions Badges (Show only if reactions exist) */}
                                {(() => {
                                  const activeEmojis = Object.entries(comment.reactions || {}).filter(([emoji, count]) => emoji !== "❤️" && (count as number) > 0);
                                  const totalCount = activeEmojis.reduce((acc, [_, count]) => acc + (count as number), 0);
                                  if (totalCount === 0) return null;

                                  return (
                                    <div
                                      onClick={() => handleToggleReaction(comment.id, undefined, activeEmojis[0][0])}
                                      className="ml-auto inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-2xs px-2 py-0.5 rounded-full text-xs font-semibold text-slate-700 cursor-pointer transition-all hover:scale-105 active:scale-95"
                                      title="Click to toggle reaction"
                                    >
                                      <span className="flex -space-x-1">
                                        {activeEmojis.slice(0, 3).map(([emoji]) => (
                                          <span key={emoji} className="text-[13px]">{emoji}</span>
                                        ))}
                                      </span>
                                      <span className="text-[11px] font-bold text-slate-600 ml-0.5">{totalCount}</span>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Inline Reply Form */}
                              {replyingToId === comment.id && (
                                <div className="mt-3.5 pl-10 pt-3 border-t border-slate-100">
                                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                    <textarea
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      placeholder={`Reply to ${comment.name}...`}
                                      rows={2}
                                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#BF1E2D] transition-all resize-y mb-2"
                                    />

                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {!isMounted || !auth.user ? (
                                          <input
                                            type="text"
                                            value={replyGuestName}
                                            onChange={(e) => setReplyGuestName(e.target.value)}
                                            placeholder="Your Name (Optional)"
                                            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#BF1E2D] sm:max-w-[160px]"
                                          />
                                        ) : (
                                          <div className="text-[11px] text-slate-600 font-medium">
                                            Replying as <strong className="text-slate-900">{auth.user.name}</strong>
                                            {isUserArticleAuthor(auth.user.email, auth.user.name) && (
                                              <span className="ml-1 text-[9px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 rounded font-mono inline-block">
                                                ⭐ Author
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2 self-end sm:self-auto">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setReplyingToId(null);
                                            setReplyImage("");
                                          }}
                                          className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handlePostReply(comment.id)}
                                          disabled={!replyText.trim()}
                                          className="bg-[#BF1E2D] hover:bg-red-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                                        >
                                          <Send size={11} />
                                          <span>Submit Reply</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Nested Replies Thread */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="mt-4 pl-4 sm:pl-8 space-y-3 border-l-2 border-slate-200 ml-5 pt-1">
                                  {comment.replies.map((reply) => {
                                    const isReplyAuthor = reply.isArticleAuthor || isUserArticleAuthor(reply.email, reply.name);
                                    return (
                                      <div
                                        key={reply.id}
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setActiveReactionPicker(activeReactionPicker === `reply_${reply.id}` ? null : `reply_${reply.id}`);
                                        }}
                                        className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-2xs relative"
                                      >
                                        <div className="flex items-center justify-between mb-1.5">
                                          <div className="flex items-center gap-2">
                                            <CornerDownRight size={13} className="text-slate-400 shrink-0" />
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 overflow-hidden shrink-0">
                                              {reply.avatar ? (
                                                <img src={reply.avatar} alt={reply.name} className="w-full h-full object-cover" />
                                              ) : (
                                                reply.name.charAt(0).toUpperCase()
                                              )}
                                            </div>
                                            <div className="flex items-center flex-wrap gap-1.5">
                                              <span className="text-xs font-bold text-slate-900">{reply.name}</span>
                                              {isReplyAuthor && (
                                                <span className="text-[9px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-mono flex items-center gap-0.5 shadow-2xs">
                                                  ⭐ Author
                                                </span>
                                              )}
                                              {!isReplyAuthor && reply.role === "admin" && (
                                                <span className="text-[9px] font-extrabold uppercase bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-mono">
                                                  Admin
                                                </span>
                                              )}
                                              {!isReplyAuthor && reply.role === "writer" && (
                                                <span className="text-[9px] font-extrabold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-mono">
                                                  Journalist
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1">
                                              <span className="text-[10px] text-zinc-400 font-mono">{reply.createdAt}</span>
                                              {reply.isEdited && (
                                                <span className="text-[10px] text-zinc-400 italic">(edited)</span>
                                              )}
                                            </div>
                                            {canManageComment(reply) && (
                                              <div className="flex items-center gap-0.5">
                                                <button
                                                  type="button"
                                                  onClick={() => handleStartEditReply(reply)}
                                                  title="Edit your reply"
                                                  className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                                                >
                                                  <Edit3 size={11} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteReply(comment.id, reply.id)}
                                                  title="Delete your reply"
                                                  className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                                >
                                                  <Trash2 size={11} />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Reply Body & Inline Edit Box */}
                                        {editingReplyId === reply.id ? (
                                          <div className="mt-1.5 mb-2 pl-7">
                                            <div className="bg-white p-2.5 rounded-lg border border-blue-200 shadow-2xs">
                                              <textarea
                                                value={editingReplyText}
                                                onChange={(e) => setEditingReplyText(e.target.value)}
                                                className="w-full text-xs text-slate-800 p-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#BF1E2D] resize-none"
                                                rows={2}
                                              />
                                              <div className="flex justify-end items-center gap-2 mt-1.5">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEditingReplyId(null);
                                                    setEditingReplyText("");
                                                  }}
                                                  className="px-2 py-0.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                                                >
                                                  Cancel
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleSaveEditReply(comment.id, reply.id)}
                                                  disabled={!editingReplyText.trim()}
                                                  className="bg-[#BF1E2D] hover:bg-red-800 text-white font-bold text-xs px-2.5 py-0.5 rounded-md transition-all cursor-pointer disabled:opacity-40"
                                                >
                                                  Save
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (() => {
                                          const currentUserKey = getCurrentUserKey();
                                          const isReplyLiked = Array.isArray(reply.likedBy) ? reply.likedBy.includes(currentUserKey) : !!reply.userReactions?.["❤️"];
                                          const replyLikeCount = Array.isArray(reply.likedBy) ? reply.likedBy.length : (reply.reactions?.["❤️"] || 0);

                                          return (
                                            <div className="flex items-start justify-between gap-2 pl-7 mb-1">
                                              <div className="flex-1">
                                                {reply.text && (
                                                  <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                                                    {reply.text}
                                                  </p>
                                                )}
                                                {reply.image && (
                                                  <div className="mt-2 max-w-xs rounded-lg overflow-hidden border border-slate-200 shadow-2xs">
                                                    <img src={reply.image} alt="Attachment" className="w-full h-auto max-h-48 object-cover" />
                                                  </div>
                                                )}
                                              </div>

                                              {/* Reply Like Heart Button directly to the right side (1 like per account) */}
                                              <div className="flex flex-col items-center shrink-0 -mt-0.5">
                                                <button
                                                  type="button"
                                                  onClick={() => handleToggleReaction(comment.id, reply.id, "❤️")}
                                                  className={`p-1 rounded-full hover:bg-red-50 transition-all cursor-pointer ${
                                                    isReplyLiked
                                                      ? "text-[#BF1E2D] scale-110"
                                                      : "text-slate-400 hover:text-[#BF1E2D]"
                                                  }`}
                                                  title={isReplyLiked ? "Unlike" : "Like reply (1 like per account)"}
                                                >
                                                  <Heart size={14} className={isReplyLiked ? "fill-[#BF1E2D]" : ""} />
                                                </button>
                                                {replyLikeCount > 0 && (
                                                  <span className="text-[9px] font-bold text-slate-500 font-mono -mt-1">
                                                    {replyLikeCount}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })()}

                                        {/* Reply Action Row: React Button & Reactions */}
                                        <div className="relative pl-7 flex items-center flex-wrap gap-2 pt-1 text-xs">
                                          {/* WhatsApp / Telegram Floating Emoji Bar for Reply */}
                                          {activeReactionPicker === `reply_${reply.id}` && (
                                            <div
                                              onMouseLeave={() => setActiveReactionPicker(null)}
                                              className="absolute -top-10 left-5 z-30 flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-full shadow-xl border border-slate-200/90 animate-in fade-in zoom-in-95 duration-150"
                                            >
                                              {QUICK_EMOJIS.map((emoji) => (
                                                <button
                                                  key={emoji}
                                                  type="button"
                                                  onClick={() => {
                                                    handleToggleReaction(comment.id, reply.id, emoji);
                                                    setActiveReactionPicker(null);
                                                  }}
                                                  className={`text-[15px] p-1 hover:scale-135 active:scale-95 transition-all rounded-full hover:bg-slate-100 cursor-pointer ${
                                                    reply.userReactions?.[emoji] ? "bg-red-50 scale-110" : ""
                                                  }`}
                                                  title={emoji}
                                                >
                                                  {emoji}
                                                </button>
                                              ))}
                                            </div>
                                          )}

                                          {/* React Trigger */}
                                          <button
                                            type="button"
                                            onClick={() => setActiveReactionPicker(activeReactionPicker === `reply_${reply.id}` ? null : `reply_${reply.id}`)}
                                            className="text-slate-500 hover:text-[#BF1E2D] font-semibold flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                                            title="Right-click reply or click here to react"
                                          >
                                            <Smile size={13} />
                                            <span>React</span>
                                          </button>

                                          {/* WhatsApp / Instagram Reactions Badge */}
                                          {(() => {
                                            const activeEmojis = Object.entries(reply.reactions || {}).filter(([emoji, count]) => emoji !== "❤️" && (count as number) > 0);
                                            const totalCount = activeEmojis.reduce((acc, [_, count]) => acc + (count as number), 0);
                                            if (totalCount === 0) return null;

                                            return (
                                              <div
                                                onClick={() => handleToggleReaction(comment.id, reply.id, activeEmojis[0][0])}
                                                className="ml-auto inline-flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs px-1.5 py-0.5 rounded-full text-[11px] font-semibold text-slate-700 cursor-pointer transition-all hover:scale-105 active:scale-95"
                                                title="Click to toggle reaction"
                                              >
                                                <span className="flex -space-x-1">
                                                  {activeEmojis.slice(0, 3).map(([emoji]) => (
                                                    <span key={emoji} className="text-[11px]">{emoji}</span>
                                                  ))}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-600 ml-0.5">{totalCount}</span>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={() => setShowCommentsList(false)}
                            className="py-2 px-5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>Hide Comments</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

          </div>

          {/* Right Column: Sidebar Feed */}
          <div className="lg:col-span-4 lg:pl-6 font-standard-sans border-l border-zinc-100 lg:border-zinc-200 pt-2 lg:pt-0 self-stretch">
            {/* SECTION 1: RELATED NEWS */}
            <div className="mb-8">
              <div className="flex items-center justify-between pb-2 mb-4 border-b border-zinc-200 font-sans">
                <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider font-sans">
                  RELATED NEWS
                </h3>
                {(() => {
                  const catSlug = formatCategorySlug(
                    (activeNewsData?.category && activeNewsData.category.toLowerCase() !== "article" ? activeNewsData.category : "") ||
                    parent?.name ||
                    "news"
                  );
                  return (
                    <Link
                      href={`/category/${catSlug}`}
                      className="text-[#BF1E2D] hover:underline text-xs font-semibold flex items-center gap-0.5"
                    >
                      <span>View All</span>
                      <span>→</span>
                    </Link>
                  );
                })()}
              </div>

              <div className="space-y-3.5 font-sans">
                {relatedNewsArticles.map((item, idx) => (
                  <Link
                    key={`related-sidebar-${idx}-${item.id || item.href}`}
                    href={item.href}
                    className="flex gap-3 items-start cursor-pointer group pb-3.5 border-b border-zinc-100 last:border-none"
                  >
                    <div className="relative w-[105px] h-[72px] flex-shrink-0 overflow-hidden bg-slate-100 rounded-none">
                      <img
                        src={item.image}
                        alt={item.title}
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=150&fit=crop";
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex flex-col text-left flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-[#BF1E2D] uppercase tracking-wider font-sans mb-0.5">
                        {item.category}
                      </span>
                      <h4 className="text-[13px] md:text-[13.5px] font-bold leading-snug text-slate-900 group-hover:text-[#BF1E2D] transition-colors mb-1 font-editorial-serif line-clamp-2">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 font-normal font-sans">{item.date}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* SECTION 2: MOST READ */}
            <div className="mb-8">
              <div className="flex items-center gap-2 pb-2 mb-4 border-b border-zinc-200 font-sans">
                <span className="w-1.5 h-4 bg-[#BF1E2D] inline-block"></span>
                <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider font-sans">
                  MOST READ
                </h3>
              </div>

              <div className="space-y-3 font-sans">
                {mostReadArticles.map((item, idx) => (
                  <Link
                    key={`most-read-sidebar-${idx}-${item.id || item.href}`}
                    href={item.href}
                    className="flex items-center gap-3 cursor-pointer group pb-3 border-b border-zinc-100 last:border-none"
                  >
                    <span className="w-5 text-center font-editorial-serif font-bold text-lg text-[#BF1E2D] flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="relative w-[72px] h-[50px] flex-shrink-0 overflow-hidden bg-slate-100 rounded-none">
                      <img
                        src={item.image}
                        alt={item.title}
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=150&fit=crop";
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex flex-col text-left flex-1 min-w-0">
                      <h4 className="text-[12.5px] font-bold leading-snug text-slate-900 group-hover:text-[#BF1E2D] transition-colors font-editorial-serif line-clamp-2">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 font-normal font-sans mt-0.5">{item.date}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* SECTION 3: LATEST IN CATEGORY */}
            {latestInCategoryArticles.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between pb-2 mb-4 border-b border-zinc-200 font-sans">
                  <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider font-sans">
                    LATEST IN {((sidebarTargetCat && sidebarTargetCat.toLowerCase() !== "article" ? sidebarTargetCat : activeNewsData?.category || "NEWS")).toUpperCase()}
                  </h3>
                  {(() => {
                    const catSlug = formatCategorySlug(
                      (sidebarTargetCat && sidebarTargetCat.toLowerCase() !== "article" ? sidebarTargetCat : "") ||
                      (activeNewsData?.category && activeNewsData.category.toLowerCase() !== "article" ? activeNewsData.category : "") ||
                      parent?.name ||
                      "news"
                    );
                    return (
                      <Link
                        href={`/category/${catSlug}`}
                        className="text-[#BF1E2D] hover:underline text-xs font-semibold flex items-center gap-0.5"
                      >
                        <span>View All</span>
                        <span>→</span>
                      </Link>
                    );
                  })()}
                </div>

                <div className="space-y-3.5 font-sans">
                  {latestInCategoryArticles.map((item, idx) => (
                    <Link
                      key={`latest-cat-sidebar-${idx}-${item.id || item.href}`}
                      href={item.href}
                      className="flex gap-3 items-start cursor-pointer group pb-3.5 border-b border-zinc-100 last:border-none"
                    >
                      <div className="relative w-[105px] h-[72px] flex-shrink-0 overflow-hidden bg-slate-100 rounded-none">
                        <img
                          src={item.image}
                          alt={item.title}
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=150&fit=crop";
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex flex-col text-left flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-[#BF1E2D] uppercase tracking-wider font-sans mb-0.5">
                          {item.category}
                        </span>
                        <h4 className="text-[13px] md:text-[13.5px] font-bold leading-snug text-slate-900 group-hover:text-[#BF1E2D] transition-colors mb-1 font-editorial-serif line-clamp-2">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 font-normal font-sans">{item.date}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 4: TRENDING TOPICS (6 SLOTS) */}
            {articleTrendingTopics.length > 0 && (
              <div className="mb-8 font-sans">
                <div className="flex items-center gap-2 pb-2 mb-4 border-b border-zinc-200 font-sans">
                  <span className="w-1.5 h-4 bg-[#BF1E2D] inline-block"></span>
                  <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider font-sans">
                    TRENDING TOPICS
                  </h3>
                </div>

                <ol className="space-y-3 font-sans list-none p-0 m-0">
                  {articleTrendingTopics.map((topic, idx) => (
                    <li key={`article-trending-topic-${idx}`}>
                      <Link
                        href={`/search?q=${encodeURIComponent(topic)}`}
                        className="flex items-center gap-3.5 group cursor-pointer"
                      >
                        <span className="w-4 text-left font-sans font-bold text-sm text-[#BF1E2D] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[13px] md:text-[13.5px] font-medium text-slate-800 group-hover:text-[#BF1E2D] transition-colors leading-snug font-sans">
                          {topic}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Sticky Advertisement Section */}
            <div className="sticky top-20 z-10 w-full flex flex-col items-start space-y-6">
              {/* Category Pages — Sidebar Top Ad Box (Slot 4) */}
              {(() => {
                const adSlot4 = adSlots.find(s => s.id === "slot-4" || (s.categoryGroup === "CATEGORY" && s.dimensions.includes("250")) || s.title.includes("Sidebar Top"));
                if (!adSlot4 || !adSlot4.isActive) return null;
                const slot4Dimensions = formatAdDimensions(adSlot4.dimensions || "300X250");
                const hasSlot4Image =
                  adSlot4.imageUrl &&
                  adSlot4.imageUrl.trim() !== "" &&
                  !isDuplicateAdImage(adSlot4.imageUrl, adSlot4.id, adSlots);
                const isExternal = (adSlot4.actionType || "").toLowerCase().includes("external") || (adSlot4.targetUrl || "").startsWith("http");
                return (
                  <div className="pt-6 border-t border-zinc-200 mt-6 w-full flex flex-col items-start">
                    {hasSlot4Image ? (
                      <a
                        href={adSlot4.targetUrl || "#"}
                        target={isExternal ? "_blank" : "_self"}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        className="block group relative overflow-hidden rounded-xs border border-zinc-200 bg-black w-full max-w-[340px] aspect-[300/250]"
                      >
                        <img
                          src={adSlot4.imageUrl}
                          alt={adSlot4.title || "Ad"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase text-white border border-white/10">
                          Ad
                        </div>
                      </a>
                    ) : (
                      <div className="w-full max-w-[340px] aspect-[300/250] bg-[#111827] border border-dashed border-gray-700 rounded-xs flex flex-col items-center justify-center p-4 text-center">
                        <span className="text-white font-mono font-bold text-sm tracking-widest">
                          {slot4Dimensions}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 mt-1">
                          Size: {slot4Dimensions} px
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Category Pages — Sidebar Bottom Tall Ad Box (Slot 5: 300x600 skyscraper) */}
              {(() => {
                const adSlot5 = adSlots.find(s => s.id === "slot-5" || (s.categoryGroup === "CATEGORY" && s.dimensions.includes("600")) || s.title.includes("Tall Ad"));
                if (!adSlot5 || !adSlot5.isActive) return null;
                const slot5Dimensions = formatAdDimensions(adSlot5.dimensions || "300X600");
                const hasSlot5Image =
                  adSlot5.imageUrl &&
                  adSlot5.imageUrl.trim() !== "" &&
                  !isDuplicateAdImage(adSlot5.imageUrl, adSlot5.id, adSlots);
                const isExternal = (adSlot5.actionType || "").toLowerCase().includes("external") || (adSlot5.targetUrl || "").startsWith("http");
                return (
                  <div className="pt-6 border-t border-zinc-200 w-full flex flex-col items-start">
                    {hasSlot5Image ? (
                      <a
                        href={adSlot5.targetUrl || "#"}
                        target={isExternal ? "_blank" : "_self"}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        className="block group relative overflow-hidden rounded-xs border border-zinc-200 bg-black w-full max-w-[340px] h-[550px]"
                      >
                        <img
                          src={adSlot5.imageUrl}
                          alt={adSlot5.title || "Ad"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase text-white border border-white/10">
                          Ad
                        </div>
                      </a>
                    ) : (
                      <div className="w-full max-w-[340px] h-[550px] bg-[#111827] border border-dashed border-gray-700 rounded-xs flex flex-col items-center justify-center p-6 text-center">
                        <span className="text-white font-mono font-bold text-base tracking-widest">
                          {slot5Dimensions}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400 mt-2">
                          Size: {slot5Dimensions} px
                        </span>
                        <span className="text-[10px] font-mono text-gray-500 mt-1">
                          Tall Skyscraper Ad
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

        </div>

        {/* More News Section (Linked with Latest News) */}
        {moreNewsArticles.length > 0 && (
          <div className="mt-14 pt-10 border-t border-zinc-200 font-sans w-full">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1.5 h-6 bg-[#D31220]" />
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight uppercase font-sans">
                <Link href="/news" className="hover:text-[#BF1E2D] transition-colors">
                  More News
                </Link>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {moreNewsArticles.map((item, idx) => (
                <Link
                  key={`more-news-col-${idx}-${item.href}`}
                  href={item.href}
                  className="group flex flex-col cursor-pointer bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md p-3.5 rounded-sm transition-all"
                >
                  <div className="relative w-full aspect-[16/10] bg-gray-100 overflow-hidden mb-3 rounded-xs border border-gray-100">
                    <img
                      src={item.image}
                      alt={item.title}
                      onError={(e) => {
                        const fallbacks = [
                          "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=600&h=400&fit=crop",
                          "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=400&fit=crop",
                          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=400&fit=crop",
                          "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&h=400&fit=crop"
                        ];
                        const fallback = fallbacks[idx % fallbacks.length];
                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] sm:text-[10.5px] font-extrabold text-[#D31220] uppercase tracking-wider">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-gray-400">• {item.time}</span>
                  </div>
                  <h3 className="text-[13.5px] sm:text-[14.5px] font-bold text-gray-900 group-hover:text-[#D31220] transition-colors line-clamp-2 leading-snug font-serif">
                    {item.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── UP NEXT & MOST READ SECTION ── */}
        {(upNextArticles.length > 0 || mostReadArticles.length > 0) && (
          <div className="mt-14 pt-10 border-t border-zinc-200 font-sans w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              
              {/* Left Column: Up next (Recent articles across multiple categories) */}
              <div className="lg:col-span-8">
                <h2 className="text-xl sm:text-2xl font-bold font-sans text-zinc-950 tracking-tight mb-6">
                  Up next
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {upNextArticles.map((item) => (
                    <Link
                      key={`upnext-card-${item.id}`}
                      href={item.href}
                      className="group flex flex-col cursor-pointer"
                    >
                      <div className="relative w-full aspect-[16/10] bg-zinc-100 overflow-hidden mb-2.5 rounded-xs border border-zinc-100">
                        <img
                          src={item.image}
                          alt={item.title}
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&h=400&fit=crop";
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <h3 className="text-[14px] sm:text-[14.5px] font-bold text-zinc-900 group-hover:text-[#BF1E2D] transition-colors line-clamp-3 leading-snug font-sans mb-1.5">
                        {item.title}
                      </h3>
                      <span className="text-[11px] font-bold tracking-wider text-zinc-400 font-sans uppercase mt-auto">
                        {item.readTime}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Right Column: Most read (Numbered 1-8 List) */}
              <div className="lg:col-span-4 lg:pl-2">
                <h2 className="text-xl sm:text-2xl font-bold font-sans text-zinc-950 tracking-tight mb-6">
                  Most read
                </h2>

                <div className="flex flex-col divide-y divide-zinc-200 border-b border-zinc-200">
                  {mostReadArticles.map((item, idx) => (
                    <Link
                      key={`most-read-item-${item.id}`}
                      href={item.href}
                      className="group flex items-start gap-4 py-3.5 first:pt-0 cursor-pointer"
                    >
                      <span className="font-bold text-base sm:text-lg text-zinc-950 w-4 shrink-0 font-sans leading-snug">
                        {idx + 1}
                      </span>
                      <h3 className="text-[13.5px] sm:text-[14px] font-medium text-zinc-900 group-hover:text-[#BF1E2D] leading-snug line-clamp-2 transition-colors font-sans">
                        {item.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* SIGN UP / LOGIN REQUIRED MODAL FOR GUESTS */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 md:p-8 shadow-2xl relative font-sans text-center">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-black font-bold cursor-pointer text-base"
            >
              ✕
            </button>

            <div className="w-14 h-14 bg-red-50 text-[#BF1E2D] rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 shadow-sm">
              <Bookmark size={28} className="fill-[#BF1E2D]" />
            </div>

            <h3 className="text-xl font-bold font-serif text-zinc-900 mb-2">
              Sign Up to Save Articles
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed mb-6">
              Please sign up for a free account or sign in to save articles to your personal reading list and view your saved stories anytime.
            </p>

            <div className="space-y-3">
              <Link
                href="/register"
                className="block w-full py-3.5 bg-[#BF1E2D] hover:bg-red-800 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-sm"
              >
                Create Free Account
              </Link>
              <Link
                href={loginHref}
                className="block w-full py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer border border-zinc-200 text-center"
              >
                Sign In to Account
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 5-Column Category Grid Section */}
      <div className="border-t border-zinc-200 mt-6">
        <BottomCategoryGrid />
      </div>

      <Footer />
      </>
      )}

    </main>
  );
}

export default function ArticlePageContent(props: ArticlePageContentProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ArticlePageContentInner {...props} />
    </Suspense>
  );
}


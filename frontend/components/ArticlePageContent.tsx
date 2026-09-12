"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CheckCircle2, Bookmark, Share2, ArrowLeft, Send, Trash2, MessageSquare, ThumbsUp, Heart, Reply, CornerDownRight, Smile, Plus, X, Image as ImageIcon, Edit3 } from "lucide-react";
import { generateAutoSEO } from "@/lib/seo";
import { getUserProfile, getAuthorAvatarByNameOrEmail, getAuthorFullProfileByNameOrEmail, resolveUserAvatar } from "@/lib/userProfiles";
import { useLiveArticles, useLiveAdSlots, formatAdDimensions, isDuplicateAdImage } from "@/lib/articlesSync";
import { useAuth } from "@/lib/auth-context";

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
  newsData: ArticleData;
  sidebarPicks: SidebarItem[];
}

function parseCaptionAndCredit(rawCaption: string, rawCredit?: string) {
  if (rawCredit && rawCredit.trim()) {
    const cleanCredit = rawCredit.trim().replace(/^\(?(photo:?\s*)?/i, "").replace(/\)?$/, "");
    return {
      caption: rawCaption.trim(),
      credit: `(PHOTO: ${cleanCredit.toUpperCase()})`
    };
  }

  const str = (rawCaption || "").trim();
  if (!str) {
    return { caption: "", credit: "" };
  }

  const bracketMatch = str.match(/\((?:photo:?\s*)?([^)]+)\)$/i);
  if (bracketMatch) {
    const creditText = bracketMatch[1].trim().toUpperCase();
    const cleanCaption = str.replace(bracketMatch[0], "").trim();
    const formattedCredit = creditText.startsWith("PHOTO:") ? `(${creditText})` : `(PHOTO: ${creditText})`;
    return {
      caption: cleanCaption || str,
      credit: formattedCredit
    };
  }

  const dashMatch = str.match(/—\s*photo\s+courtesy\s+of\s+(.+)$/i);
  if (dashMatch) {
    const creditText = dashMatch[1].trim().toUpperCase();
    const cleanCaption = str.replace(dashMatch[0], "").trim();
    return {
      caption: cleanCaption || str,
      credit: `(PHOTO: ${creditText})`
    };
  }

  return {
    caption: str,
    credit: "(PHOTO: LONDON BIGBEN)"
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
    return `<a${newAttrs}>`;
  });
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
  const { adSlots } = useLiveAdSlots();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const resolveCleanAuthor = (rawName?: string, rawAvatar?: string, rawEmail?: string) => {
    let name = (rawName || "").trim();
    if (!name || name.toLowerCase() === "system administrator" || name.toLowerCase() === "administrator" || name.toLowerCase() === "admin" || name.toLowerCase() === "editor") {
      name = "Rushdhi";
    }

    const isRushdhi = name.toLowerCase().includes("rushdhi") || (rawEmail && rawEmail.toLowerCase().includes("rushdhi"));
    const writerProfile = typeof window !== "undefined" && isMounted
      ? (isRushdhi
        ? (getUserProfile("rushdhiwriter@gmail.com") || getUserProfile("writer@digitaljournal.com") || getAuthorFullProfileByNameOrEmail("rushdhi"))
        : (getUserProfile(name) || getAuthorFullProfileByNameOrEmail(name)))
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

    return { name, avatar };
  };

  const initialAuthor = resolveCleanAuthor(newsData.authorName, newsData.authorAvatar);
  const [activeNewsData, setActiveNewsData] = useState<ArticleData>({
    ...newsData,
    authorName: initialAuthor.name,
    authorAvatar: initialAuthor.avatar,
    category: newsData.category || parent?.name || category,
    subcategories: newsData.subcategories || (subName ? [subName] : [])
  });
  const { articles: liveArticles } = useLiveArticles();

  useEffect(() => {
    try {
        const searchId = searchParams?.get("id") || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("id") : null);
        const currentTitle = (newsData.title || "").trim().toLowerCase();
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

          const rawCategory = matched.category || matched.category_name || parent?.name || category || "NEWS";
          const rawSubcategories = Array.isArray(matched.subcategories) && matched.subcategories.length > 0
            ? matched.subcategories
            : (Array.isArray(matched.subCategories) && matched.subCategories.length > 0 ? matched.subCategories : (subName ? [subName] : []));

          setActiveNewsData({
            title: matched.title,
            authorName: resolved.name,
            authorAvatar: resolved.avatar,
            authorEmail: realEmail,
            authorBio: realAuthorBio,
            date: matched.date || newsData.date || "July 2026",
            image: matched.imageUrl || matched.image || newsData.image,
            caption: matched.subheading || matched.summary || newsData.caption,
            category: rawCategory,
            subcategories: rawSubcategories,
            tags: matched.tags || (matched as any).tags || [],
            rawContent: matched.content || "",
            sections: [
              {
                heading: "",
                paragraphs
              }
            ]
          });
        }
    } catch (err) {
      console.warn("Dynamic article page content sync notice:", err);
    }
  }, [liveArticles, newsData, searchParams]);

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
        const detail = e.detail || (e.key === "dj_user_profile" && e.newValue ? JSON.parse(e.newValue) : null);
        if (detail && detail.avatar && detail.avatar.length > 5 && !detail.avatar.includes("cart")) {
          const currentAuthor = activeNewsData.authorName.toLowerCase().trim();
          const isRushdhi = currentAuthor.includes("rushdhi") && 
            ((detail.email && detail.email.toLowerCase().includes("rushdhi")) || (detail.name && detail.name.toLowerCase().includes("rushdhi")));
          const isMatch = detail.name && detail.name.toLowerCase().trim() === currentAuthor;

          if (isRushdhi || isMatch) {
            setActiveNewsData((prev) => ({
              ...prev,
              authorAvatar: detail.avatar
            }));
          }
        }
      } catch (err) {}
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
  }, [activeNewsData.authorName]);

  const auth = useAuth();

  // Track article view in real time:
  // - Unregistered person: Every visit increments view count by 1.
  // - Registered account: Exactly 1 view per account for this article.
  const didRecordView = useRef<string | null>(null);
  useEffect(() => {
    // Wait until auth has completed loading to avoid false guest tracking on logged-in users
    if (auth.loading) return;
    if (!activeNewsData?.title || typeof window === "undefined") return;

    const articleIdentifier = String((activeNewsData as any).id || (activeNewsData as any).slug || activeNewsData.title).trim();
    const activeEmail = auth.user?.email ? auth.user.email.trim().toLowerCase() : null;
    const viewSessionKey = `${articleIdentifier}_${activeEmail || "guest"}`;

    if (didRecordView.current === viewSessionKey) return;
    didRecordView.current = viewSessionKey;

    fetch("/api/articles/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: activeNewsData.title,
        slug: (activeNewsData as any).slug,
        articleId: (activeNewsData as any).id,
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
                  (a.title && a.title.trim().toLowerCase() === activeNewsData.title.trim().toLowerCase()) ||
                  ((activeNewsData as any).slug && a.slug === (activeNewsData as any).slug)
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
                    (a.title && a.title.trim().toLowerCase() === activeNewsData.title.trim().toLowerCase()) ||
                    ((activeNewsData as any).slug && a.slug === (activeNewsData as any).slug)
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
  }, [activeNewsData?.title, (activeNewsData as any)?.id, auth.loading, auth.user?.email]);

  const isAdmin = Boolean(
    isMounted && (
      auth.role === "admin" ||
      (auth.user && auth.user.role === "admin") ||
      (typeof window !== "undefined" && (
        localStorage.getItem("dj_admin_portal_authenticated") === "true" ||
        localStorage.getItem("dj_user_role") === "admin"
      ))
    )
  );

  const articleKey = (activeNewsData.title || newsData.title || "article").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const [comments, setComments] = useState<ArticleComment[]>([]);
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
    const artAuthor = (activeNewsData.authorName || newsData.authorName || "").toLowerCase().trim();
    const artEmail = (activeNewsData.authorEmail || newsData.authorEmail || "").toLowerCase().trim();
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
    try {
      const key = getUserBookmarkStorageKey();
      if (!key) {
        setIsBookmarked(false);
        return;
      }
      const savedStr = localStorage.getItem(key);
      if (savedStr) {
        const savedList: any[] = JSON.parse(savedStr);
        const exists = savedList.some(
          (item) => item.title.trim().toLowerCase() === activeNewsData.title.trim().toLowerCase()
        );
        setIsBookmarked(exists);
      } else {
        setIsBookmarked(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeNewsData.title, auth.user]);

  const toggleBookmark = () => {
    if (!auth.authenticated || !auth.user) {
      // NON-LOGGED IN USER: Require Sign Up / Login!
      setIsAuthModalOpen(true);
      return;
    }

    // DISALLOW BOOKMARKING FOR WRITERS & ADMINS
    const role = (auth.user.role || "").toLowerCase();
    const email = (auth.user.email || "").toLowerCase();
    const isStaffOrAdmin =
      role === "writer" ||
      role === "admin" ||
      email.includes("writer") ||
      email.includes("admin");

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
      const savedStr = localStorage.getItem(key);
      let savedList: any[] = savedStr ? JSON.parse(savedStr) : [];

      const existsIndex = savedList.findIndex(
        (item) => item.title.trim().toLowerCase() === newsData.title.trim().toLowerCase()
      );

      if (existsIndex >= 0) {
        // Remove bookmark from account
        savedList.splice(existsIndex, 1);
        localStorage.setItem(key, JSON.stringify(savedList));
        setIsBookmarked(false);
        showToast("Article removed from your Saved Reading List.");
      } else {
        // Add bookmark to account
        const currentHref = typeof window !== "undefined" ? (window.location.pathname + window.location.search) : "/";
        const newBookmark = {
          title: newsData.title,
          category: parent.name.toUpperCase(),
          href: currentHref,
          date: newsData.date.split("•")[0].trim() || "Jul 2026",
          image: newsData.image,
          savedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        };
        savedList.unshift(newBookmark);
        localStorage.setItem(key, JSON.stringify(savedList));
        setIsBookmarked(true);
        showToast("✓ Article saved to your personal account reading list!");
      }
    } catch (e) {
      console.error(e);
      showToast("❌ Could not update saved reading list.");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const [authorLinkedinUrl, setAuthorLinkedinUrl] = useState<string>("https://www.linkedin.com");

  useEffect(() => {
    try {
      const activeUserStr = typeof window !== "undefined" ? (localStorage.getItem("dj_user") || localStorage.getItem("dj_writer_user")) : null;
      if (activeUserStr) {
        const activeUser = JSON.parse(activeUserStr);
        if (activeUser.linkedin && activeUser.linkedin.trim()) {
          setAuthorLinkedinUrl(activeUser.linkedin.trim());
          return;
        }
      }

      const dbStr = typeof window !== "undefined" ? localStorage.getItem("dj_user_profiles_db") : null;
      if (dbStr) {
        const profiles = JSON.parse(dbStr);
        const match: any = Object.values(profiles).find(
          (p: any) => p.name && p.name.toLowerCase().trim() === newsData.authorName.toLowerCase().trim()
        );
        if (match?.linkedin && match.linkedin.trim()) {
          setAuthorLinkedinUrl(match.linkedin.trim());
        }
      }
    } catch (e) {}
  }, [newsData.authorName]);

  const autoSEO = generateAutoSEO({
    title: newsData.title,
    content: newsData.sections?.flatMap((s) => s.paragraphs).join(" ") || "",
    category,
    subcategory,
    authorName: newsData.authorName,
    imageUrl: newsData.image,
    imageCaption: newsData.caption,
    publishedAt: newsData.date
  });

  return (
    <main className="min-h-screen bg-white font-standard-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(autoSEO.jsonLdSchema)
        }}
      />
      <Header />

      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs font-bold py-2.5 px-6 rounded-full border border-zinc-700 shadow-2xl flex items-center justify-center gap-2 animate-bounce z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ARTICLE WRAPPER */}
      <div className="max-w-[1240px] mx-auto px-4 md:px-6 pt-6 pb-16 font-sans">
        
        {/* Top Utility Bar */}
        {(() => {
          const currentPath = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
          const currentTitle = (activeNewsData.title || newsData.title || "").trim().toLowerCase();
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
            if (activeNewsData.category && !isInvalidCategory(activeNewsData.category)) return activeNewsData.category;
            if (newsData.category && !isInvalidCategory(newsData.category)) return newsData.category;
            if (parent?.name && !isInvalidCategory(parent.name)) return parent.name;
            if (subName && !isInvalidCategory(subName)) return subName;
            if (subcategory && !isInvalidCategory(subcategory)) return subcategory.charAt(0).toUpperCase() + subcategory.slice(1);
            return "World";
          };

          const trueMainCategory = resolveDisplayCategory();
          const formatCategorySlug = (cat: string) => cat.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          const mainCategorySlug = formatCategorySlug(trueMainCategory);
          const newsPrefixedCategories = ["world", "politics", "economy", "markets", "lifestyle", "sports", "entertainment", "health"];
          const mainCategoryHref = newsPrefixedCategories.includes(mainCategorySlug)
            ? `/news/${mainCategorySlug}`
            : `/${mainCategorySlug}`;

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
                    if (navigator.share) {
                      navigator.share({ title: activeNewsData.title || newsData.title, url: window.location.href }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(window.location.href);
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
          <div className="lg:col-span-8 flex flex-col">

            {/* Category Navigation Badge */}
            {(() => {
              const formatCategorySlug = (cat: string) => {
                return cat.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
              };

              const currentPath = typeof window !== "undefined" ? window.location.pathname.toLowerCase() : "";
              const currentTitle = (activeNewsData.title || newsData.title || "").trim().toLowerCase();
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
                if (activeNewsData.category && !isInvalidCategory(activeNewsData.category)) return activeNewsData.category;
                if (newsData.category && !isInvalidCategory(newsData.category)) return newsData.category;
                if (parent?.name && !isInvalidCategory(parent.name)) return parent.name;
                if (subName && !isInvalidCategory(subName)) return subName;
                if (subcategory && !isInvalidCategory(subcategory)) return subcategory.charAt(0).toUpperCase() + subcategory.slice(1);
                return "World";
              };

              const mainCategoryName = resolveDisplayCategory().trim();
              const mainCategorySlug = formatCategorySlug(mainCategoryName);
              const newsPrefixedCategories = ["world", "politics", "economy", "markets", "lifestyle", "sports", "entertainment", "health"];
              const mainCategoryHref = newsPrefixedCategories.includes(mainCategorySlug)
                ? `/news/${mainCategorySlug}`
                : `/${mainCategorySlug}`;

              return (
                <div className="flex items-center gap-2 mb-3 font-standard-sans">
                  <Link
                    href={mainCategoryHref}
                    className="inline-flex items-center text-[#BF1E2D] hover:text-[#a61724] text-[12px] font-black uppercase tracking-wider transition-colors"
                  >
                    {mainCategoryName}
                  </Link>
                </div>
              );
            })()}

            {/* Main Title */}
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight mb-3 tracking-tight">
              {activeNewsData.title}
            </h1>

            {/* Subheadline */}
            {activeNewsData.caption && (
              <p className="font-serif text-lg sm:text-xl text-slate-600 italic mb-6 sm:mb-8 leading-relaxed">
                {activeNewsData.caption.split('.')[0] + '.'}
              </p>
            )}

            {/* Author Metadata Bar */}
            {(() => {
              const cleanAuth = resolveCleanAuthor(activeNewsData.authorName, activeNewsData.authorAvatar, activeNewsData.authorEmail);
              const authorSlug = cleanAuth.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

              return (
                <div className="flex items-center gap-3.5 mb-4 pb-3.5 border-b border-zinc-200 font-sans" suppressHydrationWarning>
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
                        By <Link href={`/author/${authorSlug}`} className="underline hover:text-[#BF1E2D] transition-colors">{cleanAuth.name}</Link>
                      </p>
                      <svg className="w-4 h-4 text-[#1D9BF0]" fill="currentColor" viewBox="0 0 24 24">
                        <title>Verified Journalist</title>
                        <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.34-1.89-4.24-4.23-4.24-.496 0-.966.084-1.4.238C14.31 2.225 12.94 1.35 11.36 1.35c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.34 0-4.24 1.89-4.24 4.23 0 .496.084.966.238 1.4C1.225 9.55.35 10.92.35 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.34 1.89 4.24 4.23 4.24.496 0 .966-.084 1.4-.238.65 1.273 2.02 2.148 3.6 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.34 0 4.24-1.89 4.24-4.23 0-.496-.084-.966-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.28 4.29l-4.11-4.11 1.41-1.41 2.7 2.7 6.44-6.44 1.41 1.41-7.85 7.85z"/>
                      </svg>

                      {/* Author LinkedIn Icon Symbol */}
                      <a
                        href={authorLinkedinUrl}
                        suppressHydrationWarning
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 inline-flex items-center text-[#0A66C2] hover:text-[#004182] transition-colors p-0.5"
                        title={`Connect with ${activeNewsData.authorName} on LinkedIn`}
                      >
                        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                        </svg>
                      </a>
                    </div>
                    <p className="text-[12px] text-zinc-500 mt-0.5">{activeNewsData.date}</p>
                  </div>
                </div>
              );
            })()}

            {/* Featured Hero Thumbnail Image - only show above content if content doesn't already have inline image(s) */}
            {activeNewsData.image && !(/<img\b/i.test(activeNewsData.rawContent || "")) && (
              <div className="w-full max-h-[520px] rounded-2xl overflow-hidden mb-5 border border-slate-200 shadow-sm flex items-center justify-center bg-transparent">
                <img
                  src={activeNewsData.image}
                  alt={activeNewsData.title || "Article Image"}
                  className="w-full h-auto max-h-[520px] object-cover mx-auto block"
                />
              </div>
            )}

            {/* News Body Content */}
            {activeNewsData.rawContent ? (
              <div className="prose prose-slate max-w-none text-zinc-900 leading-[1.8] font-serif text-[17px] md:text-[18px] space-y-4 flow-root [&_figure]:my-5 [&_figure]:max-w-full [&_figcaption]:flex [&_figcaption]:items-center [&_figcaption]:justify-between [&_figcaption]:gap-3 [&_figcaption]:text-xs [&_figcaption]:text-slate-500 [&_figcaption]:mt-1.5 [&_a]:text-[#BF1E2D] [&_a]:font-semibold [&_a]:underline hover:[&_a]:text-[#901320] [&_b]:font-bold [&_strong]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-[#F97316] [&_blockquote]:pl-4 [&_blockquote]:py-2.5 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-slate-700 [&_blockquote]:bg-slate-50/80 [&_blockquote]:rounded-r-xl [&_pre]:bg-slate-100/90 [&_pre]:p-3.5 [&_pre]:my-4 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-200/80 [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-sm [&_pre]:text-slate-800 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6">
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
                  rawHtml = processContentLinks(rawHtml);

                  return <div dangerouslySetInnerHTML={{ __html: rawHtml }} />;
                })()}
              </div>
            ) : (
              /* Fallback for static legacy articles */
              <div className="space-y-4 font-serif text-[17px] md:text-[18px] text-zinc-900 leading-[1.8] tracking-normal mt-0">
                {activeNewsData.sections.map((sec, secIdx) => {
                  const cleanHeading = (sec.heading || "").trim();
                  const isOverview = cleanHeading.toLowerCase() === "overview" || cleanHeading.toLowerCase() === (activeNewsData.caption || "").toLowerCase().trim();

                  return (
                    <div key={secIdx} className="space-y-4">
                      {cleanHeading && !isOverview && (
                        <h2 className="font-serif text-[22px] md:text-[24px] font-bold text-black mt-4 mb-2 leading-snug">
                          {sec.heading}
                        </h2>
                      )}
                      {sec.paragraphs.map((p, pIdx) => (
                        <div key={pIdx} className="space-y-5">
                          <p 
                            className="text-zinc-900 [&_a]:text-[#BF1E2D] [&_a]:underline [&_a]:font-semibold hover:[&_a]:text-[#901320] transition-colors"
                            dangerouslySetInnerHTML={{ __html: processContentLinks(p) }}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* HASHTAGS SECTION */}
            {activeNewsData.tags && activeNewsData.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {activeNewsData.tags.map((t: string) => (
                  <span
                    key={t}
                    className="text-slate-800 hover:text-[#BF1E2D] font-bold text-xs cursor-pointer transition-colors"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Bottom Saved Stories Toggle Bar */}
            {(() => {
              const totalCommentsCount = comments.length + comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0);
              return (
                <>
                  <div className="space-y-2 font-sans my-6 text-[12px] text-zinc-500">
                    <div className="flex items-center gap-2 font-bold text-black uppercase tracking-wider text-[11.5px]">
                      <span>💬 COMMENTS ({totalCommentsCount})</span>
                    </div>
                    <button
                      onClick={toggleBookmark}
                      className="text-[#BF1E2D] font-bold hover:underline cursor-pointer text-[13px] flex items-center gap-1.5 text-left"
                    >
                      <Bookmark size={16} className={isBookmarked ? "fill-[#BF1E2D]" : ""} />
                      <span>
                        {isBookmarked ? "✓ Saved in your Reader Reading List (Click to Remove)" : "+ Add to your saved stories"}
                      </span>
                    </button>
                  </div>

                  {/* INTERACTIVE COMMENTS & OPINIONS SECTION */}
                  <div className="mt-8 pt-6 border-t border-zinc-200 font-sans">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-black uppercase tracking-wider font-standard-sans flex items-center gap-2">
                        <MessageSquare size={16} className="text-[#BF1E2D]" />
                        <span>Reader Opinions & Comments</span>
                        <span className="text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-mono font-bold">
                          {totalCommentsCount}
                        </span>
                      </h3>
                      {isAdmin && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-mono">
                          🛡️ Admin Moderation
                        </span>
                      )}
                    </div>

                    {/* Write Opinion / Comment Box */}
                    {!isMounted || !auth.user ? (
                      <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-6 sm:p-7 mb-8 text-center shadow-2xs">
                        <div className="w-11 h-11 rounded-full bg-red-50 text-[#BF1E2D] flex items-center justify-center mx-auto mb-3 border border-red-100 shadow-2xs">
                          <MessageSquare size={20} />
                        </div>
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
                        {/* Hidden Image File Input */}
                        <input
                          type="file"
                          ref={commentFileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileChange(e, false)}
                        />

                        <div className="mb-3">
                          <textarea
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            placeholder="Share your thoughts or opinion on this article..."
                            rows={3}
                            className="w-full p-3.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#BF1E2D] focus:ring-1 focus:ring-red-100 transition-all resize-y"
                          />

                          {/* Image Preview if selected */}
                          {commentImage && (
                            <div className="relative inline-block mt-2.5 rounded-xl overflow-hidden border border-slate-200 shadow-2xs group">
                              <img src={commentImage} alt="Attachment preview" className="h-20 w-auto max-w-[200px] object-cover rounded-xl" />
                              <button
                                type="button"
                                onClick={() => setCommentImage("")}
                                className="absolute top-1 right-1 bg-black/75 hover:bg-black text-white p-1 rounded-full cursor-pointer transition-colors shadow-xs"
                                title="Remove image"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
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

                            {/* + Add Image Button */}
                            <button
                              type="button"
                              onClick={() => commentFileInputRef.current?.click()}
                              className="p-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                              title="Attach an image"
                            >
                              <Plus size={14} className="text-[#BF1E2D]" />
                              <span>Image</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            {commentSuccess && (
                              <span className="text-xs font-bold text-emerald-600 animate-in fade-in">
                                ✓ Opinion posted!
                              </span>
                            )}
                            <button
                              type="submit"
                              disabled={(!newCommentText.trim() && !commentImage) || isPostingComment}
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
                    <div className="space-y-4">
                      {comments.length === 0 ? (
                        <div className="text-center py-6 text-zinc-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-zinc-200">
                          No opinions shared yet. Be the first to share your thoughts on this story!
                        </div>
                      ) : (
                        comments.map((comment) => {
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
                                    {/* Hidden Reply Image File Input */}
                                    <input
                                      type="file"
                                      ref={replyFileInputRef}
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleImageFileChange(e, true)}
                                    />

                                    <textarea
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      placeholder={`Reply to ${comment.name}...`}
                                      rows={2}
                                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#BF1E2D] transition-all resize-y mb-2"
                                    />

                                    {/* Reply Image Preview if selected */}
                                    {replyImage && (
                                      <div className="relative inline-block mb-2 rounded-lg overflow-hidden border border-slate-200 shadow-2xs group">
                                        <img src={replyImage} alt="Reply preview" className="h-16 w-auto max-w-[150px] object-cover rounded-lg" />
                                        <button
                                          type="button"
                                          onClick={() => setReplyImage("")}
                                          className="absolute top-0.5 right-0.5 bg-black/75 hover:bg-black text-white p-0.5 rounded-full cursor-pointer transition-colors"
                                          title="Remove image"
                                        >
                                          <X size={10} />
                                        </button>
                                      </div>
                                    )}

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

                                        {/* + Image button for reply */}
                                        <button
                                          type="button"
                                          onClick={() => replyFileInputRef.current?.click()}
                                          className="p-1 px-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                                          title="Attach an image"
                                        >
                                          <Plus size={12} className="text-[#BF1E2D]" />
                                          <span>Image</span>
                                        </button>
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
                                          disabled={!replyText.trim() && !replyImage}
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
                        })
                      )}
                    </div>
                  </div>
                </>
              );
            })()}

          </div>

          {/* Right Column: Sidebar Feed */}
          <div className="lg:col-span-4 lg:pl-4 font-standard-sans border-l border-zinc-100 lg:border-zinc-200 pt-2 lg:pt-0">
            <div className="border-b-2 border-black pb-2 mb-6 w-full flex items-center justify-between">
              <h3 className="text-[13.5px] font-bold text-black uppercase tracking-wider font-standard-sans">
                MOST POPULAR IN {parent.name.toUpperCase()}
              </h3>
            </div>

            <div className="space-y-5 font-sans">
              {sidebarPicks.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  className="flex gap-3.5 items-start cursor-pointer group pb-4 border-b border-zinc-100 last:border-none"
                >
                  <div className="relative w-[75px] h-[65px] flex-shrink-0 overflow-hidden bg-gray-100 rounded border border-zinc-200">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <h4 className="text-[13px] md:text-[13.5px] font-bold leading-snug text-black group-hover:text-[#BF1E2D] transition-colors mb-1 font-serif">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-zinc-500 font-normal font-sans">{item.date}</p>
                  </div>
                </Link>
              ))}
            </div>

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
                <div className="pt-6 border-t border-zinc-200 mt-6 w-full flex flex-col items-center">
                  <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-400 mb-2 font-bold self-start">
                    SPONSORED
                  </span>
                  {hasSlot4Image ? (
                    <a
                      href={adSlot4.targetUrl || "#"}
                      target={isExternal ? "_blank" : "_self"}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      className="block group relative overflow-hidden rounded-xs border border-zinc-200 bg-black w-full max-w-[300px] aspect-[300/250]"
                    >
                      <img
                        src={adSlot4.imageUrl}
                        alt={adSlot4.title || "Advertisement"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase text-white border border-white/10">
                        Ad
                      </div>
                    </a>
                  ) : (
                    <div className="w-full max-w-[300px] aspect-[300/250] bg-[#111827] border border-dashed border-gray-700 rounded-xs flex flex-col items-center justify-center p-4 text-center">
                      <span className="text-[10px] font-mono tracking-widest uppercase text-[#D31220] font-bold mb-1">
                        ADVERTISEMENT
                      </span>
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
                <div className="pt-8 border-t border-zinc-200 mt-8 flex flex-col items-center w-full sticky top-24">
                  <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-400 mb-2 font-bold self-start">
                    ADVERTISEMENT
                  </span>
                  {hasSlot5Image ? (
                    <a
                      href={adSlot5.targetUrl || "#"}
                      target={isExternal ? "_blank" : "_self"}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      className="block group relative overflow-hidden rounded-xs border border-zinc-200 bg-black w-full max-w-[300px] h-[550px]"
                    >
                      <img
                        src={adSlot5.imageUrl}
                        alt={adSlot5.title || "Advertisement"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase text-white border border-white/10">
                        Ad
                      </div>
                    </a>
                  ) : (
                    <div className="w-full max-w-[300px] h-[550px] bg-[#111827] border border-dashed border-gray-700 rounded-xs flex flex-col items-center justify-center p-6 text-center">
                      <span className="text-[10px] font-mono tracking-widest uppercase text-[#D31220] font-bold mb-2">
                        ADVERTISEMENT
                      </span>
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

      <Footer />
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


"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SEOAssistantPanel from "@/components/SEOAssistantPanel";
import { useAuth } from "@/lib/auth-context";
import { generateAutoSEO, extractFocusKeyword, extractCardSummary } from "@/lib/seo";
import { getUserProfile, resolveUserAvatar, getAuthorAvatarByNameOrEmail } from "@/lib/userProfiles";
import { saveArticleToServer, fetchArticlesFromServer } from "@/lib/articlesSync";
import { dispatchPageDataReady } from "@/components/GlobalPageLoader";
import { convertToWebP, convertHtmlImagesToWebP, uploadImageToBackblaze } from "@/lib/imageUtils";
import {
  ArrowLeft,
  Eye,
  Save,
  Send,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Link2,
  List,
  ListOrdered,
  Quote,
  Code,
  Image as ImageIcon,
  Settings,
  X,
  Check,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Trash2,
  Search,
  Bookmark,
  Share2,
  MessageSquare,
  Loader2,
  Edit3,
  Type,
  Plus,
  Minus,
  GripVertical,
  AlertCircle,
  Mail
} from "lucide-react";

function processContentLinks(html: string): string {
  if (!html) return "";
  return html.replace(/<a\b([^>]*)>/gi, (match, attrs) => {
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

// Master Categories and Subcategories matching Navbar
const ALL_MAIN_CATEGORIES = [
  "World",
  "Politics",
  "Business",
  "Technology",
  "Economy",
  "Markets",
  "Lifestyle",
  "Sports",
  "Entertainment",
  "Health",
  "Research",
  "Interview"
];

const ALL_SUB_CATEGORIES = [
  "Politics",
  "Business",
  "Technology",
  "Economy",
  "Markets",
  "Lifestyle",
  "Sports",
  "Entertainment",
  "Health",
  "Research",
  "Interview"
];

const WORLD_SUBCATEGORIES = [
  "China",
  "United States",
  "Europe",
  "Britain",
  "Middle East",
  "Africa",
  "Asia"
];

function isSameOrMatchingCategory(catA: string, catB: string): boolean {
  if (!catA || !catB) return false;
  const a = catA.toLowerCase().replace(/[^a-z0-9]/g, "");
  const b = catB.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (a === b) return true;
  if ((a === "economyandmarkets" || a === "economymarkets") && (b === "economy" || b === "markets")) return true;
  if ((b === "economyandmarkets" || b === "economymarkets") && (a === "economy" || a === "markets")) return true;
  return false;
}

function extractCleanTagsList(source: any): string[] {
  if (!source) return [];
  const candidates = [
    source.tags,
    source.hashtags,
    source.hash_tags,
    source.hashTags
  ];
  if (Array.isArray(source)) candidates.unshift(source);

  for (const raw of candidates) {
    if (!raw) continue;
    if (Array.isArray(raw) && raw.length > 0) {
      const list = raw
        .flatMap((t: any) => typeof t === "string" ? t.split(/[\s,]+/) : [])
        .map((t: string) => t.replace(/^#+/, "").trim())
        .filter(Boolean);
      if (list.length > 0) return Array.from(new Set(list));
    }
    if (typeof raw === "string" && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list = parsed
            .flatMap((t: any) => typeof t === "string" ? t.split(/[\s,]+/) : [])
            .map((t: string) => t.replace(/^#+/, "").trim())
            .filter(Boolean);
          if (list.length > 0) return Array.from(new Set(list));
        }
      } catch (e) {}
      const list = raw
        .split(/[\s,]+/)
        .map((s: string) => s.replace(/^#+/, "").trim())
        .filter(Boolean);
      if (list.length > 0) return Array.from(new Set(list));
    }
  }
  return [];
}

function safeSetLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 20) {
        localStorage.setItem(key, JSON.stringify(parsed.slice(0, 20)));
      }
    } catch (_) {}
  }
}

export default function CreatePostPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  // Current User State
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role?: string; avatar?: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [subheading, setSubheading] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Image Modal Form State
  const [modalImageUrl, setModalImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [imageCredit, setImageCredit] = useState("");
  const [imageKeywords, setImageKeywords] = useState<string[]>([]);
  const [imageKeywordInput, setImageKeywordInput] = useState("");
  const [imageSize, setImageSize] = useState("Medium (Width: 450px)");
  const [imageAlignment, setImageAlignment] = useState("Center (No Wrap)");
  const [imageFileName, setImageFileName] = useState("No file chosen");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Selected Image Element in Editor for Interactive Resizing & Adjustment
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [selectedImgWidth, setSelectedImgWidth] = useState<number>(450);
  const [selectedImgAlign, setSelectedImgAlign] = useState<"left" | "center" | "right">("center");
  const [imgBoundingRect, setImgBoundingRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Article Settings State
  const [sidebarTab, setSidebarTab] = useState<"DETAILS" | "SEO">("DETAILS");
  const [category, setCategory] = useState("Business");
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [placement, setPlacement] = useState("Standard Post");
  const [adSlot, setAdSlot] = useState("none");

  const normalizePlacement = (pl: string | undefined | null): string => {
    if (!pl) return "Standard Post";
    const clean = pl.toLowerCase().trim();
    if (clean.includes("a+ section 3") || clean.includes("a+ 3") || clean.includes("section 3") || clean.includes("main news 3")) {
      return "Home Page A+ Section 3";
    }
    if (clean.includes("a+ section 2") || clean.includes("a+ 2") || clean.includes("section 2") || clean.includes("main news 2")) {
      return "Home Page A+ Section 2";
    }
    if (clean.includes("a+") || clean.includes("hero")) {
      return "Home Page A+ Section";
    }
    if (clean.includes("trending")) {
      return "Trending Now";
    }
    if (clean.includes("editor") || clean.includes("pick")) {
      return "Editor's Picks";
    }
    if (clean.includes("latest")) {
      return "Latest News";
    }
    return "Standard Post";
  };
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [readDuration, setReadDuration] = useState("5 min read");

  // SEO State & Live Reactive Sync
  const [cardSummary, setCardSummary] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [keywords, setKeywords] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");

  const [isMetaDescCustom, setIsMetaDescCustom] = useState(false);
  const [isCardSummaryCustom, setIsCardSummaryCustom] = useState(false);
  const [isFocusKwCustom, setIsFocusKwCustom] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  // Targeted Email Distribution State (Admin Only)
  const [isMailBoxModalOpen, setIsMailBoxModalOpen] = useState(false);
  const [targetedRecipients, setTargetedRecipients] = useState<string[]>([]);
  const [recipientEmailInput, setRecipientEmailInput] = useState("");
  const [recipientEmailError, setRecipientEmailError] = useState("");
  const [broadcastToSubscribers, setBroadcastToSubscribers] = useState(false);
  const [distributionSentArticleIds, setDistributionSentArticleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setIsCatDropdownOpen(false);
        setHoveredCat(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const editorRef = useRef<HTMLDivElement>(null);
  const isContentInitialSynced = useRef(false);

  // Synchronize loaded article body content into ContentEditable DOM element
  useEffect(() => {
    if (editorRef.current && content && (!isContentInitialSynced.current || editorRef.current.innerHTML === "")) {
      editorRef.current.innerHTML = content;
      isContentInitialSynced.current = true;
    }
  }, [content]);

  const auth = useAuth();
  const [originalAuthor, setOriginalAuthor] = useState<{ name?: string; email?: string; avatar?: string; bio?: string } | null>(null);
  const [originalTitle, setOriginalTitle] = useState<string>("");

  const userRole = (auth.user?.role || currentUser?.role || "").toLowerCase();
  const isAdmin = mounted && (userRole === "admin" || userRole === "co-admin" || userRole === "editor" || (auth.user?.email || currentUser?.email || "").toLowerCase().includes("admin"));

  useEffect(() => {
    if (auth.loading) return;

    if (!auth.authenticated || !auth.user) {
      router.push("/login");
      return;
    }

    const uRole = (auth.user.role || "").toLowerCase();
    if (uRole !== "writer" && uRole !== "admin" && uRole !== "co-admin" && uRole !== "editor") {
      router.push("/reader");
      return;
    }

    const effectiveUser = {
      id: auth.user.id,
      name: auth.user.name,
      email: auth.user.email,
      role: auth.user.role,
      avatar: auth.user.avatar || "/author_bluesuit.jpg"
    };

    setCurrentUser(effectiveUser);

    const initPostData = async () => {
      try {
        // Check if editing existing post
        let postToEdit: any = null;

        // 1. Try reading from dj_editing_post
        const storedEditingPost = localStorage.getItem("dj_editing_post");
        if (storedEditingPost && storedEditingPost.trim()) {
          try {
            postToEdit = JSON.parse(storedEditingPost);
          } catch (e) {}
        }

        // 2. Try URL search parameter ?edit=ID
        const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const editId = searchParams?.get("edit") || (postToEdit?.id ? String(postToEdit.id) : null);
        const modeParam = searchParams?.get("mode");

        if (!editId && !postToEdit) {
          // Creating a brand new post - clear any residual edit state
          setEditingPostId(null);
          try {
            localStorage.removeItem("dj_editing_post");
          } catch (e) {}
          return;
        }

        if (modeParam === "review" || (uRole === "admin" && (postToEdit?.status === "Pending review" || postToEdit?.status === "Submitted"))) {
          setIsReviewMode(true);
        } else {
          setIsReviewMode(false);
        }

        if (editId) {
          let foundArticle: any = null;
          try {
            const serverArticles = await fetchArticlesFromServer();
            const found = serverArticles.find((p: any) => String(p.id) === String(editId) || (p.title && postToEdit?.title && p.title.trim().toLowerCase() === postToEdit.title.trim().toLowerCase()));
            if (found) foundArticle = found;
          } catch (e) {}

          if (!foundArticle) {
            try {
              const submittedStr = localStorage.getItem("dj_writer_submitted_articles");
              if (submittedStr && submittedStr.trim()) {
                const list: any[] = JSON.parse(submittedStr);
                const found = list.find((p: any) => String(p.id) === String(editId) || (p.title && postToEdit?.title && p.title.trim().toLowerCase() === postToEdit.title.trim().toLowerCase()));
                if (found) foundArticle = found;
              }
            } catch (e) {}
          }

          if (foundArticle) {
            const isMatchingStoredPost = postToEdit && (String(postToEdit.id) === String(foundArticle.id) || (postToEdit.title && foundArticle.title && postToEdit.title.trim().toLowerCase() === foundArticle.title.trim().toLowerCase()));
            const safeStoredPost = isMatchingStoredPost ? postToEdit : {};
            const rawFoundPlacement = foundArticle.placement || (foundArticle.is_featured ? "Home Page A+ Section" : foundArticle.is_editors_pick ? "Editor's Picks" : null);
            const rawStoredPlacement = safeStoredPost?.placement || (safeStoredPost?.is_featured ? "Home Page A+ Section" : safeStoredPost?.is_editors_pick ? "Editor's Picks" : null);
            const finalPlacement = rawStoredPlacement && rawStoredPlacement !== "Standard Post" && rawStoredPlacement !== "None"
              ? rawStoredPlacement
              : (rawFoundPlacement || rawStoredPlacement || "Standard Post");

            postToEdit = {
              ...foundArticle,
              ...safeStoredPost,
              placement: finalPlacement,
              is_featured: foundArticle.is_featured ?? safeStoredPost?.is_featured,
              is_editors_pick: foundArticle.is_editors_pick ?? safeStoredPost?.is_editors_pick,
              subcategories: (foundArticle.subcategories && foundArticle.subcategories.length > 0)
                ? foundArticle.subcategories
                : (foundArticle.subCategories || safeStoredPost?.subcategories || safeStoredPost?.subCategories || []),
              tags: extractCleanTagsList(
                (foundArticle.tags && (Array.isArray(foundArticle.tags) ? foundArticle.tags.length > 0 : String(foundArticle.tags).trim().length > 0))
                  ? foundArticle
                  : (safeStoredPost?.tags && (Array.isArray(safeStoredPost.tags) ? safeStoredPost.tags.length > 0 : String(safeStoredPost.tags).trim().length > 0))
                  ? safeStoredPost
                  : (foundArticle || safeStoredPost)
              ),
              category: safeStoredPost?.category || foundArticle.category || foundArticle.category_name,
              authorName: foundArticle.authorName || foundArticle.author_name || foundArticle.author || safeStoredPost?.authorName || safeStoredPost?.author_name || safeStoredPost?.author,
              authorEmail: foundArticle.authorEmail || foundArticle.author_email || safeStoredPost?.authorEmail || safeStoredPost?.author_email,
              authorAvatar: foundArticle.authorAvatar || foundArticle.author_avatar || safeStoredPost?.authorAvatar || safeStoredPost?.author_avatar,
              authorBio: foundArticle.authorBio || foundArticle.author_bio || safeStoredPost?.authorBio || safeStoredPost?.author_bio
            };
          }
        }

        if (postToEdit && postToEdit.id) {
          const authorN = postToEdit.authorName || postToEdit.author_name || postToEdit.author;
          const authorE = postToEdit.authorEmail || postToEdit.author_email;
          const authorA = postToEdit.authorAvatar || postToEdit.author_avatar;
          const authorB = postToEdit.authorBio || postToEdit.author_bio;
          if (authorN || authorE || authorA) {
            setOriginalAuthor({
              name: authorN,
              email: authorE,
              avatar: authorA,
              bio: authorB
            });
          }
          setEditingPostId(String(postToEdit.id));
          setOriginalTitle(postToEdit.title || "");
          setTitle(postToEdit.title || "");
          setSubheading(postToEdit.summary || postToEdit.subheading || "");

          let mainContent = postToEdit.content || "";
          // Strip any fake unsplash placeholder images
          mainContent = mainContent
            .replace(/<figure[^>]*>.*?photo-(?:1451187580459|1541872703)[^>]*.*?<\/figure>/gi, "")
            .replace(/<img[^>]*photo-(?:1451187580459|1541872703)[^>]*>/gi, "")
            .trim();

          setContent(mainContent);
          if (editorRef.current) {
            editorRef.current.innerHTML = mainContent;
          }

          if (postToEdit.category || postToEdit.category_name) {
            const rawCat = (postToEdit.category || postToEdit.category_name).toString().trim();
            const matched = ALL_MAIN_CATEGORIES.find(c => isSameOrMatchingCategory(c, rawCat) || c.toLowerCase() === rawCat.toLowerCase()) ||
                            WORLD_SUBCATEGORIES.find(c => isSameOrMatchingCategory(c, rawCat) || c.toLowerCase() === rawCat.toLowerCase());
            setCategory(matched || rawCat);
          }

          let loadedSubs: string[] = [];
          const rawSubs = postToEdit.subcategories || postToEdit.subCategories || postToEdit.subcategory;
          if (Array.isArray(rawSubs)) {
            loadedSubs = rawSubs.map((s: any) => String(s || "").trim()).filter(Boolean);
          } else if (typeof rawSubs === "string" && rawSubs.trim()) {
            try {
              const parsed = JSON.parse(rawSubs);
              if (Array.isArray(parsed)) loadedSubs = parsed.map((s: any) => String(s || "").trim()).filter(Boolean);
              else loadedSubs = rawSubs.split(",").map((s: string) => s.trim()).filter(Boolean);
            } catch (e) {
              loadedSubs = rawSubs.split(",").map((s: string) => s.trim()).filter(Boolean);
            }
          } else if (typeof postToEdit.subcategory_name === "string" && postToEdit.subcategory_name) {
            loadedSubs = [postToEdit.subcategory_name.trim()];
          }
          setSelectedSubcategories(loadedSubs);

          const rawImg = postToEdit.imageUrl || postToEdit.image || postToEdit.image_url || "";
          const isFakeImg = typeof rawImg === "string" && (rawImg.includes("photo-1451187580459") || rawImg.includes("photo-1541872703"));
          setImageUrl(isFakeImg ? "" : rawImg);

          const loadedTags = extractCleanTagsList(postToEdit);
          setTags(loadedTags);

          if (postToEdit.readDuration || postToEdit.readTime) {
            setReadDuration(postToEdit.readDuration || postToEdit.readTime);
          }

          if (postToEdit.placement) {
            setPlacement(normalizePlacement(postToEdit.placement));
          } else if (postToEdit.is_editors_pick) {
            setPlacement("Editor's Picks");
          } else if (postToEdit.is_featured) {
            setPlacement("Home Page A+ Section");
          }

          if (postToEdit.adSlot || postToEdit.adPlacement) {
            setAdSlot(postToEdit.adSlot || postToEdit.adPlacement);
          }

          if (postToEdit.seo) {
            setCardSummary(postToEdit.seo.cardSummary || postToEdit.summary || "");
            setFocusKeyword(postToEdit.seo.focusKeyword || "");
            setMetaDescription(postToEdit.seo.metaDescription || "");
            setMetaTitle(postToEdit.seo.metaTitle || "");
            setCanonicalUrl(postToEdit.seo.canonicalUrl || "");
            if (Array.isArray(postToEdit.seo.keywords)) {
              setKeywords(postToEdit.seo.keywords.join(", "));
            }
          }

          const existingRecipients = Array.isArray(postToEdit.targetedRecipients)
            ? postToEdit.targetedRecipients
            : (Array.isArray(postToEdit.targeted_recipients)
              ? postToEdit.targeted_recipients
              : (Array.isArray(postToEdit.seo?.targetedRecipients) ? postToEdit.seo.targetedRecipients : []));
          setTargetedRecipients(existingRecipients);
          if (postToEdit.broadcastToSubscribers !== undefined) {
            setBroadcastToSubscribers(Boolean(postToEdit.broadcastToSubscribers));
          }
        }
      } catch (e) {
        console.warn("Failed to load user state or post to edit:", e);
      }
    };

    initPostData().finally(() => {
      // Signal GlobalPageLoader to hide the skeleton once auth + post data are initialized.
      dispatchPageDataReady();
    });
  }, [auth.loading, auth.authenticated, auth.user, router]);

  const selectedImgRef = useRef<HTMLImageElement | null>(null);
  const savedSelectionRangeRef = useRef<Range | null>(null);

  const saveCurrentSelection = () => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedSelectionRangeRef.current = range.cloneRange();
      }
    }
  };

  const updateImgBoundingRect = (imgOverride?: HTMLImageElement | null) => {
    const activeImg = imgOverride !== undefined ? imgOverride : (selectedImgRef.current || selectedImg);
    if (activeImg && editorRef.current) {
      const imgRect = activeImg.getBoundingClientRect();
      const parentRect = editorRef.current.parentElement?.getBoundingClientRect() || editorRef.current.getBoundingClientRect();
      setImgBoundingRect({
        top: imgRect.top - parentRect.top,
        left: imgRect.left - parentRect.left,
        width: imgRect.width,
        height: imgRect.height,
      });
    } else {
      setImgBoundingRect(null);
    }
  };

  const selectImageElement = (img: HTMLImageElement) => {
    img.ondragstart = (dragEv) => dragEv.preventDefault();
    const parentFig = (img.closest("figure") as HTMLElement) || img;
    parentFig.setAttribute("contenteditable", "false");
    parentFig.ondragstart = (dragEv) => dragEv.preventDefault();

    selectedImgRef.current = img;
    setSelectedImg(img);
    const currentWidth = img.offsetWidth || parseInt(img.style.width) || 450;
    setSelectedImgWidth(currentWidth);

    if (parentFig.style.float === "left" || img.style.float === "left") {
      setSelectedImgAlign("left");
    } else if (parentFig.style.float === "right" || img.style.float === "right") {
      setSelectedImgAlign("right");
    } else {
      setSelectedImgAlign("center");
    }
    updateImgBoundingRect(img);
  };

  const deselectImageElement = () => {
    selectedImgRef.current = null;
    setSelectedImg(null);
    setImgBoundingRect(null);
  };

  const handleEditorInteraction = (e: MouseEvent | React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target) return;

    // Don't deselect if clicking inside the image resize control bar or handles
    const resizeBar = document.getElementById("img-resize-toolbar");
    const isHandle = target.getAttribute("data-resize-handle") === "true";
    if ((resizeBar && resizeBar.contains(target)) || isHandle) return;

    const img = target.tagName === "IMG"
      ? (target as HTMLImageElement)
      : (target.closest("figure")?.querySelector("img") as HTMLImageElement | null);

    if (img) {
      selectImageElement(img);
    } else {
      // If clicking inside the editor content area away from images, deselect
      if (editorRef.current && (target === editorRef.current || editorRef.current.contains(target))) {
        deselectImageElement();
      }
    }
  };

  // Event listeners to track image selection in editor canvas
  useEffect(() => {
    selectedImgRef.current = selectedImg;
    updateImgBoundingRect(selectedImg);
  }, [selectedImg, selectedImgWidth, selectedImgAlign]);

  useEffect(() => {
    const onScrollOrResize = () => {
      if (selectedImgRef.current) {
        updateImgBoundingRect(selectedImgRef.current);
      }
    };

    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, []);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;

    const handleClick = (e: MouseEvent) => handleEditorInteraction(e);
    const handleMousedown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "IMG" || target.closest("figure"))) {
        handleEditorInteraction(e);
      }
    };
    const handleDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const img = target.tagName === "IMG"
        ? (target as HTMLImageElement)
        : (target.closest("figure")?.querySelector("img") as HTMLImageElement | null);
      if (img) {
        selectImageElement(img);
        handleEditSelectedImage(img);
      }
    };

    ed.addEventListener("click", handleClick);
    ed.addEventListener("mousedown", handleMousedown);
    ed.addEventListener("dblclick", handleDblClick);

    return () => {
      ed.removeEventListener("click", handleClick);
      ed.removeEventListener("mousedown", handleMousedown);
      ed.removeEventListener("dblclick", handleDblClick);
    };
  }, []);

  // Dedicated Pointer Drag Logic for Repositioning Images Anywhere Without Duplication
  const handleStartMoveDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImg || !editorRef.current) return;

    const figureToMove = (selectedImg.closest("figure") as HTMLElement) || selectedImg;
    figureToMove.style.opacity = "0.4";
    figureToMove.style.outline = "2px dashed #2563EB";
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    let targetBlock: HTMLElement | null = null;
    let isInsertAfter = false;

    const clearIndicators = () => {
      if (!editorRef.current) return;
      const allElements = editorRef.current.querySelectorAll(".drop-indicator-active");
      allElements.forEach((el) => {
        (el as HTMLElement).classList.remove("drop-indicator-active");
        (el as HTMLElement).style.borderTop = "";
        (el as HTMLElement).style.borderBottom = "";
      });
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!editorRef.current) return;
      clearIndicators();

      const blocks = Array.from(editorRef.current.children).filter(
        (child) => child !== figureToMove && (child as HTMLElement).id !== "img-resize-toolbar" && (child as HTMLElement).id !== "img-selection-overlay"
      ) as HTMLElement[];

      if (blocks.length === 0) return;

      const clientY = moveEvent.clientY;
      let closestBlock: HTMLElement | null = null;
      let closestDist = Infinity;
      let placeAfter = false;

      for (const block of blocks) {
        const rect = block.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dist = Math.abs(clientY - midY);

        if (dist < closestDist) {
          closestDist = dist;
          closestBlock = block;
          placeAfter = clientY > midY;
        }
      }

      if (closestBlock) {
        targetBlock = closestBlock;
        isInsertAfter = placeAfter;
        if (placeAfter) {
          closestBlock.style.borderBottom = "3px solid #2563EB";
        } else {
          closestBlock.style.borderTop = "3px solid #2563EB";
        }
        closestBlock.classList.add("drop-indicator-active");
      }
    };

    const handleMouseUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      figureToMove.style.opacity = "1";
      figureToMove.style.outline = "";
      clearIndicators();

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      if (targetBlock && targetBlock !== figureToMove && editorRef.current && editorRef.current.contains(targetBlock)) {
        figureToMove.remove();
        if (isInsertAfter) {
          targetBlock.after(figureToMove);
        } else {
          targetBlock.before(figureToMove);
        }
        if (editorRef.current) {
          setContent(editorRef.current.innerHTML);
        }
        setTimeout(updateImgBoundingRect, 50);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };



  // Smooth Drag Handle Resize Logic (Corners & Side Edges)
  const handleStartResizeDrag = (e: React.MouseEvent, handlePos: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImg) return;

    const startX = e.clientX;
    const startWidth = selectedImg.offsetWidth;
    document.body.style.cursor = handlePos.includes("left") || handlePos.includes("right") ? "ew-resize" : "nwse-resize";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      let diffX = moveEvent.clientX - startX;
      if (handlePos.includes("left")) diffX = -diffX;
      const newWidth = Math.max(120, Math.min(1100, startWidth + diffX));
      const parentFigure = (selectedImg.closest("figure") as HTMLElement) || selectedImg;
      parentFigure.style.maxWidth = `${newWidth}px`;
      parentFigure.style.width = "100%";
      selectedImg.style.width = "100%";
      selectedImg.style.display = "block";
      setSelectedImgWidth(newWidth);
      updateImgBoundingRect();
    };

    const handleMouseUp = () => {
      document.body.style.cursor = "default";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleResizeImage = (widthPx: number) => {
    if (selectedImg) {
      const parentFigure = (selectedImg.closest("figure") as HTMLElement) || selectedImg;
      parentFigure.style.maxWidth = `${widthPx}px`;
      parentFigure.style.width = "100%";
      selectedImg.style.width = "100%";
      selectedImg.style.display = "block";
      setSelectedImgWidth(widthPx);
      setTimeout(updateImgBoundingRect, 50);
      if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
      }
    }
  };

  const handleSetImageAlignment = (alignment: "left" | "center" | "right") => {
    if (selectedImg) {
      const parentFigure = (selectedImg.closest("figure") as HTMLElement) || selectedImg;
      setSelectedImgAlign(alignment);

      if (alignment === "left") {
        parentFigure.style.float = "left";
        parentFigure.style.margin = "0.5rem 1.25rem 0.5rem 0";
        parentFigure.style.display = "inline-block";
        selectedImg.style.display = "block";
        selectedImg.style.width = "100%";
      } else if (alignment === "right") {
        parentFigure.style.float = "right";
        parentFigure.style.margin = "0.5rem 0 0.5rem 1.25rem";
        parentFigure.style.display = "inline-block";
        selectedImg.style.display = "block";
        selectedImg.style.width = "100%";
      } else {
        parentFigure.style.float = "none";
        parentFigure.style.margin = "1.25rem auto";
        parentFigure.style.display = "block";
        selectedImg.style.display = "block";
        selectedImg.style.width = "100%";
      }
      setTimeout(updateImgBoundingRect, 50);
      if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
      }
    }
  };

  const handleMoveImageUp = () => {
    if (selectedImg) {
      const elem = selectedImg.closest("figure") || selectedImg;
      const prev = elem.previousElementSibling;
      if (prev) {
        prev.before(elem);
        setTimeout(updateImgBoundingRect, 50);
        if (editorRef.current) setContent(editorRef.current.innerHTML);
      }
    }
  };

  const handleMoveImageDown = () => {
    if (selectedImg) {
      const elem = selectedImg.closest("figure") || selectedImg;
      const next = elem.nextElementSibling;
      if (next) {
        next.after(elem);
        setTimeout(updateImgBoundingRect, 50);
        if (editorRef.current) setContent(editorRef.current.innerHTML);
      }
    }
  };

  const handleDeleteSelectedImage = () => {
    if (selectedImg) {
      const parentFigure = selectedImg.closest("figure") || selectedImg;
      parentFigure.remove();
      setSelectedImg(null);
      setImgBoundingRect(null);
      if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
      }
    }
  };

  const handleEditSelectedImage = (targetImg?: HTMLImageElement | null) => {
    const imgToEdit = targetImg || selectedImg || selectedImgRef.current;
    if (imgToEdit) {
      const srcVal = imgToEdit.src || "";
      setModalImageUrl(srcVal);
      setImageUrl(srcVal);
      const kw = imgToEdit.getAttribute("data-keywords") || imgToEdit.getAttribute("data-seo-keywords") || "";
      if (kw) {
        setImageKeywords(kw.split(",").map((s) => s.trim()).filter(Boolean));
      } else {
        setImageKeywords([]);
      }
      setImageKeywordInput("");
      const fig = imgToEdit.closest("figure");
      if (fig) {
        const spans = fig.querySelectorAll("figcaption span");
        if (spans.length >= 2) {
          setImageCaption(spans[0].textContent?.trim() || "");
          const cred = spans[1].textContent?.replace(/[()]/g, "").replace(/^PHOTO:\s*/i, "").trim() || "";
          setImageCredit(cred);
        } else if (spans.length === 1) {
          const capText = spans[0].textContent?.trim() || "";
          const match = capText.match(/\((?:photo:?\s*)?([^)]+)\)$/i);
          if (match) {
            setImageCredit(match[1].trim().toUpperCase());
            setImageCaption(capText.replace(match[0], "").trim());
          } else {
            setImageCaption(capText);
          }
        } else {
          setImageCaption(imgToEdit.alt || "");
        }

        if (fig.style.float === "left") setImageAlignment("Left (Wrap Text)");
        else if (fig.style.float === "right") setImageAlignment("Right (Wrap Text)");
        else setImageAlignment("Center (No Wrap)");

        if (fig.style.maxWidth === "300px" || (imgToEdit.offsetWidth && imgToEdit.offsetWidth <= 320)) {
          setImageSize("Small (Width: 300px)");
        } else if (fig.style.maxWidth === "650px" || fig.style.maxWidth === "450px" || (imgToEdit.offsetWidth && imgToEdit.offsetWidth < 700)) {
          setImageSize("Medium (Width: 450px)");
        } else {
          setImageSize("Full Width (100%)");
        }
      } else {
        setImageCaption(imgToEdit.alt || "");
      }
      setShowImageModal(true);
    }
  };

  // Active formatting state toggles for toolbar highlights
  const [activeFormats, setActiveFormats] = useState<{ [key: string]: boolean }>({});

  const handleModalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      setImageFileName(file.name);
      setIsUploadingImage(true);
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === "string") {
          const rawDataUrl = reader.result;
          setModalImageUrl(rawDataUrl);
          try {
            const b2Url = await uploadImageToBackblaze(rawDataUrl, `${baseName}-${Date.now()}.webp`, "articles");
            if (b2Url) {
              setModalImageUrl(b2Url);
              setImageFileName(file.name + " (Uploaded to Backblaze)");
              if (!imageUrl) setImageUrl(b2Url);
            }
          } catch (err) {
            console.error("Backblaze upload error:", err);
          } finally {
            setIsUploadingImage(false);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInsertImageToCanvas = () => {
    const finalUrl = (modalImageUrl || imageUrl).trim();
    if (!finalUrl) {
      alert("Please paste an image URL or choose a file.");
      return;
    }
    if (!imageUrl) {
      setImageUrl(finalUrl);
    }

    let rawCap = imageCaption.trim();
    let rawCred = imageCredit.trim();

    if (!rawCred && rawCap) {
      const match = rawCap.match(/\((?:photo:?\s*)?([^)]+)\)$/i);
      if (match) {
        rawCred = match[1].trim().toUpperCase();
        rawCap = rawCap.replace(match[0], "").trim();
      }
    }

    const leftSpan = rawCap
      ? `<span style="font-style: italic; color: #475569; font-size: 0.75rem;">${rawCap}</span>`
      : `<span></span>`;

    const rightSpan = rawCred
      ? `<span style="font-weight: 700; color: #94A3B8; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; flex-shrink: 0;">${
          rawCred.startsWith("PHOTO:") ? `(${rawCred})` : `(PHOTO: ${rawCred.toUpperCase()})`
        }</span>`
      : "";

    const captionInnerHtml = `${leftSpan}${rightSpan}`;
    const kwString = imageKeywords.join(", ");

    if (selectedImg) {
      // UPDATE EXISTING SELECTED IMAGE
      selectedImg.src = finalUrl;
      selectedImg.alt = rawCap || kwString || "Article Image";
      if (kwString) {
        selectedImg.setAttribute("data-keywords", kwString);
        selectedImg.setAttribute("data-seo-keywords", kwString);
      } else {
        selectedImg.removeAttribute("data-keywords");
        selectedImg.removeAttribute("data-seo-keywords");
      }
      selectedImg.style.cssText = "width: 100%; display: block; border-radius: 0; object-fit: cover;";

      let maxWidthVal = "450px";
      let chosenWidthPx = 450;
      if (imageSize.includes("Small") || imageSize.includes("300")) {
        maxWidthVal = "300px";
        chosenWidthPx = 300;
      } else if (imageSize.includes("Full") || imageSize.includes("100%")) {
        maxWidthVal = "100%";
        chosenWidthPx = 900;
      } else {
        maxWidthVal = "450px";
        chosenWidthPx = 450;
      }

      let chosenAlign: "left" | "center" | "right" = "center";
      let alignStyle = `float: none; margin: 1.25rem auto; max-width: ${maxWidthVal}; width: 100%; display: block; clear: both;`;
      if (imageAlignment.includes("Left")) {
        chosenAlign = "left";
        const floatMaxWidth = maxWidthVal === "100%" ? "50%" : maxWidthVal;
        alignStyle = `float: left; margin: 0.5rem 1.25rem 0.5rem 0; max-width: ${floatMaxWidth}; width: 100%; display: block;`;
      } else if (imageAlignment.includes("Right")) {
        chosenAlign = "right";
        const floatMaxWidth = maxWidthVal === "100%" ? "50%" : maxWidthVal;
        alignStyle = `float: right; margin: 0.5rem 0 0.5rem 1.25rem; max-width: ${floatMaxWidth}; width: 100%; display: block;`;
      }

      let fig = selectedImg.closest("figure");
      if (!fig) {
        fig = document.createElement("figure");
        fig.setAttribute("contenteditable", "false");
        selectedImg.parentNode?.insertBefore(fig, selectedImg);
        fig.appendChild(selectedImg);
      }

      fig.style.cssText = `${alignStyle} text-align: left; user-select: none;`;

      let figcaption = fig.querySelector("figcaption");
      if (rawCap || rawCred) {
        if (!figcaption) {
          figcaption = document.createElement("figcaption");
          fig.appendChild(figcaption);
        }
        figcaption.style.cssText = "display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; font-size: 0.75rem; color: #64748B; margin-top: 0.4rem; width: 100%; font-family: sans-serif; box-sizing: border-box;";
        figcaption.innerHTML = captionInnerHtml;
      } else if (figcaption) {
        figcaption.remove();
      }

      setSelectedImgAlign(chosenAlign);
      setSelectedImgWidth(chosenWidthPx);

      if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
        setTimeout(() => {
          if (selectedImg && editorRef.current) {
            const rect = selectedImg.getBoundingClientRect();
            const parentRect = editorRef.current.getBoundingClientRect();
            setImgBoundingRect({
              top: rect.top - parentRect.top,
              left: rect.left - parentRect.left,
              width: rect.width,
              height: rect.height,
            });
            setSelectedImgWidth(Math.round(rect.width));
          }
        }, 50);
      }

      setShowImageModal(false);
      return;
    }

    // INSERT NEW IMAGE
    let maxWidthVal = "450px";
    if (imageSize.includes("Small") || imageSize.includes("300")) maxWidthVal = "300px";
    else if (imageSize.includes("Full") || imageSize.includes("100%")) maxWidthVal = "100%";
    else maxWidthVal = "450px";

    let alignStyle = `float: none; margin: 1.25rem auto; max-width: ${maxWidthVal}; width: 100%; display: block; clear: both;`;
    if (imageAlignment.includes("Left")) {
      const floatMaxWidth = maxWidthVal === "100%" ? "50%" : maxWidthVal;
      alignStyle = `float: left; margin: 0.5rem 1.25rem 0.5rem 0; max-width: ${floatMaxWidth}; width: 100%; display: block;`;
    } else if (imageAlignment.includes("Right")) {
      const floatMaxWidth = maxWidthVal === "100%" ? "50%" : maxWidthVal;
      alignStyle = `float: right; margin: 0.5rem 0 0.5rem 1.25rem; max-width: ${floatMaxWidth}; width: 100%; display: block;`;
    }

    const captionHtml = (rawCap || rawCred)
      ? `<figcaption style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; font-size: 0.75rem; color: #64748B; margin-top: 0.35rem; width: 100%; font-family: sans-serif; box-sizing: border-box;">
          ${captionInnerHtml}
        </figcaption>`
      : "";

    const kwAttr = kwString ? ` data-keywords="${kwString}" data-seo-keywords="${kwString}"` : "";
    const imgTag = `<figure contenteditable="false" style="${alignStyle} text-align: left; user-select: none;"><img src="${finalUrl}" alt="${
      rawCap || kwString || "Article Image"
    }"${kwAttr} draggable="false" style="width: 100%; border-radius: 0; object-fit: cover; display: block; user-select: none;" />${captionHtml}</figure><p><br/></p>`;


    if (editorRef.current) {
      editorRef.current.focus();

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = imgTag;
      const frag = document.createDocumentFragment();
      let node;
      while ((node = tempDiv.firstChild)) {
        frag.appendChild(node);
      }

      const sel = window.getSelection();
      let range: Range | null = null;

      if (savedSelectionRangeRef.current) {
        try {
          if (editorRef.current.contains(savedSelectionRangeRef.current.commonAncestorContainer)) {
            range = savedSelectionRangeRef.current;
          }
        } catch (e) {}
      }

      if (!range && sel && sel.rangeCount > 0) {
        try {
          const currentRange = sel.getRangeAt(0);
          if (editorRef.current.contains(currentRange.commonAncestorContainer)) {
            range = currentRange;
          }
        } catch (e) {}
      }

      if (range) {
        range.deleteContents();
        range.insertNode(frag);
        try {
          range.collapse(false);
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } catch (e) {}
      } else {
        editorRef.current.appendChild(frag);
      }

      savedSelectionRangeRef.current = null;
      setContent(editorRef.current.innerHTML);
    }

    setShowImageModal(false);
  };

  // Apply Rich Text Formatting natively to ContentEditable Canvas
  const applyTextFormat = (command: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }

    // Toggle visual active state on toolbar button
    setActiveFormats((prev) => ({ ...prev, [command]: !prev[command] }));

    switch (command) {
      case "bold":
        document.execCommand("bold", false, undefined);
        break;
      case "italic":
        document.execCommand("italic", false, undefined);
        break;
      case "underline":
        document.execCommand("underline", false, undefined);
        break;
      case "link":
        const url = prompt("Enter Link URL:", "https://");
        if (url && url.trim() && url !== "https://") {
          const cleanUrl = url.trim().startsWith("http://") || url.trim().startsWith("https://") || url.trim().startsWith("mailto:") ? url.trim() : `https://${url.trim()}`;
          const sel = window.getSelection();
          if (sel && !sel.isCollapsed && sel.toString().trim()) {
            document.execCommand("createLink", false, cleanUrl);
          } else {
            const linkText = prompt("Enter Link Text:", cleanUrl) || cleanUrl;
            document.execCommand("insertHTML", false, `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-[#BF1E2D] underline font-semibold hover:text-[#901320] transition-colors cursor-pointer">${linkText}</a>`);
          }
          if (editorRef.current) {
            const anchors = editorRef.current.querySelectorAll("a");
            anchors.forEach((a) => {
              a.setAttribute("target", "_blank");
              a.setAttribute("rel", "noopener noreferrer");
              a.className = "text-[#BF1E2D] underline font-semibold hover:text-[#901320] transition-colors cursor-pointer";
            });
            setContent(editorRef.current.innerHTML);
          }
        }
        break;
      case "bullet":
        document.execCommand("insertUnorderedList", false, undefined);
        break;
      case "number":
        document.execCommand("insertOrderedList", false, undefined);
        break;
      case "quote":
        const currentBlock = document.queryCommandValue("formatBlock");
        if (currentBlock === "blockquote") {
          document.execCommand("formatBlock", false, "p");
        } else {
          document.execCommand("formatBlock", false, "blockquote");
        }
        break;
      case "code":
        const isPre = document.queryCommandValue("formatBlock") === "pre";
        if (isPre) {
          document.execCommand("formatBlock", false, "p");
        } else {
          document.execCommand("formatBlock", false, "pre");
        }
        break;
      case "undo":
        document.execCommand("undo", false, undefined);
        break;
      case "redo":
        document.execCommand("redo", false, undefined);
        break;
      default:
        break;
    }

    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  // Paragraph First Letter Size Adjustment (A+ / A-) with strict Min/Max Limits
  const [firstLetterSize, setFirstLetterSize] = useState<number>(32); // default 32px
  const MIN_FIRST_LETTER_SIZE = 16; // 16px min limit (normal text size)
  const MAX_FIRST_LETTER_SIZE = 72; // 72px max limit (large journal initial)

  const handleAdjustFirstLetterSize = (delta: number) => {
    const newSize = Math.min(MAX_FIRST_LETTER_SIZE, Math.max(MIN_FIRST_LETTER_SIZE, firstLetterSize + delta));
    setFirstLetterSize(newSize);

    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    // If text is highlighted / selected, apply font-size to the selected text range
    if (sel && !sel.isCollapsed && sel.rangeCount > 0 && sel.toString().trim()) {
      const span = document.createElement("span");
      span.style.fontSize = `${newSize}px`;
      const range = sel.getRangeAt(0);
      try {
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.addRange(newRange);
        setContent(editorRef.current.innerHTML);
        return;
      } catch (e) {}
    }

    // Find container paragraph or block under selection cursor, fallback to first paragraph
    let targetP: HTMLElement | null = null;

    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.getRangeAt(0).startContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE && (node.nodeName === "P" || node.nodeName === "DIV")) {
          targetP = node as HTMLElement;
          break;
        }
        node = node.parentNode;
      }
    }

    if (!targetP) {
      targetP = (editorRef.current.querySelector("p") || editorRef.current.querySelector("div")) as HTMLElement;
    }

    if (!targetP) {
      const rawText = editorRef.current.innerText || editorRef.current.textContent || "";
      if (rawText.trim()) {
        const newP = document.createElement("p");
        newP.innerHTML = editorRef.current.innerHTML;
        editorRef.current.innerHTML = "";
        editorRef.current.appendChild(newP);
        targetP = newP;
      }
    }

    if (!targetP) return;

    // Remove any existing first-letter-cap span to obtain raw text
    const existingSpan = targetP.querySelector("span.first-letter-cap");
    if (existingSpan) {
      const char = existingSpan.textContent || "";
      existingSpan.remove();
      if (!targetP.textContent?.startsWith(char)) {
        targetP.prepend(document.createTextNode(char));
      }
    }

    const fullText = (targetP.textContent || "").trim();
    if (!fullText) return;

    const firstChar = fullText.charAt(0);
    const restText = fullText.slice(1);

    if (newSize === MIN_FIRST_LETTER_SIZE) {
      targetP.innerHTML = fullText;
    } else {
      const styleCss = `float: left; font-size: ${newSize}px; line-height: 0.85; margin-right: 0.5rem; margin-top: 0.1rem; font-weight: 800; font-family: Georgia, Cambria, 'Times New Roman', Times, serif; color: #0F172A; display: inline-block; user-select: none;`;
      targetP.innerHTML = `<span class="first-letter-cap" style="${styleCss}">${firstChar}</span>${restText}`;
    }

    setContent(editorRef.current.innerHTML);
  };

  // Live real-time SEO auto-generation as user types in title, subheading, or body content (3rd row)
  useEffect(() => {
    const cleanContent = content
      .replace(/<[^>]*>?/gm, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    const auto = generateAutoSEO({
      title: title.trim(),
      subheading: subheading.trim(),
      content: cleanContent,
      category: category.toLowerCase(),
      authorName: currentUser?.name || "Rushdhi Riyaj",
      imageUrl: imageUrl.trim()
    });

    if (!isFocusKwCustom) {
      if (title.trim()) {
        setFocusKeyword(extractFocusKeyword(title.trim(), category));
      } else {
        setFocusKeyword(category.toLowerCase());
      }
    }

    if (!isMetaDescCustom) {
      setMetaDescription(auto.metaDescription);
    }
    if (!isCardSummaryCustom) {
      setCardSummary(extractCardSummary(cleanContent));
    }
    setMetaTitle(auto.metaTitle);
    setKeywords(auto.keywords.join(", "));
  }, [title, subheading, content, category, imageUrl, currentUser, isFocusKwCustom, isMetaDescCustom, isCardSummaryCustom]);

  const handleAutoGenerateSEO = () => {
    setIsMetaDescCustom(false);
    setIsCardSummaryCustom(false);
    setIsFocusKwCustom(false);

    const cleanContent = content
      .replace(/<[^>]*>?/gm, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    const auto = generateAutoSEO({
      title: title.trim(),
      subheading: subheading.trim(),
      content: cleanContent,
      category: category.toLowerCase(),
      authorName: currentUser?.name || "Rushdhi Riyaj",
      imageUrl: imageUrl.trim()
    });

    setFocusKeyword(auto.focusKeyword);
    setMetaDescription(auto.metaDescription);
    setCardSummary(extractCardSummary(cleanContent));
    setMetaTitle(auto.metaTitle);
    setKeywords(auto.keywords.join(", "));
  };

  // Modals
  const [showImageModal, setShowImageModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);


function isWorldOrWorldSub(cat: string): boolean {
  if (!cat) return false;
  const clean = cat.toLowerCase().trim();
  if (clean === "world") return true;
  return WORLD_SUBCATEGORIES.some((w) => w.toLowerCase().trim() === clean);
}

  // Filtered subcategory options: excludes the currently selected main category and excludes World if a World subcategory is selected
  const displayedSubcategories = ALL_SUB_CATEGORIES.filter((sub) => {
    if (isSameOrMatchingCategory(sub, category)) return false;
    if (isWorldOrWorldSub(category) && sub.toLowerCase() === "world") return false;
    return true;
  });

  // Filtered world subcategory options: excludes the currently selected country / region if chosen as main category
  const displayedWorldSubcategories = WORLD_SUBCATEGORIES.filter((sub) => {
    if (isSameOrMatchingCategory(sub, category)) return false;
    return true;
  });

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    setIsCatDropdownOpen(false);
    setHoveredCat(null);
    // If the newly selected main category was selected in subcategories (or World when a World sub is selected), deselect it automatically
    setSelectedSubcategories((prev) =>
      prev.filter((sub) => {
        if (isSameOrMatchingCategory(sub, newCat)) return false;
        if (isWorldOrWorldSub(newCat) && sub.toLowerCase() === "world") return false;
        return true;
      })
    );
  };

  const handleSubcategoryToggle = (sub: string) => {
    const isChecked = selectedSubcategories.some((item) => isSameOrMatchingCategory(item, sub));
    if (isChecked) {
      setSelectedSubcategories(selectedSubcategories.filter((item) => !isSameOrMatchingCategory(item, sub)));
    } else {
      if (selectedSubcategories.length < 5) {
        setSelectedSubcategories([...selectedSubcategories, sub]);
      }
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      let newTag = tagInput.trim().replace(/^#+/, "").replace(/,/g, "").trim();
      if (newTag) {
        const uppercaseTag = newTag.toUpperCase();
        if (!tags.includes(uppercaseTag)) {
          setTags([...tags, uppercaseTag]);
        }
      }
      setTagInput("");
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, tags.length - 1));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const [submittingAction, setSubmittingAction] = useState<"draft" | "publish" | "reject" | null>(null);

  const handleSaveDraft = () => {
    let currentContent = content;
    if (editorRef.current) {
      currentContent = editorRef.current.innerHTML || editorRef.current.innerText || "";
      setContent(currentContent);
    }
    if (!title.trim()) {
      alert("Please enter an article title before saving draft.");
      return;
    }
    setSubmittingAction("draft");
    savePost("Draft", currentContent);
  };

  const handleSubmitReview = () => {
    let currentContent = content;
    if (editorRef.current) {
      currentContent = editorRef.current.innerHTML || editorRef.current.innerText || "";
      setContent(currentContent);
    }
    const finalTitle = title.trim();
    if (!finalTitle) {
      alert("Please enter an article title before submitting for review.");
      return;
    }

    let bodyImgSrc = "";
    if (editorRef.current) {
      const firstImg = editorRef.current.querySelector("img");
      if (firstImg && firstImg.src) {
        bodyImgSrc = firstImg.src.trim();
      }
    }
    if (!bodyImgSrc && currentContent) {
      const match = currentContent.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        bodyImgSrc = match[1].trim();
      }
    }
    const hasImage = Boolean(bodyImgSrc || imageUrl.trim());
    if (!hasImage) {
      alert("Please insert an article image before submitting for review.");
      return;
    }

    setSubmittingAction("publish");
    savePost("Pending review", currentContent);
  };

  const handleSaveArticle = (status: "Published" | "Draft" | "Pending review") => {
    let currentContent = content;
    if (editorRef.current) {
      currentContent = editorRef.current.innerHTML || editorRef.current.innerText || "";
      setContent(currentContent);
    }
    const finalTitle = title.trim() || "Untitled Article";
    if (!title.trim()) {
      setTitle(finalTitle);
    }

    if (status === "Pending review" || status === "Published") {
      let bodyImgSrc = "";
      if (editorRef.current) {
        const firstImg = editorRef.current.querySelector("img");
        if (firstImg && firstImg.src) {
          bodyImgSrc = firstImg.src.trim();
        }
      }
      if (!bodyImgSrc && currentContent) {
        const match = currentContent.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (match && match[1]) {
          bodyImgSrc = match[1].trim();
        }
      }
      const hasImage = Boolean(bodyImgSrc || imageUrl.trim());
      if (!hasImage) {
        alert("Please insert an article image before submitting.");
        return;
      }
    }

    setSubmittingAction(status === "Draft" ? "draft" : "publish");
    savePost(status, currentContent);
  };

  const savePost = async (status: "Published" | "Draft" | "Pending review", overrideContent?: string) => {
    setIsSubmitting(true);
    let bodyContent = overrideContent !== undefined ? overrideContent : content;

    // Convert any images in article content to .webp format
    try {
      bodyContent = await convertHtmlImagesToWebP(bodyContent, 0.85);
    } catch (e) {
      console.warn("WebP body conversion notice:", e);
    }

    let bodyImgSrc = "";
    if (editorRef.current) {
      const firstImg = editorRef.current.querySelector("img");
      if (firstImg && firstImg.src) {
        bodyImgSrc = firstImg.src;
      }
    }
    if (!bodyImgSrc && bodyContent) {
      const match = bodyContent.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match) {
        bodyImgSrc = match[1];
      }
    }

    let processedImageUrl = bodyImgSrc || imageUrl.trim();
    if (!processedImageUrl && (status === "Pending review" || status === "Published")) {
      setIsSubmitting(false);
      alert("Please insert an article image before submitting.");
      return;
    }

    if (processedImageUrl && processedImageUrl.startsWith("data:image/")) {
      try {
        processedImageUrl = await uploadImageToBackblaze(processedImageUrl, imageFileName || "cover.webp", "articles");
      } catch (e) {
        console.warn("Backblaze cover upload notice:", e);
      }
    }

    const activeEmail = currentUser?.email || auth.user?.email || "";
    const activeName = currentUser?.name || auth.user?.name || "";
    const activeAvatar = currentUser?.avatar || auth.user?.avatar || "";
    const activeBio = (currentUser as any)?.bio || "";

    const userRole = (currentUser?.role || auth.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin" || userRole === "co-admin";

    let finalAuthorName = "";
    let finalAuthorEmail = "";
    let finalAuthorAvatar = "";
    let finalAuthorBio = "";

    const activeUserEmail = auth.user?.email || currentUser?.email || activeEmail || "rushdhiriyaj2005@gmail.com";
    const activeUserName = auth.user?.name || currentUser?.name || activeName || "Rushdhi";
    const savedProf = getUserProfile(activeUserEmail);
    if (originalAuthor?.name && originalAuthor.name.trim() !== "") {
      finalAuthorName = originalAuthor.name.trim();
      finalAuthorEmail = originalAuthor.email || activeUserEmail;
      finalAuthorAvatar = originalAuthor.avatar || resolveUserAvatar({ name: finalAuthorName, email: finalAuthorEmail, role: "Writer" });
      finalAuthorBio = originalAuthor.bio || `${finalAuthorName} is a journalist for London BigBen.`;
    } else {
      finalAuthorName = activeUserName;
      finalAuthorEmail = activeUserEmail;
      finalAuthorAvatar = resolveUserAvatar({ name: finalAuthorName, email: finalAuthorEmail, role: "Writer", avatar: savedProf?.avatar || auth.user?.avatar || currentUser?.avatar });
      finalAuthorBio = savedProf?.bio || (auth.user as any)?.bio || (currentUser as any)?.bio || activeBio || `${finalAuthorName} is a journalist for London BigBen.`;
    }

    const autoSeo = generateAutoSEO({
      title: title.trim(),
      subheading: subheading.trim(),
      content: bodyContent.trim(),
      category: category.toLowerCase(),
      authorName: finalAuthorName,
      imageUrl: processedImageUrl || "",
      metaTitle: metaTitle.trim() || undefined,
      metaDescription: metaDescription.trim() || undefined,
      focusKeyword: focusKeyword.trim() || undefined,
      keywords: keywords ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
      canonicalUrl: canonicalUrl.trim() || undefined,
      ogImage: processedImageUrl || undefined
    });

    const canonicalPlacement = normalizePlacement(placement);
    const isPostFeatured = canonicalPlacement === "Home Page A+ Section";
    const isPostEditorsPick = canonicalPlacement === "Editor's Picks";

    let tagsToSave = [...tags];
    if (tagInput && tagInput.trim()) {
      const extra = tagInput
        .split(/[\s,]+/)
        .map((t) => t.replace(/^#+/, "").trim().toUpperCase())
        .filter(Boolean);
      extra.forEach((t) => {
        if (!tagsToSave.includes(t)) tagsToSave.push(t);
      });
    }

    const postToSave = {
      id: editingPostId || `post-${Date.now()}`,
      title: title.trim(),
      slug: title.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
      category: category,
      subheading: subheading.trim() || title.trim(),
      summary: subheading.trim() || title.trim(),
      content: bodyContent.trim(),
      imageUrl: processedImageUrl || "",
      status: status,
      published_at: status === "Published" ? new Date().toISOString() : undefined,
      publishedAt: status === "Published" ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rejectionReason: status === "Pending review" || status === "Published" ? undefined : undefined,
      rejection_reason: status === "Pending review" || status === "Published" ? undefined : undefined,
      rejectedAt: status === "Pending review" || status === "Published" ? undefined : undefined,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      reads: 0,
      placement: canonicalPlacement,
      adSlot: adSlot,
      adPlacement: adSlot !== "none" ? adSlot : undefined,
      is_featured: isPostFeatured,
      is_editors_pick: isPostEditorsPick,
      tags: tagsToSave,
      subcategories: selectedSubcategories,
      readDuration: readDuration,
      authorEmail: finalAuthorEmail,
      authorName: finalAuthorName,
      authorAvatar: finalAuthorAvatar,
      authorBio: finalAuthorBio,
      seo: autoSeo,
      targetedRecipients: targetedRecipients,
      targeted_recipients: targetedRecipients,
      broadcastToSubscribers: broadcastToSubscribers,
      original_title: originalTitle || undefined,
      previousTitle: originalTitle || undefined
    };

    try {
      if (editingPostId) {
        try {
          localStorage.removeItem("dj_editing_post");
        } catch (e) {}
      }

      // Explicitly update local storage queue immediately
      try {
        const subsStr = localStorage.getItem("dj_writer_submitted_articles");
        const existingList: any[] = (subsStr && subsStr.trim()) ? JSON.parse(subsStr) : [];
        const targetId = String(postToSave.id);
        const editId = editingPostId ? String(editingPostId) : "";
        const targetTitle = postToSave.title.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const origTitle = originalTitle ? originalTitle.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ') : '';
        
        let foundInSubs = false;
        const updatedList = existingList.map((p: any) => {
          const pId = String(p.id || '');
          const pTitle = (p.title || "").trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
          if (pId === targetId || (editId && pId === editId) || (pTitle && pTitle === targetTitle) || (origTitle && pTitle && pTitle === origTitle)) {
            foundInSubs = true;
            const updated = { ...p, ...postToSave, id: p.id || postToSave.id, status };
            if (status === "Pending review" || status === "Published") {
              delete updated.rejectionReason;
              delete updated.rejection_reason;
              delete updated.rejectedAt;
            }
            return updated;
          }
          return p;
        });

        if (!foundInSubs) {
          updatedList.unshift(postToSave);
        }

        // Deduplicate by normalized title and ID
        const deduplicatedList: any[] = [];
        const seenSubsTitles = new Set<string>();
        const seenSubsIds = new Set<string>();
        updatedList.forEach((item) => {
          const tKey = (item.title || "").trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
          const idKey = String(item.id || "");
          if ((!tKey || !seenSubsTitles.has(tKey)) && (!idKey || !seenSubsIds.has(idKey))) {
            if (tKey) seenSubsTitles.add(tKey);
            if (idKey) seenSubsIds.add(idKey);
            deduplicatedList.push(item);
          }
        });

        safeSetLocalStorage("dj_writer_submitted_articles", JSON.stringify(deduplicatedList));

        // Also update live articles cache directly
        const { getCachedArticles, setCachedArticles } = await import("@/lib/articlesSync");
        const cached = getCachedArticles();
        let foundInCache = false;
        const updatedCache = cached.map((a: any) => {
          const aId = String(a.id || '');
          const aTitle = (a.title || "").trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
          if (aId === targetId || (editId && aId === editId) || (aTitle && aTitle === targetTitle) || (origTitle && aTitle && aTitle === origTitle)) {
            foundInCache = true;
            const updated = { ...a, ...postToSave, id: a.id || postToSave.id, status };
            if (status === "Pending review" || status === "Published") {
              delete updated.rejectionReason;
              delete updated.rejection_reason;
              delete updated.rejectedAt;
            }
            return updated;
          }
          return a;
        });
        if (!foundInCache) {
          updatedCache.unshift(postToSave as any);
        }
        setCachedArticles(updatedCache, true);
      } catch (e) {}

      try {
        const { saveArticleToServer, resetArticlesFetchCache } = await import("@/lib/articlesSync");
        await saveArticleToServer(postToSave);
        resetArticlesFetchCache();

        // Trigger targeted email distribution if configured — await before navigation
        if (status === "Published" && (targetedRecipients.length > 0 || broadcastToSubscribers)) {
          const artId = String(postToSave.id);
          if (!distributionSentArticleIds.has(artId)) {
            setDistributionSentArticleIds(prev => new Set(prev).add(artId));
            try {
              const distRes = await fetch("/api/admin/articles/send-distribution", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-admin-key": "dj_admin_portal_authenticated_2026",
                },
                credentials: "include",
                body: JSON.stringify({
                  article: {
                    title: postToSave.title,
                    summary: cardSummary || postToSave.summary || postToSave.subheading || "",
                    category: postToSave.category || "General",
                    authorName: postToSave.authorName || "London BigBen Network",
                    slug: postToSave.slug,
                    imageUrl: postToSave.imageUrl || "",
                    readTime: postToSave.readDuration || "5 min read",
                  },
                  recipients: targetedRecipients,
                  broadcastToSubscribers,
                  baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
                }),
              });
              const distData = await distRes.json().catch(() => ({ sent: 0, total: 0 }));
              console.log(`[Distribution] Article email sent: ${distData?.sent || 0}/${distData?.total || 0} recipients`, distData);
            } catch (distErr) {
              console.error("[Distribution] Email send error:", distErr);
            }
          }
        }
      } catch (err) {
        console.warn("Error saving post to server store:", err);
      }

      try {
        localStorage.setItem(
          "dj_toast",
          status === "Published"
            ? `✓ Article "${title.trim().slice(0, 35)}..." published live to homepage!`
            : status === "Pending review"
            ? `✓ Story "${title.trim()}" submitted for review! Admin approval is pending before publication.`
            : `✓ Draft "${title.trim()}" saved successfully.`
        );
        try {
          sessionStorage.setItem("dj_active_tab", status === "Published" ? "Published" : status === "Pending review" ? "Pending review" : "Drafts");
        } catch (e) {}
      } catch (e) {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dj_articles_updated"));
      }
      try {
        router.refresh();
      } catch (e) {}
    } catch (err) {
      console.warn("Error saving post:", err);
    }

    try {
      sessionStorage.setItem("dj_active_tab", status === "Published" ? "Published" : status === "Pending review" ? "Pending review" : "Drafts");
    } catch (e) {}

    setIsSubmitting(false);
    setSubmittingAction(null);
    if (status === "Pending review") {
      if (typeof window !== "undefined") {
        window.location.href = "/writer?tab=pending";
      } else {
        router.push("/writer?tab=pending");
      }
    } else if (status === "Published") {
      if (isAdmin) {
        if (typeof window !== "undefined") {
          window.location.href = "/";
        } else {
          router.push("/");
        }
      } else {
        if (typeof window !== "undefined") {
          window.location.href = "/writer?tab=published";
        } else {
          router.push("/writer?tab=published");
        }
      }
    } else {
      if (typeof window !== "undefined") {
        window.location.href = "/writer?tab=drafts";
      } else {
        router.push("/writer?tab=drafts");
      }
    }
  };

  const handleApprovePublish = async () => {
    setIsSubmitting(true);
    setSubmittingAction("publish");
    try {
      const liveTitle = title.trim() || "Untitled Article";
      let liveContent = editorRef.current ? editorRef.current.innerHTML : content;

      // Convert body images to WebP
      try {
        liveContent = await convertHtmlImagesToWebP(liveContent, 0.85);
      } catch (e) {
        console.warn("WebP body conversion notice during approval:", e);
      }

      let bodyImgSrc = "";
      if (editorRef.current) {
        const firstImg = editorRef.current.querySelector("img");
        if (firstImg && firstImg.src) {
          bodyImgSrc = firstImg.src;
        }
      }
      if (!bodyImgSrc && liveContent) {
        const match = liveContent.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (match) {
          bodyImgSrc = match[1];
        }
      }

      let liveImageUrl = bodyImgSrc || imageUrl || "";
      if (!liveImageUrl) {
        setIsSubmitting(false);
        alert("Please insert an article image before publishing.");
        return;
      }
      if (liveImageUrl && liveImageUrl.startsWith("data:image/")) {
        try {
          liveImageUrl = await uploadImageToBackblaze(liveImageUrl, (liveTitle || "article").substring(0, 30) + ".webp", "articles");
        } catch (e) {
          console.warn("Backblaze live image upload notice:", e);
        }
      }

      const liveSummary = subheading.trim() || extractCardSummary(liveContent);
      const liveSlug = liveTitle.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

      let finalAuthorName = originalAuthor?.name || "";
      let finalAuthorAvatar = originalAuthor?.avatar || "";
      let finalAuthorBio = originalAuthor?.bio || "";
      let finalAuthorEmail = originalAuthor?.email || "";

      // If missing or set to admin placeholder, retrieve the original writer from submitted articles
      if (!finalAuthorName || finalAuthorName.toLowerCase() === "system administrator" || finalAuthorName.toLowerCase() === "administrator" || finalAuthorName.toLowerCase() === "admin") {
        try {
          const subsStr = localStorage.getItem("dj_writer_submitted_articles");
          if (subsStr && subsStr.trim()) {
            const list = JSON.parse(subsStr);
            const found = list.find((p: any) => String(p.id) === String(editingPostId) || (p.title && liveTitle && p.title.trim().toLowerCase() === liveTitle.trim().toLowerCase()));
            if (found && found.authorName && !found.authorName.toLowerCase().includes("admin")) {
              finalAuthorName = found.authorName;
              finalAuthorAvatar = found.authorAvatar || finalAuthorAvatar;
              finalAuthorEmail = found.authorEmail || finalAuthorEmail;
              finalAuthorBio = found.authorBio || finalAuthorBio;
            }
          }
        } catch (e) {}
      }

      if (!finalAuthorName || finalAuthorName.toLowerCase() === "system administrator" || finalAuthorName.toLowerCase() === "administrator" || finalAuthorName.toLowerCase() === "admin") {
        finalAuthorName = "Rushdhi MR";
        finalAuthorEmail = "writer@digitaljournal.com";
      }

      const nowIso = new Date().toISOString();
      const approvedArticle = {
        id: editingPostId ? (isNaN(Number(editingPostId)) ? editingPostId : Number(editingPostId)) : Date.now(),
        title: liveTitle,
        slug: liveSlug,
        subheading: liveSummary,
        summary: liveSummary,
        content: liveContent,
        category: category,
        subcategories: selectedSubcategories,
        placement: normalizePlacement(placement),
        is_featured: normalizePlacement(placement) === "Home Page A+ Section",
        is_editors_pick: normalizePlacement(placement) === "Editor's Picks",
        adSlot: adSlot,
        adPlacement: adSlot !== "none" ? adSlot : undefined,
        readDuration: readDuration,
        imageUrl: liveImageUrl,
        status: "Published",
        published_at: nowIso,
        publishedAt: nowIso,
        updated_at: nowIso,
        updatedAt: nowIso,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        authorName: finalAuthorName,
        authorAvatar: finalAuthorAvatar,
        authorEmail: finalAuthorEmail,
        authorBio: finalAuthorBio
      };

      // 1. Update writer submitted articles store in localStorage
      try {
        const subsStr = localStorage.getItem("dj_writer_submitted_articles");
        if (subsStr && subsStr.trim()) {
          const parsed = JSON.parse(subsStr);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((p: any) => 
              (String(p.id) === String(editingPostId) || p.title.trim().toLowerCase() === liveTitle.toLowerCase())
                ? { ...p, ...approvedArticle, status: "Published" }
                : p
            );
            localStorage.setItem("dj_writer_submitted_articles", JSON.stringify(updated));
          }
        }
      } catch (e) {}

      // 2. Save / publish to server API
      const { saveArticleToServer, resetArticlesFetchCache } = await import("@/lib/articlesSync");
      await saveArticleToServer(approvedArticle as any);
      resetArticlesFetchCache();

      // Trigger targeted email distribution if configured — await before navigation
      if (targetedRecipients.length > 0 || broadcastToSubscribers) {
        const artId = String(approvedArticle.id);
        if (!distributionSentArticleIds.has(artId)) {
          setDistributionSentArticleIds(prev => new Set(prev).add(artId));
          try {
            const distRes = await fetch("/api/admin/articles/send-distribution", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-admin-key": "dj_admin_portal_authenticated_2026",
              },
              credentials: "include",
              body: JSON.stringify({
                article: {
                  title: approvedArticle.title,
                  summary: cardSummary || approvedArticle.summary || approvedArticle.subheading || "",
                  category: approvedArticle.category || "General",
                  authorName: approvedArticle.authorName || "London BigBen Network",
                  slug: approvedArticle.slug,
                  imageUrl: approvedArticle.imageUrl || "",
                  readTime: approvedArticle.readDuration || "5 min read",
                },
                recipients: targetedRecipients,
                broadcastToSubscribers,
                baseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
              }),
            });
            const distData = await distRes.json().catch(() => ({ sent: 0, total: 0 }));
            console.log(`[Distribution] Article email sent: ${distData?.sent || 0}/${distData?.total || 0} recipients`, distData);
          } catch (distErr) {
            console.error("[Distribution] Email send error:", distErr);
          }
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dj_articles_updated"));
      }
      try {
        router.refresh();
      } catch (e) {}

      localStorage.setItem("dj_toast", `✓ Article "${liveTitle.slice(0, 35)}..." approved and published!`);
      localStorage.removeItem("dj_editing_post");

      router.push("/admin");
    } catch (e) {
      console.warn("Approval publish error:", e);
      router.push("/admin");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectToTrash = () => {
    setRejectionReasonInput("");
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejectSubmission = async () => {
    setSubmittingAction("reject");
    setIsSubmitting(true);
    try {
      const liveTitle = title.trim() || "Untitled Article";
      const rejectionReason = rejectionReasonInput.trim() || undefined;
      const rejectedAt = new Date().toISOString();

      const cleanT = (t: string) =>
        String(t || "")
          .toLowerCase()
          .replace(/[\u2018\u2019\u201A\u201B']/g, "'")
          .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
          .replace(/[\u2013\u2014]/g, "-")
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      // Look up existing article to accurately determine the author who wrote this article
      let existingArticle: any = null;
      try {
        const subsStr = localStorage.getItem("dj_writer_submitted_articles");
        if (subsStr && subsStr.trim()) {
          const list: any[] = JSON.parse(subsStr);
          existingArticle = list.find((p: any) =>
            (editingPostId && String(p.id) === String(editingPostId)) ||
            (cleanT(p.title) && cleanT(liveTitle) && cleanT(p.title) === cleanT(liveTitle))
          );
        }
      } catch (e) {}

      if (!existingArticle) {
        try {
          const storedEdit = localStorage.getItem("dj_editing_post");
          if (storedEdit && storedEdit.trim()) {
            const parsed = JSON.parse(storedEdit);
            if (
              (editingPostId && String(parsed.id) === String(editingPostId)) ||
              (cleanT(parsed.title) && cleanT(liveTitle) && cleanT(parsed.title) === cleanT(liveTitle))
            ) {
              existingArticle = parsed;
            }
          }
        } catch (e) {}
      }

      if (!existingArticle) {
        try {
          const { fetchArticlesFromServer } = await import("@/lib/articlesSync");
          const serverArts = await fetchArticlesFromServer();
          existingArticle = serverArts.find((p: any) =>
            (editingPostId && String(p.id) === String(editingPostId)) ||
            (cleanT(p.title) && cleanT(liveTitle) && cleanT(p.title) === cleanT(liveTitle))
          );
        } catch (e) {}
      }

      let targetAuthorName =
        originalAuthor?.name ||
        existingArticle?.authorName ||
        existingArticle?.author_name ||
        existingArticle?.author ||
        "";

      let targetAuthorEmail =
        originalAuthor?.email ||
        existingArticle?.authorEmail ||
        existingArticle?.author_email ||
        "";

      let targetAuthorAvatar =
        originalAuthor?.avatar ||
        existingArticle?.authorAvatar ||
        existingArticle?.author_avatar ||
        "/author_bluesuit.jpg";

      let targetAuthorBio =
        originalAuthor?.bio ||
        existingArticle?.authorBio ||
        existingArticle?.author_bio ||
        "";

      // If email is still missing, attempt lookup in saved user accounts
      if (!targetAuthorEmail && targetAuthorName) {
        try {
          const uLists = ["dj_registered_users", "dj_users", "dj_all_users", "dj_user", "dj_writer_user"];
          for (const key of uLists) {
            const str = localStorage.getItem(key);
            if (str && str.trim()) {
              const parsed = JSON.parse(str);
              const arr = Array.isArray(parsed) ? parsed : [parsed];
              const foundUser = arr.find((u: any) =>
                u && u.name && u.name.toLowerCase().trim() === targetAuthorName.toLowerCase().trim()
              );
              if (foundUser?.email) {
                targetAuthorEmail = foundUser.email;
                if (foundUser.avatar) targetAuthorAvatar = foundUser.avatar;
                if (foundUser.bio) targetAuthorBio = foundUser.bio;
                break;
              }
            }
          }
        } catch (e) {}
      }

      if (!targetAuthorEmail && targetAuthorName) {
        const cleanName = targetAuthorName.toLowerCase().trim();
        if (cleanName.includes("muba")) targetAuthorEmail = "rura@gmail.com";
        else if (cleanName.includes("roomi")) targetAuthorEmail = "roomiwriter@gmail.com";
        else if (cleanName.includes("rushdhi")) targetAuthorEmail = "rushdhiwriter@gmail.com";
        else if (cleanName.includes("abcd")) targetAuthorEmail = "abcd@gmail.com";
        else if (cleanName.includes("nesto")) targetAuthorEmail = "nestosuper@gmail.com";
        else targetAuthorEmail = "writer@digitaljournal.com";
      }

      if (!targetAuthorName && targetAuthorEmail) {
        const cleanEmail = targetAuthorEmail.toLowerCase().trim();
        if (cleanEmail.includes("rura")) targetAuthorName = "Muba_kity";
        else if (cleanEmail.includes("roomi")) targetAuthorName = "Roomi";
        else if (cleanEmail.includes("rushdhi")) targetAuthorName = "Rushdhi MR";
        else if (cleanEmail.includes("abcd")) targetAuthorName = "ABCD";
        else if (cleanEmail.includes("nesto")) targetAuthorName = "Nesto Super";
      }

      if (!targetAuthorName) targetAuthorName = "Staff Journalist";
      if (!targetAuthorEmail) targetAuthorEmail = "writer@digitaljournal.com";

      const rejectedArticle = {
        ...(existingArticle || {}),
        id: editingPostId || existingArticle?.id || `art_${Date.now()}`,
        title: liveTitle,
        category: category || existingArticle?.category || "Business",
        subcategories: selectedSubcategories.length > 0 ? selectedSubcategories : (existingArticle?.subcategories || []),
        tags: tags.length > 0 ? tags : (existingArticle?.tags || []),
        summary: subheading || existingArticle?.summary || "",
        content: (editorRef.current ? editorRef.current.innerHTML : content) || existingArticle?.content || "",
        imageUrl: imageUrl || existingArticle?.imageUrl || "",
        status: "Rejected",
        rejectionReason,
        rejection_reason: rejectionReason,
        rejectedAt,
        rejected_at: rejectedAt,
        authorEmail: targetAuthorEmail,
        author_email: targetAuthorEmail,
        authorName: targetAuthorName,
        author_name: targetAuthorName,
        author: targetAuthorName,
        authorAvatar: targetAuthorAvatar,
        author_avatar: targetAuthorAvatar,
        authorBio: targetAuthorBio,
        author_bio: targetAuthorBio,
        updated_at: rejectedAt,
        updatedAt: rejectedAt
      };

      const cleanAlpha = (t: string) => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const liveAlpha = cleanAlpha(liveTitle);

      // 1. Persist to backend server API first
      try {
        const { saveArticleToServer, setCachedArticles, getCachedArticles, resetArticlesFetchCache } = await import("@/lib/articlesSync");
        resetArticlesFetchCache();

        const cached = getCachedArticles();
        const updatedCached = cached.filter((a: any) =>
          !(
            (editingPostId && String(a.id) === String(editingPostId)) ||
            (cleanT(a.title) && cleanT(liveTitle) && cleanT(a.title) === cleanT(liveTitle)) ||
            (liveAlpha && cleanAlpha(a.title) === liveAlpha) ||
            (existingArticle?.id && String(a.id) === String(existingArticle.id))
          )
        );
        setCachedArticles([rejectedArticle, ...updatedCached], false);
        await saveArticleToServer(rejectedArticle as any);
        resetArticlesFetchCache();
      } catch (backendErr) {
        console.warn("Backend server save article notice:", backendErr);
      }

      // Direct call to PUT /api/articles to ensure MySQL DB is directly updated
      try {
        await fetch("/api/articles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rejectedArticle)
        });
      } catch (e) {}

      // 2. Update/upsert submissions with status Rejected in localStorage safely
      try {
        const subsStr = localStorage.getItem("dj_writer_submitted_articles");
        let subsList: any[] = [];
        if (subsStr && subsStr.trim()) {
          try {
            subsList = JSON.parse(subsStr);
          } catch (e) {}
        }

        subsList = subsList.filter((p: any) =>
          !(
            (editingPostId && String(p.id) === String(editingPostId)) ||
            (cleanT(p.title) && cleanT(liveTitle) && cleanT(p.title) === cleanT(liveTitle)) ||
            (liveAlpha && cleanAlpha(p.title) === liveAlpha) ||
            (existingArticle?.id && String(p.id) === String(existingArticle.id))
          )
        );
        subsList.unshift(rejectedArticle);
        safeSetLocalStorage("dj_writer_submitted_articles", JSON.stringify(subsList));
      } catch (e) {}

      // 3. Dispatch live sync event across all browser windows/tabs
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dj_articles_updated"));
      }

      setIsRejectModalOpen(false);
      try {
        localStorage.setItem("dj_toast", `✓ Article marked as Rejected.`);
      } catch (e) {}
      try {
        localStorage.removeItem("dj_editing_post");
      } catch (e) {}

      if (typeof window !== "undefined") {
        window.location.href = "/admin";
      } else {
        router.push("/admin");
      }
    } catch (e) {
      console.warn("Reject submission error:", e);
      setIsRejectModalOpen(false);
      if (typeof window !== "undefined") {
        window.location.href = "/admin";
      } else {
        router.push("/admin");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUserAdmin = mounted && ((currentUser?.role || auth.user?.role || "").toLowerCase() === "admin" || (currentUser?.role || auth.user?.role || "").toLowerCase() === "co-admin");

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans antialiased text-slate-900 selection:bg-red-100 selection:text-red-900">
      
      {/* FIXED TOP NAVBAR HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0F19] border-b border-slate-800 text-white px-6 py-3 flex items-center justify-between shadow-lg w-full">
        {/* Left Side: Cancel Link & Context Breadcrumb */}
        <div className="flex items-center gap-4">
          <Link
            href={isReviewMode || isUserAdmin ? "/admin" : "/writer"}
            onClick={() => {
              try {
                localStorage.removeItem("dj_editing_post");
              } catch (e) {}
            }}
            className="flex items-center gap-2 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer hover:translate-x-0.5 font-mono"
          >
            <ArrowLeft size={15} className="stroke-[2.5]" />
            CANCEL
          </Link>

          {isReviewMode ? (
            <span className="text-[11px] font-mono font-medium text-slate-400 tracking-wider uppercase truncate max-w-md hidden sm:inline-block">
              REVIEWING: {(title || "NEW ARTICLE SUBMISSION").slice(0, 55).toUpperCase()}...
            </span>
          ) : (
            <>
              <span className="text-slate-600 font-light">|</span>
              <span className="text-[10px] font-bold text-emerald-300 tracking-wider uppercase bg-slate-800/80 px-3 py-1 rounded-xl border border-emerald-500/30 shadow-2xs font-mono">
                {editingPostId ? "EDIT" : "NEW"} {category.toUpperCase()} HEADLINE
              </span>
            </>
          )}
        </div>

        {/* Right Side Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => {
              if (editorRef.current) {
                setContent(editorRef.current.innerHTML);
              }
              setShowPreviewModal(true);
            }}
            disabled={isSubmitting}
            className="border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-[11px] sm:text-xs px-3.5 sm:px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider shadow-xs disabled:opacity-50 font-mono"
          >
            <Eye size={14} className="text-slate-300" />
            <span>PREVIEW</span>
          </button>

          {isReviewMode ? (
            <>
              <button
                type="button"
                onClick={handleRejectToTrash}
                disabled={isSubmitting}
                className="bg-[#8B0000] hover:bg-[#A00000] active:scale-[0.98] text-white font-bold text-[11px] sm:text-xs px-3.5 sm:px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm shadow-red-950/40 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed font-mono"
              >
                {isSubmitting && submittingAction === "reject" ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-white" />
                    <span>REJECTING...</span>
                  </>
                ) : (
                  <>
                    <X size={14} strokeWidth={2.5} />
                    <span>REJECT TO TRASH</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleApprovePublish}
                disabled={isSubmitting}
                className="bg-[#059669] hover:bg-[#047857] active:scale-[0.98] text-white font-bold text-[11px] sm:text-xs px-4 sm:px-5 py-2 rounded-xl flex items-center gap-1.5 sm:gap-2 shadow-sm shadow-emerald-900/30 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed font-mono"
              >
                {isSubmitting && submittingAction === "publish" ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-white" />
                    <span>PUBLISHING...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} strokeWidth={3} />
                    <span>APPROVE & PUBLISH</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {!isAdmin && (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="border border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-emerald-500/50 text-slate-200 font-bold text-[10px] sm:text-xs px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting && submittingAction === "draft" ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-emerald-400" />
                      <span>SAVING DRAFT...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} className="text-slate-400 group-hover:text-emerald-400" />
                      <span>SAVE DRAFT</span>
                    </>
                  )}
                </button>
              )}

              {!isAdmin && (
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={isSubmitting}
                  className="bg-[#D31220] hover:bg-[#B91C1C] active:scale-[0.98] text-white font-bold text-[10px] sm:text-xs px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 sm:gap-2 shadow-sm shadow-red-950/20 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                >
                  {isSubmitting && submittingAction === "publish" ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      <span>SUBMITTING...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>SUBMIT FOR REVIEW</span>
                    </>
                  )}
                </button>
              )}

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={handleRejectToTrash}
                    disabled={isSubmitting}
                    className="bg-[#8B0000] hover:bg-[#A00000] active:scale-[0.98] text-white font-bold text-[10px] sm:text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 shadow-sm shadow-red-950/40 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                  >
                    <X size={14} strokeWidth={2.5} />
                    <span>REJECT TO TRASH</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveArticle("Published")}
                    disabled={isSubmitting}
                    className="bg-[#059669] hover:bg-[#047857] active:scale-[0.98] text-white font-bold text-[10px] sm:text-xs px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 sm:gap-2 shadow-sm shadow-emerald-600/30 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                  >
                    {isSubmitting && submittingAction === "publish" ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-white" />
                        <span>PUBLISHING...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} strokeWidth={3} />
                        <span>APPROVE & PUBLISH</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </header>

      {/* FIXED SECONDARY FORMATTING TOOLBAR - PERMANENTLY FIXED ON SCROLL */}
      <div className="fixed top-[53px] sm:top-[57px] left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs py-2 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 flex items-center flex-wrap gap-2 sm:gap-2.5 text-slate-700 select-none pl-3 sm:pl-6">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextFormat("undo")}
                className="p-1.5 hover:bg-slate-200/80 rounded text-slate-700 transition-colors cursor-pointer"
                title="Undo"
              >
                <Undo size={15} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextFormat("redo")}
                className="p-1.5 hover:bg-slate-200/80 rounded text-slate-700 transition-colors cursor-pointer"
                title="Redo"
              >
                <Redo size={15} />
              </button>

              <span className="text-slate-300">|</span>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextFormat("bold")}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  activeFormats.bold ? "bg-blue-100 text-blue-700 font-bold" : "hover:bg-slate-200/80 text-slate-700"
                }`}
                title="Bold (**text**)"
              >
                <Bold size={15} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextFormat("italic")}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  activeFormats.italic ? "bg-blue-100 text-blue-700 font-bold" : "hover:bg-slate-200/80 text-slate-700"
                }`}
                title="Italic (*text*)"
              >
                <Italic size={15} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextFormat("underline")}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  activeFormats.underline ? "bg-blue-100 text-blue-700 font-bold" : "hover:bg-slate-200/80 text-slate-700"
                }`}
                title="Underline (<u>text</u>)"
              >
                <Underline size={15} />
              </button>

              <span className="text-slate-300">|</span>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextFormat("link")}
                className="p-1.5 hover:bg-slate-200/80 rounded text-slate-700 transition-colors cursor-pointer"
                title="Insert Link ([text](url))"
              >
                <Link2 size={15} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextFormat("bullet")}
                className="p-1.5 hover:bg-slate-200/80 rounded text-slate-700 transition-colors cursor-pointer"
                title="Bullet List (• item)"
              >
                <List size={15} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextFormat("number")}
                className="p-1.5 hover:bg-slate-200/80 rounded text-slate-700 transition-colors cursor-pointer"
                title="Numbered List (1. item)"
              >
                <ListOrdered size={15} />
              </button>

              <span className="text-slate-300">|</span>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextFormat("quote")}
                className="p-1.5 hover:bg-slate-200/80 rounded text-slate-700 transition-colors cursor-pointer"
                title="Blockquote (> quote)"
              >
                <Quote size={15} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextFormat("code")}
                className="p-1.5 hover:bg-slate-200/80 rounded text-slate-700 transition-colors cursor-pointer"
                title="Code (`code`)"
              >
                <Code size={15} />
              </button>

              <span className="text-slate-300">|</span>

              {/* PARAGRAPH FIRST LETTER SIZE ADJUSTMENT BUTTONS (A+ / A-) */}
              <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200/90">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAdjustFirstLetterSize(4)}
                  disabled={firstLetterSize >= MAX_FIRST_LETTER_SIZE}
                  className="p-1 px-2.5 rounded text-xs font-bold hover:bg-white text-slate-800 transition-all cursor-pointer disabled:opacity-30 flex items-center justify-center gap-0.5 shadow-2xs border border-transparent hover:border-slate-200"
                  title={`Increase Paragraph First Letter Size (+4px) | Current: ${firstLetterSize}px (Max: ${MAX_FIRST_LETTER_SIZE}px)`}
                >
                  <span className="font-serif font-black text-sm text-slate-900 leading-none">A</span>
                  <span className="text-[11px] font-extrabold text-blue-600 leading-none -mt-1">+</span>
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleAdjustFirstLetterSize(-4)}
                  disabled={firstLetterSize <= MIN_FIRST_LETTER_SIZE}
                  className="p-1 px-2.5 rounded text-xs font-bold hover:bg-white text-slate-800 transition-all cursor-pointer disabled:opacity-30 flex items-center justify-center gap-0.5 shadow-2xs border border-transparent hover:border-slate-200"
                  title={`Decrease Paragraph First Letter Size (-4px) | Current: ${firstLetterSize}px (Min: ${MIN_FIRST_LETTER_SIZE}px)`}
                >
                  <span className="font-serif font-black text-sm text-slate-900 leading-none">A</span>
                  <span className="text-[11px] font-extrabold text-blue-600 leading-none -mt-1">-</span>
                </button>

                <span className="text-[10px] font-bold text-slate-500 px-1.5 font-mono select-none" title="Current Paragraph First Letter Size">
                  {firstLetterSize}px
                </span>
              </div>

              <span className="text-slate-300">|</span>

              {/* INSERT / EDIT IMAGE BUTTON */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (selectedImg) {
                    handleEditSelectedImage(selectedImg);
                  } else {
                    saveCurrentSelection();
                    setImageUrl("");
                    setModalImageUrl("");
                    setImageCaption("");
                    setImageCredit("");
                    setImageFileName("No file chosen");
                    setImageKeywords([]);
                    setImageKeywordInput("");
                    setShowImageModal(true);
                  }
                }}
                className="border border-slate-200 bg-slate-50 text-slate-700 hover:text-[#D31220] hover:bg-red-50 hover:border-red-200 font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer uppercase tracking-wider transition-colors shadow-2xs"
              >
                <ImageIcon size={14} />
                {selectedImg ? "EDIT IMAGE" : "INSERT IMAGE"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT WORKSPACE GRID */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-[124px] pb-16 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: MAIN RICH TEXT ARTICLE CANVAS */}
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-sm hover:shadow-md transition-all min-h-[750px] flex flex-col">

            {/* TITLE INPUT - MULTI-LINE AUTO-EXPANDING TEXTAREA */}
            <textarea
              placeholder="Add Title..."
              value={title}
              onChange={(e) => {
                const newTitle = e.target.value;
                setTitle(newTitle);
                setFocusKeyword(extractFocusKeyword(newTitle, category));
              }}
              rows={2}
              className="w-full font-poppins text-3xl sm:text-4xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none border-none py-2 mb-2 bg-transparent resize-none leading-tight overflow-hidden whitespace-normal break-words"
              onInput={(e: any) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
            />

            {/* SUBHEADING / DECK INPUT - MULTI-LINE AUTO-EXPANDING TEXTAREA */}
            <textarea
              placeholder="Add Subheading / Deck..."
              value={subheading}
              onChange={(e) => {
                const newSub = e.target.value;
                setSubheading(newSub);
                if (!isCardSummaryCustom) {
                  setCardSummary(newSub);
                }
              }}
              rows={2}
              className="w-full font-poppins text-lg sm:text-xl text-slate-600 placeholder:text-slate-300 focus:outline-none border-none py-1 mb-6 bg-transparent resize-none leading-snug overflow-hidden whitespace-normal break-words"
              onInput={(e: any) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
            />

            {/* BODY PARAGRAPHS RICH TEXT EDITABLE CANVAS CONTAINER */}
            <div className="relative flex-1 flex flex-col min-h-[400px]">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onClick={handleEditorInteraction}
                onMouseDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (target && (target.tagName === "IMG" || target.closest("figure"))) {
                    handleEditorInteraction(e);
                  }
                }}
                onDoubleClick={(e) => {
                  const target = e.target as HTMLElement;
                  const img = target?.tagName === "IMG"
                    ? (target as HTMLImageElement)
                    : (target?.closest("figure")?.querySelector("img") as HTMLImageElement | null);
                  if (img) {
                    selectImageElement(img);
                    handleEditSelectedImage(img);
                  }
                }}
                onInput={() => {
                  if (editorRef.current) {
                    setContent(editorRef.current.innerHTML);
                  }
                  updateImgBoundingRect();
                }}
                onKeyUp={() => {
                  if (editorRef.current) {
                    setContent(editorRef.current.innerHTML);
                  }
                }}
                onBlur={() => {
                  if (editorRef.current) {
                    setContent(editorRef.current.innerHTML);
                  }
                }}
                onPaste={() => {
                  setTimeout(() => {
                    if (editorRef.current) {
                      setContent(editorRef.current.innerHTML);
                    }
                  }, 10);
                }}
                data-placeholder="Start writing or type / for plugins"
                className="article-content-editor font-poppins article-body-poppins outline-none text-slate-800 leading-relaxed min-h-[420px] pb-24 text-[16px] select-text focus:outline-none focus:ring-0 [&_figure]:cursor-pointer [&_img]:cursor-pointer [&_blockquote]:border-l-4 [&_blockquote]:border-[#D31220] [&_blockquote]:pl-4 [&_blockquote]:py-2.5 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-slate-700 [&_blockquote]:bg-slate-50/80 [&_blockquote]:rounded-r-xl [&_pre]:bg-slate-100/90 [&_pre]:p-3.5 [&_pre]:my-4 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-200/80 [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-sm [&_pre]:text-slate-800 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_li]:my-1"
                style={{
                  minHeight: "420px",
                  lineHeight: "1.85",
                  fontSize: "1.05rem",
                  fontFamily: "'Poppins', sans-serif",
                }}
              />

              {/* FLOATING ACTION TOOLBAR OVER SELECTED IMAGE */}
              {selectedImg && imgBoundingRect && (
                <div
                  id="img-resize-toolbar"
                  style={{
                    top: `${Math.max(-48, imgBoundingRect.top - 50)}px`,
                    left: `${imgBoundingRect.left + imgBoundingRect.width / 2}px`,
                    transform: "translateX(-50%)",
                  }}
                  className="absolute z-40 bg-[#0B132B] text-white rounded-xl shadow-2xl px-3.5 py-1.5 flex items-center gap-2.5 text-xs font-semibold border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap select-none"
                >
                  {/* DRAG TO REPOSITION BUTTON */}
                  <div
                    onMouseDown={handleStartMoveDrag}
                    className="flex items-center gap-1 text-slate-300 hover:text-white cursor-grab active:cursor-grabbing px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-600/60 shadow-xs select-none"
                    title="Click and drag to reposition image anywhere in article"
                  >
                    <GripVertical size={13} className="text-blue-400" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">DRAG</span>
                  </div>

                  <span className="text-slate-600 font-normal">|</span>

                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    SIZE
                  </span>

                  <button
                    type="button"
                    onClick={() => handleResizeImage(250)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                      selectedImgWidth <= 300
                        ? "bg-blue-600 text-white"
                        : "hover:bg-slate-800 text-slate-200"
                    }`}
                  >
                    S
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResizeImage(480)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                      selectedImgWidth > 300 && selectedImgWidth < 700
                        ? "bg-blue-600 text-white"
                        : "hover:bg-slate-800 text-slate-200"
                    }`}
                  >
                    M
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResizeImage(900)}
                    className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                      selectedImgWidth >= 700
                        ? "bg-blue-600 text-white"
                        : "hover:bg-slate-800 text-slate-200"
                    }`}
                  >
                    FULL
                  </button>

                  <span className="text-slate-600 font-normal">|</span>

                  <button
                    type="button"
                    onClick={() => handleSetImageAlignment("left")}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      selectedImgAlign === "left"
                        ? "bg-blue-600 text-white font-bold"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                    title="Align Left (Wrap Text)"
                  >
                    <AlignLeft size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetImageAlignment("center")}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      selectedImgAlign === "center"
                        ? "bg-blue-600 text-white font-bold"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                    title="Align Center (No Wrap)"
                  >
                    <AlignCenter size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetImageAlignment("right")}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      selectedImgAlign === "right"
                        ? "bg-blue-600 text-white font-bold"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                    title="Align Right (Wrap Text)"
                  >
                    <AlignRight size={14} />
                  </button>

                  <span className="text-slate-600 font-normal">|</span>

                  <button
                    type="button"
                    onClick={() => handleEditSelectedImage()}
                    className="p-1 px-2 hover:bg-slate-800 bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded transition-colors cursor-pointer flex items-center gap-1 font-bold"
                    title="Edit / Replace Image & Caption"
                  >
                    <Edit3 size={13} />
                    <span className="text-[10px] uppercase">Edit Image</span>
                  </button>

                  <span className="text-slate-600 font-normal">|</span>

                  <button
                    type="button"
                    onClick={handleMoveImageUp}
                    className="p-1 hover:bg-slate-800 rounded text-slate-300 transition-colors cursor-pointer"
                    title="Move Up"
                  >
                    <ChevronUp size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={handleMoveImageDown}
                    className="p-1 hover:bg-slate-800 rounded text-slate-300 transition-colors cursor-pointer"
                    title="Move Down"
                  >
                    <ChevronDown size={14} />
                  </button>

                  <span className="text-slate-600 font-normal">|</span>

                  <button
                    type="button"
                    onClick={handleDeleteSelectedImage}
                    className="p-1 hover:bg-rose-950/80 text-rose-400 hover:text-rose-300 rounded transition-colors cursor-pointer"
                    title="Delete Image"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {/* BLUE SELECTION BORDER AND INTERACTIVE DRAG HANDLES */}
              {imgBoundingRect && selectedImg && (
                <div
                  style={{
                    top: `${imgBoundingRect.top}px`,
                    left: `${imgBoundingRect.left}px`,
                    width: `${imgBoundingRect.width}px`,
                    height: `${imgBoundingRect.height}px`,
                  }}
                  className="absolute pointer-events-none border-2 border-blue-500 z-20 transition-all duration-75"
                >
                  {/* Left Edge Drag Strip */}
                  <div
                    data-resize-handle="true"
                    onMouseDown={(e) => handleStartResizeDrag(e, "left")}
                    className="pointer-events-auto absolute top-0 -left-1 w-2 h-full cursor-ew-resize"
                  />

                  {/* Right Edge Drag Strip */}
                  <div
                    data-resize-handle="true"
                    onMouseDown={(e) => handleStartResizeDrag(e, "right")}
                    className="pointer-events-auto absolute top-0 -right-1 w-2 h-full cursor-ew-resize"
                  />

                  {/* Top-Left Handle */}
                  <div
                    data-resize-handle="true"
                    onMouseDown={(e) => handleStartResizeDrag(e, "top-left")}
                    className="pointer-events-auto absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform ring-2 ring-blue-100"
                  />
                  {/* Top-Right Handle */}
                  <div
                    data-resize-handle="true"
                    onMouseDown={(e) => handleStartResizeDrag(e, "top-right")}
                    className="pointer-events-auto absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform ring-2 ring-blue-100"
                  />
                  {/* Bottom-Left Handle */}
                  <div
                    data-resize-handle="true"
                    onMouseDown={(e) => handleStartResizeDrag(e, "bottom-left")}
                    className="pointer-events-auto absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform ring-2 ring-blue-100"
                  />
                  {/* Bottom-Right Handle */}
                  <div
                    data-resize-handle="true"
                    onMouseDown={(e) => handleStartResizeDrag(e, "bottom-right")}
                    className="pointer-events-auto absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform ring-2 ring-blue-100"
                  />
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: ARTICLE SETTINGS SIDEBAR PANEL */}
          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs sticky top-[136px] max-h-[calc(100vh-150px)] overflow-y-auto scrollbar-thin">
            
            {/* Sidebar Title Header */}
            <div className="flex items-center gap-2 mb-5 text-slate-800">
              <Settings size={18} className="text-slate-500" />
              <h3 className="font-serif text-sm font-bold tracking-wider uppercase text-slate-900">
                ARTICLE SETTINGS
              </h3>
            </div>

            {/* Segmented Tabs: DETAILS | SEO */}
            <div className="bg-slate-100/90 p-1 rounded-xl flex items-center mb-6">
              <button
                type="button"
                onClick={() => setSidebarTab("DETAILS")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  sidebarTab === "DETAILS"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                DETAILS
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("SEO")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  sidebarTab === "SEO"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                SEO
              </button>
            </div>

            {/* TAB CONTENT: DETAILS */}
            {sidebarTab === "DETAILS" && (
              <div className="space-y-5">
                {/* 1. SELECT CATEGORY (MAIN) WITH FLYOUT SUBCATEGORIES SIDEBAR */}
                <div className="relative" ref={catDropdownRef}>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    SELECT CATEGORY (MAIN)
                  </label>

                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsCatDropdownOpen((prev) => !prev)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between focus:outline-none focus:border-[#D31220] cursor-pointer shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#D31220]"></span>
                      <span className="font-bold">{category}</span>
                    </div>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isCatDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Custom Dropdown Menu with Side-by-Side World Countries Sidebar */}
                  {isCatDropdownOpen && (
                    <div 
                      onWheel={(e) => e.stopPropagation()}
                      className={`absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden ${
                        hoveredCat === "World" || category.toLowerCase() === "world" || WORLD_SUBCATEGORIES.some(w => w.toLowerCase() === category.toLowerCase())
                          ? "w-full sm:min-w-[340px] grid grid-cols-2 divide-x divide-slate-100"
                          : "w-full"
                      }`}
                    >
                      {/* Left Pane: Main Categories List */}
                      <div 
                        onWheel={(e) => e.stopPropagation()}
                        className="space-y-0.5 max-h-72 overflow-y-auto overscroll-contain scrollbar-thin p-1"
                      >
                        {ALL_MAIN_CATEGORIES.map((cat) => {
                          const isSelected = category.toLowerCase() === cat.toLowerCase();
                          const isWorld = cat.toLowerCase() === "world";
                          const isWorldActive = isWorld && (hoveredCat === "World" || category.toLowerCase() === "world" || WORLD_SUBCATEGORIES.some(w => w.toLowerCase() === category.toLowerCase()));

                          return (
                            <button
                              key={cat}
                              type="button"
                              onMouseEnter={() => setHoveredCat(cat)}
                              onClick={() => {
                                if (isWorld) {
                                  setHoveredCat("World");
                                } else {
                                  handleCategoryChange(cat);
                                  setHoveredCat(null);
                                }
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                isSelected || isWorldActive
                                  ? "bg-red-50 text-[#D31220] font-bold"
                                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>{cat}</span>
                              {isWorld && (
                                <ChevronRight size={13} className={`text-[#D31220] transition-transform ${isWorldActive ? "translate-x-0.5" : ""}`} />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Right Pane: World Countries / Regions Sidebar (Brought up on hover over World) */}
                      {(hoveredCat === "World" || category.toLowerCase() === "world" || WORLD_SUBCATEGORIES.some(w => w.toLowerCase() === category.toLowerCase())) && (
                        <div 
                          onMouseEnter={() => setHoveredCat("World")}
                          className="p-1.5 bg-slate-50/60 flex flex-col max-h-72 overflow-y-auto overscroll-contain scrollbar-thin animate-in fade-in duration-150"
                        >
                          <div className="px-2 py-1 mb-1 border-b border-slate-200/80 flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase text-[#D31220] tracking-wider font-mono">
                              World Regions
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">7 Regions</span>
                          </div>
                          
                          <div className="space-y-0.5 flex-1">
                            {WORLD_SUBCATEGORIES.map((sub) => {
                              const isSubSelected = category.toLowerCase() === sub.toLowerCase();
                              return (
                                <button
                                  key={sub}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCategoryChange(sub);
                                    setIsCatDropdownOpen(false);
                                    setHoveredCat(null);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                    isSubSelected
                                      ? "bg-red-50 text-[#D31220] font-bold"
                                      : "text-slate-700 hover:bg-white hover:text-[#D31220] shadow-2xs hover:shadow-xs"
                                  }`}
                                >
                                  <span>{sub}</span>
                                  {isSubSelected && <Check size={12} strokeWidth={3} className="text-[#D31220]" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. SELECT SUB-CATEGORIES (OPTIONAL, MAX 5) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      SELECT SUB-CATEGORIES (OPTIONAL, MAX 5)
                    </label>
                  </div>
                  
                  <div 
                    onWheel={(e) => e.stopPropagation()}
                    className="border border-slate-200/90 rounded-xl p-3 bg-slate-50/50 max-h-56 overflow-y-auto overscroll-contain mb-2 scrollbar-thin space-y-3"
                  >
                    {/* Main Categories */}
                    <div className="grid grid-cols-2 gap-2">
                      {displayedSubcategories.map((sub) => {
                        const isChecked = selectedSubcategories.some((item) => isSameOrMatchingCategory(item, sub));
                        const isDisabled = !isChecked && selectedSubcategories.length >= 5;
                        return (
                          <label
                            key={sub}
                            onClick={() => !isDisabled && handleSubcategoryToggle(sub)}
                            className={`flex items-center gap-2 text-xs py-1 px-1.5 rounded transition-colors select-none ${
                              isDisabled
                                ? "opacity-40 cursor-not-allowed text-slate-400"
                                : "text-slate-700 cursor-pointer hover:bg-slate-100/80"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                              isChecked
                                ? "bg-[#D31220] border-[#D31220] text-white"
                                : isDisabled
                                  ? "border-slate-200 bg-slate-100/80"
                                  : "border-slate-300 bg-white"
                            }`}>
                              {isChecked && <Check size={12} strokeWidth={3} className="text-white" />}
                            </div>
                            <span className="truncate">{sub}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Regional Countries Section */}
                    {displayedWorldSubcategories.length > 0 && (
                      <div className="border-t border-slate-200/60 pt-2.5">
                        <span className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">
                          World
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {displayedWorldSubcategories.map((sub) => {
                            const isChecked = selectedSubcategories.some((item) => isSameOrMatchingCategory(item, sub));
                            const isDisabled = !isChecked && selectedSubcategories.length >= 5;
                            return (
                              <label
                                key={sub}
                                onClick={() => !isDisabled && handleSubcategoryToggle(sub)}
                                className={`flex items-center gap-2 text-xs py-1 px-1.5 rounded transition-colors select-none ${
                                  isDisabled
                                    ? "opacity-40 cursor-not-allowed text-slate-400"
                                    : "text-slate-700 cursor-pointer hover:bg-slate-100/80"
                                }`}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                  isChecked
                                    ? "bg-[#D31220] border-[#D31220] text-white"
                                    : isDisabled
                                      ? "border-slate-200 bg-slate-100/80"
                                      : "border-slate-300 bg-white"
                                }`}>
                                  {isChecked && <Check size={12} strokeWidth={3} className="text-white" />}
                                </div>
                                <span className="truncate">{sub}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 font-semibold block mb-3">
                    SELECTED: {selectedSubcategories.length} / 5
                  </span>
                </div>

                {/* 3. TAGS INPUT */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    TAGS
                  </label>
                  
                  <div className="border border-slate-200/90 rounded-xl p-3 bg-white focus-within:border-[#D31220] focus-within:ring-1 focus-within:ring-[#D31220] transition-all shadow-xs">
                    {/* Render Active Tag Pills */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-slate-100 text-slate-800 border border-slate-200 hover:border-slate-300 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 group font-mono"
                          >
                            <span>#{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-red-600 cursor-pointer transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Tag Text Input */}
                    <input
                      type="text"
                      placeholder={tags.length === 0 ? "e.g. BreakingNews, Football, WorldCup2026" : "Add another tag..."}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      onBlur={() => {
                        if (tagInput && tagInput.trim()) {
                          const extra = tagInput
                            .split(/[\s,]+/)
                            .map((t) => t.replace(/^#+/, "").trim().toUpperCase())
                            .filter(Boolean);
                          const updated = [...tags];
                          extra.forEach((t) => {
                            if (!updated.includes(t)) updated.push(t);
                          });
                          setTags(updated);
                          setTagInput("");
                        }
                      }}
                      className="w-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
                    />
                  </div>
                  
                  <span className="text-[9px] text-slate-400 font-medium block mt-1.5">
                    PRESS ENTER, COMMA OR SPACE TO ADD • CLICK TAG TO REMOVE • {tags.length} TAGS
                  </span>
                </div>

                {/* 4. READ DURATION ESTIMATION */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    READ DURATION
                  </label>
                  <input
                    type="text"
                    value={readDuration}
                    onChange={(e) => setReadDuration(e.target.value)}
                    placeholder="e.g. 5 min read"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#D31220] focus:ring-1 focus:ring-red-100 transition-all shadow-2xs"
                  />
                </div>

                {/* 5. HOMEPAGE PLACEMENT SECTION (ADMIN ONLY) */}
                {isAdmin && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] font-extrabold text-[#D31220] uppercase tracking-wider">
                        HOMEPAGE PLACEMENT
                      </label>
                      <span className="text-[9.5px] font-mono text-slate-400">Section Control</span>
                    </div>

                    <div className="space-y-1.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl p-2.5">
                      {[
                        { id: "Home Page A+ Section", label: "Home Page A+ Section", desc: "Top Hero Carousel main story" },
                        { id: "Trending Now", label: "Trending Now Section", desc: "Trending sidebar list beside Hero" },
                        { id: "Editor's Picks", label: "Editor's Picks Section", desc: "4-Card featured row below Hero" },
                        { id: "Latest News", label: "Latest News Section", desc: "Latest news feed and featured lead" },
                        { id: "Home Page A+ Section 2", label: "Main News 2 (Home Page A+ Section 2)", desc: "Middle dark spotlight banner slider" },
                        { id: "Home Page A+ Section 3", label: "Home Page A+ Section 3", desc: "Featured story beside Most Read list" },
                        { id: "Standard Post", label: "Category Section Only", desc: "Default category news feed" },
                      ].map((item) => {
                        const isSelected = normalizePlacement(placement) === normalizePlacement(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => setPlacement(item.id)}
                            className={`flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                              isSelected
                                ? "bg-white border-2 border-[#D31220] shadow-sm"
                                : "border border-transparent hover:bg-white/70"
                            }`}
                          >
                            <div className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "border-[#D31220] bg-[#D31220] text-white" : "border-slate-300 bg-white"
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-bold leading-tight ${isSelected ? "text-[#D31220]" : "text-slate-800"}`}>
                                {item.label}
                              </p>
                              <p className="text-[10px] text-slate-500 font-normal leading-snug mt-0.5">
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* TARGETED EMAIL DISTRIBUTION */}
                    <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-3.5 space-y-2.5 mt-3">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <label className="block font-mono text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                          TARGETED EMAIL DISTRIBUTION
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal font-sans">
                        Add specific VIP, partner, or client emails to receive this story upon publication.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsMailBoxModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border border-blue-200 bg-white hover:bg-blue-50 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-700 transition-all cursor-pointer shadow-xs"
                      >
                        <Mail className="w-3.5 h-3.5 text-blue-500" />
                        <span>Mail Box</span>
                        {targetedRecipients.length > 0 ? (
                          <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {targetedRecipients.length}
                          </span>
                        ) : (
                          <span className="ml-auto text-slate-400 text-[10px] font-mono">(Add Recipients)</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB CONTENT: SEO */}
            {sidebarTab === "SEO" && (
              <div className="animate-in fade-in duration-200">
                <SEOAssistantPanel
                  articleData={{
                    title: title.trim(),
                    subheading: subheading.trim(),
                    description: cardSummary.trim() || subheading.trim(),
                    content: content.trim(),
                    category: category.toLowerCase(),
                    authorName: currentUser?.name || "Rushdhi Riyaj",
                    imageUrl: imageUrl.trim()
                  }}
                  cardSummary={cardSummary}
                  focusKeyword={focusKeyword}
                  metaDescription={metaDescription}
                  onUpdateCardSummary={(val) => {
                    setCardSummary(val);
                    if (!val.trim()) {
                      setIsCardSummaryCustom(false);
                      setCardSummary(extractCardSummary(content));
                    } else {
                      setIsCardSummaryCustom(true);
                    }
                  }}
                  onUpdateFocusKeyword={(val) => {
                    setFocusKeyword(val);
                    if (!val.trim()) {
                      setIsFocusKwCustom(false);
                      if (title.trim()) {
                        setFocusKeyword(extractFocusKeyword(title.trim(), category));
                      }
                    } else {
                      setIsFocusKwCustom(true);
                    }
                  }}
                  onUpdateMetaDescription={(val) => {
                    setMetaDescription(val);
                    if (!val.trim()) {
                      setIsMetaDescCustom(false);
                      setMetaDescription(extractCardSummary(content));
                    } else {
                      setIsMetaDescCustom(true);
                    }
                  }}
                  onAutoGenerateSEO={handleAutoGenerateSEO}
                />
              </div>
            )}

          </div>

        </div>
      </main>

      {/* INSERT ARTICLE IMAGE MODAL */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative font-sans text-left overflow-hidden border border-slate-200">
            
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-2.5 mb-5">
              <ImageIcon size={20} className="text-[#D31220] flex-shrink-0" />
              <h3 className="text-lg font-sans font-bold text-slate-900">
                {selectedImg ? "Edit / Replace Image" : "Insert Article Image"}
              </h3>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">

              {/* PASTE IMAGE URL */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  PASTE IMAGE URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={modalImageUrl}
                  onChange={(e) => setModalImageUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#D31220] focus:ring-1 focus:ring-red-100 transition-all"
                />
              </div>

              {/* OR UPLOAD FILE divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">OR UPLOAD FILE</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* CHOOSE COMPUTER FILE */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                  CHOOSE COMPUTER FILE
                </label>
                <label className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl px-4 py-3 bg-slate-50/50 hover:bg-slate-100/50 transition-all flex items-center justify-between cursor-pointer group">
                  <span className="text-xs font-semibold text-slate-700 truncate">
                    {isUploadingImage
                      ? "Uploading..."
                      : imageFileName && imageFileName !== "No file chosen"
                      ? imageFileName
                      : "Choose File  No file chosen"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleModalFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* IMAGE PREVIEW */}
              {isUploadingImage ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    IMAGE PREVIEW
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 text-[#D31220] animate-spin" />
                    <span className="text-xs font-semibold text-slate-600">Uploading image...</span>
                  </div>
                </div>
              ) : (modalImageUrl || imageUrl) ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      IMAGE PREVIEW
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setModalImageUrl("");
                        setImageUrl("");
                        setImageFileName("No file chosen");
                      }}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  </div>
                  <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100/60">
                    <div className="w-full h-48 sm:h-52 flex items-center justify-center bg-slate-900/5 p-2">
                      <img
                        src={modalImageUrl || imageUrl}
                        alt="Article Image Preview"
                        className="max-h-full max-w-full object-contain rounded-lg shadow-xs"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                        onLoad={(e) => {
                          (e.target as HTMLElement).style.display = "block";
                        }}
                      />
                    </div>
                    {imageFileName && imageFileName !== "No file chosen" && (
                      <div className="px-3 py-1.5 bg-white border-t border-slate-100 text-[11px] text-slate-500 font-medium truncate">
                        {imageFileName}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* IMAGE SEO KEYWORDS */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-slate-800">
                    Image SEO Keywords <span className="font-normal text-slate-500">(Max 4 keywords)</span>
                  </label>
                  <span className="text-[10px] font-mono font-medium text-slate-400">
                    {imageKeywords.length} / 4
                  </span>
                </div>

                {/* Keyword tags */}
                {imageKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {imageKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => setImageKeywords(imageKeywords.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                          aria-label={`Remove ${kw}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="e.g. Donald Trump, White House, Election 2026"
                  value={imageKeywordInput}
                  onChange={(e) => setImageKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === ",") && imageKeywordInput.trim() && imageKeywords.length < 4) {
                      e.preventDefault();
                      const kw = imageKeywordInput.trim().replace(/,$/, "").trim();
                      if (kw && !imageKeywords.includes(kw)) {
                        setImageKeywords([...imageKeywords, kw]);
                      }
                      setImageKeywordInput("");
                    }
                  }}
                  disabled={imageKeywords.length >= 4}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#D31220] focus:ring-1 focus:ring-red-100 transition-all disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 font-normal">
                  Type keyword and press Enter or comma (,) to add. Maximum 4 keywords per image.
                </p>
              </div>

              {/* IMAGE CAPTION */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Image Caption <span className="font-normal text-slate-500">(Visible under picture to readers)</span>
                </label>
                <input
                  type="text"
                  placeholder="Brief description (e.g. President speaking with reporters outside Capitol"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#D31220] focus:ring-1 focus:ring-red-100 transition-all"
                />
              </div>

              {/* IMAGE CREDIT / SOURCE */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Image Credit / Source <span className="font-normal text-slate-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reuters, AP Photo, Getty Images"
                  value={imageCredit}
                  onChange={(e) => setImageCredit(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#D31220] focus:ring-1 focus:ring-red-100 transition-all"
                />
              </div>

              {/* IMAGE SIZE & POSITION ALIGNMENT */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    IMAGE SIZE
                  </label>
                  <select
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#D31220]"
                  >
                    <option value="Medium (Width: 450px)">Medium (Width: 450px)</option>
                    <option value="Small (Width: 300px)">Small (Width: 300px)</option>
                    <option value="Full Width (100%)">Full Width (100%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    POSITION ALIGNMENT
                  </label>
                  <select
                    value={imageAlignment}
                    onChange={(e) => setImageAlignment(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#D31220]"
                  >
                    <option value="Center (No Wrap)">Center (No Wrap)</option>
                    <option value="Left (Wrap Text)">Left (Wrap Text)</option>
                    <option value="Right (Wrap Text)">Right (Wrap Text)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center font-mono"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleInsertImageToCanvas}
                  className="flex-1 py-3 px-4 bg-[#D31220] hover:bg-[#B91C1C] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer text-center font-mono flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  {selectedImg ? "UPDATE IMAGE" : "INSERT IMAGE"}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* FULL-SCREEN ARTICLE PREVIEW OVERLAY MATCHING REFERENCE IMAGES */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto font-sans text-slate-900 animate-in fade-in duration-200">
          
          {/* 1. FIXED TOP NAVY BANNER */}
          <header className="fixed top-0 left-0 right-0 z-50 bg-[#0F172A] text-white px-6 py-3 flex items-center justify-between shadow-md border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="bg-[#B45309] text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
                PREVIEW MODE
              </span>
              <span className="text-xs text-slate-300 font-medium hidden sm:inline">
                This is how your article with inline images will render on the live feed.
              </span>
            </div>

            <button
              onClick={() => setShowPreviewModal(false)}
              className="border border-slate-700 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg uppercase cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <X size={14} />
              EXIT PREVIEW
            </button>
          </header>

          {/* 2. MAIN PREVIEW ARTICLE CONTENT CONTAINER MATCHING LIVE ARTICLE FORMAT */}
          <div className="max-w-[1240px] w-full mx-auto px-4 md:px-6 pt-20 pb-16 font-sans">
            
            {/* TOP UTILITY BAR */}
            <div className="flex items-center justify-between py-2.5 mb-4 text-[12px] font-sans text-zinc-500 border-b border-zinc-100">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="flex items-center gap-1.5 hover:text-black font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back to {(category || "Business").toUpperCase()}
              </button>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="hover:text-black transition-colors cursor-pointer flex items-center gap-1"
                  title="Share article"
                >
                  <Share2 size={15} />
                </button>

                <button
                  type="button"
                  className="text-zinc-500 hover:text-black transition-colors cursor-pointer p-1 rounded hover:bg-zinc-100 flex items-center gap-1.5"
                  title="Save"
                >
                  <Bookmark size={18} />
                  <span className="text-[11px] font-bold hidden sm:inline">SAVE</span>
                </button>
              </div>
            </div>

            {/* 2-COLUMN LAYOUT: MAIN ARTICLE (LEFT) & SIDEBAR (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-2 items-start">
              
              {/* LEFT COLUMN: MAIN ARTICLE */}
              <div className="lg:col-span-8 flex flex-col">
                
                {/* CATEGORY TAG */}
                <div className="flex items-center gap-2 mb-3 font-standard-sans">
                  <span className="inline-flex items-center text-[#BF1E2D] hover:text-[#a61724] text-[12px] font-black uppercase tracking-wider transition-colors">
                    {(category || "BUSINESS").toUpperCase()}
                  </span>
                </div>

                {/* HEADLINE TITLE */}
                <h1 className="font-poppins text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight mb-3 tracking-tight">
                  {title.trim() || "Untitled Story"}
                </h1>

                {/* SUBHEADING / DECK */}
                {subheading.trim() && (
                  <p className="font-poppins text-lg sm:text-xl text-slate-600 italic mb-6 sm:mb-8 leading-relaxed">
                    {subheading.trim()}
                  </p>
                )}

                {/* AUTHOR METADATA BAR */}
                {(() => {
                  const activeProf = getUserProfile(currentUser?.email || "");
                  const previewAuthorName = activeProf?.name || currentUser?.name || "Rushdhi MR";
                  const authorSlug = previewAuthorName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  const resolvedAvatar =
                    (activeProf?.avatar && !activeProf.avatar.includes("cart") ? activeProf.avatar : null) ||
                    (currentUser?.avatar && !currentUser.avatar.includes("cart") ? currentUser.avatar : null) ||
                    getAuthorAvatarByNameOrEmail(previewAuthorName, currentUser?.email) ||
                    resolveUserAvatar({ name: previewAuthorName, email: currentUser?.email, avatar: currentUser?.avatar }) ||
                    "/author_bluesuit.jpg";

                  const displayDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

                  return (
                    <div className="flex items-center gap-3.5 mb-4 pb-3.5 border-b border-zinc-200 font-sans">
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-[#1E293B] flex-shrink-0 border border-zinc-300 flex items-center justify-center text-white font-bold text-sm">
                        {resolvedAvatar ? (
                          <img
                            src={resolvedAvatar}
                            alt={previewAuthorName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{(previewAuthorName || "RM").slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[14px] font-bold text-black font-sans leading-tight">
                            By <span className="underline hover:text-[#BF1E2D] transition-colors">{previewAuthorName}</span>
                          </p>
                          <svg className="w-4 h-4 text-[#BF1E2D]" fill="currentColor" viewBox="0 0 24 24" aria-label="Verified Journalist">
                            <title>Verified Journalist</title>
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.34-1.89-4.24-4.23-4.24-.496 0-.966.084-1.4.238C14.31 2.225 12.94 1.35 11.36 1.35c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.34 0-4.24 1.89-4.24 4.23 0 .496.084.966.238 1.4C1.225 9.55.35 10.92.35 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.34 1.89 4.24 4.23 4.24.496 0 .966-.084 1.4-.238.65 1.273 2.02 2.148 3.6 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.34 0 4.24-1.89 4.24-4.23 0-.496-.084-.966-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.28 4.29l-4.11-4.11 1.41-1.41 2.7 2.7 6.44-6.44 1.41 1.41-7.85 7.85z"/>
                          </svg>
                        </div>
                        <p className="text-[12px] text-zinc-500 mt-0.5">{displayDate}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* FEATURED COVER IMAGE (ONLY IF NOT INLINED IN CONTENT) */}
                {imageUrl && !content.includes(imageUrl) && !content.includes("<img") && !content.includes("<figure") && (
                  <div className="w-full max-h-[520px] rounded-2xl overflow-hidden mb-5 border border-slate-200 shadow-sm flex items-center justify-center bg-transparent">
                    <img
                      src={imageUrl}
                      alt={title || "Article Image"}
                      className="w-full h-auto max-h-[520px] object-cover mx-auto block"
                    />
                  </div>
                )}

                {/* ARTICLE BODY & INLINE IMAGES CANVAS */}
                <div className="prose prose-slate max-w-none text-zinc-900 leading-[1.8] font-poppins article-body-poppins text-[17px] md:text-[18px] space-y-4 flow-root [&_figure]:my-5 [&_figure]:max-w-full [&_figcaption]:flex [&_figcaption]:items-center [&_figcaption]:justify-between [&_figcaption]:gap-3 [&_figcaption]:text-xs [&_figcaption]:text-slate-500 [&_figcaption]:mt-1.5 [&_a]:text-[#BF1E2D] [&_a]:font-semibold [&_a]:underline hover:[&_a]:text-[#901320] [&_b]:font-bold [&_strong]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-[#F97316] [&_blockquote]:pl-4 [&_blockquote]:py-2.5 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-slate-700 [&_blockquote]:bg-slate-50/80 [&_blockquote]:rounded-r-xl [&_pre]:bg-slate-100/90 [&_pre]:p-3.5 [&_pre]:my-4 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-200/80 [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-sm [&_pre]:text-slate-800 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6">
                  {(() => {
                    if (!content.trim()) {
                      return (
                        <p className="text-slate-400 italic font-sans py-8 border-y border-dashed border-slate-200 my-4 text-center">
                          No article body content written yet. Start writing in the editor to see your live preview here.
                        </p>
                      );
                    }

                    let rawHtml = content;
                    if (rawHtml.includes("&lt;") || rawHtml.includes("&gt;")) {
                      rawHtml = rawHtml
                        .replace(/&lt;/g, "<")
                        .replace(/&gt;/g, ">")
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&amp;/g, "&");
                    }
                    rawHtml = processContentLinks(rawHtml);

                    return (
                      <div
                        className="font-poppins article-body-poppins flow-root clear-both"
                        dangerouslySetInnerHTML={{ __html: rawHtml }}
                      />
                    );
                  })()}
                </div>

                {/* HASHTAGS SECTION */}
                {tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {tags.map((t) => {
                      const cleanTag = (t || "").replace(/^#+/, "").trim();
                      if (!cleanTag) return null;
                      return (
                        <span
                          key={cleanTag}
                          className="text-slate-800 hover:text-[#BF1E2D] font-bold text-xs cursor-pointer transition-colors"
                        >
                          #{cleanTag}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* AUTHOR METADATA BOX UNDER ARTICLE ("WRITTEN BY") */}
                {(() => {
                  const activeProf = getUserProfile(currentUser?.email || "");
                  const previewAuthorName = activeProf?.name || currentUser?.name || "Rushdhi MR";
                  const resolvedAvatar =
                    (activeProf?.avatar && !activeProf.avatar.includes("cart") ? activeProf.avatar : null) ||
                    (currentUser?.avatar && !currentUser.avatar.includes("cart") ? currentUser.avatar : null) ||
                    getAuthorAvatarByNameOrEmail(previewAuthorName, currentUser?.email) ||
                    resolveUserAvatar({ name: previewAuthorName, email: currentUser?.email, avatar: currentUser?.avatar }) ||
                    "/author_bluesuit.jpg";
                  const authorBio = activeProf?.bio || (currentUser as any)?.bio || `${previewAuthorName} is a journalist for London BigBen.`;

                  return (
                    <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-7 mt-8 pt-6 border-t border-zinc-200 font-sans">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-[#1E293B] flex-shrink-0 border border-zinc-200 flex items-center justify-center text-white font-bold text-xl shadow-2xs">
                        {resolvedAvatar ? (
                          <img src={resolvedAvatar} alt={previewAuthorName} className="w-full h-full object-cover" />
                        ) : (
                          <span>{(previewAuthorName || "RM").slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] sm:text-xs font-bold tracking-wider text-black uppercase font-sans mb-1">
                          WRITTEN BY
                        </p>
                        <div className="flex items-center gap-2 flex-wrap mb-3.5">
                          <span className="text-xl sm:text-2xl font-bold text-black font-sans underline underline-offset-4 decoration-2 decoration-black hover:text-[#BF1E2D] transition-colors">
                            {previewAuthorName}
                          </span>
                          <svg className="w-4 h-4 text-[#BF1E2D] shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-label="Verified Journalist">
                            <title>Verified Journalist</title>
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.34-1.89-4.24-4.23-4.24-.496 0-.966.084-1.4.238C14.31 2.225 12.94 1.35 11.36 1.35c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.34 0-4.24 1.89-4.24 4.23 0 .496.084.966.238 1.4C1.225 9.55.35 10.92.35 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.34 1.89 4.24 4.23 4.24.496 0 .966-.084 1.4-.238.65 1.273 2.02 2.148 3.6 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.34 0 4.24-1.89 4.24-4.23 0-.496-.084-.966-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6zm-12.28 4.29l-4.11-4.11 1.41-1.41 2.7 2.7 6.44-6.44 1.41 1.41-7.85 7.85z"/>
                          </svg>
                        </div>

                        <div className="text-[13.5px] sm:text-[14px] text-zinc-900 font-sans leading-relaxed space-y-3">
                          {authorBio.split(/\r?\n+/).map((p: string, pIdx: number) => (
                            <p key={pIdx}>{p.trim()}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* COMMENTS TOGGLE BAR */}
                <div className="font-sans my-6 text-[12px] text-zinc-500">
                  <div className="flex items-center gap-2 font-bold text-black uppercase tracking-wider text-[11.5px]">
                    <span>💬 COMMENTS (0)</span>
                  </div>
                </div>

                {/* INTERACTIVE COMMENTS & OPINIONS SECTION */}
                <div className="mt-8 pt-6 border-t border-zinc-200 font-sans">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-black uppercase tracking-wider font-standard-sans flex items-center gap-2">
                      <MessageSquare size={16} className="text-[#BF1E2D]" />
                      <span>Comments</span>
                      <span className="text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-mono font-bold">
                        0
                      </span>
                    </h3>
                  </div>

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
                      <button
                        type="button"
                        className="bg-[#BF1E2D] hover:bg-[#901320] text-white font-bold text-xs px-5 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send size={12} />
                        <span>Sign In to Comment</span>
                      </button>
                      <button
                        type="button"
                        className="text-xs font-bold text-slate-700 hover:text-[#BF1E2D] px-4 py-2.5 rounded-xl border border-slate-200 bg-white transition-all shadow-2xs cursor-pointer"
                      >
                        Create Free Account
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT SIDEBAR COLUMN: MOST POPULAR & SPONSORED ADS */}
              <div className="lg:col-span-4 lg:pl-4 font-standard-sans border-l border-zinc-100 lg:border-zinc-200 pt-2 lg:pt-0">
                <div className="border-b-2 border-black pb-2 mb-6 w-full flex items-center justify-between">
                  <h3 className="text-[13.5px] font-bold text-black uppercase tracking-wider font-standard-sans">
                    MOST POPULAR IN {(category || "BUSINESS").toUpperCase()}
                  </h3>
                </div>

                {/* Sponsored Sidebar Ad Box */}
                <div className="pt-6 border-t border-zinc-200 mt-6 w-full flex flex-col items-center">
                  <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-400 mb-2 font-bold self-start">
                    SPONSORED
                  </span>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* REJECT ARTICLE REASON MODAL */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative font-sans text-left border border-slate-200">
            {/* Close Button */}
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Reject Article Submission
                </h3>
                <p className="text-xs text-slate-500">
                  Article will be sent to the writer&apos;s rejected queue
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Reason for Rejection (Optional)
              </label>
              <textarea
                placeholder="Give a reason or editorial feedback (optional)..."
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                rows={3}
                className="w-full text-xs text-slate-800 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 focus:bg-white resize-none transition-colors"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                If left blank, the article will be rejected without additional feedback.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectSubmission}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-[#D31220] hover:bg-[#B91C1C] active:scale-[0.98] rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <X size={14} strokeWidth={2.5} />
                <span>{isSubmitting ? "Rejecting..." : "Reject Article"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARTICLE MAIL BOX & TARGETED DISTRIBUTION MODAL */}
      {isMailBoxModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="flex items-start gap-4 p-6 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-900 leading-tight">Article Mail Box &amp; Targeted Distribution</h2>
                <p className="text-sm text-slate-500 mt-0.5 leading-normal">Add specific emails (VIPs, clients, sponsors) to receive this article upon publication.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMailBoxModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer flex-shrink-0 mt-0.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Add Recipient Emails */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800">Add Recipient Emails</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={recipientEmailInput}
                    onChange={(e) => {
                      setRecipientEmailInput(e.target.value);
                      setRecipientEmailError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        const emails = recipientEmailInput.split(/[,\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
                        const invalid = emails.find(em => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em));
                        if (invalid) {
                          setRecipientEmailError(`"${invalid}" is not a valid email address.`);
                          return;
                        }
                        const toAdd = emails.filter(em => !targetedRecipients.includes(em));
                        if (toAdd.length === 0) {
                          setRecipientEmailError("Email already added.");
                          return;
                        }
                        setTargetedRecipients(prev => [...prev, ...toAdd]);
                        setRecipientEmailInput("");
                        setRecipientEmailError("");
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text");
                      const emails = pasted.split(/[,\n\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
                      const invalid = emails.find(em => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em));
                      if (invalid) {
                        setRecipientEmailError(`"${invalid}" is not a valid email address.`);
                        return;
                      }
                      const toAdd = emails.filter(em => !targetedRecipients.includes(em));
                      setTargetedRecipients(prev => [...prev, ...toAdd]);
                      setRecipientEmailInput("");
                      setRecipientEmailError("");
                    }}
                    placeholder="e.g. client@company.com, editor@partner.com"
                    className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-500 placeholder:text-slate-400 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const emails = recipientEmailInput.split(/[,\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
                      if (emails.length === 0) return;
                      const invalid = emails.find(em => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em));
                      if (invalid) {
                        setRecipientEmailError(`"${invalid}" is not a valid email address.`);
                        return;
                      }
                      const toAdd = emails.filter(em => !targetedRecipients.includes(em));
                      if (toAdd.length === 0) {
                        setRecipientEmailError("Email already added.");
                        return;
                      }
                      setTargetedRecipients(prev => [...prev, ...toAdd]);
                      setRecipientEmailInput("");
                      setRecipientEmailError("");
                    }}
                    className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
                {recipientEmailError && (
                  <p className="text-xs text-red-500 font-medium">{recipientEmailError}</p>
                )}
                <p className="text-xs text-amber-600">
                  💡 Press <strong>Enter</strong> or <strong>comma (,)</strong> to add. You can also paste multiple comma-separated emails.
                </p>
              </div>

              {/* Configured Recipients List */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-500">
                  CONFIGURED RECIPIENTS ({targetedRecipients.length})
                </div>
                <div className="border border-slate-200 rounded-xl min-h-[80px] max-h-[180px] overflow-y-auto bg-slate-50/50 p-3">
                  {targetedRecipients.length === 0 ? (
                    <div className="flex items-center justify-center h-14">
                      <p className="text-sm text-slate-400">No custom emails added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {targetedRecipients.map((email) => (
                        <div key={email} className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs">
                          <span className="text-slate-700 font-medium truncate">{email}</span>
                          <button
                            type="button"
                            onClick={() => setTargetedRecipients(prev => prev.filter(e => e !== email))}
                            className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0"
                            title="Remove recipient"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Broadcast to Newsletter Subscribers */}
              <label className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3.5 cursor-pointer hover:bg-blue-100/60 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={broadcastToSubscribers}
                  onChange={(e) => setBroadcastToSubscribers(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4 flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">Broadcast to newsletter subscribers list</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">Send this article notification to all general newsletter subscribers matching this article category.</p>
                </div>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsMailBoxModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-bold text-slate-700 transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  let finalRecipients = [...targetedRecipients];
                  if (recipientEmailInput.trim()) {
                    const emails = recipientEmailInput.split(/[,\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
                    const invalid = emails.find(em => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em));
                    if (invalid) {
                      setRecipientEmailError(`"${invalid}" is not a valid email address.`);
                      return;
                    }
                    const toAdd = emails.filter(em => !finalRecipients.includes(em));
                    finalRecipients = [...finalRecipients, ...toAdd];
                    setTargetedRecipients(finalRecipients);
                    setRecipientEmailInput("");
                    setRecipientEmailError("");
                  }

                  // Persist to current editing post in localStorage if present
                  try {
                    const storedPost = localStorage.getItem("dj_editing_post");
                    if (storedPost && storedPost.trim()) {
                      const parsed = JSON.parse(storedPost);
                      parsed.targetedRecipients = finalRecipients;
                      parsed.broadcastToSubscribers = broadcastToSubscribers;
                      localStorage.setItem("dj_editing_post", JSON.stringify(parsed));
                    }
                  } catch (e) {}

                  setIsMailBoxModalOpen(false);
                }}
                className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-blue-900/20"
              >
                <Check className="w-4 h-4" strokeWidth={3} />
                Save Recipients
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

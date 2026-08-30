"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SEOAssistantPanel from "@/components/SEOAssistantPanel";
import { useAuth } from "@/lib/auth-context";
import { generateAutoSEO, extractFocusKeyword, extractCardSummary } from "@/lib/seo";
import { getUserProfile, resolveUserAvatar, getAuthorAvatarByNameOrEmail } from "@/lib/userProfiles";
import { saveArticleToServer, fetchArticlesFromServer } from "@/lib/articlesSync";
import { convertToWebP, convertHtmlImagesToWebP } from "@/lib/imageUtils";
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
  AlertCircle
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
  "Research"
];

const ALL_SUB_CATEGORIES = [
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
  "Research"
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
  const [imageCaption, setImageCaption] = useState("");
  const [imageCredit, setImageCredit] = useState("");
  const [imageSize, setImageSize] = useState("Full Width (100%)");
  const [imageAlignment, setImageAlignment] = useState("Center (No Wrap)");
  const [imageFileName, setImageFileName] = useState("No file chosen");

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
    if (clean.includes("a+ section 2") || clean.includes("a+ 2") || clean.includes("section 2")) {
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

  const userRole = (auth.user?.role || currentUser?.role || "").toLowerCase();
  const isAdmin = mounted && (userRole === "admin" || userRole === "co-admin" || userRole === "editor" || (auth.user?.email || currentUser?.email || "").toLowerCase().includes("admin"));

  useEffect(() => {
    if (auth.loading) return;

    if (!auth.authenticated || !auth.user) {
      router.push("/login");
      return;
    }

    const uRole = (auth.user.role || "").toLowerCase();
    if (uRole !== "writer" && uRole !== "admin") {
      router.push("/reader");
      return;
    }

    setCurrentUser(auth.user);

    const initPostData = async () => {
      try {
        // Check if editing existing post
        let postToEdit: any = null;

        // 1. Try reading from dj_editing_post
        const storedEditingPost = localStorage.getItem("dj_editing_post");
        if (storedEditingPost) {
          try {
            postToEdit = JSON.parse(storedEditingPost);
          } catch (e) {}
        }

        // 2. Try URL search parameter ?edit=ID
        const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const editId = searchParams?.get("edit");
        const modeParam = searchParams?.get("mode");

        if (modeParam === "review" || (uRole === "admin" && (postToEdit?.status === "Pending review" || postToEdit?.status === "Submitted"))) {
          setIsReviewMode(true);
        }

        if (editId) {
          let foundArticle: any = null;
          try {
            const submittedStr = localStorage.getItem("dj_writer_submitted_articles");
            if (submittedStr) {
              const list: any[] = JSON.parse(submittedStr);
              const found = list.find((p: any) => String(p.id) === String(editId) || (p.title && postToEdit?.title && p.title.trim().toLowerCase() === postToEdit.title.trim().toLowerCase()));
              if (found) foundArticle = found;
            }
          } catch (e) {}

          if (!foundArticle) {
            try {
              const serverArticles = await fetchArticlesFromServer();
              const found = serverArticles.find((p: any) => String(p.id) === String(editId) || (p.title && postToEdit?.title && p.title.trim().toLowerCase() === postToEdit.title.trim().toLowerCase()));
              if (found) foundArticle = found;
            } catch (e) {}
          }

          if (foundArticle) {
            const rawFoundPlacement = foundArticle.placement || (foundArticle.is_featured ? "Home Page A+ Section" : foundArticle.is_editors_pick ? "Editor's Picks" : null);
            const rawStoredPlacement = postToEdit?.placement || (postToEdit?.is_featured ? "Home Page A+ Section" : postToEdit?.is_editors_pick ? "Editor's Picks" : null);
            const finalPlacement = rawStoredPlacement && rawStoredPlacement !== "Standard Post" && rawStoredPlacement !== "None"
              ? rawStoredPlacement
              : (rawFoundPlacement || rawStoredPlacement || "Standard Post");

            postToEdit = {
              ...foundArticle,
              ...(postToEdit || {}),
              placement: finalPlacement,
              is_featured: foundArticle.is_featured ?? postToEdit?.is_featured,
              is_editors_pick: foundArticle.is_editors_pick ?? postToEdit?.is_editors_pick,
              subcategories: (foundArticle.subcategories && foundArticle.subcategories.length > 0)
                ? foundArticle.subcategories
                : (foundArticle.subCategories || postToEdit?.subcategories || postToEdit?.subCategories || []),
              tags: (foundArticle.tags && foundArticle.tags.length > 0)
                ? foundArticle.tags
                : (postToEdit?.tags || []),
              category: postToEdit?.category || foundArticle.category || foundArticle.category_name
            };
          }
        }

        if (postToEdit && postToEdit.id) {
          if (postToEdit.authorName || postToEdit.author_name || postToEdit.authorEmail || postToEdit.authorAvatar) {
            setOriginalAuthor({
              name: postToEdit.authorName || postToEdit.author_name || postToEdit.author,
              email: postToEdit.authorEmail || postToEdit.author_email,
              avatar: postToEdit.authorAvatar || postToEdit.author_avatar,
              bio: postToEdit.authorBio || postToEdit.author_bio
            });
          }
          setEditingPostId(String(postToEdit.id));
          setTitle(postToEdit.title || "");
          setSubheading(postToEdit.summary || postToEdit.subheading || "");

          let mainContent = postToEdit.content || postToEdit.summary || "";
          const postImg = postToEdit.imageUrl || postToEdit.image || postToEdit.image_url || "";
          if (postImg && !mainContent.includes("<img")) {
            const imgTag = `<figure contenteditable="false" style="margin: 1.25rem auto; display: block; max-width: 100%; width: 100%; text-align: left; user-select: none;"><img src="${postImg}" alt="${postToEdit.title || "Article Image"}" draggable="false" style="width: 100%; border-radius: 0; object-fit: cover; display: block; user-select: none;" /></figure><p><br/></p>`;
            mainContent = imgTag + mainContent;
          }
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

          setImageUrl(postToEdit.imageUrl || postToEdit.image || postToEdit.image_url || "");

          let loadedTags: string[] = [];
          if (Array.isArray(postToEdit.tags)) {
            loadedTags = postToEdit.tags;
          } else if (typeof postToEdit.tags === "string") {
            try {
              const parsed = JSON.parse(postToEdit.tags);
              if (Array.isArray(parsed)) loadedTags = parsed;
              else loadedTags = postToEdit.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
            } catch (e) {
              loadedTags = postToEdit.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
            }
          }
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
        }
      } catch (e) {
        console.warn("Failed to load user state or post to edit:", e);
      }
    };

    initPostData();
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
      setImageUrl(imgToEdit.src || "");
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

  const handleInsertImageToCanvas = () => {
    if (!imageUrl.trim()) {
      alert("Please paste an image URL or choose a file.");
      return;
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

    if (selectedImg) {
      // UPDATE EXISTING SELECTED IMAGE
      selectedImg.src = imageUrl.trim();
      selectedImg.alt = rawCap || "Article Image";
      selectedImg.style.cssText = "width: 100%; display: block; border-radius: 0; object-fit: cover;";

      let maxWidthVal = "450px";
      if (imageSize.includes("Small")) maxWidthVal = "300px";
      if (imageSize.includes("Full")) maxWidthVal = "100%";

      const fig = selectedImg.closest("figure");
      if (fig) {
        let alignStyle = "margin: 1.25rem auto; display: block; max-width: 100%;";
        if (imageAlignment.includes("Left")) alignStyle = "float: left; margin: 0.25rem 1rem 0.5rem 0; max-width: 45%; display: block;";
        if (imageAlignment.includes("Right")) alignStyle = "float: right; margin: 0.25rem 0 0.5rem 1rem; max-width: 45%; display: block;";
        fig.style.cssText = `${alignStyle} text-align: left;`;

        let figcaption = fig.querySelector("figcaption");
        if (rawCap || rawCred) {
          if (figcaption) {
            figcaption.innerHTML = captionInnerHtml;
          } else {
            const newCap = document.createElement("figcaption");
            newCap.style.cssText = "display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; font-size: 0.75rem; color: #64748B; margin-top: 0.35rem; width: 100%; font-family: sans-serif; box-sizing: border-box;";
            newCap.innerHTML = captionInnerHtml;
            fig.appendChild(newCap);
          }
        } else if (figcaption) {
          figcaption.remove();
        }
      }

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
    let alignStyle = "margin: 1.25rem auto; display: block; max-width: 100%;";
    if (imageAlignment.includes("Left")) alignStyle = "float: left; margin: 0.25rem 1rem 0.5rem 0; max-width: 45%; display: block;";
    if (imageAlignment.includes("Right")) alignStyle = "float: right; margin: 0.25rem 0 0.5rem 1rem; max-width: 45%; display: block;";

    const captionHtml = (rawCap || rawCred)
      ? `<figcaption style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; font-size: 0.75rem; color: #64748B; margin-top: 0.35rem; width: 100%; font-family: sans-serif; box-sizing: border-box;">
          ${captionInnerHtml}
        </figcaption>`
      : "";

    const imgTag = `<figure contenteditable="false" style="${alignStyle} text-align: left; user-select: none;"><img src="${imageUrl.trim()}" alt="${
      rawCap || "Article Image"
    }" draggable="false" style="width: 100%; border-radius: 0; object-fit: cover; display: block; user-select: none;" />${captionHtml}</figure>`;

    if (editorRef.current) {
      editorRef.current.focus();

      // Restore saved cursor selection if available
      const sel = window.getSelection();
      if (savedSelectionRangeRef.current && sel) {
        try {
          sel.removeAllRanges();
          sel.addRange(savedSelectionRangeRef.current);
        } catch (e) {}
      }

      document.execCommand("insertHTML", false, imgTag);
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

  const [submittingAction, setSubmittingAction] = useState<"draft" | "publish" | null>(null);

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

    let hasImage = !!imageUrl.trim();
    if (!hasImage && editorRef.current) {
      const firstImg = editorRef.current.querySelector("img");
      if (firstImg && firstImg.src) hasImage = true;
    }
    if (!hasImage && currentContent) {
      hasImage = /<img[^>]+src=["'][^"']+["']/i.test(currentContent);
    }

    if (!hasImage) {
      alert("Please insert an image before submitting the article for review.");
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
      let hasImage = !!imageUrl.trim();
      if (!hasImage && editorRef.current) {
        const firstImg = editorRef.current.querySelector("img");
        if (firstImg && firstImg.src) hasImage = true;
      }
      if (!hasImage && currentContent) {
        hasImage = /<img[^>]+src=["'][^"']+["']/i.test(currentContent);
      }
      if (!hasImage) {
        alert("Please insert an image before submitting the article for review.");
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

    let processedImageUrl = imageUrl.trim();
    if (!processedImageUrl && editorRef.current) {
      const firstImg = editorRef.current.querySelector("img");
      if (firstImg && firstImg.src) {
        processedImageUrl = firstImg.src;
      }
    }
    if (!processedImageUrl && bodyContent) {
      const match = bodyContent.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match) {
        processedImageUrl = match[1];
      }
    }

    if (status === "Pending review" || status === "Published") {
      if (!processedImageUrl) {
        alert("Please insert an image before submitting the article for review.");
        setIsSubmitting(false);
        setSubmittingAction(null);
        return;
      }
    }

    if (processedImageUrl && !processedImageUrl.startsWith("data:image/webp") && !processedImageUrl.endsWith(".webp") && processedImageUrl.startsWith("data:image/")) {
      try {
        processedImageUrl = await convertToWebP(processedImageUrl, 0.85);
      } catch (e) {
        console.warn("WebP cover conversion notice:", e);
      }
    }

    let activeEmail = "";
    let activeName = "";
    let activeAvatar = "";
    let activeBio = "";
    try {
      const userStr = localStorage.getItem("dj_user") || localStorage.getItem("dj_writer_user");
      if (userStr) {
        const parsed = JSON.parse(userStr);
        activeEmail = parsed.email || "";
        activeName = parsed.name || "";
        activeAvatar = parsed.avatar || "";
        activeBio = parsed.bio || "";
      }
    } catch (e) {
      console.warn("Could not read current user for article:", e);
    }

    const userRole = (currentUser?.role || auth.user?.role || "").toLowerCase();
    const isAdmin = userRole === "admin" || userRole === "co-admin";

    let finalAuthorName = "";
    let finalAuthorEmail = "";
    let finalAuthorAvatar = "";
    let finalAuthorBio = "";

    if (editingPostId && originalAuthor?.name && (isAdmin || !originalAuthor.name.toLowerCase().includes("admin"))) {
      finalAuthorName = originalAuthor.name;
      finalAuthorEmail = originalAuthor.email || auth.user?.email || currentUser?.email || "writer@digitaljournal.com";
      finalAuthorAvatar = originalAuthor.avatar || resolveUserAvatar({ name: finalAuthorName, email: finalAuthorEmail, role: "Writer" });
      finalAuthorBio = originalAuthor.bio || `${finalAuthorName} is a journalist for London BigBen.`;
    } else {
      const activeUserEmail = auth.user?.email || currentUser?.email || activeEmail || "";
      const savedProf = getUserProfile(activeUserEmail);
      finalAuthorName = auth.user?.name || currentUser?.name || savedProf?.name || activeName || "Writer";
      finalAuthorEmail = activeUserEmail || "writer@digitaljournal.com";
      finalAuthorAvatar = resolveUserAvatar({ name: finalAuthorName, email: finalAuthorEmail, role: "Writer", avatar: savedProf?.avatar || auth.user?.avatar || currentUser?.avatar });
      finalAuthorBio = savedProf?.bio || (auth.user as any)?.bio || (currentUser as any)?.bio || activeBio || `${finalAuthorName} is a journalist for London BigBen.`;
    }

    const autoSeo = generateAutoSEO({
      title: title.trim(),
      subheading: subheading.trim(),
      content: bodyContent.trim(),
      category: category.toLowerCase(),
      authorName: finalAuthorName,
      imageUrl: processedImageUrl || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=350&fit=crop",
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

    const postToSave = {
      id: editingPostId || `post-${Date.now()}`,
      title: title.trim(),
      slug: title.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
      category: category,
      subheading: subheading.trim() || title.trim(),
      summary: subheading.trim() || title.trim(),
      content: bodyContent.trim(),
      imageUrl: processedImageUrl || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=350&fit=crop",
      status: status,
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
      tags: tags,
      subcategories: selectedSubcategories,
      readDuration: readDuration,
      authorEmail: finalAuthorEmail,
      authorName: finalAuthorName,
      authorAvatar: finalAuthorAvatar,
      authorBio: finalAuthorBio,
      seo: autoSeo
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
        const existingList: any[] = subsStr ? JSON.parse(subsStr) : [];
        const targetId = String(postToSave.id);
        const targetTitle = postToSave.title.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        
        let foundInSubs = false;
        const updatedList = existingList.map((p: any) => {
          const pTitle = (p.title || "").trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
          if (String(p.id) === targetId || (pTitle && pTitle === targetTitle)) {
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

        localStorage.setItem("dj_writer_submitted_articles", JSON.stringify(deduplicatedList));

        // Also update live articles cache directly
        const { getCachedArticles, setCachedArticles } = await import("@/lib/articlesSync");
        const cached = getCachedArticles();
        let foundInCache = false;
        const updatedCache = cached.map((a: any) => {
          const aTitle = (a.title || "").trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
          if (String(a.id) === targetId || (aTitle && aTitle === targetTitle)) {
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

      saveArticleToServer(postToSave).catch(err => console.warn("Background server save:", err));

      try {
        localStorage.setItem(
          "dj_toast",
          status === "Published"
            ? `✓ Article "${title.trim().slice(0, 35)}..." published live to homepage!`
            : status === "Pending review"
            ? `✓ Story "${title.trim()}" submitted for review! Admin approval is pending before publication.`
            : `✓ Draft "${title.trim()}" saved successfully.`
        );
        localStorage.setItem("dj_active_tab", status === "Published" ? "Published" : status === "Pending review" ? "Pending review" : "Drafts");
      } catch (e) {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dj_articles_updated"));
      }
    } catch (err) {
      console.warn("Error saving post to server store:", err);
    }

    try {
      localStorage.setItem("dj_active_tab", status === "Published" ? "Published" : status === "Pending review" ? "Pending review" : "Drafts");
    } catch (e) {}

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittingAction(null);
      const userRole = (currentUser?.role || auth.user?.role || "").toLowerCase();
      if (status === "Pending review") {
        router.push("/writer?tab=pending");
        if (typeof window !== "undefined") {
          setTimeout(() => {
            if (window.location.pathname.includes("/writer/create")) {
              window.location.href = "/writer?tab=pending";
            }
          }, 300);
        }
      } else if (status === "Published") {
        if (userRole === "admin" || userRole === "co-admin") {
          router.push("/");
        } else {
          router.push("/writer?tab=published");
        }
      } else {
        router.push("/writer?tab=drafts");
      }
    }, 200);
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

      let liveImageUrl = imageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&h=800&fit=crop";
      if (liveImageUrl && !liveImageUrl.startsWith("data:image/webp") && !liveImageUrl.endsWith(".webp") && liveImageUrl.startsWith("data:image/")) {
        try {
          liveImageUrl = await convertToWebP(liveImageUrl, 0.85);
        } catch (e) {
          console.warn("WebP cover conversion notice during approval:", e);
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
          if (subsStr) {
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
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        authorName: finalAuthorName,
        authorAvatar: finalAuthorAvatar,
        authorEmail: finalAuthorEmail,
        authorBio: finalAuthorBio
      };

      // 1. Update writer submitted articles store in localStorage
      const subsStr = localStorage.getItem("dj_writer_submitted_articles");
      if (subsStr) {
        const parsed = JSON.parse(subsStr);
        const updated = parsed.map((p: any) => 
          (String(p.id) === String(editingPostId) || p.title.trim().toLowerCase() === liveTitle.toLowerCase())
            ? { ...p, ...approvedArticle, status: "Published" }
            : p
        );
        localStorage.setItem("dj_writer_submitted_articles", JSON.stringify(updated));
      }

      // 2. Save / publish to server API
      await saveArticleToServer(approvedArticle as any);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dj_articles_updated"));
      }

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
    setIsSubmitting(true);
    try {
      const liveTitle = title.trim() || "Untitled Article";
      const rejectionReason = rejectionReasonInput.trim() || undefined;
      const rejectedAt = new Date().toISOString();

      const targetAuthorEmail = originalAuthor?.email || (currentUser?.role?.toLowerCase() === "admin" ? "rushdhiriyaj2005@gmail.com" : currentUser?.email || "writer@digitaljournal.com");
      const targetAuthorName = originalAuthor?.name || (currentUser?.role?.toLowerCase() === "admin" ? "Rushdhi MR" : currentUser?.name || "Rushdhi MR");
      const targetAuthorAvatar = originalAuthor?.avatar || currentUser?.avatar || "/author_bluesuit.jpg";

      const rejectedArticle = {
        id: editingPostId || `art_${Date.now()}`,
        title: liveTitle,
        category,
        subcategories: selectedSubcategories,
        tags,
        summary: subheading,
        content: editorRef.current ? editorRef.current.innerHTML : content,
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop",
        status: "Rejected",
        rejectionReason,
        rejectedAt,
        authorEmail: targetAuthorEmail,
        authorName: targetAuthorName,
        authorAvatar: targetAuthorAvatar
      };

      // 1. Update/upsert submissions with status Rejected in localStorage
      const subsStr = localStorage.getItem("dj_writer_submitted_articles");
      let subsList: any[] = [];
      if (subsStr) {
        try {
          subsList = JSON.parse(subsStr);
        } catch (e) {}
      }

      const existingIndex = subsList.findIndex((p: any) =>
        String(p.id) === String(editingPostId) || (p.title && p.title.trim().toLowerCase() === liveTitle.toLowerCase())
      );

      if (existingIndex >= 0) {
        subsList[existingIndex] = {
          ...subsList[existingIndex],
          ...rejectedArticle
        };
      } else {
        subsList.unshift(rejectedArticle);
      }
      localStorage.setItem("dj_writer_submitted_articles", JSON.stringify(subsList));

      // 2. Persist to backend server API
      const { saveArticleToServer } = await import("@/lib/articlesSync");
      await saveArticleToServer(rejectedArticle);

      // 3. Dispatch live sync event across all browser windows/tabs
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dj_articles_updated"));
      }

      setIsRejectModalOpen(false);
      localStorage.setItem("dj_toast", `✓ Article marked as Rejected.`);
      localStorage.removeItem("dj_editing_post");

      router.push("/admin");
    } catch (e) {
      console.warn("Reject submission error:", e);
      setIsRejectModalOpen(false);
      router.push("/admin");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUserAdmin = mounted && ((currentUser?.role || auth.user?.role || "").toLowerCase() === "admin" || (currentUser?.role || auth.user?.role || "").toLowerCase() === "co-admin");

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans antialiased text-slate-900 selection:bg-orange-100 selection:text-orange-900">
      
      {/* FIXED TOP NAVBAR HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0F19] border-b border-slate-800 text-white px-6 py-3 flex items-center justify-between shadow-lg w-full">
        {/* Left Side: Cancel Link & Context Breadcrumb */}
        <div className="flex items-center gap-4">
          <Link
            href={isUserAdmin ? "/admin" : "/writer"}
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

          {isReviewMode || (isAdmin && editingPostId) ? (
            <>
              <button
                type="button"
                onClick={handleRejectToTrash}
                disabled={isSubmitting}
                className="bg-[#8B0000] hover:bg-[#A00000] active:scale-[0.98] text-white font-bold text-[11px] sm:text-xs px-3.5 sm:px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm shadow-red-950/40 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed font-mono"
              >
                <X size={14} strokeWidth={2.5} />
                <span>REJECT TO TRASH</span>
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

              {isAdmin ? (
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
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={isSubmitting}
                  className="bg-[#F97316] hover:bg-[#EA580C] active:scale-[0.98] text-white font-bold text-[10px] sm:text-xs px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 sm:gap-2 shadow-sm shadow-orange-500/20 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-60 disabled:cursor-not-allowed font-mono"
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
                    setImageCaption("");
                    setImageCredit("");
                    setImageFileName("No file chosen");
                    setShowImageModal(true);
                  }
                }}
                className="border border-orange-200 bg-orange-50/80 text-[#F97316] hover:bg-orange-100 font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer uppercase tracking-wider transition-colors shadow-2xs"
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
              className="w-full font-serif text-3xl sm:text-4xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none border-none py-2 mb-2 bg-transparent resize-none leading-tight overflow-hidden whitespace-normal break-words"
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
              className="w-full font-serif text-lg sm:text-xl font-normal text-slate-600 placeholder:text-slate-300 focus:outline-none border-none py-1 mb-6 bg-transparent resize-none leading-relaxed overflow-hidden whitespace-normal break-words"
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
                className="article-content-editor outline-none text-slate-800 leading-relaxed min-h-[420px] pb-24 text-[16px] select-text focus:outline-none focus:ring-0 [&_figure]:cursor-pointer [&_img]:cursor-pointer [&_blockquote]:border-l-4 [&_blockquote]:border-[#F97316] [&_blockquote]:pl-4 [&_blockquote]:py-2.5 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-slate-700 [&_blockquote]:bg-slate-50/80 [&_blockquote]:rounded-r-xl [&_pre]:bg-slate-100/90 [&_pre]:p-3.5 [&_pre]:my-4 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-200/80 [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-sm [&_pre]:text-slate-800 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_li]:my-1"
                style={{
                  minHeight: "420px",
                  lineHeight: "1.85",
                  fontSize: "1.05rem",
                  fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif",
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
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between focus:outline-none focus:border-orange-500 cursor-pointer shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F97316]"></span>
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
                                  ? "bg-orange-50 text-orange-700 font-bold"
                                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span>{cat}</span>
                              {isWorld && (
                                <ChevronRight size={13} className={`text-orange-500 transition-transform ${isWorldActive ? "translate-x-0.5" : ""}`} />
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
                            <span className="text-[10px] font-extrabold uppercase text-orange-600 tracking-wider">
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
                                      ? "bg-orange-100/90 text-orange-800 font-bold"
                                      : "text-slate-700 hover:bg-white hover:text-orange-700 shadow-2xs hover:shadow-xs"
                                  }`}
                                >
                                  <span>{sub}</span>
                                  {isSubSelected && <Check size={12} strokeWidth={3} className="text-orange-600" />}
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
                                ? "bg-[#F97316] border-[#F97316] text-white"
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
                                    ? "bg-[#F97316] border-[#F97316] text-white"
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
                  
                  <div className="border-2 border-orange-500/80 rounded-xl p-3 bg-white focus-within:ring-2 focus-within:ring-orange-500/20 transition-all shadow-xs">
                    {/* Render Active Tag Pills */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 group"
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
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-2xs"
                  />
                </div>

                {/* 5. HOMEPAGE PLACEMENT SECTION */}
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
                      { id: "Home Page A+ Section 2", label: "Home Page A+ Section 2", desc: "Middle dark spotlight banner" },
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
                </div>

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
              <ImageIcon size={20} className="text-[#F97316] flex-shrink-0" />
              <h3 className="text-lg font-serif font-bold text-slate-900">
                {selectedImg ? "Edit / Replace Image" : "Insert Article Image"}
              </h3>
            </div>

            <div className="space-y-4">
              
              {/* CHOOSE COMPUTER FILE / UPLOAD IMAGE */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  CHOOSE IMAGE FILE
                </label>
                
                <label className="border-2 border-dashed border-slate-200 hover:border-orange-300 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-100/50 transition-all flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                        <ImageIcon size={20} />
                      </div>
                    )}
                    <div className="truncate">
                      <span className="text-xs font-semibold text-slate-800 block truncate">
                        {imageFileName || (imageUrl ? "Selected Image" : "No file selected")}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Click to select an image from your computer</span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-lg shrink-0 transition-colors shadow-2xs">
                    Browse
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const baseName = file.name.replace(/\.[^/.]+$/, "");
                        setImageFileName(baseName + ".webp");
                        try {
                          const webpUrl = await convertToWebP(file, 0.85);
                          setImageUrl(webpUrl);
                        } catch (err) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === "string") {
                              setImageUrl(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Field 3: IMAGE CAPTION / ALT TEXT */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  IMAGE CAPTION / ALT TEXT
                </label>
                <input
                  type="text"
                  placeholder="Describe this image..."
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-100 transition-all"
                />
              </div>

              {/* Field 4: IMAGE CREDIT / SOURCE (OPTIONAL) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  IMAGE CREDIT / SOURCE (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Getty Images, AP Photo"
                  value={imageCredit}
                  onChange={(e) => setImageCredit(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-100 transition-all"
                />
              </div>

              {/* Field 5 & 6 (2 columns): IMAGE SIZE & POSITION ALIGNMENT */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    IMAGE SIZE
                  </label>
                  <select
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                  >
                    <option value="Medium (Width: 450px)">Medium (Width: 450px)</option>
                    <option value="Small (Width: 300px)">Small (Width: 300px)</option>
                    <option value="Full Width (100%)">Full Width (100%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    POSITION ALIGNMENT
                  </label>
                  <select
                    value={imageAlignment}
                    onChange={(e) => setImageAlignment(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
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
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleInsertImageToCanvas}
                  className="flex-1 py-3 px-4 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer text-center"
                >
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

          {/* 2. MAIN PREVIEW ARTICLE CONTENT CONTAINER */}
          <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 pt-20 pb-20">
            
            {/* BACK BREADCRUMB & UTILITY ACTIONS BAR */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-8 pt-4">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
              >
                &lt; BACK TO NEWSFEED
              </button>

              <div className="flex items-center gap-2.5">
                {/* Bookmark Button */}
                <button className="w-8 h-8 rounded-full border border-slate-200/90 flex items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors">
                  <Bookmark size={14} />
                </button>

                {/* Share Button */}
                <button className="w-8 h-8 rounded-full border border-slate-200/90 flex items-center justify-center text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors">
                  <Share2 size={14} />
                </button>
              </div>
            </div>

            {/* 2-COLUMN LAYOUT: MAIN ARTICLE (LEFT) & RECENT SIDEBAR (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              
              {/* LEFT COLUMN: MAIN ARTICLE */}
              <div className="lg:col-span-8">
                
                {/* CATEGORY TAG */}
                <span className="text-xs text-[#BF1E2D] tracking-widest font-black uppercase mb-3 block">
                  {category || "BUSINESS"}
                </span>

                {/* HEADLINE TITLE */}
                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
                  {title.trim() || "Untitled Story"}
                </h1>

                {/* SUBHEADING / DECK */}
                {subheading.trim() && (
                  <p className="font-serif text-lg sm:text-xl text-slate-600 italic mb-6 sm:mb-8 leading-relaxed">
                    {subheading.trim()}
                  </p>
                )}

                {/* AUTHOR META ROW */}
                {(() => {
                  const activeProf = getUserProfile(currentUser?.email || "");
                  const previewAuthorName = activeProf?.name || currentUser?.name || "Author";
                  const resolvedAvatar =
                    (activeProf?.avatar && !activeProf.avatar.includes("cart") ? activeProf.avatar : null) ||
                    (currentUser?.avatar && !currentUser.avatar.includes("cart") ? currentUser.avatar : null) ||
                    getAuthorAvatarByNameOrEmail(previewAuthorName, currentUser?.email) ||
                    resolveUserAvatar({ name: previewAuthorName, email: currentUser?.email, avatar: currentUser?.avatar });

                  return (
                    <div className="flex items-center gap-3.5 border-b border-slate-100 pb-3.5 mb-4 mt-4 sm:mt-5">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center bg-slate-100 aspect-square">
                        <img
                          src={resolvedAvatar}
                          alt={previewAuthorName}
                          className="w-full h-full object-cover rounded-full aspect-square"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                          <span>By {previewAuthorName}</span>
                          <a
                            href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(previewAuthorName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-[#0A66C2] hover:text-[#004182] transition-colors p-0.5"
                            title={`Connect with ${previewAuthorName} on LinkedIn`}
                          >
                            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                            </svg>
                          </a>
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans tracking-wide uppercase mt-0.5">
                          PUBLISHED {new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" })} AT 4:12 PM EDT
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* FEATURED COVER IMAGE IN PREVIEW */}
                {imageUrl && !content.includes(imageUrl) && !content.includes("<img") && (
                  <div className="w-full max-h-[520px] rounded-2xl overflow-hidden mb-5 border border-slate-200 shadow-sm flex items-center justify-center bg-transparent">
                    <img
                      src={imageUrl}
                      alt={title || "Article Image"}
                      className="w-full h-auto max-h-[520px] object-cover mx-auto block"
                    />
                  </div>
                )}

                {/* ARTICLE BODY & INLINE IMAGES CANVAS WITH MID-ARTICLE NEWSLETTER WIDGET */}
                <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-serif text-base sm:text-lg space-y-4 flow-root [&_a]:text-[#F97316] [&_a]:font-semibold [&_a]:underline hover:[&_a]:text-[#EA580C] [&_b]:font-bold [&_strong]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6">
                  {(() => {
                    const newsletterWidget = (
                      <div className="clear-both w-full my-8 bg-amber-50/40 border-t-2 border-b-2 border-[#B45309]/30 p-6 md:p-8 text-left not-prose font-sans" style={{ clear: 'both' }}>
                        <h3 className="font-serif text-lg sm:text-xl font-bold text-[#B45309] mb-1">
                          London BigBen Fast Start — Let the best of news come to you
                        </h3>
                        <p className="text-xs text-slate-600 mb-4 font-sans">
                          Sign up and stay up to date with our daily newsletter.
                        </p>

                        <form onSubmit={(e) => e.preventDefault()} className="flex items-center gap-3 flex-wrap">
                          <input
                            type="email"
                            placeholder="Enter your email."
                            className="px-4 py-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#B45309] flex-1 min-w-[220px] max-w-md"
                          />
                          <button
                            type="submit"
                            className="bg-[#B45309] hover:bg-[#92400E] text-white font-bold text-xs uppercase px-6 py-2.5 rounded-md tracking-wider transition-colors cursor-pointer"
                          >
                            SIGN UP NOW
                          </button>
                        </form>

                        <p className="text-[9px] text-slate-400 font-sans mt-2.5">
                          You can unsubscribe at any time. By signing up you are agreeing to our{" "}
                          <a href="#" className="underline text-slate-500">Terms &amp; Conditions</a> and{" "}
                          <a href="#" className="underline text-slate-500">Privacy Policy</a>.
                        </p>
                      </div>
                    );

                    if (!content.trim()) {
                      return (
                        <>
                          <p className="text-slate-400 italic font-sans py-8 border-y border-dashed border-slate-200 my-4 text-center">
                            No article body content written yet. Start writing in the editor to see your live preview here.
                          </p>
                          {newsletterWidget}
                        </>
                      );
                    }

                    // Unescape any encoded HTML entities so the browser renders actual styled images, figures, and text
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

                    const pMatches = rawHtml.split("</p>");
                    if (pMatches.length >= 3) {
                      const mid = Math.min(pMatches.length - 1, Math.max(2, Math.floor(pMatches.length * 0.65)));
                      const firstPart = pMatches.slice(0, mid).join("</p>") + (pMatches[mid - 1]?.includes("</p>") ? "" : "</p>");
                      const secondPart = pMatches.slice(mid).join("</p>");

                      return (
                        <>
                          <div className="flow-root clear-both [&_a]:text-[#BF1E2D] [&_a]:underline [&_a]:font-semibold hover:[&_a]:text-[#901320] transition-colors" dangerouslySetInnerHTML={{ __html: firstPart }} />
                          {newsletterWidget}
                          <div className="flow-root clear-both [&_a]:text-[#BF1E2D] [&_a]:underline [&_a]:font-semibold hover:[&_a]:text-[#901320] transition-colors" dangerouslySetInnerHTML={{ __html: secondPart }} />
                        </>
                      );
                    }

                    return (
                      <>
                        <div className="flow-root clear-both [&_a]:text-[#BF1E2D] [&_a]:underline [&_a]:font-semibold hover:[&_a]:text-[#901320] transition-colors" dangerouslySetInnerHTML={{ __html: rawHtml }} />
                        {newsletterWidget}
                      </>
                    );
                  })()}
                </div>

                {/* HASHTAGS SECTION IN PREVIEW - TEXT ONLY NO BORDERS NO BACKGROUND COLOURS */}
                {tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="text-slate-800 hover:text-[#1B50E8] font-bold text-xs cursor-pointer transition-colors"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* COMMENTS SECTION (MATCHING REFERENCE IMAGE 5) */}
                <div className="pt-6 border-t border-slate-200 mt-10">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare size={16} className="text-slate-800" />
                    <h4 className="font-serif font-bold text-sm text-slate-900 uppercase tracking-wider">
                      COMMENTS (0)
                    </h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                    />
                    <button
                      type="button"
                      className="bg-slate-400 hover:bg-slate-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      POST
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-400 italic mt-2.5">
                    No comments yet. Be the first to share your thoughts.
                  </p>
                </div>

              </div>

              {/* RIGHT SIDEBAR COLUMN: RECENT IN CATEGORY */}
              <div className="lg:col-span-4 pl-0 lg:pl-6 border-l-0 lg:border-l border-slate-100 min-h-[300px]">
                <h3 className="font-serif text-xs font-bold text-slate-900 tracking-wider uppercase border-b-2 border-slate-900 pb-1.5 mb-4">
                  RECENT IN {category.toUpperCase() || "BUSINESS"}
                </h3>
                
                <p className="text-xs text-slate-400 italic font-serif">
                  No other recent articles in this category.
                </p>
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
    </div>
  );
}

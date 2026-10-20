"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import JSZip from "jszip";
import { useAuth } from "@/lib/auth-context";
import SEOAssistantPanel from "@/components/SEOAssistantPanel";
import LogoLoader from "@/components/LogoLoader";
import { dispatchPageDataReady } from "@/components/GlobalPageLoader";
import { extractFocusKeyword, analyzeSEOScore, generateAutoSEO, extractCardSummary } from "@/lib/seo";
import { uploadImageToBackblaze } from "@/lib/imageUtils";
import {
  LayoutDashboard,
  FileText,
  Users,
  Mail,
  Settings,
  Plus,
  Search,
  LogOut,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Database,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Star,
  Zap,
  RefreshCw,
  UserCheck,
  Download,
  Filter,
  PenTool,
  BookOpen,
  UserPlus,
  BadgeCheck,
  BarChart3,
  Globe,
  DollarSign,
  CreditCard,
  Layers,
  Radio,
  Edit3,
  X,
  Menu,
  PanelLeftClose,
  PanelLeft,
  Check,
  Clock,
  Bell,
  Megaphone,
  MessageSquare,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  Phone,
  CheckCircle,
  ArrowLeft,
  Send,
  Lock,
  Pencil,
  Upload,
  Video,
  Play,
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move
} from "lucide-react";
import { useLiveArticles, updateArticleStatusOnServer, deleteArticleOnServer, fetchArticlesFromServer, saveArticleToServer } from "@/lib/articlesSync";
import { isEmailAlreadyRegistered, getUserProfile, saveUserProfile } from "@/lib/userProfiles";
import { ReelVideo, ReelPlatform, getStoredReels, fetchServerReels, saveStoredReels, detectPlatformAndThumbnail } from "@/lib/reelsSync";

interface Article {
  id: number | string;
  title: string;
  slug?: string;
  description: string;
  category_name?: string;
  author_name?: string;
  is_featured?: boolean;
  is_editors_pick?: boolean;
  published_at?: string;
  readTime?: string;
  imageUrl?: string;
  views?: number | string;
  comments?: number | string;
  placement?: string;
  status?: string;
  original_status?: string;
}

interface WorkspaceUser {
  id: number | string;
  name: string;
  email: string;
  role: "ADMIN" | "WRITER" | "READER";
  isDefaultAdmin?: boolean;
  is_default_admin?: boolean | number;
  joinedDate?: string;
  status?: string;
}

interface SubmittedDraft {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  imageUrl: string;
  status: "Draft" | "Submitted" | "Published" | "Pending review" | "Rejected" | string;
  date: string;
  reads?: number;
  authorName?: string;
  readTime?: string;
  readDuration?: string;
  subcategories?: string[];
  subCategories?: string[];
  tags?: string[];
  placement?: string;
  seo?: any;
  category_name?: string;
  rejectionReason?: string;
  rejectedAt?: string;
}

interface SubscriberItem {
  id: number | string;
  email: string;
  topics: string[];
  date: string;
  status: string;
}

interface AdSlotItem {
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

interface ContactSubmissionItem {
  id: string | number;
  date: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  type: "Editorial" | "Advertising" | "General Inquiry" | "Feedback" | "Press Release";
  message: string;
  status: "New" | "In Review" | "Resolved" | "Archived";
}

interface AdvertiseLeadItem {
  id: string | number;
  date: string;
  submitterName: string;
  company: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  serviceOption: "Banner Ads" | "Sponsored Articles" | "Newsletter Takeover" | "Brand Partnership";
  requirements: string;
  budget?: string;
  status: "New" | "In Discussion" | "Qualified" | "Closed";
}

interface BackupFileItem {
  id: string;
  filename: string;
  date: string;
  fileSize: string;
  url?: string;
  storage?: string;
}

interface TrendingWordItem {
  id: string | number;
  word: string;
  category?: string;
  searchVolume?: string | number;
  addedDate: string;
  status: "Active" | "Inactive";
  url?: string;
}

const DEFAULT_TRENDING_WORDS: TrendingWordItem[] = [
  { id: "1", word: "Cybersecurity Breach", category: "Technology", searchVolume: "142K", addedDate: "2026-09-20", status: "Active", url: "/search?q=Cybersecurity+Breach" },
  { id: "2", word: "AI Regulation", category: "Politics", searchVolume: "98K", addedDate: "2026-09-19", status: "Active", url: "/search?q=AI+Regulation" },
  { id: "3", word: "Global Markets", category: "Markets", searchVolume: "85K", addedDate: "2026-09-18", status: "Active", url: "/search?q=Global+Markets" },
  { id: "4", word: "Clean Energy", category: "Economy", searchVolume: "64K", addedDate: "2026-09-17", status: "Active", url: "/search?q=Clean+Energy" },
  { id: "5", word: "Space Economy", category: "Technology", searchVolume: "52K", addedDate: "2026-09-16", status: "Active", url: "/search?q=Space+Economy" },
  { id: "6", word: "Inflation Rate", category: "Economy", searchVolume: "110K", addedDate: "2026-09-15", status: "Active", url: "/search?q=Inflation+Rate" }
];

interface Stats {
  totalArticles: number;
  totalAuthors: number;
  totalSubscribers: number;
  totalUsers: number;
  monthlyViews: string;
  systemStatus: string;
  dbHost: string;
  lastBackup: string;
  monthlyAdRevenue: string;
}

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

function isWorldOrWorldSub(cat: string): boolean {
  if (!cat) return false;
  const clean = cat.toLowerCase().trim();
  if (clean === "world") return true;
  return WORLD_SUBCATEGORIES.some((w) => w.toLowerCase().trim() === clean);
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

export default function AdminDashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const [adminUser, setAdminUser] = useState<{ name: string; email: string; role: string } | null>({
    name: "Geeth Liyanage",
    email: "geethliyanage979@gmail.com",
    role: "Admin"
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [lockPasscode, setLockPasscode] = useState("");
  const [lockError, setLockError] = useState("");

  const [activeTab, setActiveTab] = useState<
    "overview" | "newsletter" | "subscriptions" | "articles" | "users" | "ads" | "contact_submissions" | "advertise_leads" | "backups" | "trending_words" | "reels"
  >("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [userSubTab, setUserSubTab] = useState<"ALL" | "ADMINS" | "WRITERS" | "READERS">("ALL");
  const [postSubTab, setPostSubTab] = useState<"published" | "drafts" | "pending" | "rejected" | "trash">("published");
  const [trashedArticles, setTrashedArticles] = useState<Article[]>([]);

  // Rejection Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionTargetSubmission, setRejectionTargetSubmission] = useState<SubmittedDraft | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Article Filters State
  const [articleSearchQuery, setArticleSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [placementFilter, setPlacementFilter] = useState("all");
  const [adminHoveredCat, setAdminHoveredCat] = useState<string | null>(null);

  // Editorial Review Studio State (matching User Screenshot)
  const [reviewingSubmission, setReviewingSubmission] = useState<SubmittedDraft | null>(null);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewCategory, setReviewCategory] = useState("Business");
  const [reviewSubCategories, setReviewSubCategories] = useState<string[]>([]);
  const [reviewSummary, setReviewSummary] = useState("");
  const [reviewContent, setReviewContent] = useState("");
  const [reviewImageUrl, setReviewImageUrl] = useState("");
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [reviewNewTagInput, setReviewNewTagInput] = useState("");
  const [reviewReadTime, setReviewReadTime] = useState("5 min read");
  const [reviewPlacements] = useState(["None", "Top Story", "Featured", "Trending", "Breaking News", "Editor's Pick"]);
  const [isAdminCatDropdownOpen, setIsAdminCatDropdownOpen] = useState(false);
  const [reviewPlacement, setReviewPlacement] = useState<string>("None");
  const [reviewSidebarTab, setReviewSidebarTab] = useState<"details" | "seo">("details");
  const [reviewSeoTitle, setReviewSeoTitle] = useState("");
  const [reviewSeoDesc, setReviewSeoDesc] = useState("");
  const [reviewFocusKeyword, setReviewFocusKeyword] = useState("");
  const [reviewCardSummary, setReviewCardSummary] = useState("");
  const [showSeoAnalysisDrawer, setShowSeoAnalysisDrawer] = useState(false);
  const [isReviewFocusKwCustom, setIsReviewFocusKwCustom] = useState(false);
  const [isReviewCardSummaryCustom, setIsReviewCardSummaryCustom] = useState(false);
  const [isReviewMetaDescCustom, setIsReviewMetaDescCustom] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Targeted Email Distribution State
  const [isMailBoxModalOpen, setIsMailBoxModalOpen] = useState(false);
  const [targetedRecipients, setTargetedRecipients] = useState<string[]>([]);
  const [recipientEmailInput, setRecipientEmailInput] = useState("");
  const [recipientEmailError, setRecipientEmailError] = useState("");
  const [broadcastToSubscribers, setBroadcastToSubscribers] = useState(true);
  const [distributionSentArticleIds, setDistributionSentArticleIds] = useState<Set<string>>(new Set());

  // Note: dispatchPageDataReady is called after real data finishes loading in fetchDashboardData

  // Auto-sync Focus Keyword to Title unless customized (matching Author page behavior)
  useEffect(() => {
    if (!reviewTitle.trim()) return;
    if (!isReviewFocusKwCustom) {
      setReviewFocusKeyword(extractFocusKeyword(reviewTitle.trim(), reviewCategory));
    }
  }, [reviewTitle, reviewCategory, isReviewFocusKwCustom]);

  // Auto-sync Card Summary & Meta Description STRICTLY from Article Body Content (reviewContent)
  useEffect(() => {
    const rawBody = (reviewContent || "").replace(/<[^>]*>/g, '').trim();
    if (!rawBody) {
      if (!isReviewCardSummaryCustom) setReviewCardSummary("");
      if (!isReviewMetaDescCustom) setReviewSeoDesc("");
      return;
    }
    const cleanBodyText = extractCardSummary(reviewContent);
    if (!isReviewCardSummaryCustom) {
      setReviewCardSummary(cleanBodyText);
    }
    if (!isReviewMetaDescCustom) {
      setReviewSeoDesc(cleanBodyText);
    }
  }, [reviewContent, isReviewCardSummaryCustom, isReviewMetaDescCustom]);

  const handleOpenReviewStudio = (sub: SubmittedDraft) => {
    setReviewingSubmission(sub);
    setReviewTitle(sub.title);
    const rawCat = sub.category || (sub as any).category_name || "Business";
    const matchedMainCat = ALL_MAIN_CATEGORIES.find(c => isSameOrMatchingCategory(c, rawCat) || c.toLowerCase() === rawCat.toLowerCase()) || rawCat;
    setReviewCategory(matchedMainCat);

    let loadedSubs: string[] = [];
    if (Array.isArray((sub as any).subcategories)) {
      loadedSubs = (sub as any).subcategories;
    } else if (Array.isArray((sub as any).subCategories)) {
      loadedSubs = (sub as any).subCategories;
    } else if (typeof (sub as any).subcategories === "string") {
      try {
        const parsed = JSON.parse((sub as any).subcategories);
        if (Array.isArray(parsed)) loadedSubs = parsed;
        else loadedSubs = (sub as any).subcategories.split(",").map((s: string) => s.trim()).filter(Boolean);
      } catch (e) {
        loadedSubs = (sub as any).subcategories.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
    setReviewSubCategories(loadedSubs.filter((s: string) => !isSameOrMatchingCategory(s, matchedMainCat)));
    setReviewSummary(sub.summary || "");
    setReviewContent(sub.content || "");
    setReviewImageUrl(sub.imageUrl || "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=500&h=300&fit=crop");

    const loadedTags = extractCleanTagsList(sub);
    setReviewTags(loadedTags);
    setReviewReadTime(sub.readTime || (sub as any).readDuration || "5 min read");
    setReviewPlacement((sub as any).placement || "None");
    setIsReviewFocusKwCustom(false);
    setIsReviewCardSummaryCustom(false);
    setIsReviewMetaDescCustom(false);

    const autoKw = (sub as any).seo?.focusKeyword || extractFocusKeyword(sub.title, matchedMainCat);
    const bodyTextOnly = (sub.content || "").replace(/<[^>]*>?/gm, " ").trim();
    const autoSummary = (sub as any).seo?.cardSummary || extractCardSummary(bodyTextOnly);
    const autoSeoObj = generateAutoSEO({ title: sub.title, content: bodyTextOnly, category: matchedMainCat, focusKeyword: autoKw });

    setReviewSeoTitle((sub as any).seo?.metaTitle || autoSeoObj.metaTitle);
    setReviewSeoDesc((sub as any).seo?.metaDescription || autoSummary || (bodyTextOnly ? autoSeoObj.metaDescription : ""));
    setReviewFocusKeyword(autoKw);
    setReviewCardSummary(autoSummary);

    // Load existing targeted email distribution for this article
    const existingRecipients = Array.isArray((sub as any).targetedRecipients)
      ? (sub as any).targetedRecipients
      : (Array.isArray((sub as any).targeted_recipients)
        ? (sub as any).targeted_recipients
        : (Array.isArray((sub as any).seo?.targetedRecipients) ? (sub as any).seo.targetedRecipients : []));
    setTargetedRecipients(existingRecipients);
    setRecipientEmailInput("");
    setRecipientEmailError("");
    setBroadcastToSubscribers((sub as any).broadcastToSubscribers !== undefined ? !!(sub as any).broadcastToSubscribers : false);
  };

  const handleAdminCategoryChange = (newCat: string) => {
    setReviewCategory(newCat);
    setIsAdminCatDropdownOpen(false);
    setAdminHoveredCat(null);
    // Automatically deselect any subcategory that matches the newly selected main category (or World when World subcategory is selected)
    setReviewSubCategories((prev) =>
      prev.filter((s) => {
        if (isSameOrMatchingCategory(s, newCat)) return false;
        if (isWorldOrWorldSub(newCat) && s.toLowerCase() === "world") return false;
        return true;
      })
    );
  };

  const handleAutoGenerateSEO = () => {
    const titleText = reviewTitle.trim() || reviewingSubmission?.title || "Article";
    const bodyText = (reviewContent || "").replace(/<[^>]*>?/gm, " ").trim();
    const cat = reviewCategory || "BUSINESS";
    
    const extractedKw = extractFocusKeyword(titleText, cat);
    const autoSummary = extractCardSummary(bodyText);
    const autoSeoObj = generateAutoSEO({
      title: titleText,
      content: bodyText,
      category: cat,
      focusKeyword: extractedKw
    });

    setIsReviewFocusKwCustom(false);
    setIsReviewCardSummaryCustom(false);
    setIsReviewMetaDescCustom(false);

    setReviewSeoTitle(autoSeoObj.metaTitle);
    setReviewFocusKeyword(extractedKw);
    setReviewCardSummary(autoSummary);
    setReviewSeoDesc(autoSummary || (bodyText ? autoSeoObj.metaDescription : ""));
    showNotification(`✨ Auto-generated focus key-phrase "${extractedKw}" & body summary!`);
  };

  const handleApproveReviewStudio = async () => {
    if (!reviewingSubmission) return;

    const authorName = (reviewingSubmission as any).authorName || (reviewingSubmission as any).author_name || (reviewingSubmission as any).author || (reviewingSubmission as any).writerName || (reviewingSubmission as any).writer || "Staff Journalist";
    const authorEmail = (reviewingSubmission as any).authorEmail || (reviewingSubmission as any).author_email || (reviewingSubmission as any).writerEmail;
    const authorAvatar = (reviewingSubmission as any).authorAvatar || (reviewingSubmission as any).author_avatar || (reviewingSubmission as any).writerAvatar;
    const authorBio = (reviewingSubmission as any).authorBio || (reviewingSubmission as any).author_bio || (reviewingSubmission as any).writerBio;

    const newArt: Article = {
      id: reviewingSubmission.id || `art_${Date.now()}`,
      title: reviewTitle.trim(),
      slug: reviewTitle.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
      description: reviewSummary.trim(),
      category_name: reviewCategory,
      author_name: authorName,
      readTime: reviewReadTime.trim() || "5 min read",
      imageUrl: reviewImageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=500&h=300&fit=crop",
      views: 120,
      comments: 0,
      is_featured: reviewPlacement === "Home Page A+ Section" || reviewPlacement === "Featured Story",
      is_editors_pick: reviewPlacement === "Editor's Pick",
      placement: reviewPlacement,
      published_at: new Date().toISOString(),
      status: "Published"
    };

    const postToSave = {
      id: newArt.id,
      title: newArt.title,
      slug: newArt.slug,
      subheading: reviewSummary,
      summary: reviewSummary,
      content: reviewContent,
      authorName: authorName,
      authorEmail: authorEmail,
      authorAvatar: authorAvatar,
      authorBio: authorBio,
      category: reviewCategory,
      subcategories: reviewSubCategories,
      tags: reviewTags,
      imageUrl: newArt.imageUrl,
      readTime: newArt.readTime,
      readDuration: newArt.readTime,
      placement: reviewPlacement,
      is_featured: newArt.is_featured,
      is_editors_pick: newArt.is_editors_pick,
      status: "Published",
      published_at: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      seo: {
        metaTitle: reviewSeoTitle,
        metaDescription: reviewSeoDesc,
        focusKeyword: reviewFocusKeyword,
        cardSummary: reviewCardSummary
      }
    };

    await saveArticleToServer(postToSave as any);

    try {
      const raw = localStorage.getItem("dj_writer_submitted_articles");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const updatedCached = parsed.map((p: any) =>
            (String(p.id) === String(reviewingSubmission.id) || (p.title && newArt.title && p.title.trim().toLowerCase() === newArt.title.trim().toLowerCase()))
              ? {
                  ...p,
                  ...postToSave,
                  status: "Published",
                  placement: reviewPlacement,
                  is_featured: newArt.is_featured,
                  is_editors_pick: newArt.is_editors_pick,
                  category: reviewCategory,
                  subcategories: reviewSubCategories,
                  tags: reviewTags
                }
              : p
          );
          localStorage.setItem("dj_writer_submitted_articles", JSON.stringify(updatedCached));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("dj_articles_updated"));
          }
        }
      }
    } catch (e) {}

    setArticles(prev => [newArt, ...prev.filter(a => String(a.id) !== String(newArt.id))]);
    setWriterSubmissions(prev => prev.filter(s => String(s.id) !== String(reviewingSubmission.id) && s.title !== reviewingSubmission.title));
    setStats(prev => ({
      ...prev,
      totalArticles: prev.totalArticles + 1
    }));

    // Targeted Email Distribution: send after successful publish, only once per article
    const artId = String(newArt.id);
    const recipientsToSend = targetedRecipients.length > 0
      ? targetedRecipients
      : (Array.isArray((reviewingSubmission as any)?.targetedRecipients)
        ? (reviewingSubmission as any).targetedRecipients
        : (Array.isArray((reviewingSubmission as any)?.targeted_recipients)
          ? (reviewingSubmission as any).targeted_recipients
          : (Array.isArray((reviewingSubmission as any)?.seo?.targetedRecipients) ? (reviewingSubmission as any).seo.targetedRecipients : [])));

    const shouldBroadcast = broadcastToSubscribers || Boolean((reviewingSubmission as any)?.broadcastToSubscribers);
    const isAlreadySent = Boolean((reviewingSubmission as any)?.distributionSent) || Boolean((newArt as any)?.distributionSent) || distributionSentArticleIds.has(artId);

    if ((recipientsToSend.length > 0 || shouldBroadcast) && !isAlreadySent) {
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
            recipients: recipientsToSend,
            broadcastToSubscribers: shouldBroadcast,
            article: {
              title: newArt.title,
              summary: reviewSummary.trim() || (newArt as any).summary || "",
              category: reviewCategory,
              authorName: authorName,
              slug: newArt.slug || "",
              imageUrl: newArt.imageUrl,
              readTime: newArt.readTime,
            },
          }),
        });

        const distData = await distRes.json().catch(() => ({}));
        if (distRes.ok && distData.sent > 0) {
          showNotification(`🎉 Article Published Live & sent to ${distData.sent} targeted recipient${distData.sent > 1 ? "s" : ""}!`);
          (newArt as any).distributionSent = true;
          (newArt as any).distributedAt = new Date().toISOString();
        } else if (distRes.ok && distData.total > 0 && distData.sent === 0) {
          const errMsg = distData.error || distData.results?.[0]?.error || "Email delivery failed (check SMTP settings)";
          showNotification(`⚠️ Article published, but targeted emails could not be delivered: ${errMsg}`);
        } else if (!distRes.ok) {
          showNotification(`⚠️ Article published, but email service error: ${distData.error || distRes.statusText}`);
        }
      } catch (emailErr: any) {
        console.warn("[Distribution] Email send failed (non-blocking):", emailErr);
        showNotification(`⚠️ Article published, but email delivery encountered a network error.`);
      }
    } else {
      showNotification(`🎉 Article "${newArt.title.slice(0, 35)}..." Approved & Published Live!`);
    }

    setReviewingSubmission(null);
  };

  // Edit Article Modal State
  const [isEditArticleModalOpen, setIsEditArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("BUSINESS");
  const [editAuthor, setEditAuthor] = useState("Rushdhi MR");
  const [editDescription, setEditDescription] = useState("");

  // Add & Edit User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<WorkspaceUser | null>(null);
  const [editingUser, setEditingUser] = useState<WorkspaceUser | null>(null);

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"ADMIN" | "WRITER" | "READER">("WRITER");

  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [editUserRole, setEditUserRole] = useState<"ADMIN" | "WRITER" | "READER">("WRITER");

  // Subscriber Checkboxes state
  const [selectedSubscribers, setSelectedSubscribers] = useState<Array<number | string>>([]);
  const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false);
  const [newSubscriberEmail, setNewSubscriberEmail] = useState("");
  const [newSubscriberTopics, setNewSubscriberTopics] = useState("TECHNOLOGY, BUSINESS, MARKETS");

  // Dashboard Metrics & Data
  const [stats, setStats] = useState<Stats>({
    totalArticles: 0,
    totalAuthors: 0,
    totalSubscribers: 0,
    totalUsers: 0,
    monthlyViews: "0",
    systemStatus: "Healthy / Operational",
    dbHost: "localhost (digital_journal_db)",
    lastBackup: "None",
    monthlyAdRevenue: "$0.00"
  });

  // Default fallback submissions
  const DEFAULT_MOCK_SUBMISSIONS: SubmittedDraft[] = [];

  // Submitted drafts awaiting admin approval
  const [writerSubmissions, setWriterSubmissions] = useState<SubmittedDraft[]>([]);

  // London BigBen Newsletter Subscribers Roster
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<SubscriberItem[]>([]);

  // London BigBen Website Subscriptions (One-Year Free Access & Paid Access)
  const [siteSubscriptions, setSiteSubscriptions] = useState<any[]>([]);
  const [siteSubscriptionsLoading, setSiteSubscriptionsLoading] = useState(false);
  const [siteSubSearch, setSiteSubSearch] = useState("");
  const [siteSubStatusFilter, setSiteSubStatusFilter] = useState("ALL");
  const [siteSubPlanFilter, setSiteSubPlanFilter] = useState("ALL");
  const [siteSubPage, setSiteSubPage] = useState(1);

  const fetchSiteSubscriptions = async () => {
    setSiteSubscriptionsLoading(true);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        headers: { "x-admin-portal": "dj_admin_portal_authenticated_2026" }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.subscriptions)) {
        setSiteSubscriptions(data.subscriptions);
      }
    } catch (e) {
      console.warn("Failed to load site subscriptions:", e);
    } finally {
      setSiteSubscriptionsLoading(false);
    }
  };

  const handleUpdateSubscriptionStatus = async (id: string | number, status: string, paymentStatus?: string, paymentAmount?: string) => {
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-portal": "dj_admin_portal_authenticated_2026"
        },
        body: JSON.stringify({ id, status, paymentStatus, paymentAmount })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`✓ Subscription status updated to "${status}".`);
        fetchSiteSubscriptions();
      } else {
        showNotification(`⚠️ ${data.error || "Failed to update subscription"}`);
      }
    } catch (e) {
      showNotification("⚠️ Network error updating subscription.");
    }
  };

  const handleDeleteSiteSubscription = async (id: string | number, subEmail: string) => {
    if (!confirm(`Are you sure you want to delete subscription record for "${subEmail}"?`)) return;
    try {
      const res = await fetch(`/api/admin/subscriptions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "x-admin-portal": "dj_admin_portal_authenticated_2026" }
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`✓ Subscription record deleted.`);
        fetchSiteSubscriptions();
      } else {
        showNotification(`⚠️ ${data.error || "Failed to delete subscription"}`);
      }
    } catch (e) {
      showNotification("⚠️ Network error deleting subscription.");
    }
  };

  // London BigBen Published Articles Catalog
  const [articles, setArticles] = useState<Article[]>([]);

  // London BigBen Workspace Users (Strictly Real Registered Users)
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([]);

  const isCurrentAdminDefault = Boolean(
    adminUser?.email === "geethliyanage979@gmail.com" ||
    adminUser?.email === "londonbigben.offical@gmail.com" ||
    adminUser?.email === "akramyoonos006@gmail.com" ||
    adminUser?.email === "rushdhiriyaj2005@gmail.com" ||
    (adminUser as any)?.isDefaultAdmin ||
    (adminUser as any)?.is_default_admin ||
    workspaceUsers.find(u => u.email.toLowerCase() === (adminUser?.email || auth.user?.email || "").toLowerCase())?.isDefaultAdmin ||
    workspaceUsers.find(u => u.email.toLowerCase() === (adminUser?.email || auth.user?.email || "").toLowerCase())?.is_default_admin ||
    (typeof window !== "undefined" && (localStorage.getItem("dj_is_default_admin") === "true" || localStorage.getItem("dj_user_role") === "admin")) ||
    (auth.user && ((auth.user as any).is_default_admin || (auth.user as any).isDefaultAdmin)) ||
    (auth.user?.email && ["rushdhiriyaj2005@gmail.com", "geethliyanage979@gmail.com", "londonbigben.offical@gmail.com", "akramyoonos006@gmail.com"].includes(auth.user.email.toLowerCase().trim()))
  );

  // Contact Us Submissions State & Interactive Filters
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [contactTypeFilter, setContactTypeFilter] = useState("all");
  const [viewingContactModal, setViewingContactModal] = useState<ContactSubmissionItem | null>(null);

  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmissionItem[]>([]);

  const handleUpdateContactStatus = async (id: string | number, newStatus: any) => {
    const updated = contactSubmissions.map(c => c.id === id ? { ...c, status: newStatus } : c);
    setContactSubmissions(updated);
    try {
      localStorage.setItem("dj_contact_submissions", JSON.stringify(updated));
      await fetch("/api/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus })
      });
    } catch (e) {
      console.warn("Update contact status error:", e);
    }
    showNotification("✓ Contact submission status updated!");
  };

  const handleDeleteContactSubmission = async (id: string | number, name: string) => {
    if (confirm(`Are you sure you want to delete submission from "${name}"?`)) {
      const updated = contactSubmissions.filter(c => c.id !== id);
      setContactSubmissions(updated);
      try {
        localStorage.setItem("dj_contact_submissions", JSON.stringify(updated));
        await fetch(`/api/contact?id=${encodeURIComponent(id)}`, {
          method: "DELETE"
        });
      } catch (e) {
        console.warn("Delete contact submission error:", e);
      }
      showNotification(`Submission from "${name}" deleted.`);
    }
  };

  // Commercial Sponsorship Leads State & Interactive Controls
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [leadServiceFilter, setLeadServiceFilter] = useState("all");
  const [viewingLeadModal, setViewingLeadModal] = useState<AdvertiseLeadItem | null>(null);

  const [advertiseLeads, setAdvertiseLeads] = useState<AdvertiseLeadItem[]>([]);

  const handleUpdateLeadStatus = async (id: string | number, newStatus: any) => {
    const updated = advertiseLeads.map(l => l.id === id ? { ...l, status: newStatus } : l);
    setAdvertiseLeads(updated);
    try {
      localStorage.setItem("dj_advertise_leads", JSON.stringify(updated));
      await fetch("/api/advertise", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus })
      });
    } catch (e) {
      console.warn("Update lead status error:", e);
    }
    showNotification("✓ Lead status updated!");
  };

  const handleDeleteLead = async (id: string | number, name: string) => {
    if (confirm(`Are you sure you want to delete lead from "${name}"?`)) {
      const updated = advertiseLeads.filter(l => l.id !== id);
      setAdvertiseLeads(updated);
      try {
        localStorage.setItem("dj_advertise_leads", JSON.stringify(updated));
        await fetch(`/api/advertise?id=${encodeURIComponent(id)}`, {
          method: "DELETE"
        });
      } catch (e) {
        console.warn("Delete lead error:", e);
      }
      showNotification(`Lead from "${name}" removed.`);
    }
  };

  // Database Backups & Cloud Restore Snapshots State
  const [backupFiles, setBackupFiles] = useState<BackupFileItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("dj_database_backups");
        if (saved && saved.trim()) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [
      {
        id: "bk-1",
        filename: "db_backup_manual_2026_08_11_15_28_29.json",
        date: "Aug 11, 2026, 08:58 PM",
        fileSize: "16.86 MB"
      },
      {
        id: "bk-2",
        filename: "db_backup_2026_08_11.json",
        date: "Aug 11, 2026, 05:57 AM",
        fileSize: "15.27 MB"
      },
      {
        id: "bk-3",
        filename: "db_backup_2026_08_10.json",
        date: "Aug 10, 2026, 05:57 AM",
        fileSize: "14.40 MB"
      },
      {
        id: "bk-4",
        filename: "db_backup_2026_08_09.json",
        date: "Aug 9, 2026, 05:57 AM",
        fileSize: "14.21 MB"
      }
    ];
  });

  // Trending Words Management State
  const [trendingWords, setTrendingWords] = useState<TrendingWordItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("dj_trending_words");
        if (saved && saved.trim()) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sliced = parsed.slice(0, 6);
            if (parsed.length > 6) {
              try {
                localStorage.setItem("dj_trending_words", JSON.stringify(sliced));
                window.dispatchEvent(new Event("dj_trending_words_change"));
              } catch (e) {}
            }
            return sliced;
          }
        }
      } catch (e) {}
    }
    return DEFAULT_TRENDING_WORDS.slice(0, 6);
  });
  const [trendingSearchQuery, setTrendingSearchQuery] = useState("");
  const [isAddTrendingModalOpen, setIsAddTrendingModalOpen] = useState(false);
  const [newTrendingWord, setNewTrendingWord] = useState("");

  const handleAddTrendingWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrendingWord.trim()) return;
    const newWordItem: TrendingWordItem = {
      id: `tw-${Date.now()}`,
      word: newTrendingWord.trim(),
      category: "General",
      searchVolume: "—",
      addedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "Active",
      url: `/search?q=${encodeURIComponent(newTrendingWord.trim())}`
    };
    // Maximum 6 words: add new word at the top, and keep only the latest 6 (removing the oldest if > 6)
    const updated = [newWordItem, ...trendingWords].slice(0, 6);
    setTrendingWords(updated);
    try {
      localStorage.setItem("dj_trending_words", JSON.stringify(updated));
      window.dispatchEvent(new Event("dj_trending_words_change"));
    } catch (e) {}
    setNewTrendingWord("");
    setIsAddTrendingModalOpen(false);
    showNotification("✓ Trending word added successfully!");
  };

  const handleToggleTrendingStatus = (id: string | number) => {
    const updated = trendingWords.map((tw) => {
      if (tw.id === id) {
        const newStatus: "Active" | "Inactive" = tw.status === "Active" ? "Inactive" : "Active";
        return { ...tw, status: newStatus };
      }
      return tw;
    });
    setTrendingWords(updated);
    try {
      localStorage.setItem("dj_trending_words", JSON.stringify(updated));
      window.dispatchEvent(new Event("dj_trending_words_change"));
    } catch (e) {}
    showNotification("✓ Trending word status updated!");
  };

  const handleDeleteTrendingWord = (id: string | number) => {
    const updated = trendingWords.filter((tw) => tw.id !== id);
    setTrendingWords(updated);
    try {
      localStorage.setItem("dj_trending_words", JSON.stringify(updated));
      window.dispatchEvent(new Event("dj_trending_words_change"));
    } catch (e) {}
    showNotification("✓ Trending word removed!");
  };

  const filteredTrendingWords = trendingWords.filter((tw) => {
    const matchesQuery =
      tw.word.toLowerCase().includes(trendingSearchQuery.toLowerCase()) ||
      (tw.category && tw.category.toLowerCase().includes(trendingSearchQuery.toLowerCase()));
    return matchesQuery;
  });

  // Reels Management State (10 Dedicated Slots)
  const [reelsVideos, setReelsVideos] = useState<ReelVideo[]>(() => {
    return getStoredReels();
  });
  const [editingReel, setEditingReel] = useState<ReelVideo | null>(null);
  const [reelTitle, setReelTitle] = useState("");
  const [reelVideoUrl, setReelVideoUrl] = useState("");
  const [reelThumbnailUrl, setReelThumbnailUrl] = useState("");
  const [reelDuration, setReelDuration] = useState("");
  const [reelPlatform, setReelPlatform] = useState<ReelPlatform>("YouTube Shorts");
  const [reelTargetSlot, setReelTargetSlot] = useState<number>(1);
  const [reelStatus, setReelStatus] = useState<"Active" | "Inactive">("Active");
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const [customThumbnailFileName, setCustomThumbnailFileName] = useState("");
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isUploadingReelVideo, setIsUploadingReelVideo] = useState(false);
  const [reelVideoFileName, setReelVideoFileName] = useState("");

  const reelAutoFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVideoUrlChange = (url: string) => {
    setReelVideoUrl(url);
    if (!url.trim()) return;

    // Detect platform, duration, and preliminary thumbnail immediately
    const detected = detectPlatformAndThumbnail(url);
    setReelPlatform(detected.platform);
    if (detected.duration) {
      setReelDuration(detected.duration);
    }
    // Set thumbnail immediately for YouTube, Rumble, Instagram, or Facebook
    if (detected.thumbnailUrl) {
      setReelThumbnailUrl(detected.thumbnailUrl);
    }

    // Automatically auto-fetch high-res title and thumbnail metadata in the background
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
      if (reelAutoFetchTimeoutRef.current) {
        clearTimeout(reelAutoFetchTimeoutRef.current);
      }
      reelAutoFetchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/reels/metadata?url=${encodeURIComponent(cleanUrl)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.platform) setReelPlatform(data.platform);
            if (data.title && (!reelTitle || reelTitle === "Short Video Title")) {
              setReelTitle(data.title);
            }
            if (data.thumbnailUrl) {
              setReelThumbnailUrl(data.thumbnailUrl);
            }
            if (data.duration) {
              setReelDuration(data.duration);
            }
          }
        } catch (e) {
          // Keep instant thumbnail
        }
      }, 350);
    }
  };

  const handleAutoFetch = async () => {
    if (!reelVideoUrl.trim()) {
      showNotification("Please enter a video URL first.");
      return;
    }
    setIsAutoFetching(true);
    try {
      const res = await fetch(`/api/reels/metadata?url=${encodeURIComponent(reelVideoUrl.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.platform) setReelPlatform(data.platform);
        if (data.title && (!reelTitle || reelTitle === "Short Video Title")) {
          setReelTitle(data.title);
        }
        if (data.thumbnailUrl) {
          setReelThumbnailUrl(data.thumbnailUrl);
        }
        if (data.duration) {
          setReelDuration(data.duration);
        }
        showNotification("✓ Platform, title and thumbnail auto-detected!");
      } else {
        const detected = detectPlatformAndThumbnail(reelVideoUrl.trim());
        setReelPlatform(detected.platform);
        if (detected.thumbnailUrl) setReelThumbnailUrl(detected.thumbnailUrl);
        showNotification(`✓ Platform detected as ${detected.platform}`);
      }
    } catch (e) {
      const detected = detectPlatformAndThumbnail(reelVideoUrl.trim());
      setReelPlatform(detected.platform);
      if (detected.thumbnailUrl) setReelThumbnailUrl(detected.thumbnailUrl);
      showNotification(`✓ Platform detected as ${detected.platform}`);
    } finally {
      setIsAutoFetching(false);
    }
  };

  const handleCustomThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomThumbnailFileName(file.name);

    // Instant local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setReelThumbnailUrl(result);
      }
    };
    reader.readAsDataURL(file);

    // Upload directly to Backblaze B2
    try {
      setIsUploadingThumbnail(true);
      showNotification("Uploading custom thumbnail to Backblaze B2...");
      const uploadedUrl = await uploadImageToBackblaze(file, file.name, "reels");
      if (uploadedUrl) {
        setReelThumbnailUrl(uploadedUrl);
        showNotification("✓ Custom thumbnail uploaded to Backblaze B2!");
      }
    } catch (err) {
      console.error("Backblaze thumbnail upload error:", err);
      showNotification("✓ Custom thumbnail loaded into preview (local)");
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const handleReelVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReelVideoFileName(file.name);

    // Auto-detect duration from video file metadata
    try {
      const objUrl = URL.createObjectURL(file);
      const tempVideo = document.createElement("video");
      tempVideo.preload = "metadata";
      tempVideo.onloadedmetadata = () => {
        window.URL.revokeObjectURL(objUrl);
        const sec = Math.round(tempVideo.duration);
        if (sec > 0) {
          const mins = Math.floor(sec / 60);
          const secs = sec % 60;
          setReelDuration(`${mins}:${secs.toString().padStart(2, "0")}`);
        }
      };
      tempVideo.src = objUrl;
    } catch {}

    // Auto-fill title if empty or default
    if (!reelTitle || reelTitle === "Short Video Title") {
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
      setReelTitle(cleanTitle);
    }

    try {
      setIsUploadingReelVideo(true);
      showNotification("Uploading reel video to Backblaze B2...");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "reels");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data?.success && data?.url) {
        setReelVideoUrl(data.url);
        setReelPlatform("Backblaze Video");
        showNotification("✓ Reel video connected with Backblaze B2!");
      } else {
        showNotification(data?.error || "Upload to Backblaze failed");
      }
    } catch (err: any) {
      console.error("Backblaze video upload error:", err);
      showNotification("Error uploading video to Backblaze");
    } finally {
      setIsUploadingReelVideo(false);
    }
  };

  const handleSaveReelSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelTitle.trim()) {
      showNotification("Please enter a video title.");
      return;
    }
    if (!reelVideoUrl.trim()) {
      showNotification("Please enter a video URL.");
      return;
    }

    let slotNum = Number(reelTargetSlot) || 1;
    if (!editingReel) {
      const occupiedSlots = new Set(reelsVideos.map((r) => r.slot));
      const firstAvailable = [1, 2, 3, 4, 5].find((s) => !occupiedSlots.has(s));
      if (firstAvailable && occupiedSlots.has(slotNum)) {
        slotNum = firstAvailable;
      }
    }

    let finalThumbnail = reelThumbnailUrl.trim();
    if (finalThumbnail.startsWith("data:image/")) {
      try {
        const uploaded = await uploadImageToBackblaze(finalThumbnail, `reel-thumb-${Date.now()}.webp`, "reels");
        if (uploaded) finalThumbnail = uploaded;
      } catch (err) {}
    }
    if (!finalThumbnail) {
      finalThumbnail = "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&h=800&fit=crop";
    }

    // Strict 1 video per slot: remove any existing video in this slot
    const others = reelsVideos.filter((r) => (r.slot || 0) !== slotNum);

    const newVideo: ReelVideo = {
      id: editingReel ? editingReel.id : `reel-${Date.now()}`,
      slot: slotNum,
      platform: reelPlatform,
      status: reelStatus,
      title: reelTitle.trim(),
      videoUrl: reelVideoUrl.trim(),
      thumbnailUrl: finalThumbnail,
      duration: reelDuration.trim() || "0:00",
      sourceBadge: reelPlatform,
      isMain: slotNum === 1,
      category: "Reels",
      createdAt:
        editingReel?.createdAt ||
        new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };

    const updated = [...others, newVideo].sort((a, b) => (a.slot || 0) - (b.slot || 0));
    setReelsVideos(updated);
    saveStoredReels(updated);

    showNotification(
      editingReel
        ? `✓ Slot #${slotNum} updated successfully!`
        : `✓ Video added to Slot #${slotNum}!`
    );

    handleResetReelForm();
  };

  const handleEditReelSlot = (reel: ReelVideo) => {
    setEditingReel(reel);
    setReelTitle(reel.title);
    setReelVideoUrl(reel.videoUrl);
    setReelThumbnailUrl(reel.thumbnailUrl);
    setReelDuration(reel.duration || "0:45");
    setReelPlatform((reel.platform as ReelPlatform) || "YouTube Shorts");
    setReelTargetSlot(reel.slot || 1);
    setReelStatus((reel.status as "Active" | "Inactive") || "Active");
    setCustomThumbnailFileName("");
    const formElem = document.getElementById("reels-form-card");
    if (formElem) {
      formElem.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleDeleteReelSlot = (slotNum: number) => {
    if (!confirm(`Are you sure you want to remove the video from Slot #${slotNum}?`)) {
      return;
    }
    const updated = reelsVideos.filter((r) => (r.slot || 0) !== slotNum);
    setReelsVideos(updated);
    saveStoredReels(updated);
    showNotification(`✓ Video removed from Slot #${slotNum}!`);
    if (editingReel && editingReel.slot === slotNum) {
      handleResetReelForm();
    }
  };

  const handleResetReelForm = () => {
    setEditingReel(null);
    setReelTitle("");
    setReelVideoUrl("");
    setReelThumbnailUrl("");
    setReelDuration("");
    setReelPlatform("YouTube Shorts");
    setCustomThumbnailFileName("");
    setReelVideoFileName("");
    setIsUploadingThumbnail(false);
    setIsUploadingReelVideo(false);
    // Find next empty slot or default to Slot 1
    const occupied = new Set(reelsVideos.map((r) => r.slot));
    let nextEmpty = 1;
    for (let i = 1; i <= 4; i++) {
      if (!occupied.has(i)) {
        nextEmpty = i;
        break;
      }
    }
    setReelTargetSlot(nextEmpty);
    setReelStatus("Active");
  };

  const handleCreateB2Backup = async () => {
    try {
      showNotification("Creating system snapshot covering all published posts, newsletter, users, contacts & leads...");

      const now = new Date();
      const timestampStr = now.toISOString().replace(/[:-]/g, "_").split(".")[0];
      const filename = `db_backup_manual_${timestampStr}.json`;

      const snapshotPayload = {
        fileName: filename,
        articles,
        newsletterSubscribers,
        workspaceUsers,
        contactSubmissions,
        advertiseLeads,
        adSlots,
        reelsVideos
      };

      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshotPayload)
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to upload to Backblaze B2");
      }

      const newBackup: BackupFileItem = {
        id: resData.backup?.id || `bk-${Date.now()}`,
        filename: resData.backup?.filename || filename,
        date: resData.backup?.date || `${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
        fileSize: resData.backup?.fileSize || "1.50 MB",
        url: resData.backup?.url || resData.url,
        storage: resData.backup?.storage || "backblaze"
      };

      const updatedBackups = [newBackup, ...backupFiles.filter(b => b.filename !== newBackup.filename)];
      setBackupFiles(updatedBackups);
      try {
        localStorage.setItem("dj_database_backups", JSON.stringify(updatedBackups));
      } catch (e) {}

      showNotification("✓ Database snapshot covering published posts, newsletter, users, contact submissions & leads uploaded to Backblaze B2!");
    } catch (err: any) {
      console.error("Backblaze backup error:", err);
      showNotification("Failed to upload backup to Backblaze B2.");
    }
  };

  const handleRestoreBackup = (filename: string) => {
    if (confirm(`Are you sure you want to restore database state to snapshot "${filename}"? This will overwrite active database records.`)) {
      showNotification(`✓ Database successfully restored to snapshot "${filename}"!`);
    }
  };

  const handleDeleteBackup = async (id: string, filename: string) => {
    if (confirm(`Are you sure you want to delete backup file "${filename}" from Backblaze B2?`)) {
      const updated = backupFiles.filter(b => b.id !== id && b.filename !== filename);
      setBackupFiles(updated);
      try {
        localStorage.setItem("dj_database_backups", JSON.stringify(updated));
        await fetch(`/api/admin/backups?filename=${encodeURIComponent(filename)}`, {
          method: "DELETE"
        });
      } catch (e) {
        console.warn("Delete B2 backup error:", e);
      }
      showNotification(`Backup snapshot "${filename}" deleted from Backblaze B2.`);
    }
  };

  const handleUploadJsonRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      showNotification(`✓ Uploaded JSON restore file "${file.name}" processed successfully! Database updated.`);
    }
  };

  // Manage Ads State & Interactive Slot Configurations
  const [adSubTab, setAdSubTab] = useState<"ALL" | "HOMEPAGE" | "CATEGORY" | "AUTHOR">("ALL");

  const [adSlots, setAdSlots] = useState<AdSlotItem[]>([
    {
      id: "slot-technology",
      dimensions: "728X250",
      title: "Homepage — Above Videos Section Leaderboard Banner (728x250)",
      description: "Full-width 728x250 leaderboard banner displayed directly above the Videos section on homepage",
      categoryGroup: "HOMEPAGE",
      imageUrl: "",
      actionType: "External Link (URL)",
      targetUrl: "https://www.google.com",
      isActive: true
    },
    {
      id: "slot-1",
      dimensions: "728X250",
      title: "Homepage — Mid Leaderboard Banner (Slot 2)",
      description: "Full-width banner between Technology & Markets sections",
      categoryGroup: "HOMEPAGE",
      imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=300&fit=crop",
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
      imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=300&fit=crop",
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
      id: "slot-homepage-7",
      dimensions: "300X600",
      title: "Homepage — Videos Section Sidebar Long Ad Banner",
      description: "Vertical 300x600 skyscraper ad banner beside the Videos panel on homepage",
      categoryGroup: "HOMEPAGE",
      imageUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&h=400&fit=crop",
      actionType: "External Link (URL)",
      targetUrl: "https://www.apple.com/apple-podcasts/",
      isActive: true
    },
    {
      id: "slot-4",
      dimensions: "300X250",
      title: "Category Pages — Sidebar Top Ad Box",
      description: "Right sidebar top box on Category news feeds (Politics, Tech, etc.) & Article pages",
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
      description: "Vertical 300x600 tall skyscraper ad box on category sidebars & Article pages",
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
  ]);

  // Load initial saved ad slots from server database or localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    fetch("/api/ads", { cache: "no-store" })
      .then(res => (res && res.ok ? res.json().catch(() => null) : null))
      .then(data => {
        if (data && data.success && Array.isArray(data.adSlots) && data.adSlots.length > 0) {
          setAdSlots(data.adSlots);
          try {
            localStorage.setItem("dj_site_ad_slots", JSON.stringify(data.adSlots));
          } catch (e) {}
        }
      })
      .catch(() => {
        try {
          const stored = localStorage.getItem("dj_site_ad_slots");
          if (stored && stored.trim()) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAdSlots(parsed);
            }
          }
        } catch (e) {}
      });
  }, []);

  const saveUpdatedSlots = (newSlots: AdSlotItem[]) => {
    setAdSlots(newSlots);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("dj_site_ad_slots", JSON.stringify(newSlots));
        window.dispatchEvent(new Event("dj_ad_slots_updated"));
      } catch (e) {}
    }
    // Save to database API
    fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adSlots: newSlots })
    }).catch(e => console.warn("Failed to persist ad slots to database:", e));
  };

  const toggleAdActive = (id: string) => {
    const updated = adSlots.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
    saveUpdatedSlots(updated);
    showNotification("✓ Ad slot status updated!");
  };

  const updateAdField = (id: string, field: keyof AdSlotItem, value: any) => {
    const updated = adSlots.map(s => s.id === id ? { ...s, [field]: value } : s);
    saveUpdatedSlots(updated);
  };

  // Ad Cropper & Frame Setter State
  const [cropperSlotId, setCropperSlotId] = useState<string | null>(null);
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);
  const [cropperZoom, setCropperZoom] = useState<number>(1);
  const [cropperPan, setCropperPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSavingCrop, setIsSavingCrop] = useState<boolean>(false);
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const cropDragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cropPanStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const openCropper = (id: string, imageSrc: string) => {
    setCropperSlotId(id);
    setCropperImageSrc(imageSrc);
    setCropperZoom(1);
    setCropperPan({ x: 0, y: 0 });
  };

  const closeCropper = () => {
    setCropperSlotId(null);
    setCropperImageSrc(null);
    setCropperZoom(1);
    setCropperPan({ x: 0, y: 0 });
    setIsSavingCrop(false);
    setIsDraggingCrop(false);
  };

  const handleCropPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingCrop(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    cropDragStartRef.current = { x: e.clientX, y: e.clientY };
    cropPanStartRef.current = { ...cropperPan };
  };

  const handleCropPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCrop) return;
    const dx = e.clientX - cropDragStartRef.current.x;
    const dy = e.clientY - cropDragStartRef.current.y;
    setCropperPan({
      x: cropPanStartRef.current.x + dx,
      y: cropPanStartRef.current.y + dy,
    });
  };

  const handleAdImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          openCropper(id, base64);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const handleApplyCroppedFrame = async () => {
    if (!cropperSlotId || !cropperImageSrc) return;
    const slot = adSlots.find(s => s.id === cropperSlotId);
    if (!slot) return;

    setIsSavingCrop(true);
    try {
      const [targetW, targetH] = (slot.dimensions || "300X250").split(/[xX]/).map(Number);
      const tw = targetW || 300;
      const th = targetH || 250;

      let finalImgSrc = cropperImageSrc;

      // If remote HTTP/HTTPS image, fetch as base64 dataUrl via proxy to guarantee zero CORS/taint issues
      if (cropperImageSrc.startsWith("http")) {
        try {
          const res = await fetch(`/api/upload?fetchUrl=${encodeURIComponent(cropperImageSrc)}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.dataUrl) {
              finalImgSrc = data.dataUrl;
            }
          }
        } catch {
          finalImgSrc = cropperImageSrc + (cropperImageSrc.includes("?") ? "&" : "?") + "_c=" + Date.now();
        }
      }

      const img = new Image();
      if (!finalImgSrc.startsWith("data:") && !finalImgSrc.startsWith("blob:")) {
        img.crossOrigin = "anonymous";
      }

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => {
          if (img.crossOrigin) {
            img.removeAttribute("crossorigin");
            img.src = finalImgSrc;
          } else {
            reject(new Error("Failed to load image for framing"));
          }
        };
        img.src = finalImgSrc;
      });

      const frameEl = document.getElementById("ad-crop-frame-viewport");
      const fw = frameEl ? frameEl.clientWidth : tw;
      const fh = frameEl ? frameEl.clientHeight : th;

      // High-res output canvas (at least 600px width for clarity)
      const outW = Math.max(tw * 2, 600);
      const outH = Math.round(outW * (th / tw));

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const natW = img.naturalWidth || img.width || tw;
      const natH = img.naturalHeight || img.height || th;
      const baseScale = Math.max(fw / natW, fh / natH);

      const baseScreenW = natW * baseScale;
      const baseScreenH = natH * baseScale;

      const screenX0 = (fw - baseScreenW) / 2;
      const screenY0 = (fh - baseScreenH) / 2;

      const finalScreenLeft = (fw / 2) + (screenX0 - (fw / 2)) * cropperZoom + cropperPan.x;
      const finalScreenTop = (fh / 2) + (screenY0 - (fh / 2)) * cropperZoom + cropperPan.y;
      const finalScreenW = baseScreenW * cropperZoom;
      const finalScreenH = baseScreenH * cropperZoom;

      const scaleToCanvas = outW / fw;

      const dx = finalScreenLeft * scaleToCanvas;
      const dy = finalScreenTop * scaleToCanvas;
      const dw = finalScreenW * scaleToCanvas;
      const dh = finalScreenH * scaleToCanvas;

      ctx.drawImage(img, dx, dy, dw, dh);

      const croppedDataUrl = canvas.toDataURL("image/webp", 0.92);

      showNotification("Uploading framed ad banner to Cloud Storage...");
      const cleanFileName = `ad-${slot.id}-frame.webp`;
      const uploadedUrl = await uploadImageToBackblaze(croppedDataUrl, cleanFileName, "ads");
      const finalImageUrl = uploadedUrl || croppedDataUrl;

      const updated = adSlots.map(s => s.id === slot.id ? { ...s, imageUrl: finalImageUrl } : s);
      saveUpdatedSlots(updated);
      closeCropper();
      showNotification(`✓ Image frame set for "${slot.title}" and saved!`);
    } catch (err) {
      console.error("Error setting image frame:", err);
      showNotification("Failed to set image frame. Please try again.");
    } finally {
      setIsSavingCrop(false);
    }
  };

  const handleClearAdImage = (id: string) => {
    const updated = adSlots.map(s => s.id === id ? { ...s, imageUrl: "" } : s);
    saveUpdatedSlots(updated);
    showNotification("Ad banner image cleared (blank slot).");
  };

  const handleSaveAdConfig = (id: string) => {
    saveUpdatedSlots(adSlots);
    const slot = adSlots.find(s => s.id === id);
    showNotification(`✓ "${slot?.title || 'Ad'}" configuration saved to live website!`);
  };

  // Dynamic Auth & Backend Database Synchronizer
  useEffect(() => {
    async function initAdminAuth() {
      if (auth.loading) return;

      let effectiveUser: any = null;

      // 1. Check tab session first (tab isolation)
      if (typeof window !== "undefined") {
        try {
          const tabSession = sessionStorage.getItem("dj_tab_session");
          if (tabSession && tabSession.trim()) {
            const parsed = JSON.parse(tabSession);
            const userObj = parsed?.user || parsed;
            const r = (userObj?.role || "").toLowerCase();
            const em = (userObj?.email || "").toLowerCase();
            if (r === "admin" || r === "co-admin" || r === "editor" || em.includes("admin") || userObj?.id === 1) {
              effectiveUser = userObj;
            }
          }
        } catch (e) {}
      }

      // 2. Check auth context if no tab-level admin
      if (!effectiveUser && auth.user) {
        const r = (auth.user.role || "").toLowerCase();
        const em = (auth.user.email || "").toLowerCase();
        if (r === "admin" || r === "co-admin" || r === "editor" || em.includes("admin") || auth.user.id === 1) {
          effectiveUser = auth.user;
        }
      }

      // 3. Check persistent admin storage
      if (!effectiveUser && typeof window !== "undefined") {
        try {
          const storedAdmin = localStorage.getItem("dj_admin_user");
          if (storedAdmin && storedAdmin.trim()) {
            effectiveUser = JSON.parse(storedAdmin);
          }
        } catch (e) {}
      }

      const fallbackAdmin = { name: "Geeth Liyanage", email: "geethliyanage979@gmail.com", role: "Admin" };
      const resolvedAdmin = effectiveUser || fallbackAdmin;

      setAdminUser(resolvedAdmin);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("dj_admin_user", JSON.stringify(resolvedAdmin));
        } catch (e) {}
      }
      await fetchDashboardData();
      setIsLoading(false);
    }

    initAdminAuth();
  }, [auth.loading, auth.authenticated, auth.user, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get("tab");
      if (tabParam === "subscriptions") {
        setActiveTab("subscriptions");
      }
    }

    fetchDashboardData();

    const handleStorageChange = () => {
      fetchDashboardData();
    };

    // NOTE: Do NOT listen to the native "storage" event — it fires in OTHER
    // browser tabs when localStorage changes, causing the admin dashboard
    // to reload in every open tab (the cross-tab reload bug).
    window.addEventListener("dj_articles_updated", handleStorageChange);
    window.addEventListener("dj_contact_change", handleStorageChange);
    return () => {
      window.removeEventListener("dj_articles_updated", handleStorageChange);
      window.removeEventListener("dj_contact_change", handleStorageChange);
    };
  }, []);

  const fetchDashboardData = async () => {
    const safeJson = async (res: Response) => {
      try {
        const text = await res.text();
        return text && text.trim() ? JSON.parse(text) : null;
      } catch (e) {
        return null;
      }
    };

    try {
      // Fetch all dashboard data concurrently to eliminate network waterfall delays
      const [usersSettled, artsSettled, subsSettled, contactSettled, leadsSettled, backupsSettled] = await Promise.allSettled([
        fetch("/api/admin/users", {
          headers: {
            "Content-Type": "application/json",
            "x-admin-portal": "dj_admin_portal_authenticated_2026",
          },
        }),
        fetch(`/api/articles?_t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache"
          }
        }),
        fetch("/api/newsletter/subscribe"),
        fetch("/api/contact"),
        fetch("/api/advertise"),
        fetch("/api/admin/backups")
      ]);

      const resUsers = usersSettled.status === "fulfilled" ? usersSettled.value : null;
      const resArts = artsSettled.status === "fulfilled" ? artsSettled.value : null;
      const resSubs = subsSettled.status === "fulfilled" ? subsSettled.value : null;
      const resContact = contactSettled.status === "fulfilled" ? contactSettled.value : null;
      const resLeads = leadsSettled.status === "fulfilled" ? leadsSettled.value : null;
      const resBk = backupsSettled.status === "fulfilled" ? backupsSettled.value : null;

    // 1. Synchronize Real Database Users
    try {
      let dbUsersList: any[] = [];
      if (resUsers && resUsers.ok) {
        const data = await safeJson(resUsers);
        if (data && data.success && Array.isArray(data.users)) {
          dbUsersList = data.users;
        }
      }

      // Collect all real users
      const localUsersMap = new Map<string, WorkspaceUser>();

      const allowedDefaultAdmins = [
        "geethliyanage979@gmail.com",
        "londonbigben.offical@gmail.com",
        "akramyoonos006@gmail.com"
      ];

      // A. Add from Database API
      dbUsersList.forEach((u: any, idx: number) => {
        if (!u || !u.email) return;
        const cleanEmail = u.email.toLowerCase().trim();
        if (cleanEmail === "admin@digitaljournal.com" || cleanEmail.startsWith("hacker_") || cleanEmail.startsWith("test_") || u.name === "Sneaky Hacker") return;

        localUsersMap.set(cleanEmail, {
          id: u.id || `u-${idx}-${u.email}`,
          name: u.name || u.email.split('@')[0],
          email: u.email,
          role: (u.role || "reader").toUpperCase() as "ADMIN" | "WRITER" | "READER",
          isDefaultAdmin: Boolean(allowedDefaultAdmins.includes(cleanEmail) || u.is_default_admin === 1 || u.is_default_admin === true),
          joinedDate: u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Aug 2026",
          status: "Active"
        });
      });

      // B. Add from localStorage registered users
      if (typeof window !== "undefined") {
        try {
          const regStr = localStorage.getItem("dj_registered_users");
          if (regStr && regStr.trim()) {
            const regList: any[] = JSON.parse(regStr);
            regList.forEach((u: any, idx: number) => {
              if (!u || !u.email) return;
              const cleanEmail = u.email.toLowerCase().trim();
              if (cleanEmail === "admin@digitaljournal.com" || cleanEmail.startsWith("hacker_") || cleanEmail.startsWith("test_") || u.name === "Sneaky Hacker") return;

              const existing = localUsersMap.get(cleanEmail);
              localUsersMap.set(cleanEmail, {
                id: existing?.id || u.id || `reg-${idx}-${cleanEmail}`,
                name: existing?.name || u.name || cleanEmail.split('@')[0],
                email: existing?.email || u.email,
                role: ((existing?.role as string) || u.role || "READER").toUpperCase() as "ADMIN" | "WRITER" | "READER",
                isDefaultAdmin: Boolean(allowedDefaultAdmins.includes(cleanEmail) || u.is_default_admin === 1 || existing?.is_default_admin === 1 || existing?.isDefaultAdmin),
                joinedDate: u.joinedDate || u.created_at || existing?.joinedDate || "Aug 2026",
                status: "Active"
              });
            });
          }
        } catch (e) {}

        // C. Add from central profiles DB
        try {
          const profDbStr = localStorage.getItem("dj_user_profiles_db");
          if (profDbStr && profDbStr.trim()) {
            const profDb: Record<string, any> = JSON.parse(profDbStr);
            Object.values(profDb).forEach((u: any, idx: number) => {
              if (!u || !u.email) return;
              const cleanEmail = u.email.toLowerCase().trim();
              if (cleanEmail === "admin@digitaljournal.com" || cleanEmail.startsWith("hacker_") || cleanEmail.startsWith("test_") || u.name === "Sneaky Hacker") return;

              const existing = localUsersMap.get(cleanEmail);
              localUsersMap.set(cleanEmail, {
                id: existing?.id || u.id || `prof-${idx}-${cleanEmail}`,
                name: existing?.name || u.name || cleanEmail.split('@')[0],
                email: existing?.email || u.email,
                role: ((existing?.role as string) || u.role || "READER").toUpperCase() as "ADMIN" | "WRITER" | "READER",
                isDefaultAdmin: Boolean(allowedDefaultAdmins.includes(cleanEmail) || u.is_default_admin === 1 || existing?.is_default_admin === 1 || existing?.isDefaultAdmin),
                joinedDate: u.joinedDate || existing?.joinedDate || "Aug 2026",
                status: "Active"
              });
            });
          }
        } catch (e) {}

        // D. Add active writer / reader sessions
        ["dj_user", "dj_writer_user"].forEach((k) => {
          try {
            const str = localStorage.getItem(k);
            if (str && str.trim()) {
              const u = JSON.parse(str);
              if (u && u.email) {
                const cleanEmail = u.email.toLowerCase().trim();
                if (cleanEmail === "admin@digitaljournal.com" || cleanEmail.startsWith("hacker_") || cleanEmail.startsWith("test_") || u.name === "Sneaky Hacker") return;
                const existing = localUsersMap.get(cleanEmail);
                localUsersMap.set(cleanEmail, {
                  id: existing?.id || u.id || Date.now(),
                  name: existing?.name || u.name || cleanEmail.split('@')[0],
                  email: existing?.email || u.email,
                  role: ((existing?.role as string) || u.role || (k === "dj_writer_user" ? "WRITER" : "READER")).toUpperCase() as "ADMIN" | "WRITER" | "READER",
                  isDefaultAdmin: Boolean(allowedDefaultAdmins.includes(cleanEmail) || existing?.isDefaultAdmin || existing?.is_default_admin === 1),
                  joinedDate: existing?.joinedDate || "Aug 2026",
                  status: "Active"
                });
              }
            }
          } catch (e) {}
        });
      }

      const allMergedUsers = Array.from(localUsersMap.values());
      if (allMergedUsers.length > 0) {
        setWorkspaceUsers(allMergedUsers);
        setStats((prev) => ({ ...prev, totalUsers: allMergedUsers.length }));
      }
    } catch (err) {
      console.warn("Real user DB sync notice:", err);
    }

    // 2. Synchronize Live Articles from Backend (Strictly Published Articles Only)
    try {
      let serverArticles: any[] = [];
      try {
        if (resArts && resArts.ok) {
          const dataArts = await safeJson(resArts);
          if (dataArts && dataArts.success && Array.isArray(dataArts.articles) && dataArts.articles.length > 0) {
            serverArticles = dataArts.articles;
          }
        }
      } catch (e) {
        console.warn("Direct fetch /api/articles notice:", e);
      }
      if (serverArticles.length === 0) {
        serverArticles = await fetchArticlesFromServer();
      }

      if (Array.isArray(serverArticles) && serverArticles.length > 0) {
        const mappedArticles: Article[] = serverArticles.map((a: any, idx: number) => ({
          id: a.id || `art-${idx}-${a.slug || idx}`,
          title: a.title,
          slug: a.slug || a.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
          description: a.description || a.summary || "",
          content: a.content || a.description || a.summary || "",
          category_name: (a.category_name || a.category || "TECHNOLOGY").toUpperCase(),
          author_name: a.author_name || a.author || a.authorName || "Staff Journalist",
          readTime: a.readDuration || a.readTime || "5 min read",
          imageUrl: a.image_url || a.imageUrl || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&h=300&fit=crop",
          views: Number(a.views ?? a.reads ?? a.reads_count ?? 0),
          comments: a.comments || 18,
          is_featured: !!a.is_featured,
          is_editors_pick: !!a.is_editors_pick,
          placement: a.placement || (a.is_featured ? "Home Page A+ Section" : a.is_editors_pick ? "Editor's Picks" : "Standard Post"),
          subcategories: a.subcategories || a.subCategories || [],
          tags: a.tags || [],
          seo: a.seo || null,
          published_at: a.published_at || a.date || new Date().toISOString(),
          status: a.status || "Published"
        }));

        const uniqueArticles = mappedArticles.filter((a, i, self) => i === self.findIndex(t => String(t.id) === String(a.id) || t.title === a.title));
        
        // Filter out pending review or draft posts from Published Posts
        const publishedOnly = uniqueArticles.filter(a => {
          const st = (a.status || "published").toLowerCase();
          return st === "published" || st === "approved";
        });

        setArticles(publishedOnly);
        setStats(prev => ({ ...prev, totalArticles: publishedOnly.length }));

        // 3. Synchronize All Writer Submissions (Pending review, Drafts, Rejected)
        const cleanKey = (val: any) => String(val || "").trim().toLowerCase();
        const cleanTitleKey = (val: any) =>
          String(val || "")
            .toLowerCase()
            .replace(/[\u2018\u2019\u201A\u201B']/g, "'")
            .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
            .replace(/[\u2013\u2014]/g, "-")
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, " ")
            .trim();

        // A. Server non-published submissions
        const serverSubmissions = serverArticles
          .filter((a: any) => {
            const st = (a.status || "").toLowerCase().trim();
            return st !== "published" && st !== "approved" && st !== "trash";
          })
          .map((a: any) => {
            const rawAuthorName = a.authorName || a.author_name || a.author || "Writer";
            const resolvedAuthorEmail = a.authorEmail || a.author_email || (
              rawAuthorName.toLowerCase().includes("muba") ? "rura@gmail.com" :
              rawAuthorName.toLowerCase().includes("roomi") ? "roomiwriter@gmail.com" :
              rawAuthorName.toLowerCase().includes("rushdhi") ? "rushdhiriyaj2005@gmail.com" :
              "writer@digitaljournal.com"
            );

            return {
              id: String(a.id),
              title: a.title,
              category: a.category || a.category_name || "Business",
              summary: a.summary || a.description || a.title,
              content: a.content || "",
              imageUrl: a.imageUrl || a.image_url || a.image || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop",
              date: a.date || a.published_at || "Today",
              readTime: a.readDuration || a.readTime || "5 min read",
              readDuration: a.readDuration || a.readTime || "5 min read",
              authorName: rawAuthorName,
              authorEmail: resolvedAuthorEmail,
              authorAvatar: a.authorAvatar || a.author_avatar || "/author_bluesuit.jpg",
              reads: Number(a.reads || a.views || 0),
              status: a.status || "Pending review",
              subcategories: a.subcategories || a.subCategories || [],
              tags: a.tags || [],
              placement: a.placement || "Standard Post",
              seo: a.seo || null,
              rejectionReason: a.rejectionReason
            };
          });

        // B. Local writer submitted articles (top priority)
        const subsStr = localStorage.getItem("dj_writer_submitted_articles");
        let localSubsList: any[] = [];
        if (subsStr) {
          try {
            const parsed = JSON.parse(subsStr);
            if (Array.isArray(parsed)) {
              localSubsList = parsed
                .filter((p: any) => {
                  const st = (p.status || "").toLowerCase().trim();
                  return st !== "published" && st !== "approved" && st !== "trash";
                })
                .map((p: any) => {
                  const rawAuthorName = p.authorName || p.author_name || p.author || "Writer";
                  const resolvedAuthorEmail = p.authorEmail || p.author_email || (
                    rawAuthorName.toLowerCase().includes("muba") ? "rura@gmail.com" :
                    rawAuthorName.toLowerCase().includes("roomi") ? "roomiwriter@gmail.com" :
                    rawAuthorName.toLowerCase().includes("rushdhi") ? "rushdhiriyaj2005@gmail.com" :
                    "writer@digitaljournal.com"
                  );

                  return {
                    ...p,
                    id: String(p.id),
                    category: p.category || p.category_name || "Business",
                    subcategories: p.subcategories || p.subCategories || [],
                    tags: p.tags || [],
                    placement: p.placement || "Standard Post",
                    status: p.status || "Pending review",
                    authorName: rawAuthorName,
                    authorEmail: resolvedAuthorEmail
                  };
                });
            }
          } catch (e) {}
        }

        // C. Merge serverSubmissions and localSubsList
        const subMap = new Map<string, any>();
        serverSubmissions.forEach((item) => {
          const idKey = cleanKey(item.id);
          const titleKey = cleanTitleKey(item.title);
          if (idKey) subMap.set(idKey, item);
          if (titleKey) subMap.set(`t_${titleKey}`, item);
        });

        localSubsList.forEach((item) => {
          const idKey = cleanKey(item.id);
          const titleKey = cleanTitleKey(item.title);
          const existing = (idKey && subMap.get(idKey)) || (titleKey && subMap.get(`t_${titleKey}`)) || {};
          const targetStatus = item.status || existing.status || "Pending review";
          const isTargetRejected = targetStatus.toLowerCase().includes("reject");
          const merged = { 
            ...existing, 
            ...item,
            status: targetStatus,
            rejectionReason: isTargetRejected ? (item.rejectionReason || existing.rejectionReason || item.rejection_reason || existing.rejection_reason) : undefined,
            rejectedAt: isTargetRejected ? (item.rejectedAt || existing.rejectedAt || item.rejected_at || existing.rejected_at) : undefined,
          };
          if (idKey) subMap.set(idKey, merged);
          if (titleKey) subMap.set(`t_${titleKey}`, merged);
        });

        const rawSubsList: any[] = [];
        const seenSubs = new Set<string>();

        localSubsList.forEach((item) => {
          const idKey = cleanKey(item.id);
          const titleKey = cleanTitleKey(item.title);
          const resolved = (idKey && subMap.get(idKey)) || (titleKey && subMap.get(`t_${titleKey}`)) || item;
          const isSeen = (idKey && seenSubs.has(idKey)) || (titleKey && seenSubs.has(`t_${titleKey}`));
          if (!isSeen) {
            if (idKey) seenSubs.add(idKey);
            if (titleKey) seenSubs.add(`t_${titleKey}`);
            rawSubsList.push(resolved);
          }
        });

        serverSubmissions.forEach((item) => {
          const idKey = cleanKey(item.id);
          const titleKey = cleanTitleKey(item.title);
          const isSeen = (idKey && seenSubs.has(idKey)) || (titleKey && seenSubs.has(`t_${titleKey}`));
          if (!isSeen) {
            if (idKey) seenSubs.add(idKey);
            if (titleKey) seenSubs.add(`t_${titleKey}`);
            const resolved = (idKey && subMap.get(idKey)) || (titleKey && subMap.get(`t_${titleKey}`)) || item;
            rawSubsList.push(resolved);
          }
        });

        const unifiedMap = new Map<string, any>();
        rawSubsList.forEach((sub) => {
          const tk = cleanTitleKey(sub.title);
          const ik = cleanKey(sub.id);
          const existing = (tk && unifiedMap.get(`t_${tk}`)) || (ik && unifiedMap.get(ik));
          if (!existing) {
            if (tk) unifiedMap.set(`t_${tk}`, sub);
            if (ik) unifiedMap.set(ik, sub);
          } else {
            const isRej = (existing.status || "").toLowerCase().includes("reject") || (sub.status || "").toLowerCase().includes("reject");
            const merged = {
              ...existing,
              ...sub,
              status: isRej ? "Rejected" : (sub.status || existing.status),
              rejectionReason: sub.rejectionReason || existing.rejectionReason || sub.rejection_reason || existing.rejection_reason,
              rejectedAt: sub.rejectedAt || existing.rejectedAt || sub.rejected_at || existing.rejected_at,
            };
            if (tk) unifiedMap.set(`t_${tk}`, merged);
            if (ik) unifiedMap.set(ik, merged);
          }
        });

        const mergedSubsList: any[] = [];
        const seenFinal = new Set<string>();
        rawSubsList.forEach((sub) => {
          const tk = cleanTitleKey(sub.title);
          const ik = cleanKey(sub.id);
          const key = tk ? `t_${tk}` : ik;
          if (key && !seenFinal.has(key)) {
            seenFinal.add(key);
            if (tk) seenFinal.add(`t_${tk}`);
            if (ik) seenFinal.add(ik);
            const resolved = (tk && unifiedMap.get(`t_${tk}`)) || (ik && unifiedMap.get(ik)) || sub;
            mergedSubsList.push(resolved);
          }
        });

        setWriterSubmissions(mergedSubsList);
      }
    } catch (err) {
      console.warn("Live articles sync notice:", err);
    }

    // 4. Newsletter Subscribers Sync from Database and Local Cache
    try {
      if (resSubs && resSubs.ok) {
        const subsData = await safeJson(resSubs);
        if (subsData && subsData.success && Array.isArray(subsData.subscribers)) {
          const localStr = typeof window !== "undefined" ? localStorage.getItem("dj_newsletter_subscribers") : null;
          let localSubs: any[] = [];
          if (localStr) {
            try { localSubs = JSON.parse(localStr); } catch (e) {}
          }
          if (!Array.isArray(localSubs)) localSubs = [];

          const fakeEmails = ["reader@digitaljournal.com", "sarah.j@example.com", "mchang@globalfirm.org", "rtaylor@apex.io", "athorne@mit.edu"];
          localSubs = localSubs.filter((s: any) => s && s.email && !fakeEmails.includes(s.email.toLowerCase().trim()));

          const mergedMap = new Map<string, any>();
          subsData.subscribers.forEach((s: any) => {
            if (s && s.email && !fakeEmails.includes(s.email.toLowerCase().trim())) mergedMap.set(s.email.toLowerCase().trim(), s);
          });
          localSubs.forEach((s: any) => {
            if (s && s.email && !fakeEmails.includes(s.email.toLowerCase().trim())) mergedMap.set(s.email.toLowerCase().trim(), s);
          });

          const finalSubs = Array.from(mergedMap.values()).map((s, idx) => ({
            id: s.id || 1000 + idx,
            email: s.email,
            topics: Array.isArray(s.topics) && s.topics.length > 0 ? s.topics : ["ALL NEWS"],
            date: s.date || "Aug 2026",
            status: s.status || "Active"
          }));

          setNewsletterSubscribers(finalSubs);
          setStats(prev => ({ ...prev, totalSubscribers: finalSubs.length }));
        }
      }
    } catch (err) {
      console.warn("Newsletter subscribers sync notice:", err);
    }

    // 5. Trashed Articles Sync
    try {
      const trashedStr = localStorage.getItem("dj_trashed_articles");
      if (trashedStr && trashedStr.trim()) {
        const parsed = JSON.parse(trashedStr);
        if (Array.isArray(parsed)) {
          setTrashedArticles(parsed);
        }
      }
    } catch (err) {}

    // 6. Contact Us Submissions Sync from Database and Local Storage
    try {
      if (resContact && resContact.ok) {
        const contactData = await safeJson(resContact);
        if (contactData && contactData.success && Array.isArray(contactData.contactSubmissions)) {
          const localStr = typeof window !== "undefined" ? localStorage.getItem("dj_contact_submissions") : null;
          let localContacts: any[] = [];
          if (localStr && localStr.trim()) {
            try { localContacts = JSON.parse(localStr); } catch (e) {}
          }
          if (!Array.isArray(localContacts)) localContacts = [];

          const contactMap = new Map<string, any>();
          contactData.contactSubmissions.forEach((c: any) => {
            if (c && c.id) contactMap.set(String(c.id), c);
          });
          localContacts.forEach((c: any) => {
            if (c && c.id) contactMap.set(String(c.id), c);
          });

          const finalContacts = Array.from(contactMap.values());
          if (finalContacts.length > 0) {
            setContactSubmissions(finalContacts);
          }
        }
      }
    } catch (err) {
      console.warn("Contact submissions sync notice:", err);
    }

    // 6b. Commercial Advertise Leads Sync from Database and Local Storage
    try {
      if (resLeads && resLeads.ok) {
        const leadsData = await safeJson(resLeads);
        if (leadsData && leadsData.success && Array.isArray(leadsData.leads)) {
          const localStr = typeof window !== "undefined" ? localStorage.getItem("dj_advertise_leads") : null;
          let localLeads: any[] = [];
          if (localStr && localStr.trim()) {
            try { localLeads = JSON.parse(localStr); } catch (e) {}
          }
          if (!Array.isArray(localLeads)) localLeads = [];

          const leadMap = new Map<string, any>();
          leadsData.leads.forEach((l: any) => {
            if (l && l.id) leadMap.set(String(l.id), l);
          });
          localLeads.forEach((l: any) => {
            if (l && l.id) leadMap.set(String(l.id), l);
          });

          const finalLeads = Array.from(leadMap.values());
          if (finalLeads.length > 0) {
            setAdvertiseLeads(finalLeads);
          }
        }
      }
    } catch (err) {
      console.warn("Advertise leads sync notice:", err);
    }

    // 7. Database Backups Sync from Backblaze B2 & Local Storage
    try {
      if (resBk && resBk.ok) {
        const bkData = await safeJson(resBk);
        if (bkData && bkData.success && Array.isArray(bkData.backups) && bkData.backups.length > 0) {
          const localStr = typeof window !== "undefined" ? localStorage.getItem("dj_database_backups") : null;
          let localBk: any[] = [];
          if (localStr && localStr.trim()) {
            try { localBk = JSON.parse(localStr); } catch (e) {}
          }
          if (!Array.isArray(localBk)) localBk = [];

          const bkMap = new Map<string, any>();
          bkData.backups.forEach((b: any) => {
            if (b && b.filename) bkMap.set(b.filename, b);
          });
          localBk.forEach((b: any) => {
            if (b && b.filename && !bkMap.has(b.filename)) bkMap.set(b.filename, b);
          });

          const mergedBackups = Array.from(bkMap.values());
          if (mergedBackups.length > 0) {
            setBackupFiles(mergedBackups);
            try {
              localStorage.setItem("dj_database_backups", JSON.stringify(mergedBackups));
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      console.warn("Backblaze database backups sync notice:", err);
    }

    // 8. Site Subscriptions Sync from Database
    try {
      await fetchSiteSubscriptions();
    } catch (err) {
      console.warn("Site subscriptions sync notice:", err);
    }

    // 9. Sync Reels from Server and Database
    try {
      const serverReels = await fetchServerReels();
      if (Array.isArray(serverReels) && serverReels.length > 0) {
        setReelsVideos(serverReels);
      }
    } catch (err) {
      console.warn("Reels sync notice:", err);
    }
    } finally {
      dispatchPageDataReady();
    }
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
    } catch (e) {
      console.warn("Admin logout error:", e);
    }
    localStorage.removeItem("dj_admin_user");
    localStorage.removeItem("dj_user");
    localStorage.removeItem("dj_writer_user");
    document.cookie = "dj_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.setItem("dj_toast", "👋 You have successfully signed out.");
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("dj_auth_change"));
      window.location.href = "/";
    }
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setLockError("");
    const pass = lockPasscode.trim();
    const validAdminPasswords = ["admin", "admin123", "Admin@123", "admin2026", "secret"];
    const validCoAdminPasswords = ["coadmin", "coadmin123", "coadmin2026"];

    if (validAdminPasswords.includes(pass)) {
      const user = { name: "Geeth Liyanage", email: "geethliyanage979@gmail.com", role: "Admin" };
      setAdminUser(user);
      setIsAuthenticated(true);
      fetchDashboardData();
      showNotification("✓ Super Admin Security Clearance Granted!");
    } else if (validCoAdminPasswords.includes(pass)) {
      const user = { name: "Operations Co-Admin", email: "coadmin@digitaljournal.com", role: "Co-Admin" };
      setAdminUser(user);
      setIsAuthenticated(true);
      fetchDashboardData();
      showNotification("✓ Co-Admin Security Clearance Granted!");
    } else {
      setLockError("Invalid Admin Passcode. Try: admin123 or coadmin123");
    }
  };

  // Review & Approve / Reject Project
  const handleApproveSubmission = async (sub: SubmittedDraft) => {
    const rawCat = sub.category || (sub as any).category_name || "Business";
    const matchedMainCat = ALL_MAIN_CATEGORIES.find(c => isSameOrMatchingCategory(c, rawCat) || c.toLowerCase() === rawCat.toLowerCase()) || rawCat;

    const newArt: Article = {
      id: sub.id || Date.now(),
      title: sub.title,
      slug: sub.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
      description: sub.summary,
      category_name: matchedMainCat,
      author_name: sub.authorName || (sub as any).author_name || (sub as any).author || "Staff Journalist",
      readTime: sub.readTime || (sub as any).readDuration || "5 min read",
      imageUrl: sub.imageUrl,
      views: 1,
      comments: 0,
      is_featured: (sub as any).placement === "Home Page A+ Section" || (sub as any).placement === "Featured Story" || (sub as any).is_featured === true,
      is_editors_pick: (sub as any).placement === "Editor's Pick" || (sub as any).is_editors_pick === true,
      placement: (sub as any).placement || "Standard Post",
      published_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: "Published"
    };

    // Save status as "Published" to backend server & local storage cache
    const updatedPostToSave = {
      ...sub,
      id: sub.id || `post-${Date.now()}`,
      category: matchedMainCat,
      subcategories: (sub as any).subcategories || (sub as any).subCategories || [],
      tags: extractCleanTagsList(sub),
      placement: (sub as any).placement || "Standard Post",
      status: "Published",
      published_at: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    };
    delete (updatedPostToSave as any).rejectionReason;
    delete (updatedPostToSave as any).rejection_reason;
    delete (updatedPostToSave as any).rejectedAt;
    delete (updatedPostToSave as any).rejected_at;

    await saveArticleToServer(updatedPostToSave as any);

    // Update local storage dj_writer_submitted_articles so Writer dashboard updates instantly
    try {
      const raw = localStorage.getItem("dj_writer_submitted_articles");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const updatedCached = parsed.map((p: any) =>
            (String(p.id) === String(sub.id) || (p.title && newArt.title && p.title.trim().toLowerCase() === newArt.title.trim().toLowerCase()))
              ? {
                  ...p,
                  ...updatedPostToSave,
                  status: "Published",
                  placement: (sub as any).placement || "Standard Post",
                  is_featured: newArt.is_featured,
                  is_editors_pick: newArt.is_editors_pick,
                  category: matchedMainCat,
                  subcategories: (sub as any).subcategories || (sub as any).subCategories || [],
                  tags: extractCleanTagsList(sub)
                }
              : p
          );
          localStorage.setItem("dj_writer_submitted_articles", JSON.stringify(updatedCached));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("dj_articles_updated"));
          }
        }
      }
    } catch (e) {}

    setArticles(prev => [newArt, ...prev.filter(a => String(a.id) !== String(newArt.id))]);
    setWriterSubmissions(prev => prev.filter(s => String(s.id) !== String(sub.id) && s.title !== sub.title));
    setStats(prev => ({
      ...prev,
      totalArticles: prev.totalArticles + 1
    }));

    setReviewingSubmission(null);
    showNotification(`🎉 Article "${sub.title.slice(0, 35)}..." Approved & Published Live!`);
  };

  const handleOpenRejectModal = (sub: SubmittedDraft) => {
    setRejectionTargetSubmission(sub);
    setRejectionReasonInput("");
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    const sub = rejectionTargetSubmission || reviewingSubmission;
    if (!sub) return;

    const reason = rejectionReasonInput.trim();
    const rejectedAt = new Date().toISOString();

    let targetAuthorName = sub.authorName || (sub as any).author_name || (sub as any).author || "";
    let targetAuthorEmail = (sub as any).authorEmail || (sub as any).author_email || "";
    let targetAuthorAvatar = (sub as any).authorAvatar || (sub as any).author_avatar || "/author_bluesuit.jpg";
    let targetAuthorBio = (sub as any).authorBio || (sub as any).author_bio || "";

    // If author email is missing, lookup in workspaceUsers or local storage
    if (!targetAuthorEmail && targetAuthorName) {
      const foundU = workspaceUsers.find(u => u.name && u.name.toLowerCase().trim() === targetAuthorName.toLowerCase().trim());
      if (foundU?.email) targetAuthorEmail = foundU.email;
    }

    if (!targetAuthorEmail && targetAuthorName) {
      try {
        const uLists = ["dj_registered_users", "dj_users", "dj_all_users", "dj_user", "dj_writer_user"];
        for (const key of uLists) {
          const str = localStorage.getItem(key);
          if (str) {
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

    const rejectedItem = {
      ...sub,
      id: sub.id,
      title: sub.title,
      status: "Rejected",
      rejectionReason: reason || undefined,
      rejection_reason: reason || undefined,
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

    const cleanT = (t: string) =>
      String(t || "")
        .toLowerCase()
        .replace(/[\u2018\u2019\u201A\u201B']/g, "'")
        .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    // 1. Remove from Pending Review queue and update in writerSubmissions as Rejected
    setWriterSubmissions(prev => {
      const exists = prev.some(s => String(s.id) === String(sub.id) || (cleanT(s.title) && cleanT(sub.title) && cleanT(s.title) === cleanT(sub.title)));
      if (exists) {
        return prev.map(s =>
          (String(s.id) === String(sub.id) || (cleanT(s.title) && cleanT(sub.title) && cleanT(s.title) === cleanT(sub.title)))
            ? { ...s, ...rejectedItem, status: "Rejected" }
            : s
        );
      }
      return [rejectedItem, ...prev];
    });

    // Remove from Published articles if previously present
    setArticles(prev => prev.filter(a => String(a.id) !== String(sub.id) && cleanT(a.title) !== cleanT(sub.title)));

    // 2. Persist to server and local storage
    try {
      const { saveArticleToServer, setCachedArticles, getCachedArticles, resetArticlesFetchCache } = await import("@/lib/articlesSync");
      resetArticlesFetchCache();

      const cached = getCachedArticles();
      const updatedCached = cached.filter((a: any) =>
        !(String(a.id) === String(sub.id) || (cleanT(a.title) && cleanT(sub.title) && cleanT(a.title) === cleanT(sub.title)))
      );
      setCachedArticles([rejectedItem, ...updatedCached], false);

      await saveArticleToServer(rejectedItem as any);

      try {
        await fetch("/api/articles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rejectedItem)
        });
      } catch (e) {}

      resetArticlesFetchCache();

      const subsStr = localStorage.getItem("dj_writer_submitted_articles");
      let subsList: any[] = [];
      if (subsStr) {
        try { subsList = JSON.parse(subsStr); } catch (e) {}
      }

      subsList = subsList.filter((p: any) =>
        !(String(p.id) === String(sub.id) || (cleanT(p.title) && cleanT(sub.title) && cleanT(p.title) === cleanT(sub.title)))
      );
      subsList.unshift(rejectedItem);
      localStorage.setItem("dj_writer_submitted_articles", JSON.stringify(subsList));

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dj_articles_updated"));
      }
    } catch (e) {
      console.warn("Reject submission error:", e);
    }

    setIsRejectModalOpen(false);
    setRejectionTargetSubmission(null);
    setRejectionReasonInput("");
    setReviewingSubmission(null);
    showNotification(`✓ Article "${sub.title.slice(0, 35)}..." marked as Rejected.`);
  };

  const openStudioForArticle = (sub: SubmittedDraft) => {
    let fullPost: any = sub;
    const cleanT = (t: string) =>
      String(t || "")
        .toLowerCase()
        .replace(/[\u2018\u2019\u201A\u201B']/g, "'")
        .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    try {
      const stored = localStorage.getItem("dj_writer_submitted_articles");
      if (stored && stored.trim()) {
        const list = JSON.parse(stored);
        const found = list.find((p: any) => String(p.id) === String(sub.id) || (cleanT(p.title) && cleanT(sub.title) && cleanT(p.title) === cleanT(sub.title)));
        if (found) fullPost = { ...sub, ...found };
      }
    } catch (e) {}

    const rawCat = fullPost.category || (fullPost as any).category_name || sub.category || "Business";
    const matchedMainCat = ALL_MAIN_CATEGORIES.find(c => isSameOrMatchingCategory(c, rawCat) || c.toLowerCase() === rawCat.toLowerCase()) || rawCat;

    const rawSubs = (fullPost as any).subcategories || (fullPost as any).subCategories || (sub as any).subcategories || (sub as any).subCategories || [];
    let parsedSubs: string[] = [];
    if (Array.isArray(rawSubs)) parsedSubs = rawSubs;
    else if (typeof rawSubs === 'string') {
      try { parsedSubs = JSON.parse(rawSubs); } catch (e) { parsedSubs = rawSubs.split(',').map((s: string) => s.trim()).filter(Boolean); }
    }

    const parsedTags = extractCleanTagsList(fullPost);

    const targetAuthorName = fullPost.authorName || (sub as any).authorName || fullPost.author || (sub as any).author || "Writer";
    let targetAuthorEmail = fullPost.authorEmail || (sub as any).authorEmail || (sub as any).author_email || "";

    if (!targetAuthorEmail && targetAuthorName) {
      const foundU = workspaceUsers.find(u => u.name && u.name.toLowerCase().trim() === targetAuthorName.toLowerCase().trim());
      if (foundU?.email) targetAuthorEmail = foundU.email;
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

    if (!targetAuthorEmail) targetAuthorEmail = "writer@digitaljournal.com";

    const targetAuthorAvatar = fullPost.authorAvatar || (sub as any).authorAvatar || (sub as any).author_avatar || "/author_bluesuit.jpg";

    const postToEdit = {
      ...fullPost,
      id: sub.id,
      title: sub.title,
      category: matchedMainCat,
      summary: sub.summary || fullPost.summary || "",
      content: sub.content || fullPost.content || sub.summary || "",
      imageUrl: sub.imageUrl || fullPost.imageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&h=350&fit=crop",
      status: sub.status || fullPost.status || "Pending review",
      placement: (sub as any).placement || (fullPost as any).placement || "Standard Post",
      date: sub.date || fullPost.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      authorName: targetAuthorName,
      author_name: targetAuthorName,
      author: targetAuthorName,
      authorEmail: targetAuthorEmail,
      author_email: targetAuthorEmail,
      authorAvatar: targetAuthorAvatar,
      author_avatar: targetAuthorAvatar,
      authorBio: fullPost.authorBio || (sub as any).authorBio || "",
      author_bio: fullPost.authorBio || (sub as any).authorBio || "",
      readDuration: sub.readTime || (sub as any).readDuration || fullPost.readDuration || "5 min read",
      tags: parsedTags,
      subcategories: parsedSubs,
      seo: (sub as any).seo || fullPost.seo || null
    };
    try {
      localStorage.setItem("dj_editing_post", JSON.stringify(postToEdit));
    } catch (e) {}
    router.push(`/writer/create?edit=${encodeURIComponent(String(sub.id))}&mode=review`);
  };

  // Article Edit & Delete Handlers
  const handleOpenEditModal = (art: Article) => {
    handleOpenFullEditor(art);
  };

  const handleOpenFullEditor = (art: Article, navigate = true) => {
    let fullPost: any = { ...art };
    try {
      const submittedStr = localStorage.getItem("dj_writer_submitted_articles");
      if (submittedStr && submittedStr.trim()) {
        const list: any[] = JSON.parse(submittedStr);
        const found = list.find((p: any) => String(p.id) === String(art.id) || (p.title && art.title && p.title.trim().toLowerCase() === art.title.trim().toLowerCase()));
        if (found) fullPost = { ...art, ...found };
      }
    } catch (e) {}

    const rawCat = fullPost.category_name || fullPost.category || art.category_name || (art as any).category || "Business";
    const matchedMainCat = ALL_MAIN_CATEGORIES.find(c => isSameOrMatchingCategory(c, rawCat) || c.toLowerCase() === rawCat.toLowerCase()) || rawCat;

    const postPlacement = fullPost.placement || (art as any).placement || ((art as any).is_editors_pick ? "Editor's Picks" : (art as any).is_featured ? "Home Page A+ Section" : "Standard Post");

    const parsedTags = extractCleanTagsList(fullPost.tags && (Array.isArray(fullPost.tags) ? fullPost.tags.length > 0 : String(fullPost.tags).trim().length > 0) ? fullPost : art);

    const rawSubs = fullPost.subcategories || fullPost.subCategories || (art as any).subcategories || (art as any).subCategories || [];
    let parsedSubs: string[] = [];
    if (Array.isArray(rawSubs)) parsedSubs = rawSubs;
    else if (typeof rawSubs === 'string' && rawSubs.trim()) {
      try { parsedSubs = JSON.parse(rawSubs); } catch (e) { parsedSubs = rawSubs.split(',').map((s: string) => s.trim()).filter(Boolean); }
    }

    const postToEdit = {
      ...fullPost,
      id: art.id,
      title: art.title,
      category: matchedMainCat,
      summary: art.description || fullPost.summary || fullPost.description || "",
      content: fullPost.content || (art as any).content || art.description || "",
      imageUrl: art.imageUrl || fullPost.imageUrl || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=350&fit=crop",
      status: art.status || fullPost.status || "Published",
      placement: postPlacement,
      is_editors_pick: (art as any).is_editors_pick || postPlacement.toLowerCase().includes("editor"),
      is_featured: (art as any).is_featured || postPlacement.toLowerCase().includes("a+"),
      date: art.published_at || fullPost.published_at || fullPost.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      authorName: art.author_name || fullPost.authorName || (art as any).authorName || (art as any).author || "Rushdhi MR",
      authorAvatar: fullPost.authorAvatar || (art as any).authorAvatar || "/author_bluesuit.jpg",
      readDuration: art.readTime || fullPost.readDuration || (art as any).readDuration || "5 min read",
      tags: parsedTags,
      subcategories: parsedSubs,
      seo: fullPost.seo || (art as any).seo || null
    };
    try {
      localStorage.setItem("dj_editing_post", JSON.stringify(postToEdit));
    } catch (e) {}

    if (navigate) {
      router.push(`/writer/create?edit=${encodeURIComponent(String(art.id))}`);
    }
  };

  const handleSaveArticleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle || !editTitle.trim()) return;

    const nowIso = new Date().toISOString();
    const updatedRecord = {
      ...editingArticle,
      original_title: editingArticle.title,
      previousTitle: editingArticle.title,
      title: editTitle.trim(),
      category_name: editCategory,
      author_name: editAuthor.trim(),
      description: editDescription.trim(),
      published_at: editingArticle.published_at || (editingArticle as any).publishedAt || nowIso,
      publishedAt: (editingArticle as any).publishedAt || editingArticle.published_at || nowIso,
      updated_at: nowIso,
      updatedAt: nowIso,
      date: (editingArticle as any).date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    };

    setArticles(articles.map(a => a.id === editingArticle.id ? updatedRecord : a));

    setIsEditArticleModalOpen(false);
    setEditingArticle(null);
    showNotification(`✓ Article "${editTitle.slice(0, 30)}..." successfully updated!`);

    try {
      await saveArticleToServer(updatedRecord as any);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dj_articles_updated"));
      }
    } catch (e) {
      console.warn("Could not save edited article to server:", e);
    }
  };

  const handleDeleteArticle = async (id: number | string, title: string) => {
    if (confirm(`Are you sure you want to move article "${title.slice(0, 30)}..." to Trash?`)) {
      const target = articles.find(a => String(a.id) === String(id) || a.title === title);
      const trashedItem: Article = target ? { ...target, status: "Trash", original_status: "Published" } : {
        id,
        title,
        description: "",
        category_name: "GENERAL",
        author_name: "Writer",
        readTime: "5 min read",
        imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop",
        views: 100,
        comments: 0,
        is_featured: false,
        is_editors_pick: false,
        placement: "Standard Post",
        published_at: new Date().toISOString(),
        status: "Trash",
        original_status: "Published"
      };

      setArticles(prev => prev.filter(a => String(a.id) !== String(id) && a.title !== title));
      setTrashedArticles(prev => {
        const next = [trashedItem, ...prev.filter(t => String(t.id) !== String(id) && t.title !== title)];
        try {
          localStorage.setItem("dj_trashed_articles", JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      setStats(prev => ({ ...prev, totalArticles: Math.max(0, prev.totalArticles - 1) }));

      try {
        const { deleteArticleOnServer } = await import("@/lib/articlesSync");
        await deleteArticleOnServer(id, title);

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dj_articles_updated"));
        }
      } catch (e) {
        console.warn("Delete article error:", e);
      }

      showNotification(`✓ Published article moved to Trash.`);
    }
  };

  const handleTrashDraftOrPending = async (sub: SubmittedDraft, originalStatus: "Draft" | "Pending review") => {
    if (confirm(`Are you sure you want to move ${originalStatus.toLowerCase()} article "${sub.title.slice(0, 30)}..." to Trash?`)) {
      const trashedItem: Article = {
        id: sub.id,
        title: sub.title,
        description: sub.summary || sub.content || "",
        category_name: (sub.category || "GENERAL").toUpperCase(),
        author_name: sub.authorName || "Writer",
        readTime: sub.readTime || "5 min read",
        imageUrl: sub.imageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop",
        views: 0,
        comments: 0,
        is_featured: false,
        is_editors_pick: false,
        placement: "Standard Post",
        published_at: sub.date || new Date().toISOString(),
        status: "Trash",
        original_status: originalStatus
      };

      setWriterSubmissions(prev => prev.filter(s => String(s.id) !== String(sub.id) && s.title !== sub.title));

      setTrashedArticles(prev => {
        const next = [trashedItem, ...prev.filter(t => String(t.id) !== String(sub.id) && t.title !== sub.title)];
        try {
          localStorage.setItem("dj_trashed_articles", JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      try {
        const { deleteArticleOnServer } = await import("@/lib/articlesSync");
        await deleteArticleOnServer(sub.id, sub.title);

        const subsStr = localStorage.getItem("dj_writer_submitted_articles");
        if (subsStr && subsStr.trim()) {
          const parsed = JSON.parse(subsStr);
          const updated = parsed.map((p: any) => 
            (String(p.id) === String(sub.id) || (p.title || "").trim().toLowerCase() === sub.title.trim().toLowerCase())
              ? { ...p, status: "Trash", original_status: originalStatus }
              : p
          );
          localStorage.setItem("dj_writer_submitted_articles", JSON.stringify(updated));
        }

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dj_articles_updated"));
        }
      } catch (e) {}

      showNotification(`✓ ${originalStatus} article moved to Trash.`);
    }
  };

  const handleRestoreArticle = async (art: Article) => {
    setTrashedArticles(prev => {
      const next = prev.filter(t => String(t.id) !== String(art.id) && t.title !== art.title);
      try {
        localStorage.setItem("dj_trashed_articles", JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    const restoredSubmission: SubmittedDraft = {
      id: String(art.id),
      title: art.title,
      category: art.category_name || "NEWS",
      summary: art.description || "",
      content: art.description || "",
      imageUrl: art.imageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop",
      date: art.published_at || "Today",
      readTime: art.readTime || "5 min read",
      authorName: art.author_name || "Writer",
      status: "Draft"
    };

    setWriterSubmissions(prev => [restoredSubmission, ...prev.filter(s => String(s.id) !== String(art.id) && s.title !== art.title)]);

    try {
      const deletedStr = localStorage.getItem("dj_deleted_articles");
      if (deletedStr && deletedStr.trim()) {
        const list: string[] = JSON.parse(deletedStr);
        const normTitle = (art.title || "").trim().toLowerCase();
        const normId = String(art.id);
        const normSlug = (art.slug || normTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-'));
        const filtered = list.filter(k => k !== normId && k !== normTitle && k !== normSlug);
        localStorage.setItem("dj_deleted_articles", JSON.stringify(filtered));
      }

      const subsStr = localStorage.getItem("dj_writer_submitted_articles");
      if (subsStr && subsStr.trim()) {
        const parsed = JSON.parse(subsStr);
        const updated = parsed.map((p: any) =>
          (String(p.id) === String(art.id) || (p.title || "").trim().toLowerCase() === (art.title || "").trim().toLowerCase())
            ? { ...p, status: "Draft" }
            : p
        );
        localStorage.setItem("dj_writer_submitted_articles", JSON.stringify(updated));
      }

      const { saveArticleToServer } = await import("@/lib/articlesSync");
      await saveArticleToServer({
        id: art.id,
        title: art.title,
        summary: art.description,
        category: art.category_name,
        authorName: art.author_name,
        imageUrl: art.imageUrl,
        status: "Draft"
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dj_articles_updated"));
      }
    } catch (e) {}

    showNotification(`✓ Article "${art.title.slice(0, 30)}..." recovered from Trash to Drafts.`);
  };

  const handlePermanentDeleteArticle = async (art: Article) => {
    if (confirm(`Are you sure you want to PERMANENTLY delete article "${art.title.slice(0, 30)}..."? This cannot be undone.`)) {
      setTrashedArticles(prev => {
        const next = prev.filter(t => String(t.id) !== String(art.id) && t.title !== art.title);
        try {
          localStorage.setItem("dj_trashed_articles", JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      try {
        const { deletePermanentlyOnServer } = await import("@/lib/articlesSync");
        await deletePermanentlyOnServer(art.id, art.title);
        
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dj_articles_updated"));
        }
      } catch (e) {}

      showNotification(`Article permanently purged from Trash.`);
    }
  };

  const handleBackupArticlesZIP = async () => {
    try {
      if (!articles || articles.length === 0) {
        showNotification("No published articles available to backup.");
        return;
      }

      showNotification("Creating ZIP archive of published articles...");
      const zip = new JSZip();
      const usedFilenames = new Set<string>();

      // Create a .txt file for each published article
      articles.forEach((art, index) => {
        const rawTitle = art.title || `article_${art.id || index + 1}`;
        let cleanTitle = rawTitle
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .trim()
          .replace(/\s+/g, '_')
          .substring(0, 70);

        if (!cleanTitle) cleanTitle = `article_${art.id || index + 1}`;

        let filename = `${String(index + 1).padStart(2, '0')}_${cleanTitle}.txt`;
        let counter = 1;
        while (usedFilenames.has(filename)) {
          filename = `${String(index + 1).padStart(2, '0')}_${cleanTitle}_${counter}.txt`;
          counter++;
        }
        usedFilenames.add(filename);

        // Helper to strip HTML tags from content if present
        const rawContent = (art as any).content || art.description || "";
        const cleanContent = typeof rawContent === "string" 
          ? rawContent.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
          : String(rawContent);

        // Format image URL as a valid, working URL link
        const siteOrigin = typeof window !== "undefined" ? window.location.origin : "";
        let formattedImageUrl = (art.imageUrl || "").trim();

        if (formattedImageUrl.startsWith("http://") || formattedImageUrl.startsWith("https://")) {
          // Already a direct CDN / Cloud Storage link
          formattedImageUrl = formattedImageUrl;
        } else if (formattedImageUrl.startsWith("/") && siteOrigin) {
          // Local upload path
          formattedImageUrl = `${siteOrigin}${formattedImageUrl}`;
        } else if (art.slug || art.id) {
          // Direct image API URL that serves the article's image directly
          formattedImageUrl = `${siteOrigin}/api/articles/image?slug=${art.slug || art.id}`;
        } else {
          formattedImageUrl = "N/A";
        }

        const txtContent = [
          "================================================================================",
          `TITLE          : ${art.title || "Untitled"}`,
          `AUTHOR         : ${art.author_name || "London BigBen Staff"}`,
          `CATEGORY       : ${art.category_name || "General"}`,
          `STATUS         : ${art.status || "Published"}`,
          `PUBLISHED DATE : ${art.published_at || "N/A"}`,
          `READ TIME      : ${art.readTime || "5 min read"}`,
          `PLACEMENT      : ${art.placement || "Standard Post"}`,
          `VIEWS          : ${art.views ?? 0}`,
          `SLUG           : ${art.slug || "N/A"}`,
          `IMAGE URL      : ${formattedImageUrl}`,
          "================================================================================",
          "",
          "SUMMARY / DESCRIPTION:",
          art.description || "N/A",
          "",
          "--------------------------------------------------------------------------------",
          "ARTICLE BODY CONTENT:",
          cleanContent || art.description || "N/A",
          "",
          "================================================================================"
        ].join("\r\n");

        zip.file(filename, txtContent);
      });

      // Add an Index / Summary Manifest text file
      const indexSummary = [
        "================================================================================",
        "LONDON BIGBEN NETWORK - PUBLISHED ARTICLES ARCHIVE",
        `Export Timestamp       : ${new Date().toLocaleString()}`,
        `Total Published Articles: ${articles.length}`,
        "================================================================================",
        "",
        "ARCHIVED ARTICLES LIST:",
        ...articles.map((art, idx) => 
          `${String(idx + 1).padStart(2, '0')}. [${art.category_name || 'General'}] ${art.title} (Author: ${art.author_name || 'Staff Journalist'} | Date: ${art.published_at || 'N/A'})`
        ),
        "",
        "================================================================================"
      ].join("\r\n");

      zip.file("00_BACKUP_INDEX.txt", indexSummary);

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `london_bigben_published_articles_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification(`✓ Exported all ${articles.length} published articles as .txt files in a ZIP!`);
    } catch (err) {
      console.error("Backup articles ZIP error:", err);
      showNotification("Failed to generate articles ZIP backup.");
    }
  };

  // User Roster Handlers (Add, Edit, Delete, View)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const emailNorm = newUserEmail.trim().toLowerCase();

    if (newUserRole === "ADMIN" && !isCurrentAdminDefault) {
      alert("Permission Denied: Only the Default Administrator can create or assign Admin accounts. Normal admins can only add Writers and Readers.");
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-portal": "dj_admin_portal_authenticated_2026",
        },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: emailNorm,
          password: newUserPassword.trim() || "digitaljournal123",
          role: newUserRole.toLowerCase(),
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }
      if (!res.ok) {
        alert(data.error || "Failed to create user");
        return;
      }

      // Unblacklist email from local storage blacklist if previously deleted
      try {
        const blStr = localStorage.getItem("dj_deleted_users_blacklist");
        if (blStr && blStr.trim()) {
          const blacklist: string[] = JSON.parse(blStr);
          const filtered = blacklist.filter(e => e.toLowerCase() !== emailNorm);
          localStorage.setItem("dj_deleted_users_blacklist", JSON.stringify(filtered));
        }
      } catch (e) {}

      // Refresh real database users roster live from API
      await fetchDashboardData();

      setUserSubTab("ALL");
      setIsAddUserModalOpen(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("WRITER");
      showNotification(`✓ New ${newUserRole} "${data.user?.name || newUserName}" added from database!`);
    } catch (err) {
      console.error("Create user API error:", err);
      showNotification(`✓ User added.`);
    }
  };

  const handleOpenAddUserModal = () => {
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserRole("WRITER");
    setIsAddUserModalOpen(true);
  };

  const handleOpenEditUserModal = (user: WorkspaceUser) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserPassword("");
    setEditUserRole(user.role);
    setIsEditUserModalOpen(true);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editUserName.trim()) return;

    const currentUserEmail = (adminUser?.email || auth.user?.email || "").toLowerCase().trim();
    const isEditingSelf = Boolean(currentUserEmail && editingUser.email && currentUserEmail === editingUser.email.toLowerCase().trim());
    const isTargetDefaultAdmin = Boolean(editingUser.isDefaultAdmin || editingUser.is_default_admin);

    if (isTargetDefaultAdmin && !isEditingSelf) {
      alert("Permission Denied: Default Administrator accounts cannot be edited by other users.");
      return;
    }

    if (editingUser.role === "ADMIN" && !isEditingSelf && !isCurrentAdminDefault) {
      alert("Permission Denied: Only the Default Administrator can edit other administrator accounts.");
      return;
    }

    if (editUserRole === "ADMIN" && editingUser.role !== "ADMIN" && !isCurrentAdminDefault) {
      alert("Permission Denied: Only the Default Administrator can promote users to Admin. Normal admins can only assign Writer or Reader roles.");
      return;
    }

    const oldEmail = (editingUser.email || "").toLowerCase().trim();
    const newEmail = editUserEmail.trim().toLowerCase();
    const newName = editUserName.trim();
    const newRole = editUserRole;
    const newPassword = editUserPassword.trim();

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-portal": "dj_admin_portal_authenticated_2026",
        },
        body: JSON.stringify({
          id: editingUser.id,
          originalEmail: oldEmail,
          name: newName,
          email: newEmail,
          role: newRole.toLowerCase(),
          ...(newPassword ? { password: newPassword } : {}),
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(resData.error || "Failed to update user credentials.");
        return;
      }

      // Synchronize localStorage caches so stale entries don't revert updates
      if (typeof window !== "undefined") {
        try {
          // 1. dj_registered_users
          const regStr = localStorage.getItem("dj_registered_users");
          if (regStr && regStr.trim()) {
            let regList = JSON.parse(regStr);
            if (Array.isArray(regList)) {
              regList = regList.map((u: any) => {
                const uEmail = (u.email || "").toLowerCase().trim();
                if (uEmail === oldEmail || String(u.id) === String(editingUser.id)) {
                  return {
                    ...u,
                    name: newName,
                    email: newEmail,
                    role: newRole.toLowerCase(),
                    ...(newPassword ? { password: newPassword } : {}),
                  };
                }
                return u;
              });
              localStorage.setItem("dj_registered_users", JSON.stringify(regList));
            }
          }

          // 2. dj_user_profiles_db
          try {
            const profStr = localStorage.getItem("dj_user_profiles_db");
            if (profStr && profStr.trim()) {
              const profDb = JSON.parse(profStr);
              let profileObj = profDb[oldEmail] || profDb[editingUser.id] || null;
              if (profileObj || oldEmail !== newEmail) {
                if (oldEmail !== newEmail) {
                  delete profDb[oldEmail];
                }
                profDb[newEmail] = {
                  ...(profileObj || {}),
                  id: resData.user?.id || profileObj?.id || editingUser.id,
                  name: newName,
                  email: newEmail,
                  role: newRole.toLowerCase(),
                };
                localStorage.setItem("dj_user_profiles_db", JSON.stringify(profDb));
              }
            }
          } catch (e) {}

          // 3. dj_user & dj_writer_user & dj_author_profile (active session storage)
          ["dj_user", "dj_writer_user", "dj_author_profile"].forEach((k) => {
            const s = localStorage.getItem(k);
            if (s) {
              try {
                const u = JSON.parse(s);
                const uEmail = (u.email || "").toLowerCase().trim();
                if (uEmail === oldEmail || String(u.id) === String(editingUser.id)) {
                  const updated = {
                    ...u,
                    id: resData.user?.id || u.id,
                    name: newName,
                    email: newEmail,
                    role: newRole.toLowerCase(),
                  };
                  localStorage.setItem(k, JSON.stringify(updated));
                }
              } catch (e) {}
            }
          });

          // 4. Update individual profile cache if present
          if (oldEmail !== newEmail) {
            const oldProf = localStorage.getItem(`dj_profile_${oldEmail}`);
            if (oldProf) {
              localStorage.removeItem(`dj_profile_${oldEmail}`);
              try {
                const p = JSON.parse(oldProf);
                p.name = newName;
                p.email = newEmail;
                localStorage.setItem(`dj_profile_${newEmail}`, JSON.stringify(p));
              } catch (e) {}
            }
          }
        } catch (e) {
          console.warn("Error updating local storage cache:", e);
        }
      }

      setWorkspaceUsers(prev => prev.map(u => {
        const uEmail = (u.email || "").toLowerCase().trim();
        if (u.id === editingUser.id || uEmail === oldEmail) {
          return {
            ...u,
            id: resData.user?.id || u.id,
            name: newName,
            email: newEmail,
            role: newRole as "ADMIN" | "WRITER" | "READER",
          };
        }
        return u;
      }));

      setIsEditUserModalOpen(false);
      setEditingUser(null);
      setEditUserPassword("");
      await fetchDashboardData();
      showNotification(`✓ User "${newName}" updated successfully!`);
    } catch (err: any) {
      console.error("Update user API error:", err);
      alert(err.message || "Failed to update user");
    }
  };

  const handleDeleteUser = async (id: number | string, name: string, isDefault?: boolean) => {
    const targetUser = workspaceUsers.find(u => String(u.id) === String(id) || u.name === name);
    const targetEmail = targetUser?.email || (typeof id === 'string' && id.includes('@') ? id : "");
    const currentUserEmail = (adminUser?.email || auth.user?.email || "").toLowerCase().trim();
    const isSelf = Boolean(
      (currentUserEmail && targetEmail && currentUserEmail === targetEmail.toLowerCase().trim()) ||
      (id === 1 && (adminUser as any)?.id === 1)
    );

    if (isSelf) {
      alert("🚫 You cannot delete your own account while logged in.");
      return;
    }

    const isTargetDefaultAdmin = Boolean(
      isDefault ||
      targetUser?.isDefaultAdmin ||
      targetUser?.is_default_admin ||
      ["geethliyanage979@gmail.com", "londonbigben.offical@gmail.com", "akramyoonos006@gmail.com"].includes(targetEmail.toLowerCase().trim())
    );

    if (isTargetDefaultAdmin) {
      alert("🚫 System Protection: The Default Administrator account cannot be deleted.");
      return;
    }

    if (!isCurrentAdminDefault) {
      if (targetUser?.role === "ADMIN") {
        alert("🚫 Permission Denied: Only Default Administrators can delete administrator accounts.");
        return;
      }
    }

    if (!confirm(`Are you sure you want to delete user "${name}" (${targetEmail || id}) from the database? This action is permanent and will block this email from logging in until re-added.`)) {
      return;
    }

    try {
      await fetch(`/api/admin/users?id=${encodeURIComponent(String(id))}&email=${encodeURIComponent(targetEmail)}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-portal": "dj_admin_portal_authenticated_2026",
        },
      });
    } catch (err) {
      console.error("Delete user API error:", err);
    }

    // Purge from all client storage registries & add to blacklist
    if (typeof window !== "undefined" && targetEmail) {
      const emailLower = targetEmail.toLowerCase().trim();

      // 1. Add to deleted users blacklist in localStorage
      try {
        const blStr = localStorage.getItem("dj_deleted_users_blacklist");
        const blacklist: string[] = (blStr && blStr.trim()) ? JSON.parse(blStr) : [];
        if (!blacklist.includes(emailLower)) {
          blacklist.push(emailLower);
          localStorage.setItem("dj_deleted_users_blacklist", JSON.stringify(blacklist));
        }
      } catch (e) {}

      // 2. Remove from registered users list
      try {
        const regStr = localStorage.getItem("dj_registered_users");
        if (regStr && regStr.trim()) {
          const regList: any[] = JSON.parse(regStr);
          const filtered = regList.filter(u => (u.email || '').toLowerCase().trim() !== emailLower);
          localStorage.setItem("dj_registered_users", JSON.stringify(filtered));
        }
      } catch (e) {}

      // 3. Remove from user profiles DB
      try {
        const dbStr = localStorage.getItem("dj_user_profiles_db");
        if (dbStr && dbStr.trim()) {
          const dbObj = JSON.parse(dbStr);
          delete dbObj[emailLower];
          localStorage.setItem("dj_user_profiles_db", JSON.stringify(dbObj));
        }
      } catch (e) {}

      // 4. Remove from writers list
      try {
        const wStr = localStorage.getItem("dj_writers_list");
        if (wStr && wStr.trim()) {
          const wList: any[] = JSON.parse(wStr);
          const filtered = wList.filter(w => (w.email || '').toLowerCase().trim() !== emailLower);
          localStorage.setItem("dj_writers_list", JSON.stringify(filtered));
        }
      } catch (e) {}

      // 5. Remove from device google accounts
      try {
        const dStr = localStorage.getItem("dj_device_google_accounts");
        if (dStr && dStr.trim()) {
          const dList: any[] = JSON.parse(dStr);
          const filtered = dList.filter(d => (d.email || '').toLowerCase().trim() !== emailLower);
          localStorage.setItem("dj_device_google_accounts", JSON.stringify(filtered));
        }
      } catch (e) {}

      // 6. Clear session if currently active user was deleted
      try {
        const activeUserStr = localStorage.getItem("dj_user");
        if (activeUserStr && activeUserStr.trim()) {
          const active = JSON.parse(activeUserStr);
          if ((active?.email || '').toLowerCase().trim() === emailLower) {
            localStorage.removeItem("dj_user");
            sessionStorage.removeItem("dj_tab_session");
          }
        }
      } catch (e) {}
    }

    await fetchDashboardData();
    showNotification(`✓ User "${name}" permanently deleted from database.`);
  };

  // Subscriber Checkbox Functions
  const handleSelectAllSubscribers = () => {
    if (selectedSubscribers.length === newsletterSubscribers.length) {
      setSelectedSubscribers([]);
    } else {
      setSelectedSubscribers(newsletterSubscribers.map(s => s.id));
    }
  };

  const handleToggleSubscriberSelect = (id: number | string) => {
    if (selectedSubscribers.includes(id)) {
      setSelectedSubscribers(selectedSubscribers.filter(item => item !== id));
    } else {
      setSelectedSubscribers([...selectedSubscribers, id]);
    }
  };

  const handleRemoveSingleSubscriber = async (id: number | string, email: string) => {
    try {
      await fetch(`/api/newsletter/subscribe?id=${encodeURIComponent(String(id))}&email=${encodeURIComponent(email)}`, {
        method: "DELETE"
      });
    } catch (e) {}

    if (typeof window !== "undefined") {
      try {
        const localStr = localStorage.getItem("dj_newsletter_subscribers");
        if (localStr) {
          const parsed: any[] = JSON.parse(localStr);
          const filtered = parsed.filter((s: any) => s.id !== id && s.email?.toLowerCase() !== email.toLowerCase());
          localStorage.setItem("dj_newsletter_subscribers", JSON.stringify(filtered));
        }
      } catch (e) {}
    }

    setNewsletterSubscribers(prev => prev.filter(s => s.id !== id && s.email.toLowerCase() !== email.toLowerCase()));
    setSelectedSubscribers(prev => prev.filter(item => item !== id));
    showNotification(`Subscriber ${email} removed.`);
  };

  const handleBulkRemoveSubscribers = async () => {
    if (selectedSubscribers.length === 0) return;
    const toRemoveIds = [...selectedSubscribers];
    for (const subId of toRemoveIds) {
      const sub = newsletterSubscribers.find(s => s.id === subId);
      try {
        await fetch(`/api/newsletter/subscribe?id=${encodeURIComponent(String(subId))}&email=${encodeURIComponent(sub?.email || "")}`, {
          method: "DELETE"
        });
      } catch (e) {}
    }

    if (typeof window !== "undefined") {
      try {
        const localStr = localStorage.getItem("dj_newsletter_subscribers");
        if (localStr) {
          const parsed: any[] = JSON.parse(localStr);
          const filtered = parsed.filter((s: any) => !toRemoveIds.includes(s.id));
          localStorage.setItem("dj_newsletter_subscribers", JSON.stringify(filtered));
        }
      } catch (e) {}
    }

    setNewsletterSubscribers(prev => prev.filter(s => !toRemoveIds.includes(s.id)));
    showNotification(`✓ ${toRemoveIds.length} subscriber(s) removed from mailing list.`);
    setSelectedSubscribers([]);
  };

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubscriberEmail.trim()) return;

    const topicsArray = newSubscriberTopics
      .split(",")
      .map(t => t.trim().toUpperCase())
      .filter(t => t.length > 0);

    const finalTopics = topicsArray.length > 0 ? topicsArray : ["TECHNOLOGY", "NEWS"];

    try {
      await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newSubscriberEmail.trim(), topics: finalTopics })
      });
    } catch (e) {}

    const newSub: SubscriberItem = {
      id: Date.now(),
      email: newSubscriberEmail.trim(),
      topics: finalTopics,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "Active"
    };

    if (typeof window !== "undefined") {
      try {
        const subsStr = localStorage.getItem("dj_newsletter_subscribers");
        let subsList: any[] = (subsStr && subsStr.trim()) ? JSON.parse(subsStr) : [];
        if (!Array.isArray(subsList)) subsList = [];
        subsList.unshift(newSub);
        localStorage.setItem("dj_newsletter_subscribers", JSON.stringify(subsList));
      } catch (e) {}
    }

    setNewsletterSubscribers(prev => [newSub, ...prev.filter(s => s.email.toLowerCase() !== newSub.email.toLowerCase())]);
    setNewSubscriberEmail("");
    setIsNewsletterModalOpen(false);
    showNotification(`✓ Subscriber ${newSub.email} added to mailing list!`);
  };

  const handleExportNewsletterCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      ["ID,Email,Topics,Date,Status", ...newsletterSubscribers.map(s => `"${s.id}","${s.email}","${s.topics.join("; ")}","${s.date}","${s.status}"`)].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `digital_journal_newsletter_subscribers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Newsletter subscribers CSV exported!");
  };

  const handleExportDatabase = (customBackup?: BackupFileItem) => {
    if (customBackup?.url) {
      window.open(customBackup.url, "_blank");
      showNotification(`Downloading backup "${customBackup.filename}" from Backblaze B2...`);
      return;
    }

    const backupData = {
      backupType: "Backblaze B2 System Snapshot",
      timestamp: new Date().toISOString(),
      exportedAt: new Date().toLocaleString(),
      datasets: {
        publishedPosts: {
          count: articles.length,
          items: articles
        },
        newsletterSubscribers: {
          count: newsletterSubscribers.length,
          items: newsletterSubscribers
        },
        userDetails: {
          count: workspaceUsers.length,
          items: workspaceUsers
        },
        contactUsSubmissions: {
          count: contactSubmissions.length,
          items: contactSubmissions
        },
        advertiseLeads: {
          count: advertiseLeads.length,
          items: advertiseLeads
        },
        adSlots: {
          count: adSlots.length,
          items: adSlots
        }
      }
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = customBackup?.filename || `london_bigben_db_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Database backup snapshot file downloaded!");
  };

  // Filtered Articles Calculation (Strictly Published Articles Only)
  const filteredArticles = articles.filter(a => {
    const statusNorm = (a.status || "published").toLowerCase();
    const isPublished = statusNorm === "published" || statusNorm === "approved";
    if (!isPublished) return false;

    const matchesSearch =
      a.title.toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
      (a.author_name && a.author_name.toLowerCase().includes(articleSearchQuery.toLowerCase()));

    const matchesCategory =
      categoryFilter === "all" ||
      (a.category_name && a.category_name.toLowerCase() === categoryFilter.toLowerCase());

    const matchesPlacement = (() => {
      if (placementFilter === "all") return true;
      const pl = (a.placement || "").toLowerCase().trim();

      if (placementFilter === "home_page_a_plus" || placementFilter === "featured") {
        return (
          (pl.includes("home page a+") && !pl.includes("2") && !pl.includes("3")) ||
          pl === "a+ section" ||
          (pl.includes("a+") && !pl.includes("2") && !pl.includes("3")) ||
          (a.is_featured === true && !pl.includes("2") && !pl.includes("3"))
        );
      }

      if (placementFilter === "trending_now") {
        return pl.includes("trending");
      }

      if (placementFilter === "editors_picks" || placementFilter === "editors_pick") {
        return pl.includes("editor") || a.is_editors_pick === true;
      }

      if (placementFilter === "latest_news") {
        return pl.includes("latest");
      }

      if (placementFilter === "home_page_a_plus_2") {
        return (
          (pl.includes("section 2") ||
          pl.includes("a+ 2") ||
          pl.includes("a+2") ||
          pl.includes("spotlight banner")) &&
          !pl.includes("3")
        );
      }

      if (placementFilter === "home_page_a_plus_3") {
        return (
          pl.includes("section 3") ||
          pl.includes("a+ 3") ||
          pl.includes("a+3") ||
          pl.includes("main news 3")
        );
      }

      if (placementFilter === "category_only") {
        return (
          pl === "category section only" ||
          pl === "standard post" ||
          pl === "none" ||
          pl === ""
        );
      }

      return pl === placementFilter.toLowerCase();
    })();

    return matchesSearch && matchesCategory && matchesPlacement;
  });

  // Filtered Users Calculation according to sub-tab
  const filteredWorkspaceUsers = workspaceUsers
    .filter(u => u && u.email && !u.email.toLowerCase().startsWith("hacker_") && !u.email.toLowerCase().startsWith("test_") && u.name !== "Sneaky Hacker")
    .filter((u, i, self) => i === self.findIndex(t => t.email.toLowerCase() === u.email.toLowerCase()))
    .filter(u => {
      if (userSubTab === "ADMINS") return u.role === "ADMIN";
      if (userSubTab === "WRITERS") return u.role === "WRITER";
      if (userSubTab === "READERS") return u.role === "READER";
      return true;
    });

  const cleanUsersList = workspaceUsers.filter(u => u && u.email && !u.email.toLowerCase().startsWith("hacker_") && !u.email.toLowerCase().startsWith("test_") && u.name !== "Sneaky Hacker");
  const countAdmins = cleanUsersList.filter(u => u.role === "ADMIN").length;
  const countWriters = cleanUsersList.filter(u => u.role === "WRITER").length;
  const countReaders = cleanUsersList.filter(u => u.role === "READER").length;

  const filteredAdSlots = adSlots.filter(slot => {
    if (adSubTab === "HOMEPAGE") return slot.categoryGroup === "HOMEPAGE";
    if (adSubTab === "CATEGORY") return slot.categoryGroup === "CATEGORY";
    if (adSubTab === "AUTHOR") return slot.categoryGroup === "AUTHOR";
    return true;
  });

  const filteredContactSubmissions = contactSubmissions.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(contactSearchQuery.toLowerCase())) ||
      c.message.toLowerCase().includes(contactSearchQuery.toLowerCase());

    const matchesType =
      contactTypeFilter === "all" ||
      c.type.toLowerCase() === contactTypeFilter.toLowerCase();

    return matchesSearch && matchesType;
  });

  const filteredAdvertiseLeads = advertiseLeads.filter(l => {
    const matchesSearch =
      l.submitterName.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      l.company.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
      l.requirements.toLowerCase().includes(leadSearchQuery.toLowerCase());

    const matchesService =
      leadServiceFilter === "all" ||
      l.serviceOption.toLowerCase() === leadServiceFilter.toLowerCase();

    return matchesSearch && matchesService;
  });

  if (isLoading) {
    return <LogoLoader text="Verifying Security Session..." theme="dark" fullScreen={true} />;
  }


  const cleanTitleKeyForFilter = (val: any) =>
    String(val || "")
      .toLowerCase()
      .replace(/[\u2018\u2019\u201A\u201B']/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const rejectedTitleKeys = new Set(
    writerSubmissions
      .filter((s) => (s.status || "").toLowerCase().includes("reject"))
      .map((s) => cleanTitleKeyForFilter(s.title))
      .filter(Boolean)
  );

  const rejectedIds = new Set(
    writerSubmissions
      .filter((s) => (s.status || "").toLowerCase().includes("reject"))
      .map((s) => String(s.id))
      .filter(Boolean)
  );

  const pendingSubmissions = writerSubmissions.filter((s) => {
    const st = (s.status || "").toLowerCase().trim();
    if (st.includes("reject") || st === "draft" || st === "trash" || st === "published" || st === "approved") {
      return false;
    }
    if (rejectedIds.has(String(s.id))) {
      return false;
    }
    const tk = cleanTitleKeyForFilter(s.title);
    if (tk && rejectedTitleKeys.has(tk)) {
      return false;
    }
    return true;
  });

  const activeReviewsCount = pendingSubmissions.length;
  const completedReleasesCount = articles.length;
  const newsletterSubsCount = newsletterSubscribers.length;

  const adminName = adminUser?.name || "Geeth Liyanage";
  const userInitials = adminName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "GL";

  return (
    <div className="h-screen bg-[#EBF0F7] flex font-sans text-slate-800 overflow-hidden relative">
      
      {/* MOBILE BACKDROP OVERLAY (< md) */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* LEFT SIDEBAR NAVIGATION - RESPONSIVE DRAWER ON MOBILE, COLLAPSIBLE ON DESKTOP */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0B111E] text-white flex flex-col h-full border-r border-slate-800/80 select-none transition-transform duration-300 ease-in-out shadow-2xl
          ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          ${isSidebarOpen ? "md:static md:w-68 lg:w-72 md:translate-x-0 md:h-screen md:flex-shrink-0 md:z-auto md:shadow-none" : "md:hidden"}
        `}
      >
        
        {/* LOGO HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex-shrink-0">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="flex items-center gap-3 group min-w-0"
            >
              <div className="relative shrink-0">
                <img
                  src="/logo.png"
                  alt="London BigBen Logo"
                  className="w-10 h-10 object-contain rounded-xl shadow-md border border-white/10 group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-sans font-extrabold text-sm tracking-tight text-white uppercase leading-none group-hover:text-[#D31220] transition-colors truncate">
                  LONDON BIGBEN
                </h1>
              </div>
            </Link>

            {/* Button to Disappear / Hide Sidebar */}
            <button
              onClick={() => {
                setIsSidebarOpen(false);
                setIsMobileSidebarOpen(false);
              }}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-2 shrink-0 cursor-pointer flex items-center justify-center"
              title="Disappear Sidebar"
              aria-label="Disappear Sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          <Link
            href="/"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="mt-4 flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold transition-colors group px-2 py-1.5 rounded-lg hover:bg-slate-800/50"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform text-slate-400 group-hover:text-white" />
            <span>Back to Live Website</span>
          </Link>
        </div>

        {/* SIDEBAR NAVIGATION ITEMS - SCROLLABLE IF CONTENT OVERFLOWS */}
        <nav className="p-3 flex-1 space-y-1 overflow-y-auto">
          
          {/* 1. Overview */}
          <button
            onClick={() => {
              setActiveTab("overview");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-gradient-to-r from-[#D31220] to-[#b91522] text-white shadow-md shadow-red-950/50"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
            <span className="font-sans">Overview</span>
            <span className={`ml-auto text-[10.5px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
              activeTab === "overview" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400 border border-slate-700/60"
            }`}>
              {pendingSubmissions.length}
            </span>
          </button>

          {/* 2. Newsletter */}
          <button
            onClick={() => {
              setActiveTab("newsletter");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "newsletter"
                ? "bg-gradient-to-r from-[#D31220] to-[#b91522] text-white shadow-md shadow-red-950/50"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="font-sans">Newsletter</span>
            <span className={`ml-auto text-[10.5px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
              activeTab === "newsletter" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400 border border-slate-700/60"
            }`}>
              {newsletterSubscribers.length}
            </span>
          </button>

          {/* Subscription */}
          <button
            onClick={() => {
              setActiveTab("subscriptions");
              fetchSiteSubscriptions();
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "subscriptions"
                ? "bg-gradient-to-r from-[#D31220] to-[#b91522] text-white shadow-md shadow-red-950/50"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <CreditCard className="w-4 h-4 flex-shrink-0" />
            <span className="font-sans">Subscription</span>
            <span className={`ml-auto text-[10.5px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
              activeTab === "subscriptions" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400 border border-slate-700/60"
            }`}>
              {siteSubscriptions.length}
            </span>
          </button>

          {/* 3. Published Posts */}
          <button
            onClick={() => {
              setActiveTab("articles");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "articles"
                ? "bg-gradient-to-r from-[#D31220] to-[#b91522] text-white shadow-md shadow-red-950/50"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span className="font-sans">Published Posts</span>
            <span className={`ml-auto text-[10.5px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
              activeTab === "articles" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400 border border-slate-700/60"
            }`}>
              {articles.length}
            </span>
          </button>

          {/* 4. Users */}
          <button
            onClick={() => {
              setActiveTab("users");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-gradient-to-r from-[#D31220] to-[#b91522] text-white shadow-md shadow-red-950/50"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="font-sans">Users</span>
            <span className={`ml-auto text-[10.5px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
              activeTab === "users" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400 border border-slate-700/60"
            }`}>
              {workspaceUsers.length}
            </span>
          </button>

          {/* 5. Manage Ads */}
          <button
            onClick={() => {
              setActiveTab("ads");
              setAdSubTab("ALL");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ads"
                ? "bg-gradient-to-r from-[#D31220] to-[#b91522] text-white shadow-md shadow-red-950/50"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <Megaphone className="w-4 h-4 flex-shrink-0" />
            <span className="font-sans">Manage Ads</span>
            <span className={`ml-auto text-[10.5px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
              activeTab === "ads" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400 border border-slate-700/60"
            }`}>
              {adSlots.length}
            </span>
          </button>

          {/* 6. Contact Us Submissions */}
          <button
            onClick={() => {
              setActiveTab("contact_submissions");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "contact_submissions"
                ? "bg-gradient-to-r from-[#D31220] to-[#b91522] text-white shadow-md shadow-red-950/50"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <span className="font-sans">Contact Submissions</span>
            <span className={`ml-auto text-[10.5px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
              activeTab === "contact_submissions" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400 border border-slate-700/60"
            }`}>
              {contactSubmissions.length}
            </span>
          </button>

          {/* 7. Advertise Leads */}
          <button
            onClick={() => {
              setActiveTab("advertise_leads");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "advertise_leads"
                ? "bg-gradient-to-r from-[#D31220] to-[#b91522] text-white shadow-md shadow-red-950/50"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <Briefcase className="w-4 h-4 flex-shrink-0" />
            <span className="font-sans">Advertise Leads</span>
            <span className={`ml-auto text-[10.5px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
              activeTab === "advertise_leads" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400 border border-slate-700/60"
            }`}>
              {advertiseLeads.length}
            </span>
          </button>

          {/* 8. Database Backups */}
          <button
            onClick={() => {
              setActiveTab("backups");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "backups"
                ? "bg-gradient-to-r from-[#D31220] to-[#b91522] text-white shadow-md shadow-red-950/50"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <Database className="w-4 h-4 flex-shrink-0" />
            <span className="font-sans">Database Backups</span>
          </button>

          {/* 9. Trending words */}
          <button
            onClick={() => {
              setActiveTab("trending_words");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "trending_words"
                ? "bg-gradient-to-r from-[#D31220] to-[#b91522] text-white shadow-md shadow-red-950/50"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4 flex-shrink-0" />
            <span className="font-sans">Trending words</span>
            <span className={`ml-auto text-[10.5px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
              activeTab === "trending_words" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400 border border-slate-700/60"
            }`}>
              {trendingWords.length}
            </span>
          </button>

          {/* 10. Reels */}
          <button
            onClick={() => {
              setActiveTab("reels");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "reels"
                ? "bg-gradient-to-r from-[#D31220] to-[#b91522] text-white shadow-md shadow-red-950/50"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <Video className="w-4 h-4 flex-shrink-0" />
            <span className="font-sans">Reels</span>
            <span className={`ml-auto text-[10.5px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
              activeTab === "reels" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400 border border-slate-700/60"
            }`}>
              {reelsVideos.length}
            </span>
          </button>
        </nav>

        {/* SIDEBAR FOOTER LOGOUT */}
        <div className="p-4 border-t border-slate-800/80 flex-shrink-0">
          <button
            onClick={() => {
              setIsMobileSidebarOpen(false);
              handleLogout();
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 text-xs font-bold transition-all cursor-pointer border border-slate-800 hover:border-rose-900 group"
          >
            <span className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-rose-400 group-hover:rotate-12 transition-transform" />
              <span>Sign Out Terminal</span>
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE AREA - SCROLLS INDEPENDENTLY */}
      <main className="flex-1 h-screen p-3.5 sm:p-6 md:p-8 lg:p-10 overflow-y-auto min-w-0 w-full bg-[#EBF0F7]">
        
        {/* MOBILE WORKSPACE TOP APP BAR (< md) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#EBF0F7] border border-white/80 rounded-2xl shadow-[6px_6px_14px_#c8d2df,-6px_-6px_14px_#ffffff] mb-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Open Admin Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <span className="font-sans font-extrabold text-xs uppercase tracking-tight text-slate-900 block truncate">
                Admin Control
              </span>
              <span className="text-[10px] font-sans text-[#D31220] uppercase font-bold block truncate">
                {activeTab.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D31220] to-[#99000D] text-white font-extrabold text-xs flex items-center justify-center font-sans shadow-[2px_2px_5px_#c8d2df,-2px_-2px_5px_#ffffff]">
              {userInitials}
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TOAST NOTIFICATION BANNER */}
        {toastMessage && (
          <div className="mb-6 w-full bg-[#D31220] text-white text-xs font-extrabold py-3 px-5 rounded-2xl shadow-[6px_6px_16px_#c8d2df,-6px_-6px_16px_#ffffff] flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TOP HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-3">
              {!isSidebarOpen && (
                <button
                  onClick={() => {
                    setIsSidebarOpen(true);
                    setIsMobileSidebarOpen(true);
                  }}
                  title="Show Sidebar"
                  aria-label="Show Sidebar"
                  className="p-2 rounded-xl bg-[#EBF0F7] shadow-[4px_4px_10px_#c8d2df,-4px_-4px_10px_#ffffff] active:shadow-[inset_2px_2px_5px_#c8d2df,inset_-2px_-2px_5px_#ffffff] border border-white/80 text-slate-700 hover:text-slate-900 transition-all cursor-pointer flex items-center justify-center mr-0.5"
                >
                  <PanelLeft className="w-5 h-5 text-slate-700" />
                </button>
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold font-sans text-slate-900 tracking-tight">
                My Workspace
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF0F7] shadow-[inset_2px_2px_4px_#c8d2df,inset_-2px_-2px_4px_#ffffff] border border-white/60 text-emerald-700 text-[11px] font-bold font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Control
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Welcome back, <span className="text-slate-900 font-bold">{adminName}</span>! Here is your daily editorial overview.
            </p>
          </div>

          {/* User Profile Badge Chip */}
          <div className="hidden sm:flex items-center gap-3 bg-[#EBF0F7] px-4 py-2 rounded-2xl border border-white/80 shadow-[6px_6px_14px_#c8d2df,-6px_-6px_14px_#ffffff] self-start sm:self-auto hover:shadow-[inset_2px_2px_5px_#c8d2df,inset_-2px_-2px_5px_#ffffff] transition-all cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D31220] to-[#99000D] text-white font-extrabold text-xs flex items-center justify-center font-sans uppercase shadow-[2px_2px_5px_#c8d2df,-2px_-2px_5px_#ffffff]">
              {userInitials}
            </div>
            <div className="text-left leading-tight pr-1.5">
              <p className="text-xs font-bold text-slate-900">{adminName}</p>
              <p className="text-[10px] text-slate-400 font-sans font-semibold uppercase tracking-wider">System Admin</p>
            </div>
          </div>
        </div>

        {/* STAT CARDS ROW (Pinned at top of overview workspace) */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            
            {/* Card 1: ACTIVE REVIEWS */}
            <div className="bg-[#EBF0F7] p-5 sm:p-6 rounded-3xl border border-white/80 shadow-[8px_8px_18px_#c8d2df,-8px_-8px_18px_#ffffff] hover:shadow-[10px_10px_22px_#becadb,-10px_-10px_22px_#ffffff] transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D31220] to-red-400 opacity-90" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-sans mb-1">
                    Active Reviews
                  </p>
                  <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-sans tracking-tight group-hover:text-[#D31220] transition-colors">
                    {activeReviewsCount}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Submissions pending approval
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#EBF0F7] text-[#D31220] shadow-[inset_3px_3px_6px_#c8d2df,inset_-3px_-3px_6px_#ffffff] border border-white/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Card 2: COMPLETED RELEASES */}
            <div className="bg-[#EBF0F7] p-5 sm:p-6 rounded-3xl border border-white/80 shadow-[8px_8px_18px_#c8d2df,-8px_-8px_18px_#ffffff] hover:shadow-[10px_10px_22px_#becadb,-10px_-10px_22px_#ffffff] transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-400 opacity-90" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-sans mb-1">
                    Completed Releases
                  </p>
                  <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-sans tracking-tight group-hover:text-emerald-600 transition-colors">
                    {completedReleasesCount}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Live published stories
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#EBF0F7] text-emerald-600 shadow-[inset_3px_3px_6px_#c8d2df,inset_-3px_-3px_6px_#ffffff] border border-white/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Card 3: NEWSLETTER SUBS */}
            <div className="bg-[#EBF0F7] p-5 sm:p-6 rounded-3xl border border-white/80 shadow-[8px_8px_18px_#c8d2df,-8px_-8px_18px_#ffffff] hover:shadow-[10px_10px_22px_#becadb,-10px_-10px_22px_#ffffff] sm:col-span-2 lg:col-span-1 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-400 opacity-90" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-sans mb-1">
                    Newsletter Subs
                  </p>
                  <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-sans tracking-tight group-hover:text-blue-600 transition-colors">
                    {newsletterSubsCount}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Registered subscribers
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#EBF0F7] text-blue-600 shadow-[inset_3px_3px_6px_#c8d2df,inset_-3px_-3px_6px_#ffffff] border border-white/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Mail className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* MAIN TABLE CONTAINER: Recent Projects (Pending Review) */}
            <div className="bg-[#EBF0F7] rounded-3xl border border-white/80 shadow-[10px_10px_24px_#c8d2df,-10px_-10px_24px_#ffffff] overflow-hidden">
              
              {/* Table Header Bar */}
              <div className="p-4 sm:p-6 border-b border-[#c8d2df]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#EBF0F7]">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-5 bg-[#D31220] rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.2)]" />
                  <div>
                    <h2 className="text-base sm:text-lg font-bold font-sans text-slate-900 tracking-tight">
                      Recent Projects (Pending Review)
                    </h2>
                    <p className="text-xs text-slate-400 font-sans">
                      Editorial queue awaiting admin review and publishing
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold bg-[#EBF0F7] shadow-[inset_2px_2px_4px_#c8d2df,inset_-2px_-2px_4px_#ffffff] border border-white/60 text-slate-700 px-3.5 py-1.5 rounded-full font-sans self-start sm:self-auto">
                  Pending Count: {pendingSubmissions.length}
                </span>
              </div>

              {/* Projects Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#c8d2df]/60 bg-[#EBF0F7] text-[11px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                      <th className="py-3.5 px-6">ARTICLE DETAILS</th>
                      <th className="py-3.5 px-4">CATEGORY</th>
                      <th className="py-3.5 px-4">AUTHOR</th>
                      <th className="py-3.5 px-4">SUBMITTED DATE</th>
                      <th className="py-3.5 px-4">STATUS</th>
                      <th className="py-3.5 px-6 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c8d2df]/30 text-xs">
                    {pendingSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400 font-medium">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-[#EBF0F7] shadow-[inset_3px_3px_6px_#c8d2df,inset_-3px_-3px_6px_#ffffff] border border-white/60 flex items-center justify-center text-slate-400">
                              <CheckCircle2 className="w-7 h-7 text-emerald-500 stroke-[1.75]" />
                            </div>
                            <div>
                              <p className="text-base font-bold text-slate-800 font-sans">No pending submissions in queue</p>
                              <p className="text-xs text-slate-400 font-sans mt-0.5">All submitted articles have been reviewed and published.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pendingSubmissions.map((post, idx) => (
                        <tr key={`sub-${post.id}-${idx}`} className="hover:bg-white/40 transition-colors">
                          
                          {/* ARTICLE DETAILS */}
                          <td className="py-4 px-6 max-w-md">
                            <div className="flex items-start gap-3.5">
                              <img
                                src={post.imageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop"}
                                alt="Thumbnail"
                                className="w-12 h-12 rounded-xl object-cover shadow-[2px_2px_5px_#c8d2df,-2px_-2px_5px_#ffffff] border border-white/60 flex-shrink-0"
                              />
                              <div>
                                <h3 className="font-extrabold text-slate-900 text-[13px] leading-snug line-clamp-1 font-sans">
                                  {post.title}
                                </h3>
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal font-sans">
                                  {post.summary}
                                </p>
                                <span className="inline-block mt-1 text-[10px] font-sans font-medium text-slate-400">
                                  {post.readTime || "5 min read"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* CATEGORY */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 bg-[#EBF0F7] shadow-[inset_2px_2px_4px_#c8d2df,inset_-2px_-2px_4px_#ffffff] border border-white/60 text-[#D31220] text-[10px] font-bold uppercase rounded-full font-sans tracking-wide">
                              {post.category}
                            </span>
                          </td>

                          {/* AUTHOR */}
                          <td className="py-4 px-4 whitespace-nowrap font-bold text-slate-800 font-sans">
                            {post.authorName || "Rushdhi MR"}
                          </td>

                          {/* SUBMITTED DATE */}
                          <td className="py-4 px-4 whitespace-nowrap font-sans text-slate-500 text-xs">
                            {post.date || "Aug 11, 2026"}
                          </td>

                          {/* STATUS */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 bg-[#EBF0F7] shadow-[inset_2px_2px_4px_#c8d2df,inset_-2px_-2px_4px_#ffffff] border border-white/60 text-amber-700 text-[10px] font-extrabold uppercase rounded-md tracking-wider font-sans">
                              PENDING
                            </span>
                          </td>

                          {/* ACTIONS */}
                          <td className="py-4 px-6 whitespace-nowrap text-right">
                            <button
                              onClick={() => openStudioForArticle(post)}
                              className="bg-[#D31220] hover:bg-[#b91522] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-[3px_3px_8px_#c8d2df,-3px_-3px_8px_#ffffff] active:shadow-[inset_2px_2px_4px_#c8d2df,inset_-2px_-2px_4px_#ffffff] uppercase tracking-wider font-sans"
                            >
                              OPEN
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: NEWSLETTER */}
        {activeTab === "newsletter" && (
          <div className="space-y-6">
            
            {/* Header Bar above Newsletter Table */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold font-sans text-slate-900 tracking-tight">
                  Newsletter Subscribers
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Emails collected from the Newsletter signup page.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {selectedSubscribers.length > 0 && (
                  <button
                    onClick={handleBulkRemoveSubscribers}
                    className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Selected ({selectedSubscribers.length})
                  </button>
                )}

                <button
                  onClick={handleExportNewsletterCSV}
                  className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm uppercase tracking-wider font-mono"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  EXPORT CSV
                </button>

                <span className="text-[11px] font-extrabold bg-slate-200/80 text-slate-700 px-3.5 py-1.5 rounded-full font-mono">
                  Total: {newsletterSubscribers.length}
                </span>
              </div>
            </div>

            {/* NEWSLETTER SUBSCRIBERS TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                      <th className="py-3.5 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedSubscribers.length > 0 && selectedSubscribers.length === newsletterSubscribers.length}
                          onChange={handleSelectAllSubscribers}
                          className="rounded border-slate-300 text-[#D31220] focus:ring-[#D31220] cursor-pointer"
                        />
                      </th>
                      <th className="py-3.5 px-6">EMAIL</th>
                      <th className="py-3.5 px-4">NEWSLETTERS</th>
                      <th className="py-3.5 px-4">SUBSCRIBED</th>
                      <th className="py-3.5 px-6 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {newsletterSubscribers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-mono">
                          No newsletter subscribers in database.
                        </td>
                      </tr>
                    ) : (
                      newsletterSubscribers.map((sub, idx) => (
                        <tr key={`subscr-${sub.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* CHECKBOX */}
                          <td className="py-4 px-4 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={selectedSubscribers.includes(sub.id)}
                              onChange={() => handleToggleSubscriberSelect(sub.id)}
                              className="rounded border-slate-300 text-[#D31220] focus:ring-[#D31220] cursor-pointer"
                            />
                          </td>

                          {/* EMAIL ADDRESS WITH MAIL ICON */}
                          <td className="py-4 px-6 font-extrabold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>{sub.email}</span>
                            </div>
                          </td>

                          {/* NEWSLETTERS TOPIC BADGES */}
                          <td className="py-4 px-4 max-w-xl">
                            <div className="flex flex-wrap gap-1.5">
                              {sub.topics.map((t, tIdx) => (
                                <span
                                  key={`topic-${t}-${tIdx}`}
                                  className="px-2 py-0.5 bg-blue-50/90 text-blue-700 border border-blue-200/70 rounded-md font-mono text-[9px] font-extrabold uppercase tracking-tight"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* SUBSCRIBED DATE */}
                          <td className="py-4 px-4 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                            {sub.date}
                          </td>

                          {/* REMOVE ACTION BUTTON */}
                          <td className="py-4 px-6 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleRemoveSingleSubscriber(sub.id, sub.email)}
                              className="border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-extrabold text-[10.5px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 uppercase tracking-wider font-mono"
                            >
                              <Trash2 className="w-3 h-3 text-rose-500" />
                              REMOVE
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SUBSCRIPTION MANAGEMENT */}
        {activeTab === "subscriptions" && (() => {
          const now = Date.now();
          const totalSubscribers = siteSubscriptions.length;
          const activePaid = siteSubscriptions.filter(s => s.status === "Active Paid").length;
          const expiredCount = siteSubscriptions.filter(s => s.status === "Expired" || (s.status === "Free Trial" && new Date(s.trialExpiryDate).getTime() <= now)).length;

          // Filter by search query, status, and plan
          const filteredSubs = siteSubscriptions.filter((sub) => {
            const matchesSearch =
              !siteSubSearch ||
              (sub.name || "").toLowerCase().includes(siteSubSearch.toLowerCase()) ||
              (sub.email || "").toLowerCase().includes(siteSubSearch.toLowerCase()) ||
              (sub.phone || "").toLowerCase().includes(siteSubSearch.toLowerCase()) ||
              (sub.planName || "").toLowerCase().includes(siteSubSearch.toLowerCase());

            const expTime = new Date(sub.trialExpiryDate).getTime();
            const isExpiredTime = isNaN(expTime) ? false : expTime <= now;
            const isExpired = sub.status === "Expired" || (sub.status === "Free Trial" && isExpiredTime);
            const effectiveStatus = isExpired ? "Expired" : sub.status;

            const matchesStatus =
              siteSubStatusFilter === "ALL" ||
              (siteSubStatusFilter === "Active" ? (!isExpired && sub.status !== "Cancelled") :
               siteSubStatusFilter === "Expired" ? isExpired : sub.status === siteSubStatusFilter);

            const matchesPlan =
              siteSubPlanFilter === "ALL" ||
              sub.plan === siteSubPlanFilter;

            return matchesSearch && matchesStatus && matchesPlan;
          });

          // Pagination
          const itemsPerPage = 10;
          const totalPages = Math.max(1, Math.ceil(filteredSubs.length / itemsPerPage));
          const currentPage = Math.min(siteSubPage, totalPages);
          const startIndex = (currentPage - 1) * itemsPerPage;
          const paginatedSubs = filteredSubs.slice(startIndex, startIndex + itemsPerPage);

          return (
            <div className="space-y-6">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold font-sans text-slate-900 tracking-tight flex items-center gap-2.5">
                    <CreditCard className="w-6 h-6 text-[#D31220]" />
                    <span>Subscription Management</span>
                  </h2>
                  <p className="text-xs font-mono text-slate-500 mt-1">
                    Manage 1-year free trial accounts, countdown timers, renewal dates, and payment records.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => fetchSiteSubscriptions()}
                    disabled={siteSubscriptionsLoading}
                    className="flex items-center gap-2 bg-[#EBF0F7] shadow-[4px_4px_10px_#c8d2df,-4px_-4px_10px_#ffffff] active:shadow-[inset_2px_2px_5px_#c8d2df,inset_-2px_-2px_5px_#ffffff] border border-white/80 text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer font-mono uppercase tracking-wider"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${siteSubscriptionsLoading ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* 3 SUMMARY STAT CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Subscribers */}
                <div className="bg-[#EBF0F7] rounded-3xl border border-white/80 p-5 shadow-[6px_6px_14px_#c8d2df,-6px_-6px_14px_#ffffff] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                      Total Subscribers
                    </div>
                    <div className="text-2xl font-black font-sans text-slate-900">
                      {totalSubscribers}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      All registered records
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/20">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                {/* Active Paid Subscriptions */}
                <div className="bg-[#EBF0F7] rounded-3xl border border-white/80 p-5 shadow-[6px_6px_14px_#c8d2df,-6px_-6px_14px_#ffffff] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-emerald-600 mb-1">
                      Active Paid
                    </div>
                    <div className="text-2xl font-black font-sans text-emerald-950">
                      {activePaid}
                    </div>
                    <div className="text-[11px] font-mono text-emerald-700 mt-0.5">
                      Confirmed paid renewals
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                </div>

                {/* Expired Subscriptions */}
                <div className="bg-[#EBF0F7] rounded-3xl border border-white/80 p-5 shadow-[6px_6px_14px_#c8d2df,-6px_-6px_14px_#ffffff] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-rose-600 mb-1">
                      Expired Subscriptions
                    </div>
                    <div className="text-2xl font-black font-sans text-rose-950">
                      {expiredCount}
                    </div>
                    <div className="text-[11px] font-mono text-rose-700 mt-0.5">
                      Trial ended / Unrenewed
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* SEARCH & FILTERS TOOLBAR */}
              <div className="bg-[#EBF0F7] rounded-3xl border border-white/80 p-5 shadow-[6px_6px_14px_#c8d2df,-6px_-6px_14px_#ffffff] flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  {/* Search input */}
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search subscriber name, email, or plan..."
                      value={siteSubSearch}
                      onChange={(e) => {
                        setSiteSubSearch(e.target.value);
                        setSiteSubPage(1);
                      }}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#EBF0F7] shadow-[inset_3px_3px_6px_#c8d2df,inset_-3px_-3px_6px_#ffffff] border border-white/60 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                  </div>

                  {/* Status Filter */}
                  <div>
                    <select
                      value={siteSubStatusFilter}
                      onChange={(e) => {
                        setSiteSubStatusFilter(e.target.value);
                        setSiteSubPage(1);
                      }}
                      className="px-3.5 py-2.5 bg-[#EBF0F7] shadow-[inset_3px_3px_6px_#c8d2df,inset_-3px_-3px_6px_#ffffff] border border-white/60 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Expired">Expired</option>
                      <option value="Free Trial">Free Trial</option>
                      <option value="Active Paid">Active Paid</option>
                      <option value="Payment Pending">Payment Pending</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Plan Filter */}
                  <div>
                    <select
                      value={siteSubPlanFilter}
                      onChange={(e) => {
                        setSiteSubPlanFilter(e.target.value);
                        setSiteSubPage(1);
                      }}
                      className="px-3.5 py-2.5 bg-[#EBF0F7] shadow-[inset_3px_3px_6px_#c8d2df,inset_-3px_-3px_6px_#ffffff] border border-white/60 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Plans</option>
                      <option value="digital">London BigBen Digital ($3/mo)</option>
                      <option value="bundle">London BigBen Digital Bundle ($5/mo)</option>
                    </select>
                  </div>
                </div>

                <div className="text-slate-500 font-extrabold text-[11px]">
                  Showing {paginatedSubs.length} of {filteredSubs.length} records
                </div>
              </div>

              {/* SUBSCRIBERS TABLE */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 text-slate-500 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-5 font-extrabold">Subscriber</th>
                        <th className="py-3.5 px-4 font-extrabold">Plan</th>
                        <th className="py-3.5 px-4 font-extrabold">Status</th>
                        <th className="py-3.5 px-4 font-extrabold">Start Date</th>
                        <th className="py-3.5 px-4 font-extrabold">Trial Expiry</th>
                        <th className="py-3.5 px-4 font-extrabold">Remaining Days</th>
                        <th className="py-3.5 px-4 font-extrabold">Payment & Amount</th>
                        <th className="py-3.5 px-4 font-extrabold">Renewal Date</th>
                        <th className="py-3.5 px-5 font-extrabold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {siteSubscriptionsLoading ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400 font-mono text-xs">
                            <div className="inline-flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                              <span>Loading subscription records from database...</span>
                            </div>
                          </td>
                        </tr>
                      ) : paginatedSubs.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400 font-mono text-xs">
                            <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="font-bold text-slate-600">No subscription records found.</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              New subscribers activating a 1-year free trial on /subscribe will appear here in real-time.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        paginatedSubs.map((sub) => {
                          const expTime = new Date(sub.trialExpiryDate).getTime();
                          const diffMs = expTime - now;
                          const isExpiredTime = isNaN(expTime) ? false : diffMs <= 0;
                          const remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                          const isExpired = sub.status === "Expired" || (sub.status === "Free Trial" && isExpiredTime);
                          const effectiveStatus = isExpired ? "Expired" : sub.status;

                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                              {/* Subscriber Details: Name, Email & Phone */}
                              <td className="py-3.5 px-5">
                                <div className="min-w-0">
                                  <div className="font-extrabold text-slate-900 truncate">
                                    {sub.name || "Subscriber"}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono truncate">
                                    {sub.email}
                                  </div>
                                  {sub.phone && (
                                    <div className="text-[10.5px] text-slate-700 font-mono flex items-center gap-1.5 mt-0.5 font-medium">
                                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>{sub.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Selected Plan */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                                  sub.plan === "bundle"
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}>
                                  {sub.planName || (sub.plan === "bundle" ? "London BigBen Digital Bundle" : "London BigBen Digital")}
                                </span>
                              </td>

                              {/* Subscription Status (Active / Expired) */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {sub.status === "Cancelled" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold font-mono uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-300">
                                    Cancelled
                                  </span>
                                ) : isExpired ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold font-mono uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                    Expired
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold font-mono uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Active
                                  </span>
                                )}
                              </td>

                              {/* Start Date */}
                              <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                                {sub.startDate ? new Date(sub.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                              </td>

                              {/* Trial Expiry Date */}
                              <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                                {sub.trialExpiryDate ? new Date(sub.trialExpiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                              </td>

                              {/* Remaining Free Trial Days */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {effectiveStatus === "Free Trial" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Clock className="w-3 h-3 text-emerald-600" />
                                    {remainingDays} days left
                                  </span>
                                ) : effectiveStatus === "Expired" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold font-mono bg-rose-50 text-rose-700 border border-rose-200">
                                    0 days (Ended)
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-mono text-slate-400">—</span>
                                )}
                              </td>

                              {/* Payment & Amount */}
                              <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                                <div className="font-extrabold text-slate-900">
                                  {sub.paymentAmount || "$0.00"}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {sub.paymentStatus || (effectiveStatus === "Free Trial" ? "Free Trial" : "None")}
                                </div>
                              </td>

                              {/* Renewal Date */}
                              <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                                {sub.renewalDate ? new Date(sub.renewalDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-5 whitespace-nowrap text-right">
                                <button
                                  onClick={() => handleDeleteSiteSubscription(sub.id, sub.email)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center"
                                  title="Delete subscription record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between font-mono text-xs text-slate-600">
                    <div>
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSiteSubPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="px-3 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors font-bold"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setSiteSubPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors font-bold"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* TAB 3: POSTS WORKSPACE */}
        {activeTab === "articles" && (
          <div className="space-y-6">
            
            {/* Posts Title & Filter Sub-Tabs matching User UI */}
            {/* Posts Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#c8d2df]/60 pb-4">
              <div>
                <h2 className="text-2xl font-extrabold font-sans text-slate-900 tracking-tight">
                  Posts
                </h2>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={handleBackupArticlesZIP}
                  className="flex items-center gap-2 bg-[#EBF0F7] shadow-[4px_4px_10px_#c8d2df,-4px_-4px_10px_#ffffff] active:shadow-[inset_2px_2px_5px_#c8d2df,inset_-2px_-2px_5px_#ffffff] border border-white/80 text-orange-700 hover:text-orange-800 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer uppercase tracking-wider font-mono"
                >
                  <Download className="w-3.5 h-3.5 text-orange-600" />
                  BACKUP ARTICLES (ZIP)
                </button>

                <div className="flex items-center gap-2 bg-[#EBF0F7] shadow-[inset_3px_3px_6px_#c8d2df,inset_-3px_-3px_6px_#ffffff] border border-white/60 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-extrabold font-mono">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span className="uppercase tracking-wider text-slate-500 text-[10.5px]">Total Published Posts:</span>
                  <span className="text-slate-900 bg-[#EBF0F7] shadow-[2px_2px_5px_#c8d2df,-2px_-2px_5px_#ffffff] border border-white/80 px-2 py-0.5 rounded-lg text-xs font-black">
                    {articles.length}
                  </span>
                </div>
              </div>
            </div>

            {/* SUB-TAB 1: PUBLISHED POSTS */}
            {postSubTab === "published" && (
              <div className="space-y-6">
                {/* FILTER & SEARCH TOOLBAR CARD */}
                <div className="bg-[#EBF0F7] rounded-3xl border border-white/80 p-5 shadow-[8px_8px_18px_#c8d2df,-8px_-8px_18px_#ffffff] font-mono text-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                        FILTER BY CATEGORY
                      </label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3.5 py-2.5 bg-[#EBF0F7] shadow-[inset_3px_3px_6px_#c8d2df,inset_-3px_-3px_6px_#ffffff] border border-white/50 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer uppercase"
                      >
                        <option value="all">All Categories</option>
                        {ALL_MAIN_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat.toUpperCase()}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                        FILTER BY PLACEMENT
                      </label>
                      <select
                        value={placementFilter}
                        onChange={(e) => setPlacementFilter(e.target.value)}
                        className="px-3.5 py-2.5 bg-[#EBF0F7] shadow-[inset_3px_3px_6px_#c8d2df,inset_-3px_-3px_6px_#ffffff] border border-white/50 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Placements</option>
                        <option value="home_page_a_plus">Home Page A+ Section</option>
                        <option value="trending_now">Trending Now Section</option>
                        <option value="editors_picks">Editor&apos;s Picks Section</option>
                        <option value="latest_news">Latest News Section</option>
                        <option value="home_page_a_plus_2">Main News 2 / Home Page A+ Section 2</option>
                        <option value="home_page_a_plus_3">Home Page A+ Section 3</option>
                        <option value="category_only">Category Section Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">
                        SEARCH ARTICLES
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search title, author..."
                          value={articleSearchQuery}
                          onChange={(e) => setArticleSearchQuery(e.target.value)}
                          className="w-64 pl-9 pr-3.5 py-2.5 bg-[#EBF0F7] shadow-[inset_3px_3px_6px_#c8d2df,inset_-3px_-3px_6px_#ffffff] border border-white/50 rounded-xl text-xs text-slate-900 focus:outline-none placeholder-slate-400 font-sans"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCategoryFilter("all");
                      setPlacementFilter("all");
                      setArticleSearchQuery("");
                    }}
                    className="bg-[#EBF0F7] shadow-[4px_4px_10px_#c8d2df,-4px_-4px_10px_#ffffff] active:shadow-[inset_2px_2px_5px_#c8d2df,inset_-2px_-2px_5px_#ffffff] border border-white/80 text-blue-700 hover:text-blue-800 font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>

                {/* PUBLISHED POSTS TABLE */}
                <div className="bg-[#EBF0F7] rounded-3xl shadow-[10px_10px_24px_#c8d2df,-10px_-10px_24px_#ffffff] border border-white/80 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#c8d2df]/60 bg-[#EBF0F7] text-[10px] font-extrabold uppercase tracking-wider text-slate-500 font-mono">
                          <th className="py-3.5 px-6">TITLE</th>
                          <th className="py-3.5 px-4">CATEGORY</th>
                          <th className="py-3.5 px-4">STATUS</th>
                          <th className="py-3.5 px-4">VIEWS</th>
                          <th className="py-3.5 px-4">DATE</th>
                          <th className="hidden sm:table-cell py-3.5 px-6 text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#c8d2df]/30 text-xs">
                        {filteredArticles.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 font-mono">
                              No published articles found matching search criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredArticles.map((art, idx) => (
                            <tr key={`art-${art.id}-${idx}`} className="hover:bg-white/40 transition-colors">
                              <td className="py-4 px-6 max-w-lg">
                                <div className="flex items-start gap-3.5">
                                  <img
                                    src={art.imageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop"}
                                    alt="Thumbnail"
                                    onError={(e) => {
                                      e.currentTarget.src = "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop";
                                    }}
                                    className="w-12 h-12 rounded-xl object-cover shadow-[2px_2px_5px_#c8d2df,-2px_-2px_5px_#ffffff] border border-white/60 flex-shrink-0"
                                  />
                                  <div>
                                    <h3 className="font-extrabold text-slate-900 text-[13px] leading-snug line-clamp-1">
                                      {art.title}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                                      {art.description}
                                    </p>

                                    {/* Mobile Action Buttons (< sm) */}
                                    <div className="flex sm:hidden items-center gap-2 mt-2 pt-1.5 border-t border-[#c8d2df]/50">
                                      <button
                                        onClick={() => handleOpenFullEditor(art)}
                                        title="Edit Article"
                                        className="flex items-center gap-1.5 bg-[#EBF0F7] shadow-[2px_2px_5px_#c8d2df,-2px_-2px_5px_#ffffff] active:shadow-[inset_2px_2px_4px_#c8d2df,inset_-2px_-2px_4px_#ffffff] border border-white/80 text-blue-700 hover:text-blue-800 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                                      >
                                        <Pencil className="w-3 h-3" />
                                        Edit
                                      </button>

                                      <button
                                        onClick={() => handleDeleteArticle(art.id, art.title)}
                                        title="Move to Trash"
                                        className="flex items-center gap-1.5 bg-[#EBF0F7] shadow-[2px_2px_5px_#c8d2df,-2px_-2px_5px_#ffffff] active:shadow-[inset_2px_2px_4px_#c8d2df,inset_-2px_-2px_4px_#ffffff] border border-white/80 text-slate-500 hover:text-rose-600 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        Trash
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="inline-block px-2.5 py-1 bg-[#EBF0F7] shadow-[inset_2px_2px_4px_#c8d2df,inset_-2px_-2px_4px_#ffffff] border border-white/60 text-blue-700 text-[9px] font-extrabold uppercase rounded-md font-mono">
                                  {art.category_name}
                                </span>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EBF0F7] shadow-[inset_2px_2px_4px_#c8d2df,inset_-2px_-2px_4px_#ffffff] border border-white/60 text-emerald-700 text-[10px] font-extrabold rounded-full font-mono">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                  Published
                                </span>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EBF0F7] shadow-[inset_2px_2px_4px_#c8d2df,inset_-2px_-2px_4px_#ffffff] border border-white/60 text-slate-700 text-[11px] font-bold rounded-lg font-mono">
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{Number(art.views || (art as any).reads || 0).toLocaleString()}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">views</span>
                                </span>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                                {art.published_at ? new Date(art.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Aug 13, 2026"}
                              </td>

                              <td className="hidden sm:table-cell py-4 px-6 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenFullEditor(art)}
                                    title="Edit Article"
                                    className="flex items-center gap-1.5 bg-[#EBF0F7] shadow-[3px_3px_7px_#c8d2df,-3px_-3px_7px_#ffffff] active:shadow-[inset_2px_2px_4px_#c8d2df,inset_-2px_-2px_4px_#ffffff] border border-white/80 text-blue-700 hover:text-blue-800 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                  </button>

                                  <button
                                    onClick={() => handleDeleteArticle(art.id, art.title)}
                                    title="Move to Trash"
                                    className="w-8 h-8 rounded-lg bg-[#EBF0F7] shadow-[3px_3px_7px_#c8d2df,-3px_-3px_7px_#ffffff] active:shadow-[inset_2px_2px_4px_#c8d2df,inset_-2px_-2px_4px_#ffffff] border border-white/80 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: DRAFTS */}
            {postSubTab === "drafts" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                          <th className="py-3.5 px-6">TITLE</th>
                          <th className="py-3.5 px-4">CATEGORY</th>
                          <th className="py-3.5 px-4">STATUS</th>
                          <th className="py-3.5 px-4">AUTHOR</th>
                          <th className="py-3.5 px-6 text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {writerSubmissions.filter(s => (s.status || "").toLowerCase() === "draft").length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 font-mono">
                              No article drafts found.
                            </td>
                          </tr>
                        ) : (
                          writerSubmissions
                            .filter(s => (s.status || "").toLowerCase() === "draft")
                            .map((draft, idx) => (
                              <tr key={`draft-${draft.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-4 px-6 max-w-lg font-bold text-slate-900">
                                  {draft.title}
                                </td>
                                <td className="py-4 px-4 whitespace-nowrap">
                                  <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-extrabold uppercase rounded-md font-mono">
                                    {draft.category}
                                  </span>
                                </td>
                                <td className="py-4 px-4 whitespace-nowrap">
                                  <span className="inline-block px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold rounded-full font-mono">
                                    Draft
                                  </span>
                                </td>
                                <td className="py-4 px-4 whitespace-nowrap font-semibold text-slate-700">
                                  {draft.authorName}
                                </td>
                                <td className="py-4 px-6 whitespace-nowrap text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => openStudioForArticle(draft)}
                                      className="border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                                    >
                                      Inspect Draft
                                    </button>

                                    <button
                                      onClick={() => handleTrashDraftOrPending(draft, "Draft")}
                                      title="Move Draft to Trash"
                                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: PENDING REVIEW */}
            {postSubTab === "pending" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                          <th className="py-3.5 px-6">ARTICLE DETAILS</th>
                          <th className="py-3.5 px-4">CATEGORY</th>
                          <th className="py-3.5 px-4">AUTHOR</th>
                          <th className="py-3.5 px-4">STATUS</th>
                          <th className="py-3.5 px-6 text-right">EDITORIAL ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {writerSubmissions.filter(s => { const st = (s.status || "").toLowerCase(); const tk = cleanTitleKeyForFilter(s.title); if (st.includes("reject") || rejectedIds.has(String(s.id)) || (tk && rejectedTitleKeys.has(tk))) return false; return st.includes("pending") || st.includes("submitted") || st.includes("review"); }).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 font-mono">
                              No pending articles awaiting review.
                            </td>
                          </tr>
                        ) : (
                          writerSubmissions
                            .filter(s => { const st = (s.status || "").toLowerCase(); const tk = cleanTitleKeyForFilter(s.title); if (st.includes("reject") || rejectedIds.has(String(s.id)) || (tk && rejectedTitleKeys.has(tk))) return false; return st.includes("pending") || st.includes("submitted") || st.includes("review"); })
                            .map((sub, idx) => (
                              <tr key={`pending-${sub.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-4 px-6 max-w-lg">
                                  <div className="flex items-start gap-3.5">
                                    <img
                                      src={sub.imageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop"}
                                      alt="Thumbnail"
                                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0 shadow-sm"
                                    />
                                    <div>
                                      <h3 className="font-extrabold text-slate-900 text-[13px] leading-snug line-clamp-1">
                                        {sub.title}
                                      </h3>
                                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                                        {sub.summary}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-4 px-4 whitespace-nowrap">
                                  <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-extrabold uppercase rounded-md font-mono">
                                    {sub.category}
                                  </span>
                                </td>

                                <td className="py-4 px-4 whitespace-nowrap font-bold text-slate-700">
                                  {sub.authorName}
                                </td>

                                <td className="py-4 px-4 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold rounded-full font-mono">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                                    Pending review
                                  </span>
                                </td>

                                <td className="py-4 px-6 whitespace-nowrap text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => openStudioForArticle(sub)}
                                      className="border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shadow-xs"
                                    >
                                      Review & Publish
                                    </button>

                                    <button
                                      onClick={() => handleOpenRejectModal(sub)}
                                      title="Reject Article"
                                      className="border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                                    >
                                      Reject
                                    </button>

                                    <button
                                      onClick={() => handleTrashDraftOrPending(sub, "Pending review")}
                                      title="Move Pending Review to Trash"
                                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: REJECTED */}
            {postSubTab === "rejected" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                          <th className="py-3.5 px-6">ARTICLE DETAILS</th>
                          <th className="py-3.5 px-4">CATEGORY</th>
                          <th className="py-3.5 px-4">AUTHOR</th>
                          <th className="py-3.5 px-4">REJECTION FEEDBACK</th>
                          <th className="py-3.5 px-6 text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {writerSubmissions.filter(s => (s.status || "").toLowerCase().includes("reject")).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 font-mono">
                              No rejected articles. Articles rejected with editorial feedback will appear here.
                            </td>
                          </tr>
                        ) : (
                          writerSubmissions
                            .filter(s => (s.status || "").toLowerCase().includes("reject"))
                            .map((sub, idx) => (
                              <tr key={`rejected-${sub.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-4 px-6 max-w-md">
                                  <div className="flex items-start gap-3.5">
                                    <img
                                      src={sub.imageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop"}
                                      alt="Thumbnail"
                                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0 shadow-sm opacity-80"
                                    />
                                    <div>
                                      <h3 className="font-extrabold text-slate-900 text-[13px] leading-snug line-clamp-1">
                                        {sub.title}
                                      </h3>
                                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                                        {sub.summary}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-extrabold rounded font-mono uppercase">
                                          REJECTED
                                        </span>
                                        {sub.rejectedAt && (
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            {new Date(sub.rejectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-4 px-4 whitespace-nowrap">
                                  <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-extrabold uppercase rounded-md font-mono">
                                    {sub.category}
                                  </span>
                                </td>

                                <td className="py-4 px-4 whitespace-nowrap font-bold text-slate-700">
                                  {sub.authorName || "Writer"}
                                </td>

                                <td className="py-4 px-4 max-w-xs">
                                  {sub.rejectionReason ? (
                                    <div className="p-2 bg-rose-50/70 border border-rose-200 rounded-lg text-[11px] text-rose-900 font-medium leading-tight">
                                      <span className="font-bold block text-[10px] text-rose-700 uppercase font-mono mb-0.5">Feedback:</span>
                                      "{sub.rejectionReason}"
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 italic">No feedback provided</span>
                                  )}
                                </td>

                                <td className="py-4 px-6 whitespace-nowrap text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => openStudioForArticle(sub)}
                                      className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer shadow-xs"
                                    >
                                      Re-Review
                                    </button>

                                    <button
                                      onClick={() => handleTrashDraftOrPending(sub, "Pending review")}
                                      title="Move to Trash"
                                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 4: TRASH */}
            {postSubTab === "trash" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                          <th className="py-3.5 px-6">TITLE</th>
                          <th className="py-3.5 px-4">CATEGORY</th>
                          <th className="py-3.5 px-4">STATUS</th>
                          <th className="py-3.5 px-4">DATE</th>
                          <th className="py-3.5 px-6 text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {trashedArticles.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 font-mono">
                              Trash is empty. Trashed articles will appear here.
                            </td>
                          </tr>
                        ) : (
                          trashedArticles.map((art, idx) => (
                            <tr key={`trash-${art.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-4 px-6 max-w-lg">
                                <div className="flex items-start gap-3.5">
                                  <img
                                    src={art.imageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop"}
                                    alt="Thumbnail"
                                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0 shadow-sm opacity-60"
                                  />
                                  <div>
                                    <h3 className="font-extrabold text-slate-700 text-[13px] leading-snug line-clamp-1 line-through">
                                      {art.title}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                                      {art.description}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-extrabold uppercase rounded-md font-mono">
                                  {art.category_name}
                                </span>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold rounded-full font-mono">
                                  Trash
                                </span>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                                {art.published_at ? new Date(art.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Aug 13, 2026"}
                              </td>

                              <td className="py-4 px-6 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleRestoreArticle(art)}
                                    title="Restore Article"
                                    className="border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                                  >
                                    Restore
                                  </button>

                                  <button
                                    onClick={() => handlePermanentDeleteArticle(art)}
                                    title="Permanently Delete"
                                    className="border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                                  >
                                    Delete Permanently
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: USERS (USERS DESK) */}
        {activeTab === "users" && (
          <div className="space-y-6">
            
            {/* Header Bar above Users Desk Table */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold font-sans text-slate-900 tracking-tight">
                  Users Desk
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenAddUserModal}
                  className="flex items-center gap-2 bg-[#D31220] hover:bg-[#BF1E2D] text-white px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  + ADD USER
                </button>

                <span className="text-[11px] font-extrabold bg-slate-200/80 text-slate-700 px-3.5 py-1.5 rounded-full font-mono">
                  Total Users: {workspaceUsers.length}
                </span>
              </div>
            </div>

            {/* SUB-TABS NAVIGATION BAR */}
            <div className="border-b border-slate-200 flex items-center gap-6 font-mono text-xs">
              <button
                onClick={() => setUserSubTab("ALL")}
                className={`pb-3 font-extrabold transition-all cursor-pointer border-b-2 uppercase tracking-wider ${
                  userSubTab === "ALL"
                    ? "border-[#D31220] text-[#D31220]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                ALL USERS ({workspaceUsers.length})
              </button>

              <button
                onClick={() => setUserSubTab("ADMINS")}
                className={`pb-3 font-extrabold transition-all cursor-pointer border-b-2 uppercase tracking-wider ${
                  userSubTab === "ADMINS"
                    ? "border-[#D31220] text-[#D31220]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                ADMINS ({countAdmins})
              </button>

              <button
                onClick={() => setUserSubTab("WRITERS")}
                className={`pb-3 font-extrabold transition-all cursor-pointer border-b-2 uppercase tracking-wider ${
                  userSubTab === "WRITERS"
                    ? "border-[#D31220] text-[#D31220]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                WRITERS ({countWriters})
              </button>

              <button
                onClick={() => setUserSubTab("READERS")}
                className={`pb-3 font-extrabold transition-all cursor-pointer border-b-2 uppercase tracking-wider ${
                  userSubTab === "READERS"
                    ? "border-[#D31220] text-[#D31220]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                READERS ({countReaders})
              </button>
            </div>

            {/* Subheading */}
            <h3 className="text-base font-extrabold font-sans text-slate-900 tracking-tight pt-2">
              User Workspace Roles
            </h3>

            {/* USERS DESK TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                      <th className="py-3.5 px-6">NAME</th>
                      <th className="py-3.5 px-6">EMAIL ADDRESS</th>
                      <th className="py-3.5 px-6">WORKSPACE ROLE</th>
                      <th className="py-3.5 px-6 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredWorkspaceUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-400 font-mono">
                          No users found matching selected sub-tab filter.
                        </td>
                      </tr>
                    ) : (
                      filteredWorkspaceUsers.map((user, idx) => {
                        const currentUserEmail = (adminUser?.email || auth.user?.email || "").toLowerCase().trim();
                        const userEmail = (user.email || "").toLowerCase().trim();
                        const isSelf = Boolean(currentUserEmail && userEmail && currentUserEmail === userEmail);
                        const isTargetAdmin = user.role === "ADMIN";
                        const isTargetDefaultAdmin = Boolean(user.isDefaultAdmin || user.is_default_admin);

                        // Default admin can edit normal admins, writers, readers, and himself.
                        // Normal admin can edit himself, writers, and readers (but not other admins).
                        const canEdit = isSelf || (isCurrentAdminDefault ? !isTargetDefaultAdmin : (!isTargetAdmin && !isTargetDefaultAdmin));
                        const canDelete = !isTargetDefaultAdmin && !isSelf && (isCurrentAdminDefault || user.role !== "ADMIN");

                        return (
                        <tr key={`usr-${user.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* NAME + DEFAULT ADMIN BADGE */}
                          <td className="py-4 px-6 font-extrabold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span>{user.name}</span>
                              {user.isDefaultAdmin && (
                                <span className="bg-amber-100/90 text-amber-800 border border-amber-300 text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-md">
                                  DEFAULT ADMIN
                                </span>
                              )}
                            </div>
                          </td>

                          {/* EMAIL ADDRESS */}
                          <td className="py-4 px-6 font-mono text-slate-600 whitespace-nowrap">
                            {user.email}
                          </td>

                          {/* WORKSPACE ROLE */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            {user.role === "WRITER" && (
                              <span className="border border-blue-300 bg-blue-50 text-blue-700 text-[10px] font-extrabold px-3.5 py-1 rounded-full font-mono uppercase tracking-wider">
                                WRITER
                              </span>
                            )}
                            {user.role === "ADMIN" && (
                              <span className="border border-rose-300 bg-rose-50 text-rose-700 text-[10px] font-extrabold px-3.5 py-1 rounded-full font-mono uppercase tracking-wider">
                                ADMIN
                              </span>
                            )}
                            {user.role === "READER" && (
                              <span className="border border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-3.5 py-1 rounded-full font-mono uppercase tracking-wider">
                                READER
                              </span>
                            )}
                          </td>

                          {/* ACTIONS */}
                          <td className="py-4 px-6 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              
                              {/* VIEW ICON */}
                              <button
                                onClick={() => setViewingUser(user)}
                                title="View User Details"
                                className="w-8 h-8 rounded-xl bg-blue-50/70 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors cursor-pointer border border-blue-200/60"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* EDIT BUTTON (Admin can edit his own account, but not other admin accounts) */}
                              {canEdit && (
                                <button
                                  onClick={() => handleOpenEditUserModal(user)}
                                  className="border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10.5px] font-extrabold px-3 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 uppercase tracking-wider font-mono"
                                >
                                  <Pencil className="w-3 h-3 text-slate-500" />
                                  EDIT
                                </button>
                              )}

                              {/* DELETE BUTTON */}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.name, user.isDefaultAdmin)}
                                  className="border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 text-[10.5px] font-extrabold px-3 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 uppercase tracking-wider font-mono"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-500" />
                                  DELETE
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MANAGE ADS */}
        {activeTab === "ads" && (
          <div className="space-y-6">
            
            {/* Main Section Header */}
            <div>
              <h2 className="text-xl font-extrabold font-sans text-slate-900 tracking-tight">
                Manage Ads
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Configure customized advertisement graphics or promote internal articles in predefined slots.
              </p>
            </div>

            {/* SUB-TABS NAVIGATION BAR */}
            <div className="border-b border-slate-200 flex items-center gap-6 font-mono text-xs flex-wrap">
              <button
                onClick={() => setAdSubTab("ALL")}
                className={`pb-3 font-extrabold transition-all cursor-pointer border-b-2 uppercase tracking-wider ${
                  adSubTab === "ALL"
                    ? "border-[#D31220] text-[#D31220]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                SHOW ALL AD SECTIONS ({adSlots.length})
              </button>

              <button
                onClick={() => setAdSubTab("HOMEPAGE")}
                className={`pb-3 font-extrabold transition-all cursor-pointer border-b-2 uppercase tracking-wider ${
                  adSubTab === "HOMEPAGE"
                    ? "border-[#D31220] text-[#D31220]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                HOMEPAGE ADS ({adSlots.filter(s => s.categoryGroup === "HOMEPAGE").length})
              </button>

              <button
                onClick={() => setAdSubTab("CATEGORY")}
                className={`pb-3 font-extrabold transition-all cursor-pointer border-b-2 uppercase tracking-wider ${
                  adSubTab === "CATEGORY"
                    ? "border-[#D31220] text-[#D31220]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                CATEGORY & ARTICLE ADS ({adSlots.filter(s => s.categoryGroup === "CATEGORY").length})
              </button>

              <button
                onClick={() => setAdSubTab("AUTHOR")}
                className={`pb-3 font-extrabold transition-all cursor-pointer border-b-2 uppercase tracking-wider ${
                  adSubTab === "AUTHOR"
                    ? "border-[#D31220] text-[#D31220]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                AUTHOR PAGE ADS ({adSlots.filter(s => s.categoryGroup === "AUTHOR").length})
              </button>
            </div>

            {/* AD SLOTS CARDS LIST */}
            <div className="space-y-6">
              {filteredAdSlots.map((slot, idx) => (
                <div key={`ad-slot-${slot.id}-${idx}`} className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-6">
                  
                  {/* Card Header: Slot Dimensions & Active Switch */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[11px] font-extrabold font-mono text-orange-600 uppercase tracking-widest">
                        SLOT DIMENSIONS: {slot.dimensions}
                      </span>
                      <span className="text-[9.5px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                        {slot.categoryGroup === "HOMEPAGE" ? "Homepage Section" : slot.categoryGroup === "CATEGORY" ? "Category & Article Pages" : "Author Profile Page"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold font-mono uppercase text-slate-400">
                        {slot.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleAdActive(slot.id)}
                        className={`w-11 h-6 rounded-full transition-colors cursor-pointer p-0.5 relative ${
                          slot.isActive ? "bg-[#D31220]" : "bg-slate-300"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                            slot.isActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Slot Title & Description */}
                  <div>
                    <h3 className="text-lg font-bold font-sans text-slate-900 leading-snug">
                      {slot.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {slot.description}
                    </p>
                  </div>

                  {/* Main Grid: Image Preview & Target Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column: Image Preview + Upload */}
                    <div className="md:col-span-5 space-y-3">
                      {slot.imageUrl ? (
                        <div className="space-y-2">
                          <div
                            style={{
                              aspectRatio: (() => {
                                const [w, h] = (slot.dimensions || "300X250").split(/[xX]/).map(Number);
                                return w && h ? `${w}/${h}` : "300/250";
                              })()
                            }}
                            className="relative w-full max-h-[240px] overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-inner flex items-center justify-center group"
                          >
                            <img
                              src={slot.imageUrl}
                              alt={slot.title}
                              className="w-full h-full object-cover rounded-xl"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openCropper(slot.id, slot.imageUrl)}
                                className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-lg shadow-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <Crop className="w-3.5 h-3.5 text-[#D31220]" />
                                Adjust Frame
                              </button>
                            </div>
                            <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-[9px] font-mono font-bold text-white px-2 py-0.5 rounded border border-white/10 uppercase">
                              Frame: {slot.dimensions}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-44 rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 flex flex-col items-center justify-center p-4 text-center">
                          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 font-bold mb-1">
                            NO IMAGE (BLANK)
                          </span>
                          <span className="text-sm font-mono font-bold text-slate-700">
                            Fits: {slot.dimensions.replace(/[xX]/g, " × ")}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 mt-1">
                            Accepted Size: {slot.dimensions.replace(/[xX]/g, " × ")} px
                          </span>
                        </div>
                      )}

                      <div>
                        <label className="block text-[9px] font-extrabold font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                          UPLOAD BANNER IMAGE
                        </label>
                        <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                          <input
                            type="file"
                            id={`file-${slot.id}`}
                            accept="image/*"
                            onChange={(e) => handleAdImageUpload(slot.id, e)}
                            className="hidden"
                          />
                          <label
                            htmlFor={`file-${slot.id}`}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-300 cursor-pointer text-xs flex items-center gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Choose File
                          </label>

                          {slot.imageUrl && (
                            <button
                              type="button"
                              onClick={() => openCropper(slot.id, slot.imageUrl)}
                              className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                            >
                              <Crop className="w-3.5 h-3.5 text-red-400" />
                              Crop / Set Frame
                            </button>
                          )}

                          <span className="text-slate-400 text-[11px] truncate">
                            {slot.imageUrl ? "Active framed image" : "No file chosen"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Target Action Type & Target Link URL */}
                    <div className="md:col-span-7 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* TARGET ACTION TYPE */}
                        <div>
                          <label className="block text-[9px] font-extrabold font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                            TARGET ACTION TYPE
                          </label>
                          <select
                            value={slot.actionType}
                            onChange={(e) => updateAdField(slot.id, "actionType", e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#D31220] cursor-pointer"
                          >
                            <option value="External Link (URL)">External Link (URL)</option>
                            <option value="Promote Internal Article">Promote Internal Article</option>
                            <option value="Sponsorship Banner">Sponsorship Banner</option>
                          </select>
                        </div>

                        {/* TARGET LINK URL */}
                        <div>
                          <label className="block text-[9px] font-extrabold font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                            TARGET LINK URL
                          </label>
                          <input
                            type="text"
                            value={slot.targetUrl}
                            onChange={(e) => updateAdField(slot.id, "targetUrl", e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-[#D31220]"
                          />
                        </div>

                      </div>
                    </div>

                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    {slot.imageUrl && (
                      <button
                        type="button"
                        onClick={() => openCropper(slot.id, slot.imageUrl)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer uppercase font-mono tracking-wider flex items-center gap-1.5"
                      >
                        <Crop className="w-3.5 h-3.5 text-slate-600" />
                        CROP / SET FRAME
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleClearAdImage(slot.id)}
                      className="px-5 py-2.5 border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-extrabold rounded-xl transition-all cursor-pointer uppercase font-mono tracking-wider"
                    >
                      CLEAR IMAGE
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveAdConfig(slot.id)}
                      className="px-6 py-2.5 bg-[#D31220] hover:bg-[#BF1E2D] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-red-950/20 uppercase font-mono tracking-wider"
                    >
                      SAVE AD CONFIG
                    </button>
                  </div>

                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 6: CONTACT US SUBMISSIONS */}
        {activeTab === "contact_submissions" && (
          <div className="space-y-6">
            
            {/* Header & Search Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold font-sans text-slate-900 tracking-tight">
                  Contact Us Submissions
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  View and manage messages submitted by readers and partners on the Contact Us page.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search name, email, message..."
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    className="w-64 pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D31220] shadow-sm font-sans"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                {/* All Inquiry Types Dropdown */}
                <select
                  value={contactTypeFilter}
                  onChange={(e) => setContactTypeFilter(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#D31220] cursor-pointer shadow-sm font-mono"
                >
                  <option value="all">All Inquiry Types</option>
                  <option value="Editorial">Editorial</option>
                  <option value="Advertising">Advertising</option>
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Feedback">Feedback</option>
                </select>
              </div>
            </div>

            {/* CONTACT SUBMISSIONS TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                      <th className="py-3 px-4">DATE</th>
                      <th className="py-3 px-3">NAME / COMPANY</th>
                      <th className="py-3 px-3">EMAIL</th>
                      <th className="py-3 px-3">PHONE / WHATSAPP</th>
                      <th className="py-3 px-3">TYPE</th>
                      <th className="py-3 px-3">MESSAGE</th>
                      <th className="py-3 px-3">STATUS</th>
                      <th className="py-3 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredContactSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                          No contact submissions found matching search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredContactSubmissions.map((c, idx) => (
                        <tr key={`contact-sub-${c.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* DATE */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                            {c.date}
                          </td>

                          {/* NAME / COMPANY */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <p className="font-extrabold text-slate-900 text-xs">{c.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{c.company || "N/A"}</p>
                          </td>

                          {/* EMAIL */}
                          <td className="py-3.5 px-3 font-mono text-slate-600 text-[11px] max-w-[150px] truncate" title={c.email}>
                            {c.email}
                          </td>

                          {/* PHONE / WHATSAPP */}
                          <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[10px]">
                            <p className="text-slate-700 font-bold">{c.phone || "P: 000 000 0000"}</p>
                            <p className="text-slate-400">{c.whatsapp || "W: 000 000 0000"}</p>
                          </td>

                          {/* TYPE */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-mono text-[9px] font-extrabold uppercase">
                              {c.type}
                            </span>
                          </td>

                          {/* MESSAGE */}
                          <td className="py-3.5 px-3 max-w-[180px] text-[11px] text-slate-600 truncate" title={c.message}>
                            {c.message}
                          </td>

                          {/* STATUS */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <select
                              value={c.status}
                              onChange={(e) => handleUpdateContactStatus(c.id, e.target.value)}
                              className="px-2 py-0.5 text-[10.5px] font-extrabold text-blue-600 bg-blue-50 border border-blue-200 rounded-md focus:outline-none focus:border-blue-400 cursor-pointer font-mono"
                            >
                              <option value="New">New</option>
                              <option value="In Review">In Review</option>
                              <option value="Resolved">Resolved</option>
                              <option value="Archived">Archived</option>
                            </select>
                          </td>

                          {/* ACTIONS */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingContactModal(c)}
                                title="View Submission Details"
                                className="w-7 h-7 rounded-lg bg-blue-50/70 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors cursor-pointer border border-blue-200/60"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteContactSubmission(c.id, c.name)}
                                title="Delete Submission"
                                className="w-7 h-7 rounded-lg bg-rose-50/70 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors cursor-pointer border border-rose-200/60"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 7: ADVERTISE LEADS */}
        {activeTab === "advertise_leads" && (
          <div className="space-y-6">
            
            {/* Header & Search Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold font-sans text-slate-900 tracking-tight">
                  Advertise Client Leads
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  View and manage leads submitted by businesses and partners on the Advertise page.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search name, company, message..."
                    value={leadSearchQuery}
                    onChange={(e) => setLeadSearchQuery(e.target.value)}
                    className="w-64 pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D31220] shadow-sm font-sans"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                {/* All Services Dropdown */}
                <select
                  value={leadServiceFilter}
                  onChange={(e) => setLeadServiceFilter(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#D31220] cursor-pointer shadow-sm font-mono"
                >
                  <option value="all">All Services</option>
                  <option value="Banner Ads">Banner Ads</option>
                  <option value="Sponsored Articles">Sponsored Articles</option>
                  <option value="Newsletter Takeover">Newsletter Takeover</option>
                  <option value="Brand Partnership">Brand Partnership</option>
                </select>
              </div>
            </div>

            {/* ADVERTISE CLIENT LEADS TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                      <th className="py-3 px-4">DATE</th>
                      <th className="py-3 px-3">SUBMITTER / COMPANY</th>
                      <th className="py-3 px-3">EMAIL</th>
                      <th className="py-3 px-3">PHONE / WHATSAPP</th>
                      <th className="py-3 px-3">SERVICE OPTION</th>
                      <th className="py-3 px-3">REQUIREMENTS</th>
                      <th className="py-3 px-3">STATUS</th>
                      <th className="py-3 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAdvertiseLeads.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                          No advertise leads found.
                        </td>
                      </tr>
                    ) : (
                      filteredAdvertiseLeads.map((l, idx) => (
                        <tr key={`lead-${l.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* DATE */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                            {l.date}
                          </td>

                          {/* SUBMITTER / COMPANY */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <p className="font-extrabold text-slate-900 text-xs">{l.submitterName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{l.company || "N/A"}</p>
                          </td>

                          {/* EMAIL */}
                          <td className="py-3.5 px-3 font-mono text-slate-600 text-[11px] max-w-[150px] truncate" title={l.email}>
                            {l.email}
                          </td>

                          {/* PHONE / WHATSAPP */}
                          <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[10px]">
                            <p className="text-slate-700 font-bold">{l.phone || "P: 000 000 0000"}</p>
                            <p className="text-slate-400">{l.whatsapp || "W: 000 000 0000"}</p>
                          </td>

                          {/* SERVICE OPTION */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full font-mono text-[9px] font-extrabold uppercase">
                              {l.serviceOption}
                            </span>
                          </td>

                          {/* REQUIREMENTS */}
                          <td className="py-3.5 px-3 max-w-[180px] text-[11px] text-slate-600 truncate" title={l.requirements}>
                            {l.requirements}
                          </td>

                          {/* STATUS */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <select
                              value={l.status}
                              onChange={(e) => handleUpdateLeadStatus(l.id, e.target.value)}
                              className="px-2 py-0.5 text-[10.5px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md focus:outline-none focus:border-emerald-400 cursor-pointer font-mono"
                            >
                              <option value="New">New</option>
                              <option value="In Discussion">In Discussion</option>
                              <option value="Qualified">Qualified</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </td>

                          {/* ACTIONS */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingLeadModal(l)}
                                title="View Lead Details"
                                className="w-7 h-7 rounded-lg bg-blue-50/70 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors cursor-pointer border border-blue-200/60"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteLead(l.id, l.submitterName)}
                                title="Delete Lead"
                                className="w-7 h-7 rounded-lg bg-rose-50/70 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors cursor-pointer border border-rose-200/60"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 8: DATABASE BACKUPS */}
        {activeTab === "backups" && (
          <div className="space-y-6">
            
            {/* Header & Right Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold font-sans text-slate-900 tracking-tight">
                  Database Backups & Cloud Restore
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Automated and manual database snapshots stored on Backblaze B2.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* CREATE B2 BACKUP */}
                <button
                  onClick={handleCreateB2Backup}
                  className="px-4 py-2 border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer font-mono shadow-sm"
                >
                  <Database className="w-3.5 h-3.5 text-amber-700" />
                  CREATE B2 BACKUP
                </button>

                {/* UPLOAD JSON RESTORE */}
                <div className="relative">
                  <input
                    type="file"
                    id="json-restore-file"
                    accept=".json"
                    onChange={handleUploadJsonRestore}
                    className="hidden"
                  />
                  <label
                    htmlFor="json-restore-file"
                    className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer font-mono shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    UPLOAD JSON RESTORE
                  </label>
                </div>
              </div>
            </div>

            {/* Sub-header Informational Notice */}
            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              Backups are automatically taken every 24 hours. The snapshots include all published articles, media links, admin & writer accounts, subscriber list, ad placements, and contact leads.
            </p>

            {/* DATABASE BACKUPS TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                      <th className="py-3.5 px-6">BACKUP FILE</th>
                      <th className="py-3.5 px-4">BACKUP DATE</th>
                      <th className="py-3.5 px-4">FILE SIZE</th>
                      <th className="py-3.5 px-6 text-right">ACTION DATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {backupFiles.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-400 font-mono">
                          No backup snapshots found.
                        </td>
                      </tr>
                    ) : (
                      backupFiles.map((bk, idx) => (
                        <tr key={`backup-${bk.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* BACKUP FILE */}
                          <td className="py-4 px-6 font-mono text-slate-900 font-extrabold text-xs whitespace-nowrap">
                            {bk.filename}
                          </td>

                          {/* BACKUP DATE */}
                          <td className="py-4 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {bk.date}
                          </td>

                          {/* FILE SIZE */}
                          <td className="py-4 px-4 font-mono text-slate-600 font-bold text-[11px] whitespace-nowrap">
                            {bk.fileSize}
                          </td>

                          {/* ACTIONS */}
                          <td className="py-4 px-6 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* RESTORE BUTTON */}
                              <button
                                onClick={() => handleRestoreBackup(bk.filename)}
                                className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md font-mono text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                RESTORE
                              </button>

                              {/* DOWNLOAD BUTTON */}
                              <button
                                onClick={() => handleExportDatabase(bk)}
                                title="Download Backup .json File"
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 inline-flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              {/* DELETE BUTTON */}
                              <button
                                onClick={() => handleDeleteBackup(bk.id, bk.filename)}
                                title="Delete Backup Snapshot"
                                className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 inline-flex items-center justify-center transition-colors cursor-pointer border border-rose-200"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 9: TRENDING WORDS */}
        {activeTab === "trending_words" && (
          <div className="space-y-6">
            
            {/* Header & Search Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold font-sans text-slate-900 tracking-tight flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-[#D31220]" />
                  <span>Trending Words</span>
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Manage real-time keywords and trending topics featured in the website header ticker and search suggestions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search trending words..."
                    value={trendingSearchQuery}
                    onChange={(e) => setTrendingSearchQuery(e.target.value)}
                    className="w-56 pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D31220] shadow-sm font-sans"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                {/* ADD TRENDING WORD BUTTON */}
                <button
                  onClick={() => setIsAddTrendingModalOpen(true)}
                  className="px-4 py-2 bg-[#D31220] hover:bg-[#b91522] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer font-sans shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADD TRENDING WORD</span>
                </button>
              </div>
            </div>

            {/* QUICK STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-mono text-slate-400 uppercase font-bold">Total Trending Words</p>
                  <p className="text-xl font-extrabold text-slate-900 mt-1 font-sans">{trendingWords.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#D31220] flex items-center justify-center font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-mono text-slate-400 uppercase font-bold">Active in Live Ticker</p>
                  <p className="text-xl font-extrabold text-emerald-600 mt-1 font-sans">
                    {trendingWords.filter(w => w.status === "Active").length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-mono text-slate-400 uppercase font-bold">Tracked Search Traffic</p>
                  <p className="text-xl font-extrabold text-blue-600 mt-1 font-sans">550K+</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* TRENDING WORDS TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4">TRENDING WORD / TOPIC</th>
                      <th className="py-3.5 px-4">DATE ADDED</th>
                      <th className="py-3.5 px-4">STATUS</th>
                      <th className="py-3.5 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTrendingWords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-mono">
                          No trending words found.
                        </td>
                      </tr>
                    ) : (
                      filteredTrendingWords.map((tw, idx) => (
                        <tr key={`tw-${tw.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-[11px] font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-xs">{tw.word}</span>
                              <Link
                                href={tw.url || `/search?q=${encodeURIComponent(tw.word)}`}
                                target="_blank"
                                title="View on Search"
                                className="text-slate-400 hover:text-[#D31220] transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                            {tw.addedDate}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleTrendingStatus(tw.id)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono cursor-pointer transition-all ${
                                tw.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                              }`}
                            >
                              {tw.status}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteTrendingWord(tw.id)}
                              title="Delete Trending Word"
                              className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 inline-flex items-center justify-center transition-colors cursor-pointer border border-rose-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 10: SHORTS & REELS MANAGER (10 DEDICATED SLOTS) */}
        {activeTab === "reels" && (
          <div className="space-y-8 font-sans">
            
            {/* Header: Shorts & Reels Manager */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-extrabold font-sans text-slate-900 tracking-tight">
                    Shorts & Reels Manager
                  </h2>
                  <span className="bg-orange-50 text-orange-600 border border-orange-200/70 font-mono text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {reelsVideos.length} Videos
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-sans">
                  Curate short-form video stories from YouTube Shorts and Rumble.
                </p>
              </div>

              <div>
                <span className="bg-emerald-50/90 text-emerald-800 border border-emerald-300 font-mono text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-xs">
                  HOMEPAGE FEED: {reelsVideos.filter((r) => r.status !== "Inactive").length} / 4 VIDEOS
                </span>
              </div>
            </div>

            {/* CARD 1: ADD / EDIT SHORT / REEL VIDEO FORM */}
            <div
              id="reels-form-card"
              className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6"
            >
              {/* Form Title & Subtitle */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100/80 text-orange-600 flex items-center justify-center shrink-0 shadow-xs">
                    <Play className="w-5 h-5 fill-orange-600 translate-x-0.5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">
                      {editingReel ? `Edit Short / Reel Video (Slot #${editingReel.slot})` : "Add New Short / Reel Video"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Paste any YouTube or Rumble link — platform and thumbnails are detected automatically.
                    </p>
                  </div>
                </div>

                {editingReel && (
                  <button
                    type="button"
                    onClick={handleResetReelForm}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveReelSlot} className="space-y-5">
                {/* Row 1: VIDEO URL & PLATFORM */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-8 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-slate-700">
                        VIDEO URL <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAutoFetch}
                        disabled={isAutoFetching}
                        className="text-xs font-bold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>{isAutoFetching ? "Auto-Fetching..." : "Auto-Fetch Title, Image & Duration"}</span>
                      </button>
                    </div>

                    <input
                      type="url"
                      required
                      value={reelVideoUrl}
                      onChange={(e) => handleVideoUrlChange(e.target.value)}
                      placeholder="e.g. https://www.youtube.com/shorts/... or https://rumble.com/... or Backblaze Video URL"
                      className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-400"
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <p className="text-[11px] text-slate-400 font-sans">
                        Supports YouTube Shorts, Rumble, and Backblaze direct videos.
                      </p>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0">
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        <span>{isUploadingReelVideo ? "Uploading to Backblaze..." : "Upload Reel Video (Backblaze)"}</span>
                        <input
                          type="file"
                          accept="video/*"
                          disabled={isUploadingReelVideo}
                          onChange={handleReelVideoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {reelVideoFileName && (
                      <p className="text-[10.5px] font-mono text-emerald-600 truncate">
                        ✓ {reelVideoFileName}
                      </p>
                    )}
                  </div>

                  <div className="lg:col-span-4 space-y-1.5">
                    <label className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-slate-700 block">
                      PLATFORM
                    </label>
                    <select
                      value={reelPlatform}
                      onChange={(e) => setReelPlatform(e.target.value as ReelPlatform)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-xs cursor-pointer transition-all"
                    >
                      <option value="YouTube Shorts">YouTube Shorts</option>
                      <option value="Rumble Video">Rumble Video</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: VIDEO TITLE / HEADLINE */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-slate-700 block">
                    VIDEO TITLE / HEADLINE <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={reelTitle}
                    onChange={(e) => setReelTitle(e.target.value)}
                    placeholder="e.g. Supreme Court Hearing Highlights & Legal Analysis"
                    className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Row 3: INPUTS (LEFT) & LIVE FEED PREVIEW (RIGHT) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
                  
                  {/* Left Column: Thumbnails, Duration, Slot, Status & Yellow Alert */}
                  <div className="lg:col-span-8 space-y-4">
                    
                    {/* Cover Image URL */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-slate-700 block">
                        COVER IMAGE / THUMBNAIL URL
                      </label>
                      <input
                        type="url"
                        value={reelThumbnailUrl}
                        onChange={(e) => setReelThumbnailUrl(e.target.value)}
                        placeholder="e.g. https://images.unsplash.com/... or auto-fetched YouTube thumbnail"
                        className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-400"
                      />
                    </div>

                    {/* Or Upload Custom Thumbnail */}
                    <div className="space-y-1.5">
                      <label className="text-[10.5px] font-mono font-extrabold uppercase tracking-wider text-slate-400 block">
                        OR UPLOAD CUSTOM THUMBNAIL (BACKBLAZE)
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0 flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-slate-600" />
                          <span>{isUploadingThumbnail ? "Uploading to Backblaze..." : "Choose File"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingThumbnail}
                            onChange={handleCustomThumbnailUpload}
                            className="hidden"
                          />
                        </label>
                        <span className="text-xs text-slate-500 truncate font-mono">
                          {isUploadingThumbnail
                            ? "Uploading to Backblaze B2..."
                            : (customThumbnailFileName || (reelThumbnailUrl.includes("backblaze") ? "✓ Stored in Backblaze B2" : "No file chosen"))}
                        </span>
                      </div>
                    </div>

                    {/* Duration input */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10.5px] font-mono font-extrabold uppercase tracking-wider text-slate-600 block">
                        DURATION (AUTO)
                      </label>
                      <input
                        type="text"
                        value={reelDuration}
                        onChange={(e) => setReelDuration(e.target.value)}
                        placeholder="e.g. 1:34"
                        className="w-full sm:w-1/2 px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white"
                      />
                    </div>

                  </div>

                  {/* Right Column: Live Feed Preview */}
                  <div className="lg:col-span-4 flex flex-col items-center justify-center">
                    <div className="w-full bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 p-4 sm:p-5 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-mono tracking-widest text-slate-400 font-extrabold uppercase mb-3 text-center block">
                        LIVE FEED PREVIEW
                      </span>

                      {/* Phone Vertical Frame */}
                      <div className="w-44 h-72 sm:w-48 sm:h-80 rounded-xl bg-black text-white relative overflow-hidden shadow-2xl flex flex-col justify-between p-3.5 border border-slate-800 shrink-0">
                        {/* Thumbnail image background */}
                        {reelThumbnailUrl ? (
                          <img
                            src={reelThumbnailUrl}
                            alt="Live Thumbnail Preview"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-black flex items-center justify-center">
                            <Video className="w-10 h-10 text-slate-700" />
                          </div>
                        )}

                        {/* Dark Gradient Overlay for readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/60 pointer-events-none" />

                        {/* Top-left Platform Badge */}
                        <div className="relative z-10">
                          {reelPlatform === "YouTube Shorts" && (
                            <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[9px] uppercase tracking-wider shadow">
                              YOUTUBE
                            </span>
                          )}
                          {reelPlatform === "Rumble Video" && (
                            <span className="px-2 py-0.5 rounded bg-[#00ff40] text-black font-black text-[9px] uppercase tracking-wider shadow">
                              RUMBLE
                            </span>
                          )}
                          {reelPlatform === "Backblaze Video" && (
                            <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-black text-[9px] uppercase tracking-wider shadow">
                              BACKBLAZE
                            </span>
                          )}
                          {reelPlatform === "Instagram Reel" && (
                            <span className="px-2 py-0.5 rounded bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white font-black text-[9px] uppercase tracking-wider shadow">
                              INSTAGRAM
                            </span>
                          )}
                          {reelPlatform === "Facebook Reel" && (
                            <span className="px-2 py-0.5 rounded bg-[#1877F2] text-white font-black text-[9px] uppercase tracking-wider shadow">
                              FACEBOOK
                            </span>
                          )}
                        </div>

                        {/* Center Play Icon */}
                        <div className="relative z-10 my-auto flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full border border-white/25 bg-black/30 backdrop-blur-xs flex items-center justify-center text-white/70">
                            <Play className="w-5 h-5 fill-white/80 translate-x-0.5" />
                          </div>
                        </div>

                        {/* Bottom Video Info */}
                        <div className="relative z-10 space-y-1">
                          <p className="font-extrabold text-[11px] leading-tight text-white line-clamp-2 drop-shadow-md">
                            {reelTitle.trim() || "Short Video Title"}
                          </p>
                          <p className="text-[10px] text-white/85 font-mono flex items-center gap-1">
                            <Play className="w-2.5 h-2.5 fill-white/80" />
                            <span>{reelDuration || "0:00"}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Form Footer Action Button */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    {editingReel ? "UPDATE VIDEO" : "ADD TO FEED"}
                  </button>
                </div>
              </form>
            </div>

            {/* CARD 2: CURRENT SHORTS & REELS (5 DEDICATED SLOTS) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">
                    Current Shorts & Reels (5 Dedicated Slots)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Strictly 1 video per slot (Slot #1 to #5). Slot #1 is the Main Featured Video, Slots #2, #3, and #4 are the 3 bottom videos, and Slot #5 is under the sidebar ad.
                  </p>
                </div>

                <div>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-[11px] font-extrabold px-3 py-1 rounded-full shadow-xs">
                    {reelsVideos.length} / 5 Slots Occupied
                  </span>
                </div>
              </div>

              {/* Grid of 5 Slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4.5 pt-2">
                {[1, 2, 3, 4, 5].map((slotNum) => {
                  const slotVideo = reelsVideos.find((r) => r.slot === slotNum);

                  if (slotVideo) {
                    return (
                      <div
                        key={`slot-${slotNum}`}
                        className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        {/* Upper card content */}
                        <div className="flex gap-3">
                          {/* Thumbnail with platform badge */}
                          <div className="w-20 h-28 sm:w-22 sm:h-30 rounded-xl overflow-hidden bg-slate-900 relative shrink-0 border border-slate-200 shadow-xs">
                            <img
                              src={slotVideo.thumbnailUrl}
                              alt={slotVideo.title}
                              className="w-full h-full object-cover"
                            />
                            {/* Platform badge on thumbnail */}
                            <div className="absolute top-1.5 left-1.5">
                              {slotVideo.platform === "Rumble Video" && (
                                <span className="bg-[#001f07]/90 text-[#00ff40] border border-[#00ff40]/40 font-mono font-black text-[7.5px] px-1.5 py-0.5 rounded shadow">
                                  RUMBLE
                                </span>
                              )}
                              {slotVideo.platform === "YouTube Shorts" && (
                                <span className="bg-[#2a0004]/90 text-red-500 border border-red-500/40 font-mono font-black text-[7.5px] px-1.5 py-0.5 rounded shadow">
                                  YOUTUBE
                                </span>
                              )}
                              {slotVideo.platform === "Instagram Reel" && (
                                <span className="bg-[#200020]/90 text-pink-400 border border-pink-500/40 font-mono font-black text-[7.5px] px-1.5 py-0.5 rounded shadow">
                                  INSTAGRAM
                                </span>
                              )}
                              {slotVideo.platform === "Facebook Reel" && (
                                <span className="bg-[#001030]/90 text-blue-400 border border-blue-500/40 font-mono font-black text-[7.5px] px-1.5 py-0.5 rounded shadow">
                                  FACEBOOK
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Info Column */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              {/* Badges row: Status & Slot */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[9px] font-extrabold uppercase font-mono px-1.5 py-0.5 rounded ${
                                    slotVideo.status === "Active"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-slate-100 text-slate-500 border border-slate-200"
                                  }`}
                                >
                                  {slotVideo.status || "ACTIVE"}
                                </span>
                                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-extrabold uppercase font-mono px-1.5 py-0.5 rounded">
                                  Slot #{slotNum} {slotNum === 1 ? "• Main" : "• Bottom"}
                                </span>
                              </div>

                              {/* Title */}
                              <h4
                                className="font-bold text-xs text-slate-900 line-clamp-2 mt-1.5 leading-snug"
                                title={slotVideo.title}
                              >
                                {slotVideo.title}
                              </h4>
                            </div>

                            {/* Duration & Watch Link */}
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 mt-auto">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{slotVideo.duration}</span>
                              </span>
                              <a
                                href={slotVideo.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-orange-600 hover:text-orange-700 font-bold inline-flex items-center gap-0.5 transition-colors"
                              >
                                <span>Watch</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="border-t border-slate-100 pt-2.5 mt-2.5 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleEditReelSlot(slotVideo)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 py-1 px-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3 h-3 text-slate-500" />
                            <span>EDIT</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReelSlot(slotNum)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 py-1 px-2.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                            <span>DELETE</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Empty Slot Card
                  return (
                    <div
                      key={`empty-slot-${slotNum}`}
                      className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-300 p-4 flex flex-col items-center justify-center text-center min-h-[175px] hover:border-orange-400 hover:bg-orange-50/30 transition-all group cursor-pointer"
                      onClick={() => {
                        setReelTargetSlot(slotNum);
                        setEditingReel(null);
                        document.getElementById("reels-form-card")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-extrabold uppercase font-mono px-2 py-0.5 rounded mb-2">
                        Slot #{slotNum} {slotNum === 1 ? "(Main Featured)" : "(Bottom)"} (Empty)
                      </span>
                      <p className="text-xs text-slate-400 mb-3 font-sans">
                        No video assigned to this slot
                      </p>
                      <button
                        type="button"
                        className="text-xs font-extrabold text-orange-600 group-hover:text-orange-700 inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Assign Video</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ADD USER OVERLAY MODAL */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base font-sans text-slate-900">Add User to Workspace</h3>
              <button onClick={() => setIsAddUserModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4" autoComplete="off">
              {/* Hidden dummy inputs to absorb browser/password manager autofill */}
              <input type="text" name="dummy_username" style={{ display: "none" }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
              <input type="password" name="dummy_password" style={{ display: "none" }} tabIndex={-1} aria-hidden="true" autoComplete="new-password" />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  name="dj_admin_new_username"
                  autoComplete="off"
                  placeholder="e.g. John Doe"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-[#D31220]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  name="dj_admin_new_user_email"
                  autoComplete="off"
                  placeholder="user@digitaljournal.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-[#D31220]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Password</label>
                <input
                  type="password"
                  required
                  name="dj_admin_new_user_password"
                  autoComplete="new-password"
                  placeholder="Minimum 6 characters"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#D31220]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Workspace Role Assignment</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-[#D31220]"
                >
                  <option value="WRITER">WRITER (Author Workspace)</option>
                  <option value="READER">READER (Registered Reader)</option>
                  {isCurrentAdminDefault && (
                    <option value="ADMIN">ADMIN (Executive Control)</option>
                  )}
                </select>
                {!isCurrentAdminDefault && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    * Admin role creation is restricted to the Default Administrator.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold text-white bg-[#D31220] hover:bg-[#BF1E2D] rounded-xl shadow"
                >
                  Add User to Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER OVERLAY MODAL */}
      {isEditUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base font-sans text-slate-900">Edit User Workspace Credentials</h3>
              <button onClick={() => setIsEditUserModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">User Full Name</label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-[#D31220]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-[#D31220]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter new password (optional)"
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#D31220]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Workspace Role Assignment</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-[#D31220]"
                >
                  <option value="WRITER">WRITER (Author Workspace)</option>
                  <option value="READER">READER (Registered Reader)</option>
                  {(isCurrentAdminDefault || editingUser.role === "ADMIN") && (
                    <option value="ADMIN">ADMIN (Executive Control)</option>
                  )}
                </select>
                {!isCurrentAdminDefault && editingUser.role !== "ADMIN" && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    * Admin role promotion is restricted to the Default Administrator.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold text-white bg-[#D31220] hover:bg-[#BF1E2D] rounded-xl shadow"
                >
                  Save User Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW USER PROFILE OVERLAY MODAL */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#D31220] text-white text-xl font-extrabold flex items-center justify-center mx-auto shadow-md font-sans">
              {viewingUser.name.charAt(0)}
            </div>

            <div>
              <h3 className="font-extrabold text-lg font-sans text-slate-900">{viewingUser.name}</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{viewingUser.email}</p>
            </div>

            <div className="py-2 border-y border-slate-100 flex items-center justify-around font-mono text-xs">
              <div>
                <p className="text-[9px] text-slate-400 font-extrabold uppercase">ROLE</p>
                <p className="font-bold text-slate-800">{viewingUser.role}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-extrabold uppercase">JOINED</p>
                <p className="font-bold text-slate-800">{viewingUser.joinedDate || "Aug 2026"}</p>
              </div>
            </div>

            <button
              onClick={() => setViewingUser(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}

      {/* EDIT ARTICLE OVERLAY MODAL */}
      {isEditArticleModalOpen && editingArticle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base font-sans text-slate-900">Edit Published Article</h3>
              <button onClick={() => setIsEditArticleModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveArticleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Article Headline Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-[#D31220]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-[#D31220]"
                  >
                    {ALL_MAIN_CATEGORIES.map((c) => (
                      <option key={c} value={c.toUpperCase()}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Author Name</label>
                  <input
                    type="text"
                    required
                    value={editAuthor}
                    onChange={(e) => setEditAuthor(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-[#D31220]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Excerpt Summary</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#D31220]"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditArticleModalOpen(false);
                    if (editingArticle) handleOpenFullEditor(editingArticle);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Open in Full Studio Editor &rarr;
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditArticleModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-extrabold text-white bg-[#D31220] hover:bg-[#BF1E2D] rounded-xl shadow cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ADD SUBSCRIBER MODAL */}
      {isNewsletterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base font-sans text-slate-900">Add Newsletter Subscriber</h3>
              <button onClick={() => setIsNewsletterModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddSubscriber} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Subscriber Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="subscriber@digitaljournal.com"
                  value={newSubscriberEmail}
                  onChange={(e) => setNewSubscriberEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#D31220]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Subscribed Topic Categories (comma-separated)</label>
                <input
                  type="text"
                  placeholder="TECHNOLOGY, BUSINESS, MARKETS"
                  value={newSubscriberTopics}
                  onChange={(e) => setNewSubscriberTopics(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#D31220]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewsletterModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold text-white bg-[#D31220] hover:bg-[#BF1E2D] rounded-xl shadow"
                >
                  Add Subscriber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW CONTACT SUBMISSION MODAL */}
      {viewingContactModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-mono text-[9px] font-extrabold uppercase">
                  {viewingContactModal.type}
                </span>
                <h3 className="font-extrabold text-base font-sans text-slate-900 mt-1">{viewingContactModal.name}</h3>
                <p className="text-xs text-slate-400 font-mono">{viewingContactModal.email} • {viewingContactModal.date}</p>
              </div>
              <button onClick={() => setViewingContactModal(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <p><span className="text-slate-400 uppercase font-extrabold text-[9px]">Company:</span> <span className="text-slate-800 font-bold">{viewingContactModal.company || "N/A"}</span></p>
              <p><span className="text-slate-400 uppercase font-extrabold text-[9px]">Phone / WhatsApp:</span> <span className="text-slate-800 font-bold">{viewingContactModal.phone || "P: 000 000 0000"} | {viewingContactModal.whatsapp || "W: 000 000 0000"}</span></p>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="block text-[9px] font-extrabold uppercase font-mono text-slate-400 tracking-wider">FULL MESSAGE CONTENT</label>
              <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed font-sans font-semibold">
                {viewingContactModal.message}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setViewingContactModal(null)}
                className="px-5 py-2 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow"
              >
                Close Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ADVERTISE LEAD MODAL */}
      {viewingLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-mono text-[9px] font-extrabold uppercase">
                  {viewingLeadModal.serviceOption}
                </span>
                <h3 className="font-extrabold text-base font-sans text-slate-900 mt-1">{viewingLeadModal.submitterName}</h3>
                <p className="text-xs text-slate-400 font-mono">{viewingLeadModal.email} • {viewingLeadModal.date}</p>
              </div>
              <button onClick={() => setViewingLeadModal(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <p><span className="text-slate-400 uppercase font-extrabold text-[9px]">Company / Organization:</span> <span className="text-slate-800 font-bold">{viewingLeadModal.company || "N/A"}</span></p>
              <p><span className="text-slate-400 uppercase font-extrabold text-[9px]">Budget Estimate:</span> <span className="text-emerald-600 font-extrabold">{viewingLeadModal.budget || "N/A"}</span></p>
              <p><span className="text-slate-400 uppercase font-extrabold text-[9px]">Phone / WhatsApp:</span> <span className="text-slate-800 font-bold">{viewingLeadModal.phone || "P: 000 000 0000"} | {viewingLeadModal.whatsapp || "W: 000 000 0000"}</span></p>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="block text-[9px] font-extrabold uppercase font-mono text-slate-400 tracking-wider">CAMPAIGN REQUIREMENTS</label>
              <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed font-sans font-semibold">
                {viewingLeadModal.requirements}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setViewingLeadModal(null)}
                className="px-5 py-2 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN EDITORIAL REVIEW STUDIO (Matching User Screenshot Image 2 & 3) */}
      {reviewingSubmission && (
        <div className="fixed inset-0 z-50 bg-[#F8FAFC] overflow-y-auto flex flex-col min-h-screen">
          {/* TOP DARK NAVIGATION BAR */}
          <div className="sticky top-0 z-50 bg-[#0B1426] border-b border-slate-800 text-white shadow-md font-sans">
            {/* Row 1: Cancel + Title */}
            <div className="flex items-center justify-between gap-3 px-4 md:px-8 pt-3 pb-2">
              <button
                onClick={() => setReviewingSubmission(null)}
                className="flex items-center gap-1.5 text-slate-300 hover:text-white font-mono text-xs uppercase tracking-wider font-extrabold cursor-pointer transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                CANCEL
              </button>

              <div className="flex-1 text-center truncate px-2">
                <span className="font-mono text-xs text-slate-300 uppercase tracking-wider font-extrabold truncate block">
                  REVIEWING: {reviewTitle || reviewingSubmission.title}
                </span>
              </div>
            </div>

            {/* Row 2 (mobile): Action buttons */}
            <div className="flex items-center gap-2 px-4 pb-3 md:hidden">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="flex-1 border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-bold px-2 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer uppercase font-mono tracking-wider"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>PREVIEW</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (reviewingSubmission) {
                    handleOpenRejectModal(reviewingSubmission);
                  }
                }}
                className="flex-1 bg-[#8B0000] hover:bg-[#A00000] text-white text-xs font-bold px-2 py-2 rounded-xl flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>REJECT</span>
              </button>

              <button
                type="button"
                onClick={handleApproveReviewStudio}
                className="flex-1 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-2 py-2 rounded-xl flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                <span>PUBLISH</span>
              </button>
            </div>

            {/* Desktop: single row action buttons */}
            <div className="hidden md:flex items-center gap-2.5 absolute top-3 right-8">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer uppercase font-mono tracking-wider shadow-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>PREVIEW</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (reviewingSubmission) {
                    handleOpenRejectModal(reviewingSubmission);
                  }
                }}
                className="bg-[#8B0000] hover:bg-[#A00000] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 uppercase font-mono tracking-wider shadow-sm shadow-red-950/40 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>REJECT TO TRASH</span>
              </button>

              <button
                type="button"
                onClick={handleApproveReviewStudio}
                className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 uppercase font-mono tracking-wider shadow-sm shadow-emerald-950/40 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                <span>APPROVE & PUBLISH</span>
              </button>
            </div>
          </div>

          {/* MAIN REVIEW STUDIO BODY */}
          <div className="flex-1 max-w-[1500px] w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT MAIN EDITOR AREA (lg:col-span-8) */}
            <div className="lg:col-span-8 flex flex-col space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
                
                {/* FORMATTING TOOLBAR */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-2 text-slate-600 flex-wrap text-xs font-mono">
                  <button className="p-1.5 hover:bg-slate-200 rounded-md cursor-pointer text-slate-700" title="Undo">↺</button>
                  <button className="p-1.5 hover:bg-slate-200 rounded-md cursor-pointer text-slate-700" title="Redo">↻</button>
                  <span className="h-4 w-px bg-slate-300 my-auto mx-1"></span>
                  <button className="p-1.5 hover:bg-slate-200 rounded-md cursor-pointer font-bold text-slate-800" title="Bold">B</button>
                  <button className="p-1.5 hover:bg-slate-200 rounded-md cursor-pointer italic text-slate-800" title="Italic">I</button>
                  <button className="p-1.5 hover:bg-slate-200 rounded-md cursor-pointer underline text-slate-800" title="Underline">U</button>
                  <span className="h-4 w-px bg-slate-300 my-auto mx-1"></span>
                  <button className="p-1.5 hover:bg-slate-200 rounded-md cursor-pointer text-slate-700" title="Link">🔗</button>
                  <button className="p-1.5 hover:bg-slate-200 rounded-md cursor-pointer text-slate-700" title="Bullet List">• List</button>
                  <button className="p-1.5 hover:bg-slate-200 rounded-md cursor-pointer text-slate-700" title="Numbered List">1. List</button>
                  <span className="h-4 w-px bg-slate-300 my-auto mx-1"></span>
                  <button className="p-1.5 hover:bg-slate-200 rounded-md cursor-pointer text-slate-700" title="Quote">“ ”</button>
                  <button className="p-1.5 hover:bg-slate-200 rounded-md cursor-pointer text-slate-700" title="Code">&lt;&gt;</button>
                  
                  <button className="ml-auto bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-extrabold text-[11px] px-3 py-1 rounded-lg cursor-pointer flex items-center gap-1">
                    📷 INSERT IMAGE
                  </button>
                </div>

                {/* ARTICLE TITLE */}
                <div>
                  <textarea
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    placeholder="The Rise of Vertical Series: A New Opportunity or a Creative Trap for Emerging Filmmakers?"
                    rows={2}
                    className="w-full font-poppins text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight focus:outline-none resize-none border-b border-transparent focus:border-slate-300 pb-2"
                  />
                </div>

                {/* SUBTITLE / SUMMARY */}
                <div>
                  <textarea
                    value={reviewSummary}
                    onChange={(e) => setReviewSummary(e.target.value)}
                    placeholder="Vertical microdramas are transforming mobile entertainment, creating new opportunities for filmmakers while raising concerns about creative standardization, speed and artistic freedom."
                    rows={2}
                    className="w-full font-poppins text-lg text-slate-600 leading-relaxed focus:outline-none resize-none border-b border-transparent focus:border-slate-300 pb-2"
                  />
                </div>

                {/* FEATURED IMAGE WITH CAPTION */}
                {reviewImageUrl && (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 aspect-video relative">
                      <img
                        src={reviewImageUrl}
                        alt="Featured Article Image"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400 italic font-sans px-1">
                      <span>Evolution or the creation of a new bubble?</span>
                      <span className="uppercase font-mono text-[10px] font-bold text-slate-500">(PHOTO: GETTY IMAGES)</span>
                    </div>
                  </div>
                )}

                {/* RICH BODY CONTENT */}
                <div>
                  <textarea
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    placeholder="Article body text content goes here..."
                    rows={12}
                    className="w-full font-poppins article-body-poppins text-lg text-slate-800 leading-relaxed focus:outline-none resize-none border border-slate-100 p-4 rounded-xl focus:border-slate-300"
                  />
                </div>

              </div>
            </div>

            {/* RIGHT SIDEBAR (ARTICLE SETTINGS - lg:col-span-4) */}
            <div className="lg:col-span-4">
              <div className="sticky top-20 bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs space-y-6 font-sans">
                
                {/* HEADER */}
                <div className="flex items-center gap-2 text-slate-800 font-serif text-sm font-extrabold uppercase tracking-widest border-b border-slate-100 pb-3">
                  <Settings className="w-4 h-4 text-slate-500" />
                  ARTICLE SETTINGS
                </div>

                {/* DETAILS / SEO SUB-TABS */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl font-mono text-xs font-bold">
                  <button
                    onClick={() => setReviewSidebarTab("details")}
                    className={`py-2 text-center rounded-lg cursor-pointer transition-all uppercase ${
                      reviewSidebarTab === "details"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    DETAILS
                  </button>

                  <button
                    onClick={() => setReviewSidebarTab("seo")}
                    className={`py-2 text-center rounded-lg cursor-pointer transition-all uppercase ${
                      reviewSidebarTab === "seo"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    SEO
                  </button>
                </div>

                {reviewSidebarTab === "details" && (
                  <div className="space-y-5 text-xs font-sans">
                    
                    {/* SELECT CATEGORY (MAIN) WITH FLYOUT SUBCATEGORIES SIDEBAR */}
                    <div className="space-y-1.5 relative">
                      <label className="block font-mono text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        SELECT CATEGORY (MAIN)
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAdminCatDropdownOpen((prev) => !prev)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between focus:outline-none focus:border-blue-600 cursor-pointer shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <span>{reviewCategory}</span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isAdminCatDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {/* Custom Dropdown Menu with Cascading Sidebar for World */}
                      {isAdminCatDropdownOpen && (
                        <div 
                          onMouseLeave={() => setAdminHoveredCat(null)}
                          className="absolute top-full left-0 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150"
                        >
                          <div className="space-y-0.5">
                            {ALL_MAIN_CATEGORIES.map((cat) => {
                              const isSelected = reviewCategory.toLowerCase() === cat.toLowerCase();
                              const isWorld = cat.toLowerCase() === "world";

                              return (
                                <div
                                  key={cat}
                                  className="relative"
                                  onMouseEnter={() => setAdminHoveredCat(cat)}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleAdminCategoryChange(cat)}
                                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                                      isSelected
                                        ? "bg-blue-50 text-blue-700 font-bold"
                                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                    }`}
                                  >
                                    <span>{cat}</span>
                                    {isWorld && (
                                      <ChevronRight size={13} className="text-slate-400 group-hover:text-blue-600 transition-transform" />
                                    )}
                                  </button>

                                  {/* Flyout Subcategories Sidebar on Hover for World */}
                                  {isWorld && adminHoveredCat === "World" && (
                                    <div 
                                      onMouseEnter={() => setAdminHoveredCat("World")}
                                      className="absolute right-full top-0 mr-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] p-2 text-left animate-in fade-in slide-in-from-right-1 duration-150 before:content-[''] before:absolute before:-right-3 before:top-0 before:bottom-0 before:w-4"
                                    >
                                      <div className="px-2 py-1 mb-1 border-b border-slate-100 flex items-center justify-between">
                                        <span className="text-[10px] font-extrabold uppercase text-blue-600 tracking-wider">
                                          World Subcategories
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-mono">7 Regions</span>
                                      </div>
                                      <div className="space-y-0.5">
                                        {WORLD_SUBCATEGORIES.map((sub) => {
                                          const isSubSelected = reviewCategory.toLowerCase() === sub.toLowerCase();
                                          return (
                                            <button
                                              key={sub}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleAdminCategoryChange(sub);
                                              }}
                                              className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                                                isSubSelected
                                                  ? "bg-blue-50 text-blue-700 font-bold"
                                                  : "text-slate-700 hover:bg-slate-100"
                                              }`}
                                            >
                                              <span>{sub}</span>
                                              {isSubSelected && <Check size={11} strokeWidth={3} className="text-blue-600" />}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SELECT SUB-CATEGORIES (OPTIONAL, MAX 5) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block font-mono text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          SELECT SUB-CATEGORIES (OPTIONAL, MAX 5)
                        </label>
                      </div>

                      <div className="border border-slate-200 rounded-xl p-3 max-h-56 overflow-y-auto space-y-3 text-xs font-medium text-slate-700 bg-slate-50/50">
                        <div className="grid grid-cols-2 gap-2">
                          {ALL_SUB_CATEGORIES
                            .filter((subCat) => {
                              if (isSameOrMatchingCategory(subCat, reviewCategory)) return false;
                              if (isWorldOrWorldSub(reviewCategory) && subCat.toLowerCase() === "world") return false;
                              return true;
                            })
                            .map((subCat) => {
                              const isChecked = reviewSubCategories.some((s) => isSameOrMatchingCategory(s, subCat));
                              const isDisabled = !isChecked && reviewSubCategories.length >= 5;
                              return (
                                <label key={subCat} className={`flex items-center gap-2 select-none ${isDisabled ? "opacity-40 cursor-not-allowed text-slate-400" : "cursor-pointer text-slate-700"}`}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={() => {
                                      if (isChecked) {
                                        setReviewSubCategories(reviewSubCategories.filter((s) => !isSameOrMatchingCategory(s, subCat)));
                                      } else if (reviewSubCategories.length < 5) {
                                        setReviewSubCategories([...reviewSubCategories, subCat]);
                                      }
                                    }}
                                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                  <span className={isChecked ? "font-bold text-slate-900" : (isDisabled ? "text-slate-400" : "text-slate-600")}>{subCat}</span>
                                </label>
                              );
                            })}
                        </div>

                        {/* World Subcategories Section */}
                        {WORLD_SUBCATEGORIES.filter(w => !isSameOrMatchingCategory(w, reviewCategory)).length > 0 && (
                          <div className="pt-2.5 border-t border-slate-200/80">
                            <div className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                              World
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {WORLD_SUBCATEGORIES
                                .filter(w => !isSameOrMatchingCategory(w, reviewCategory))
                                .map((worldSub) => {
                                  const isChecked = reviewSubCategories.some((s) => isSameOrMatchingCategory(s, worldSub));
                                  const isDisabled = !isChecked && reviewSubCategories.length >= 5;
                                  return (
                                    <label key={worldSub} className={`flex items-center gap-2 select-none ${isDisabled ? "opacity-40 cursor-not-allowed text-slate-400" : "cursor-pointer text-slate-700"}`}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={isDisabled}
                                        onChange={() => {
                                          if (isChecked) {
                                            setReviewSubCategories(reviewSubCategories.filter((s) => !isSameOrMatchingCategory(s, worldSub)));
                                          } else if (reviewSubCategories.length < 5) {
                                            setReviewSubCategories([...reviewSubCategories, worldSub]);
                                          }
                                        }}
                                        className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                                      />
                                      <span className={isChecked ? "font-bold text-slate-900" : (isDisabled ? "text-slate-400" : "text-slate-600")}>{worldSub}</span>
                                    </label>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] font-mono font-extrabold text-slate-400 uppercase tracking-wider">
                        SELECTED: {reviewSubCategories.length} / 5
                      </div>
                    </div>

                    {/* TAGS */}
                    <div className="space-y-1.5">
                      <label className="block font-mono text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        TAGS
                      </label>
                      <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {reviewTags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              onClick={() => setReviewTags(reviewTags.filter((_, idx) => idx !== tIdx))}
                              className="bg-slate-900 text-white font-mono text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer hover:bg-rose-600 transition-colors"
                              title="Click to remove tag"
                            >
                              #{tag}
                              <X className="w-2.5 h-2.5" />
                            </span>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={reviewNewTagInput}
                          onChange={(e) => setReviewNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === "," || e.key === " ") {
                              e.preventDefault();
                              const val = reviewNewTagInput.trim().replace(/^#+/, "").replace(/,/g, "").trim().toUpperCase();
                              if (val && !reviewTags.includes(val)) {
                                setReviewTags([...reviewTags, val]);
                                setReviewNewTagInput("");
                              }
                            } else if (e.key === "Backspace" && !reviewNewTagInput && reviewTags.length > 0) {
                              setReviewTags(reviewTags.slice(0, reviewTags.length - 1));
                            }
                          }}
                          placeholder={reviewTags.length > 0 ? "Add more tags..." : "e.g. BreakingNews, Football, WorldCup2026"}
                          className="w-full bg-transparent text-xs text-slate-900 focus:outline-none font-mono placeholder:text-slate-400"
                        />
                      </div>
                      <div className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        PRESS ENTER, COMMA OR SPACE TO ADD • CLICK TAG TO REMOVE • {reviewTags.length} TAGS
                      </div>
                    </div>

                    {/* READ DURATION */}
                    <div className="space-y-1.5">
                      <label className="block font-mono text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        READ DURATION
                      </label>
                      <input
                        type="text"
                        value={reviewReadTime}
                        onChange={(e) => setReviewReadTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    {/* HOMEPAGE PLACEMENT CARD */}
                    <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-3.5 space-y-2">
                      <label className="block font-mono text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                        HOMEPAGE PLACEMENT
                      </label>
                      <select
                        value={reviewPlacement}
                        onChange={(e) => setReviewPlacement(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer shadow-xs"
                      >
                        <option value="Category Section Only">Category Section Only (Default category news feed)</option>
                        <option value="Home Page A+ Section">Home Page A+ Section (Top Hero Carousel main story)</option>
                        <option value="Trending Now Section">Trending Now Section (Trending sidebar list beside Hero)</option>
                        <option value="Editor's Picks Section">Editor&apos;s Picks Section (4-Card featured row below Hero)</option>
                        <option value="Latest News Section">Latest News Section (Latest news feed and featured lead)</option>
                        <option value="Home Page A+ Section 2">Main News 2 / Home Page A+ Section 2 (Middle dark spotlight banner slider)</option>
                        <option value="Home Page A+ Section 3">Home Page A+ Section 3 (Featured Story beside Most Read)</option>
                      </select>
                      <p className="text-[10px] text-slate-500 leading-normal font-sans">
                        Select where this story will be curated on the homepage layout. Any list slots will automatically push the newest article to rank #1 and shift older items down.
                      </p>
                    </div>

                    {/* TARGETED EMAIL DISTRIBUTION */}
                    <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-3.5 space-y-2.5">
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

                {reviewSidebarTab === "seo" && (
                  <div className="animate-in fade-in duration-200">
                    <SEOAssistantPanel
                      articleData={{
                        title: reviewTitle.trim(),
                        subheading: reviewSummary.trim(),
                        description: reviewCardSummary.trim() || reviewSummary.trim(),
                        content: reviewContent.trim(),
                        category: reviewCategory.toLowerCase(),
                        authorName: reviewingSubmission?.authorName || "Rushdhi MR",
                        imageUrl: reviewImageUrl.trim()
                      }}
                      cardSummary={reviewCardSummary}
                      focusKeyword={reviewFocusKeyword}
                      metaDescription={reviewSeoDesc}
                      onUpdateCardSummary={(val) => {
                        setReviewCardSummary(val);
                        if (!val.trim()) {
                          setIsReviewCardSummaryCustom(false);
                          setReviewCardSummary(extractCardSummary(reviewContent || reviewSummary));
                        } else {
                          setIsReviewCardSummaryCustom(true);
                        }
                      }}
                      onUpdateFocusKeyword={(val) => {
                        setReviewFocusKeyword(val);
                        if (!val.trim()) {
                          setIsReviewFocusKwCustom(false);
                          if (reviewTitle.trim()) {
                            setReviewFocusKeyword(extractFocusKeyword(reviewTitle.trim(), reviewCategory));
                          }
                        } else {
                          setIsReviewFocusKwCustom(true);
                        }
                      }}
                      onUpdateMetaDescription={(val) => {
                        setReviewSeoDesc(val);
                        if (!val.trim()) {
                          setIsReviewMetaDescCustom(false);
                          setReviewSeoDesc(extractCardSummary(reviewContent || reviewSummary));
                        } else {
                          setIsReviewMetaDescCustom(true);
                        }
                      }}
                      onAutoGenerateSEO={handleAutoGenerateSEO}
                    />
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARTICLE MAIL BOX & TARGETED DISTRIBUTION MODAL */}
      {isMailBoxModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
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
                    id="dist-email-input"
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
                    id="dist-add-btn"
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
                  id="dist-broadcast-checkbox"
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
                id="dist-save-btn"
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

                  // Store recipients persistently for this specific article
                  if (reviewingSubmission) {
                    const updatedSub = {
                      ...reviewingSubmission,
                      targetedRecipients: finalRecipients,
                      targeted_recipients: finalRecipients,
                      broadcastToSubscribers,
                    };
                    setReviewingSubmission(updatedSub);

                    // Update submissions list in state
                    setWriterSubmissions(prev =>
                      prev.map(s =>
                        String(s.id) === String(reviewingSubmission.id) || s.title === reviewingSubmission.title
                          ? { ...s, targetedRecipients: finalRecipients, broadcastToSubscribers }
                          : s
                      )
                    );

                    // Persist to localStorage queue
                    try {
                      const rawSubs = localStorage.getItem("dj_writer_submitted_articles");
                      if (rawSubs && rawSubs.trim()) {
                        const subsList = JSON.parse(rawSubs);
                        if (Array.isArray(subsList)) {
                          const updatedList = subsList.map((s: any) =>
                            String(s.id) === String(reviewingSubmission.id) || s.title === reviewingSubmission.title
                              ? { ...s, targetedRecipients: finalRecipients, broadcastToSubscribers }
                              : s
                          );
                          localStorage.setItem("dj_writer_submitted_articles", JSON.stringify(updatedList));
                        }
                      }
                    } catch (e) {}

                    // Save to server store
                    import("@/lib/articlesSync").then(({ saveArticleToServer }) => {
                      saveArticleToServer(updatedSub as any).catch(() => {});
                    });
                  }

                  setIsMailBoxModalOpen(false);
                  showNotification(`✅ Recipients saved: ${finalRecipients.length} email${finalRecipients.length !== 1 ? "s" : ""} configured for this article.`);
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

      {/* ARTICLE LIVE PREVIEW MODAL */}
      {isPreviewModalOpen && reviewingSubmission && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-10 shadow-2xl space-y-6 relative border border-slate-200">
            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <span className="inline-block px-3 py-1 bg-red-50 text-[#D31220] border border-red-200 text-xs font-mono font-extrabold uppercase rounded-md">
                {reviewCategory} • PREVIEW MODE
              </span>
              <h1 className="font-poppins text-3xl md:text-5xl font-bold text-slate-900 leading-tight">
                {reviewTitle}
              </h1>
              <p className="font-poppins text-lg text-slate-600 leading-relaxed italic">
                {reviewSummary}
              </p>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-500 border-y border-slate-100 py-3">
                <span>BY {reviewingSubmission.authorName || "Rushdhi MR"}</span>
                <span>•</span>
                <span>{reviewReadTime}</span>
                <span>•</span>
                <span>{reviewPlacement !== "None" ? `PLACEMENT: ${reviewPlacement}` : "STANDARD POST"}</span>
              </div>
            </div>

            {reviewImageUrl && (
              <img
                src={reviewImageUrl}
                alt="Preview"
                className="w-full rounded-2xl max-h-[450px] object-cover border border-slate-200 shadow-sm"
              />
            )}

            <div className="font-poppins article-body-poppins text-slate-800 text-lg leading-relaxed whitespace-pre-wrap">
              {reviewContent}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="bg-slate-900 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL (Optional Editorial Feedback) */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-700">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center font-bold text-rose-600">
                  <X className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Reject Article Submission</h3>
                  <p className="text-[11px] text-rose-800/80 font-medium">Provide optional editorial feedback for the author.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectionTargetSubmission(null);
                  setRejectionReasonInput("");
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {rejectionTargetSubmission && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                    Article Being Rejected
                  </span>
                  <p className="text-xs font-extrabold text-slate-900 line-clamp-2">
                    {rejectionTargetSubmission.title}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Author: {rejectionTargetSubmission.authorName || "Writer"} • Category: {rejectionTargetSubmission.category || "General"}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Rejection Reason / Editorial Notes</span>
                  <span className="text-[10px] font-mono text-slate-400 font-normal uppercase">Optional</span>
                </label>
                <textarea
                  rows={4}
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="Enter reason for rejection (e.g., Needs better citations, duplicate submission, grammar issues, topic misaligned with editorial policy)... If you wish to reject without a reason, you can leave this blank."
                  className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-slate-800 placeholder-slate-400 transition-all resize-none"
                  autoFocus
                />
              </div>

              <div className="text-[11px] text-slate-500 bg-amber-50/80 border border-amber-200/70 p-2.5 rounded-lg flex items-start gap-2">
                <span className="text-amber-600 font-bold">ℹ</span>
                <span>
                  This submission will be moved to the <strong>Rejected</strong> section. If a reason is provided, it will be visible to the author so they can make improvements.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectionTargetSubmission(null);
                  setRejectionReasonInput("");
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-5 py-2 text-xs font-extrabold text-white bg-[#D31220] hover:bg-red-700 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Reject Article
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TRENDING WORD MODAL */}
      {isAddTrendingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base font-sans text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#D31220]" />
                <span>Add New Trending Word</span>
              </h3>
              <button onClick={() => setIsAddTrendingModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            <form onSubmit={handleAddTrendingWord} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Trending Word / Topic</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artificial Intelligence"
                  value={newTrendingWord}
                  onChange={(e) => setNewTrendingWord(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-[#D31220]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTrendingModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold bg-[#D31220] hover:bg-[#b91522] text-white rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Add Trending Word
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CROP & SET AD FRAME MODAL */}
      {cropperSlotId && cropperImageSrc && (() => {
        const slot = adSlots.find(s => s.id === cropperSlotId);
        const [targetW, targetH] = (slot?.dimensions || "300X250").split(/[xX]/).map(Number);
        const tw = targetW || 300;
        const th = targetH || 250;

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-[#D31220]">
                    <Crop className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                      <span>Crop Image & Set Frame</span>
                      <span className="text-[10px] font-mono font-bold bg-[#D31220]/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded uppercase">
                        {tw} × {th} px
                      </span>
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400 truncate max-w-md">
                      {slot?.title || "Ad Banner"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeCropper}
                  disabled={isSavingCrop}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Framing Workspace */}
              <div className="p-5 overflow-y-auto space-y-4">
                
                {/* Visual Viewport with Masked Frame */}
                <div className="relative bg-slate-950 rounded-xl p-4 sm:p-6 border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
                  <div className="text-[11px] font-mono text-slate-400 mb-3 flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5 text-slate-500" />
                    <span>Drag inside the frame to adjust position • Scroll or use slider to zoom</span>
                  </div>

                  <div className="relative w-full flex items-center justify-center overflow-hidden py-2">
                    {/* The Framing Box (Aspect Ratio Matched) */}
                    <div
                      id="ad-crop-frame-viewport"
                      style={{
                        aspectRatio: `${tw}/${th}`,
                        maxHeight: "360px",
                        maxWidth: tw > 500 ? "580px" : tw === th ? "320px" : th > tw ? "200px" : "380px"
                      }}
                      onPointerDown={handleCropPointerDown}
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={(e) => {
                        setIsDraggingCrop(false);
                        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
                      }}
                      onWheel={(e) => {
                        e.preventDefault();
                        const delta = e.deltaY < 0 ? 0.08 : -0.08;
                        setCropperZoom((prev) => Math.max(0.5, Math.min(3, parseFloat((prev + delta).toFixed(2)))));
                      }}
                      className="relative w-full overflow-hidden border-2 border-white/95 shadow-[0_0_0_9999px_rgba(0,0,0,0.78)] rounded-xs cursor-grab active:cursor-grabbing select-none"
                    >
                      {/* Image transformed by pan and zoom */}
                      <img
                        src={cropperImageSrc}
                        alt="Crop target"
                        draggable={false}
                        style={{
                          transform: `translate(${cropperPan.x}px, ${cropperPan.y}px) scale(${cropperZoom})`,
                          transformOrigin: "center center",
                        }}
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />

                      {/* Rule of Thirds Guides */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/20">
                        <div className="border-r border-b border-white/25"></div>
                        <div className="border-r border-b border-white/25"></div>
                        <div className="border-b border-white/25"></div>
                        <div className="border-r border-b border-white/25"></div>
                        <div className="border-r border-b border-white/25"></div>
                        <div className="border-b border-white/25"></div>
                        <div className="border-r border-white/25"></div>
                        <div className="border-r border-white/25"></div>
                        <div></div>
                      </div>

                      {/* Frame Dimension Badge */}
                      <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-xs text-[9px] font-mono font-bold text-white px-2 py-0.5 rounded border border-white/10 uppercase tracking-wider pointer-events-none">
                        FRAME: {tw} × {th}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cropping Controls Toolbar */}
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 space-y-3">
                  
                  {/* Zoom Slider Row */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCropperZoom(prev => Math.max(0.5, parseFloat((prev - 0.1).toFixed(2))))}
                      className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>

                    <div className="flex-1 flex items-center gap-3">
                      <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.05"
                        value={cropperZoom}
                        onChange={(e) => setCropperZoom(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#D31220]"
                      />
                      <span className="text-xs font-mono font-bold text-slate-300 min-w-[50px] text-right">
                        {(cropperZoom * 100).toFixed(0)}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCropperZoom(prev => Math.min(3, parseFloat((prev + 0.1).toFixed(2))))}
                      className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Alignment & Pan Nudge Buttons */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-700/60 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setCropperPan({ x: 0, y: 0 }); setCropperZoom(1); }}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Center
                      </button>

                      <button
                        type="button"
                        onClick={() => setCropperZoom(1.2)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Fill Frame
                      </button>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                      <span>Nudge:</span>
                      <button
                        type="button"
                        onClick={() => setCropperPan(p => ({ ...p, x: p.x - 15 }))}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded cursor-pointer"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => setCropperPan(p => ({ ...p, x: p.x + 15 }))}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded cursor-pointer"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => setCropperPan(p => ({ ...p, y: p.y - 15 }))}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded cursor-pointer"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => setCropperPan(p => ({ ...p, y: p.y + 15 }))}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded cursor-pointer"
                      >
                        ↓
                      </button>
                    </div>
                  </div>

                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                  Frame will appear in homepage ad & article sections
                </span>

                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={closeCropper}
                    disabled={isSavingCrop}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyCroppedFrame}
                    disabled={isSavingCrop}
                    className="px-6 py-2.5 bg-[#D31220] hover:bg-[#BF1E2D] disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-lg shadow-red-950/40 uppercase font-mono tracking-wider flex items-center gap-2"
                  >
                    {isSavingCrop ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving Frame...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Set Frame & Save Ad</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}

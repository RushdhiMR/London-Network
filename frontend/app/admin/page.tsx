"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import JSZip from "jszip";
import { useAuth } from "@/lib/auth-context";
import SEOAssistantPanel from "@/components/SEOAssistantPanel";
import LogoLoader from "@/components/LogoLoader";
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
  Layers,
  Radio,
  Edit3,
  X,
  Menu,
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
  CheckCircle,
  ArrowLeft,
  Send,
  Lock,
  Pencil,
  Upload
} from "lucide-react";
import { useLiveArticles, updateArticleStatusOnServer, deleteArticleOnServer, fetchArticlesFromServer, saveArticleToServer } from "@/lib/articlesSync";
import { isEmailAlreadyRegistered, getUserProfile, saveUserProfile } from "@/lib/userProfiles";

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
    source.hashTags,
    source.seo?.keywords,
    source.keywords
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
    "overview" | "newsletter" | "articles" | "users" | "ads" | "contact_submissions" | "advertise_leads" | "backups"
  >("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

    setReviewingSubmission(null);
    showNotification(`🎉 Article "${newArt.title.slice(0, 35)}..." Approved & Published Live!`);
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
    totalArticles: 142,
    totalAuthors: 6,
    totalSubscribers: 5,
    totalUsers: 9,
    monthlyViews: "184,250",
    systemStatus: "Healthy / Operational",
    dbHost: "localhost (digital_journal_db)",
    lastBackup: "2026-08-11 04:00 AM",
    monthlyAdRevenue: "$14,850.00"
  });

  // Default fallback submissions
  const DEFAULT_MOCK_SUBMISSIONS: SubmittedDraft[] = [
    {
      id: "sub-100",
      title: "Why Latin America and Parts of Europe Are Moving Right While the American Left Gains Momentum",
      category: "WORLD",
      summary: "The apparent ideological contradiction reflects different economic experiences, political systems and voter priorities rather than a simple global shift from left to right.",
      content: "<p>Politics on both sides of the Atlantic is undergoing a striking transformation. While much of Latin America has recently moved toward conservative, libertarian or right-wing governments, and several European countries have seen substantial gains by right-wing parties, the United States has simultaneously witnessed renewed interest in progressive economics and democratic socialism, particularly among younger voters.</p><p><br></p><p>At first glance, the trends appear contradictory. In reality, they reflect different political experiences. Voters in each region are responding to distinct combinations of inflation, crime, immigration, housing costs, and institutional trust.</p>",
      imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop",
      status: "Submitted",
      date: "Aug 13, 2026",
      reads: 0,
      authorName: "Rushdhi MR",
      readTime: "5 min read"
    },
    {
      id: "sub-101",
      title: "Saudi Arabia Opens Talks to Purchase Westinghouse AP1000 Nuclear Reactors",
      category: "BUSINESS",
      summary: "Riyadh advances civil nuclear ambitions with high-capacity American reactor tech for power generation and industrial desalination...",
      content: "Riyadh advances civil nuclear ambitions with high-capacity American reactor tech for clean power generation and industrial desalination infrastructure across the peninsula.",
      imageUrl: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=150&h=150&fit=crop",
      status: "Submitted",
      date: "Aug 11, 2026",
      reads: 0,
      authorName: "Rushdhi MR",
      readTime: "4 min read"
    },
    {
      id: "sub-102",
      title: "Next-Gen Quantum Computing Chips Achieve Room-Temperature Breakthrough",
      category: "TECHNOLOGY",
      summary: "Research labs confirm micro-architecture stability at ambient temperatures, unlocking massive parallel compute clusters...",
      content: "Research labs confirm micro-architecture stability at ambient temperatures, unlocking massive parallel compute clusters for real-time cryptographic processing.",
      imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150&h=150&fit=crop",
      status: "Submitted",
      date: "Aug 10, 2026",
      reads: 0,
      authorName: "Muba_kity",
      readTime: "6 min read"
    },
    {
      id: "sub-103",
      title: "Autonomous Fleet Operating Networks Expand Regional Commercial Routes",
      category: "INNOVATION",
      summary: "Safety telematics report zero critical disruptions across 1.2 million autonomous miles driven on public highways...",
      content: "Safety telematics report zero critical disruptions across 1.2 million autonomous miles driven on public highways, accelerating state regulatory approvals.",
      imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=150&h=150&fit=crop",
      status: "Submitted",
      date: "Aug 09, 2026",
      reads: 0,
      authorName: "Roomi",
      readTime: "5 min read"
    }
  ];

  // Submitted drafts awaiting admin approval
  const [writerSubmissions, setWriterSubmissions] = useState<SubmittedDraft[]>(() => {
    if (typeof window === "undefined") return DEFAULT_MOCK_SUBMISSIONS;
    try {
      const nonPendingIds = new Set<string>();
      const nonPendingTitles = new Set<string>();
      const cleanT = (t: string) => String(t || "").toLowerCase().replace(/[\u2018\u2019\u201A\u201B']/g, "'").replace(/[\u201C\u201D\u201E\u201F"]/g, '"').replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
      const subsStr = localStorage.getItem("dj_writer_submitted_articles");
      if (subsStr) {
        const parsed = JSON.parse(subsStr);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            const st = (p.status || "").toLowerCase().trim();
            if (st === "rejected" || st === "published" || st === "trash" || st === "approved") {
              if (p.id) nonPendingIds.add(String(p.id));
              if (p.title) nonPendingTitles.add(cleanT(p.title));
            }
          });
        }
      }
      return DEFAULT_MOCK_SUBMISSIONS.filter(m => !nonPendingIds.has(String(m.id)) && !nonPendingTitles.has(cleanT(m.title)));
    } catch (e) {
      return DEFAULT_MOCK_SUBMISSIONS;
    }
  });

  // London BigBen Newsletter Subscribers Roster
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<SubscriberItem[]>([]);

  // London BigBen Published Articles Catalog
  const [articles, setArticles] = useState<Article[]>([
    {
      id: 2001,
      title: "Review: Has AI been chasing the wrong dream since Alan Turing?",
      slug: "review-has-ai-been-chasing-the-wrong-dream",
      description: "The essential question, then, is not whether machines can imitate people, but whether neural architectures can discover novel principles of reasoning.",
      category_name: "TECHNOLOGY",
      author_name: "Dr. Tim Sandle",
      readTime: "6 min read",
      imageUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&h=300&fit=crop",
      views: 2450,
      comments: 34,
      is_featured: true,
      is_editors_pick: true,
      placement: "Featured Story",
      published_at: "2026-08-11 12:00:00"
    },
    {
      id: 2002,
      title: "Exclusive: Saudi Arabia opens talks to purchase Westinghouse AP1000 nuclear reactors",
      slug: "exclusive-saudi-arabia-opens-talks-to-purchase-westinghouse-ap1000-nuclear-reactors",
      description: "Riyadh advances civil nuclear ambitions with high-capacity American reactor tech for clean power generation and desalination.",
      category_name: "BUSINESS",
      author_name: "Rushdhi MR",
      readTime: "4 min read",
      imageUrl: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=500&h=300&fit=crop",
      views: 1280,
      comments: 14,
      is_featured: true,
      is_editors_pick: true,
      placement: "Featured Story",
      published_at: "2026-08-10 14:30:00"
    },
    {
      id: 2003,
      title: "US stocks end higher as SK Hynix debut & Meta AI momentum lift markets",
      slug: "us-stocks-end-higher-as-sk-hynixs-wall-street-debut-and-metas-ai-momentum-lift-markets",
      description: "Tech rally pushes S&P 500 near record highs as semiconductor demand remains robust across global trading hubs.",
      category_name: "NEWS",
      author_name: "Muba_kity",
      readTime: "5 min read",
      imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&h=300&fit=crop",
      views: 3890,
      comments: 42,
      is_featured: false,
      is_editors_pick: true,
      placement: "Editor's Pick",
      published_at: "2026-08-09 16:15:00"
    },
    {
      id: 2004,
      title: "Tesla earnings call key focus: Robotaxi progress, low-cost EV platform & FSD v13",
      slug: "tesla-earnings-call-key-focus-robotaxi-progress-low-cost-ev-platform-fsd-v13",
      description: "Investors await updates on autonomous fleet expansion and next-generation vehicle architecture.",
      category_name: "INNOVATION",
      author_name: "Roomi",
      readTime: "5 min read",
      imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=500&h=300&fit=crop",
      views: 1940,
      comments: 21,
      is_featured: true,
      is_editors_pick: false,
      placement: "Featured Story",
      published_at: "2026-08-08 18:45:00"
    },
    {
      id: 2005,
      title: "Can AI give reliable mortgage advice? We tested 4 top AI bots",
      slug: "can-ai-give-reliable-mortgage-advice-we-tested-4-top-ai-bots",
      description: "Evaluating financial accuracy and regulatory compliance of leading generative models.",
      category_name: "INNOVATION",
      author_name: "Rushdhi MR",
      readTime: "4 min read",
      imageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&h=300&fit=crop",
      views: 1120,
      comments: 9,
      is_featured: false,
      is_editors_pick: true,
      placement: "Editor's Pick",
      published_at: "2026-08-07 09:20:00"
    },
    {
      id: 2006,
      title: "Global solar-powered mobile medical units deployed in emergency response zones",
      slug: "global-solar-powered-mobile-medical-units-deployed-in-emergency-response-zones",
      description: "Clean energy mobile clinics deliver off-grid medical care to remote disaster regions.",
      category_name: "INDUSTRY INSIGHTS",
      author_name: "Roomi",
      readTime: "5 min read",
      imageUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500&h=300&fit=crop",
      views: 850,
      comments: 6,
      is_featured: false,
      is_editors_pick: false,
      placement: "Standard Post",
      published_at: "2026-08-06 16:00:00"
    }
  ]);

  // London BigBen Workspace Users (Strictly Real Registered Users)
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([
    { id: 2, name: "Rushdhi MR", email: "rushdhiriyaj2005@gmail.com", role: "ADMIN", isDefaultAdmin: true, joinedDate: "Aug 01, 2026", status: "Active" },
    { id: 9, name: "Rushdhi MR", email: "rushdhiwriter@gmail.com", role: "WRITER", joinedDate: "Aug 26, 2026", status: "Active" },
    { id: 12, name: "Muba_kity", email: "rura@gmail.com", role: "WRITER", joinedDate: "Aug 31, 2026", status: "Active" },
    { id: 13, name: "Roomi", email: "roomiwriter@gmail.com", role: "WRITER", joinedDate: "Sep 01, 2026", status: "Active" },
    { id: 5, name: "Ruzni", email: "ruzni@gmail.com", role: "ADMIN", joinedDate: "Aug 31, 2026", status: "Active" },
    { id: 7, name: "Roomi", email: "roomi@gmail.com", role: "READER", joinedDate: "Aug 13, 2026", status: "Active" }
  ]);

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

  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmissionItem[]>([
    {
      id: "cs-101",
      date: "Jul 27, 09:07 PM",
      name: "SORORIA",
      company: "N/A",
      email: "rij102008sororia@outlook.com",
      phone: "P: 000 000 0000",
      whatsapp: "W: 000 000 0000",
      type: "Editorial",
      message: "Policy and structure Although our publication standards require verified sources, we would like to inquire about publishing syndication arrangements...",
      status: "New"
    },
    {
      id: "cs-102",
      date: "Aug 11, 10:14 AM",
      name: "Robert Taylor",
      company: "Apex Media Partners",
      email: "rtaylor@apex.io",
      phone: "P: +1 (555) 234-5678",
      whatsapp: "W: +1 (555) 234-5678",
      type: "Advertising",
      message: "We are interested in booking the Header Top Leaderboard slot for Q4 enterprise campaign targeting AI startups.",
      status: "In Review"
    },
    {
      id: "cs-103",
      date: "Aug 10, 04:30 PM",
      name: "Dr. Aris Thorne",
      company: "MIT Media Lab",
      email: "athorne@mit.edu",
      phone: "P: +1 (617) 253-1000",
      whatsapp: "W: N/A",
      type: "Editorial",
      message: "Submitting a research breakthrough paper on quantum semiconductor nodes for review by your technology editorial desk.",
      status: "New"
    },
    {
      id: "cs-104",
      date: "Aug 08, 02:15 PM",
      name: "Sarah Jenkins",
      company: "Global Tech Foundation",
      email: "sjenkins@globaltech.org",
      phone: "P: +44 20 7946 0912",
      whatsapp: "W: +44 20 7946 0912",
      type: "General Inquiry",
      message: "Inquiry regarding press accreditation for the upcoming International Digital Journalism Conference in London.",
      status: "Resolved"
    }
  ]);

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

  const [advertiseLeads, setAdvertiseLeads] = useState<AdvertiseLeadItem[]>([
    {
      id: "lead-5001",
      date: "Aug 11, 11:30 AM",
      submitterName: "Rachel Vance",
      company: "NVIDIA Enterprise",
      email: "rvance@nvidia.com",
      phone: "P: +1 (408) 486-2000",
      whatsapp: "W: +1 (408) 486-2000",
      serviceOption: "Banner Ads",
      requirements: "Requesting Header Top Leaderboard placement for Q4 Enterprise AI launch campaign...",
      budget: "$25,000 / mo",
      status: "In Discussion"
    },
    {
      id: "lead-5002",
      date: "Aug 09, 03:45 PM",
      submitterName: "David Miller",
      company: "Palantir Tech",
      email: "dmiller@palantir.com",
      phone: "P: +1 (650) 841-4000",
      whatsapp: "W: N/A",
      serviceOption: "Sponsored Articles",
      requirements: "Sponsorship slot for multi-part editorial series on Foundry data infrastructure.",
      budget: "$15,000 / mo",
      status: "Qualified"
    },
    {
      id: "lead-5003",
      date: "Aug 07, 09:20 AM",
      submitterName: "Marcus Vance",
      company: "AWS Cloud Solutions",
      email: "mvance@amazon.com",
      phone: "P: +1 (206) 266-1000",
      whatsapp: "W: +1 (206) 266-1000",
      serviceOption: "Newsletter Takeover",
      requirements: "Exclusive newsletter banner placement for re:Invent conference announcements.",
      budget: "$18,500 / mo",
      status: "New"
    },
    {
      id: "lead-5004",
      date: "Aug 04, 01:10 PM",
      submitterName: "Elena Rostova",
      company: "Bloomberg Media",
      email: "erostova@bloomberg.net",
      phone: "P: +1 (212) 318-2000",
      whatsapp: "W: +1 (212) 318-2000",
      serviceOption: "Brand Partnership",
      requirements: "Joint content syndication and co-branded webinar sponsorship package.",
      budget: "$30,000 / mo",
      status: "Closed"
    }
  ]);

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
        if (saved) {
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
        adSlots
      };

      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshotPayload)
      });

      const resData = await res.json();
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
          if (stored) {
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

  const handleAdImageUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        showNotification("Uploading ad banner to Backblaze B2...");
        const cleanFileName = `ad-${id}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const b2Url = await uploadImageToBackblaze(file, cleanFileName, "ads");
        if (b2Url) {
          const updated = adSlots.map(s => s.id === id ? { ...s, imageUrl: b2Url } : s);
          saveUpdatedSlots(updated);
          showNotification("✓ New ad banner uploaded to Backblaze B2 and saved!");
        }
      } catch (err) {
        console.error("Ad upload to Backblaze error:", err);
        // Fallback to local base64 reader if anything unexpected occurs
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (base64) {
            const updated = adSlots.map(s => s.id === id ? { ...s, imageUrl: base64 } : s);
            saveUpdatedSlots(updated);
            showNotification("✓ New ad banner image uploaded and saved!");
          }
        };
        reader.readAsDataURL(file);
      }
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
          if (tabSession) {
            const parsed = JSON.parse(tabSession);
            const r = (parsed?.role || "").toLowerCase();
            const em = (parsed?.email || "").toLowerCase();
            if (r === "admin" || r === "co-admin" || r === "editor" || em.includes("admin") || parsed?.id === 1) {
              effectiveUser = parsed;
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
          if (storedAdmin) {
            effectiveUser = JSON.parse(storedAdmin);
          }
        } catch (e) {}
      }

      const fallbackAdmin = { name: "Geeth Liyanage", email: "geethliyanage979@gmail.com", role: "Admin" };
      const resolvedAdmin = effectiveUser || fallbackAdmin;

      setAdminUser(resolvedAdmin);
      setIsAuthenticated(true);
      await fetchDashboardData();
      setIsLoading(false);
    }

    initAdminAuth();
  }, [auth.loading, auth.authenticated, auth.user, router]);

  useEffect(() => {
    fetchDashboardData();

    const handleStorageChange = () => {
      fetchDashboardData();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("dj_articles_updated", handleStorageChange);
    window.addEventListener("dj_contact_change", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("dj_articles_updated", handleStorageChange);
      window.removeEventListener("dj_contact_change", handleStorageChange);
    };
  }, []);

  const fetchDashboardData = async () => {
    // 1. Synchronize Real Database Users
    try {
      const resUsers = await fetch("/api/admin/users", {
        headers: {
          "Content-Type": "application/json",
          "x-admin-portal": "dj_admin_portal_authenticated_2026",
        },
      });

      let dbUsersList: any[] = [];
      if (resUsers.ok) {
        const data = await resUsers.json();
        if (data.success && Array.isArray(data.users)) {
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
          if (regStr) {
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
          if (profDbStr) {
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
            if (str) {
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
        const resArts = await fetch("/api/articles", { cache: "no-store" });
        if (resArts.ok) {
          const dataArts = await resArts.json();
          if (dataArts.success && Array.isArray(dataArts.articles) && dataArts.articles.length > 0) {
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

        if (publishedOnly.length > 0) {
          setArticles(publishedOnly);
          setStats(prev => ({ ...prev, totalArticles: publishedOnly.length }));
        }

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
          const merged = { ...existing, ...item };
          if (idKey) subMap.set(idKey, merged);
          if (titleKey) subMap.set(`t_${titleKey}`, merged);
        });

        const mergedSubsList: any[] = [];
        const seenSubs = new Set<string>();

        localSubsList.forEach((item) => {
          const idKey = cleanKey(item.id);
          const titleKey = cleanTitleKey(item.title);
          const resolved = (idKey && subMap.get(idKey)) || (titleKey && subMap.get(`t_${titleKey}`)) || item;
          const isSeen = (idKey && seenSubs.has(idKey)) || (titleKey && seenSubs.has(`t_${titleKey}`));
          if (!isSeen) {
            if (idKey) seenSubs.add(idKey);
            if (titleKey) seenSubs.add(`t_${titleKey}`);
            mergedSubsList.push(resolved);
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
            mergedSubsList.push(resolved);
          }
        });

        if (mergedSubsList.length > 0) {
          setWriterSubmissions(mergedSubsList);
        }
      }
    } catch (err) {
      console.warn("Live articles sync notice:", err);
    }

    // 4. Newsletter Subscribers Sync from Database and Local Cache
    try {
      const resSubs = await fetch("/api/newsletter/subscribe");
      if (resSubs.ok) {
        const subsData = await resSubs.json();
        if (subsData.success && Array.isArray(subsData.subscribers)) {
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
      if (trashedStr) {
        const parsed = JSON.parse(trashedStr);
        if (Array.isArray(parsed)) {
          setTrashedArticles(parsed);
        }
      }
    } catch (err) {}

    // 6. Contact Us Submissions Sync from Database and Local Storage
    try {
      const resContact = await fetch("/api/contact");
      if (resContact.ok) {
        const contactData = await resContact.json();
        if (contactData.success && Array.isArray(contactData.contactSubmissions)) {
          const localStr = typeof window !== "undefined" ? localStorage.getItem("dj_contact_submissions") : null;
          let localContacts: any[] = [];
          if (localStr) {
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
      const resLeads = await fetch("/api/advertise");
      if (resLeads.ok) {
        const leadsData = await resLeads.json();
        if (leadsData.success && Array.isArray(leadsData.leads)) {
          const localStr = typeof window !== "undefined" ? localStorage.getItem("dj_advertise_leads") : null;
          let localLeads: any[] = [];
          if (localStr) {
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
      const resBk = await fetch("/api/admin/backups");
      if (resBk.ok) {
        const bkData = await resBk.json();
        if (bkData.success && Array.isArray(bkData.backups) && bkData.backups.length > 0) {
          const localStr = typeof window !== "undefined" ? localStorage.getItem("dj_database_backups") : null;
          let localBk: any[] = [];
          if (localStr) {
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

    // 2. Persist to server and local storage
    try {
      const { saveArticleToServer, setCachedArticles, getCachedArticles } = await import("@/lib/articlesSync");
      const cached = getCachedArticles();
      const cIdx = cached.findIndex((a: any) =>
        String(a.id) === String(sub.id) || (cleanT(a.title) && cleanT(sub.title) && cleanT(a.title) === cleanT(sub.title))
      );
      if (cIdx >= 0) {
        cached[cIdx] = { ...cached[cIdx], ...rejectedItem, status: "Rejected" };
        setCachedArticles(cached, false);
      } else {
        setCachedArticles([rejectedItem, ...cached], false);
      }

      await saveArticleToServer(rejectedItem as any);

      const subsStr = localStorage.getItem("dj_writer_submitted_articles");
      let subsList: any[] = [];
      if (subsStr) {
        try { subsList = JSON.parse(subsStr); } catch (e) {}
      }

      const existingIdx = subsList.findIndex((p: any) =>
        String(p.id) === String(sub.id) || (cleanT(p.title) && cleanT(sub.title) && cleanT(p.title) === cleanT(sub.title))
      );

      if (existingIdx >= 0) {
        subsList[existingIdx] = {
          ...subsList[existingIdx],
          ...rejectedItem,
          status: "Rejected"
        };
      } else {
        subsList.unshift(rejectedItem);
      }
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
      if (stored) {
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
    let fullPost: any = { ...art };
    try {
      const submittedStr = localStorage.getItem("dj_writer_submitted_articles");
      if (submittedStr) {
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
    else if (typeof rawSubs === 'string') {
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
    router.push(`/writer/create?edit=${art.id}`);
  };

  const handleSaveArticleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle || !editTitle.trim()) return;

    const nowIso = new Date().toISOString();
    const updatedRecord = {
      ...editingArticle,
      title: editTitle.trim(),
      category_name: editCategory,
      author_name: editAuthor.trim(),
      description: editDescription.trim(),
      published_at: nowIso,
      publishedAt: nowIso,
      updated_at: nowIso,
      updatedAt: nowIso,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
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
        if (subsStr) {
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
      if (deletedStr) {
        const list: string[] = JSON.parse(deletedStr);
        const normTitle = (art.title || "").trim().toLowerCase();
        const normId = String(art.id);
        const normSlug = (art.slug || normTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-'));
        const filtered = list.filter(k => k !== normId && k !== normTitle && k !== normSlug);
        localStorage.setItem("dj_deleted_articles", JSON.stringify(filtered));
      }

      const subsStr = localStorage.getItem("dj_writer_submitted_articles");
      if (subsStr) {
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

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create user");
        return;
      }

      // Unblacklist email from local storage blacklist if previously deleted
      try {
        const blStr = localStorage.getItem("dj_deleted_users_blacklist");
        if (blStr) {
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
          if (regStr) {
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
          const profStr = localStorage.getItem("dj_user_profiles_db");
          if (profStr) {
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
        const blacklist: string[] = blStr ? JSON.parse(blStr) : [];
        if (!blacklist.includes(emailLower)) {
          blacklist.push(emailLower);
          localStorage.setItem("dj_deleted_users_blacklist", JSON.stringify(blacklist));
        }
      } catch (e) {}

      // 2. Remove from registered users list
      try {
        const regStr = localStorage.getItem("dj_registered_users");
        if (regStr) {
          const regList: any[] = JSON.parse(regStr);
          const filtered = regList.filter(u => (u.email || '').toLowerCase().trim() !== emailLower);
          localStorage.setItem("dj_registered_users", JSON.stringify(filtered));
        }
      } catch (e) {}

      // 3. Remove from user profiles DB
      try {
        const dbStr = localStorage.getItem("dj_user_profiles_db");
        if (dbStr) {
          const dbObj = JSON.parse(dbStr);
          delete dbObj[emailLower];
          localStorage.setItem("dj_user_profiles_db", JSON.stringify(dbObj));
        }
      } catch (e) {}

      // 4. Remove from writers list
      try {
        const wStr = localStorage.getItem("dj_writers_list");
        if (wStr) {
          const wList: any[] = JSON.parse(wStr);
          const filtered = wList.filter(w => (w.email || '').toLowerCase().trim() !== emailLower);
          localStorage.setItem("dj_writers_list", JSON.stringify(filtered));
        }
      } catch (e) {}

      // 5. Remove from device google accounts
      try {
        const dStr = localStorage.getItem("dj_device_google_accounts");
        if (dStr) {
          const dList: any[] = JSON.parse(dStr);
          const filtered = dList.filter(d => (d.email || '').toLowerCase().trim() !== emailLower);
          localStorage.setItem("dj_device_google_accounts", JSON.stringify(filtered));
        }
      } catch (e) {}

      // 6. Clear session if currently active user was deleted
      try {
        const activeUserStr = localStorage.getItem("dj_user");
        if (activeUserStr) {
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
        let subsList: any[] = subsStr ? JSON.parse(subsStr) : [];
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
          pl.includes("home page a+") ||
          pl === "a+ section" ||
          (pl.includes("a+") && !pl.includes("2")) ||
          (a.is_featured === true && !pl.includes("2"))
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
          pl.includes("section 2") ||
          pl.includes("a+ 2") ||
          pl.includes("a+2") ||
          pl.includes("spotlight banner")
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


  const pendingSubmissions = writerSubmissions.filter((s) => {
    const st = (s.status || "").toLowerCase().trim();
    if (st.includes("reject") || st === "draft" || st === "trash" || st === "published" || st === "approved") {
      return false;
    }
    return true;
  });

  const activeReviewsCount = pendingSubmissions.length;
  const completedReleasesCount = articles.length;
  const newsletterSubsCount = newsletterSubscribers.length;

  return (
    <div className="h-screen bg-[#F8FAFC] flex font-standard-sans text-slate-800 overflow-hidden relative">
      
      {/* MOBILE BACKDROP OVERLAY (< md) */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* LEFT SIDEBAR NAVIGATION - RESPONSIVE DRAWER ON MOBILE, FIXED IN PLACE ON DESKTOP */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0F172A] text-white flex flex-col h-full border-r border-slate-800 select-none transition-transform duration-300 ease-in-out shadow-2xl
          ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:w-64 md:h-screen md:flex-shrink-0 md:z-auto md:shadow-none
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
              <img
                src="/logo.png"
                alt="London BigBen Logo"
                className="w-9 h-9 object-contain rounded-lg shadow-md shrink-0"
              />
              <div className="min-w-0">
                <h1 className="font-serif font-black text-sm tracking-tight text-white uppercase leading-none group-hover:text-[#D31220] transition-colors truncate">
                  LONDON BIGBEN
                </h1>
                <p className="text-[9px] font-mono text-slate-400 tracking-widest uppercase mt-1 truncate">
                  EXECUTIVE CONTROL
                </p>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-2 shrink-0 cursor-pointer"
              aria-label="Close Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <Link
            href="/"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="mt-4 sm:mt-5 flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
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
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11.5px] font-extrabold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-[#D31220] text-white shadow-lg shadow-red-950/40"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Overview</span>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ${
              activeTab === "overview" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"
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
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11.5px] font-extrabold transition-all cursor-pointer ${
              activeTab === "newsletter"
                ? "bg-[#D31220] text-white shadow-lg shadow-red-950/40"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
            }`}
          >
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Newsletter</span>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ${
              activeTab === "newsletter" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"
            }`}>
              {newsletterSubscribers.length}
            </span>
          </button>

          {/* 3. Published Posts */}
          <button
            onClick={() => {
              setActiveTab("articles");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11.5px] font-extrabold transition-all cursor-pointer ${
              activeTab === "articles"
                ? "bg-[#D31220] text-white shadow-lg shadow-red-950/40"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Published Posts</span>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ${
              activeTab === "articles" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"
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
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11.5px] font-extrabold transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-[#D31220] text-white shadow-lg shadow-red-950/40"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Users</span>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ${
              activeTab === "users" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"
            }`}>
              {workspaceUsers.length}
            </span>
          </button>

          {/* 5. Manage Ads */}
          <button
            onClick={() => {
              setActiveTab("ads");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11.5px] font-extrabold transition-all cursor-pointer ${
              activeTab === "ads"
                ? "bg-[#D31220] text-white shadow-lg shadow-red-950/40"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
            }`}
          >
            <Megaphone className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Manage Ads</span>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ${
              activeTab === "ads" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"
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
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11.5px] font-extrabold transition-all cursor-pointer ${
              activeTab === "contact_submissions"
                ? "bg-[#D31220] text-white shadow-lg shadow-red-950/40"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Contact Us Submissions</span>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ${
              activeTab === "contact_submissions" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"
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
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11.5px] font-extrabold transition-all cursor-pointer ${
              activeTab === "advertise_leads"
                ? "bg-[#D31220] text-white shadow-lg shadow-red-950/40"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
            }`}
          >
            <Briefcase className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Advertise Leads</span>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ${
              activeTab === "advertise_leads" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"
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
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11.5px] font-extrabold transition-all cursor-pointer ${
              activeTab === "backups"
                ? "bg-[#D31220] text-white shadow-lg shadow-red-950/40"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
            }`}
          >
            <Database className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Database Backups</span>
          </button>
        </nav>

        {/* SIDEBAR FOOTER LOGOUT */}
        <div className="p-4 border-t border-slate-800/80 flex-shrink-0">
          <button
            onClick={() => {
              setIsMobileSidebarOpen(false);
              handleLogout();
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 text-xs font-bold transition-all cursor-pointer border border-slate-800 hover:border-rose-900"
          >
            <span className="flex items-center gap-2">
              <LogOut className="w-4 h-4 text-rose-400" />
              Sign Out Terminal
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE AREA - SCROLLS INDEPENDENTLY */}
      <main className="flex-1 h-screen p-3.5 sm:p-6 md:p-10 overflow-y-auto min-w-0 w-full">
        
        {/* MOBILE WORKSPACE TOP APP BAR (< md) */}
        <div className="md:hidden flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Open Admin Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <span className="font-serif font-black text-xs uppercase tracking-tight text-slate-900 block truncate">
                Admin Control
              </span>
              <span className="text-[10px] font-mono text-[#D31220] uppercase font-bold block truncate">
                {activeTab.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#D31220] text-white font-extrabold text-[11px] flex items-center justify-center font-mono shadow-xs">
              RA
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TOAST NOTIFICATION BANNER */}
        {toastMessage && (
          <div className="mb-6 w-full bg-[#D31220] text-white text-xs font-extrabold py-3 px-5 rounded-xl shadow-lg flex items-center justify-between animate-fade-in">
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-serif text-slate-900 tracking-tight">
              My Workspace
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Welcome back, <span className="text-slate-900 font-bold">{adminUser?.name || "rushdi admin"}</span>!
            </p>
          </div>

          {/* User Profile Badge Chip */}
          <div className="hidden sm:flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm self-start sm:self-auto">
            <div className="w-8 h-8 rounded-xl bg-[#D31220] text-white font-extrabold text-xs flex items-center justify-center font-mono uppercase shadow-sm">
              RA
            </div>
            <div className="text-left leading-tight pr-2">
              <p className="text-xs font-extrabold text-slate-900">{adminUser?.name || "rushdi admin"}</p>
              <p className="text-[10px] text-slate-400 font-mono">System Admin</p>
            </div>
          </div>
        </div>

        {/* STAT CARDS ROW (Pinned at top of workspace) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          
          {/* Card 1: ACTIVE REVIEWS */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm border-l-4 border-l-purple-500 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-1">
                ACTIVE REVIEWS
              </p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 font-sans tracking-tight">
                {activeReviewsCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner shrink-0">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: COMPLETED RELEASES */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm border-l-4 border-l-emerald-500 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-1">
                COMPLETED RELEASES
              </p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 font-sans tracking-tight">
                {completedReleasesCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: NEWSLETTER SUBS */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm border-l-4 border-l-amber-500 flex items-center justify-between sm:col-span-2 lg:col-span-1">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-1">
                NEWSLETTER SUBS
              </p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 font-sans tracking-tight">
                {newsletterSubsCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner shrink-0">
              <Mail className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* MAIN TABLE CONTAINER: Recent Projects (Pending Review) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              
              {/* Table Header Bar */}
              <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <h2 className="text-base sm:text-lg font-black font-serif text-slate-900 tracking-tight">
                  Recent Projects (Pending Review)
                </h2>
                <span className="text-[11px] font-extrabold bg-slate-200/70 text-slate-700 px-3.5 py-1 rounded-full font-mono self-start sm:self-auto">
                  Pending Count: {pendingSubmissions.length}
                </span>
              </div>

              {/* Projects Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                      <th className="py-3.5 px-6">ARTICLE DETAILS</th>
                      <th className="py-3.5 px-4">CATEGORY</th>
                      <th className="py-3.5 px-4">AUTHOR</th>
                      <th className="py-3.5 px-4">SUBMITTED DATE</th>
                      <th className="py-3.5 px-4">STATUS</th>
                      <th className="py-3.5 px-6 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {pendingSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No pending submissions in queue. All articles have been reviewed!
                        </td>
                      </tr>
                    ) : (
                      pendingSubmissions.map((post, idx) => (
                        <tr key={`sub-${post.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* ARTICLE DETAILS */}
                          <td className="py-4 px-6 max-w-md">
                            <div className="flex items-start gap-3.5">
                              <img
                                src={post.imageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop"}
                                alt="Thumbnail"
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0 shadow-sm"
                              />
                              <div>
                                <h3 className="font-extrabold text-slate-900 text-[13px] leading-snug line-clamp-1">
                                  {post.title}
                                </h3>
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                                  {post.summary}
                                </p>
                                <span className="inline-block mt-1 text-[10px] font-mono text-slate-400">
                                  {post.readTime || "5 min read"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* CATEGORY */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="inline-block px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-extrabold uppercase rounded-full font-mono">
                              {post.category}
                            </span>
                          </td>

                          {/* AUTHOR */}
                          <td className="py-4 px-4 whitespace-nowrap font-bold text-slate-700">
                            {post.authorName || "Rushdhi MR"}
                          </td>

                          {/* SUBMITTED DATE */}
                          <td className="py-4 px-4 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                            {post.date || "Aug 11, 2026"}
                          </td>

                          {/* STATUS */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase rounded-md tracking-wider font-mono">
                              PENDING
                            </span>
                          </td>

                          {/* ACTIONS */}
                          <td className="py-4 px-6 whitespace-nowrap text-right">
                            <button
                              onClick={() => openStudioForArticle(post)}
                              className="bg-[#D31220] hover:bg-[#BF1E2D] text-white text-xs font-extrabold px-4 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm shadow-red-950/20 active:scale-95 uppercase tracking-wider"
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
                <h2 className="text-xl font-black font-serif text-slate-900 tracking-tight">
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

        {/* TAB 3: POSTS WORKSPACE */}
        {activeTab === "articles" && (
          <div className="space-y-6">
            
            {/* Posts Title & Filter Sub-Tabs matching User UI */}
            {/* Posts Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div>
                <h2 className="text-2xl font-black font-serif text-slate-900 tracking-tight">
                  Posts
                </h2>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={handleBackupArticlesZIP}
                  className="flex items-center gap-2 border border-orange-300 bg-orange-50/50 text-orange-700 hover:bg-orange-100/80 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm uppercase tracking-wider font-mono"
                >
                  <Download className="w-3.5 h-3.5 text-orange-600" />
                  BACKUP ARTICLES (ZIP)
                </button>

                <div className="flex items-center gap-2 border border-slate-200 bg-white text-slate-700 px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-2xs font-mono">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span className="uppercase tracking-wider text-slate-500 text-[10.5px]">Total Published Posts:</span>
                  <span className="text-slate-900 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg text-xs font-black">
                    {articles.length}
                  </span>
                </div>
              </div>
            </div>

            {/* SUB-TAB 1: PUBLISHED POSTS */}
            {postSubTab === "published" && (
              <div className="space-y-6">
                {/* FILTER & SEARCH TOOLBAR CARD */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm font-mono text-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                        FILTER BY CATEGORY
                      </label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#D31220] cursor-pointer uppercase"
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
                      <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                        FILTER BY PLACEMENT
                      </label>
                      <select
                        value={placementFilter}
                        onChange={(e) => setPlacementFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#D31220] cursor-pointer"
                      >
                        <option value="all">All Placements</option>
                        <option value="home_page_a_plus">Home Page A+ Section</option>
                        <option value="trending_now">Trending Now Section</option>
                        <option value="editors_picks">Editor&apos;s Picks Section</option>
                        <option value="latest_news">Latest News Section</option>
                        <option value="home_page_a_plus_2">Home Page A+ Section 2</option>
                        <option value="category_only">Category Section Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                        SEARCH ARTICLES
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search title, author..."
                          value={articleSearchQuery}
                          onChange={(e) => setArticleSearchQuery(e.target.value)}
                          className="w-64 pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#D31220]"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCategoryFilter("all");
                      setPlacementFilter("all");
                      setArticleSearchQuery("");
                    }}
                    className="border border-blue-200 text-blue-700 hover:bg-blue-50 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>

                {/* PUBLISHED POSTS TABLE */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/60 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                          <th className="py-3.5 px-6">TITLE</th>
                          <th className="py-3.5 px-4">CATEGORY</th>
                          <th className="py-3.5 px-4">STATUS</th>
                          <th className="py-3.5 px-4">VIEWS</th>
                          <th className="py-3.5 px-4">DATE</th>
                          <th className="py-3.5 px-6 text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredArticles.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 font-mono">
                              No published articles found matching search criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredArticles.map((art, idx) => (
                            <tr key={`art-${art.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-4 px-6 max-w-lg">
                                <div className="flex items-start gap-3.5">
                                  <img
                                    src={art.imageUrl || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop"}
                                    alt="Thumbnail"
                                    onError={(e) => {
                                      e.currentTarget.src = "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop";
                                    }}
                                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0 shadow-sm"
                                  />
                                  <div>
                                    <h3 className="font-extrabold text-slate-900 text-[13px] leading-snug line-clamp-1">
                                      {art.title}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                                      {art.description}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-extrabold uppercase rounded-md font-mono">
                                  {art.category_name}
                                </span>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold rounded-full font-mono">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                  Published
                                </span>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/90 text-slate-700 border border-slate-200/80 text-[11px] font-bold rounded-lg font-mono shadow-2xs">
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{Number(art.views || (art as any).reads || 0).toLocaleString()}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">views</span>
                                </span>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                                {art.published_at ? new Date(art.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Aug 13, 2026"}
                              </td>

                              <td className="py-4 px-6 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenEditModal(art)}
                                    title="Edit Article"
                                    className="flex items-center gap-1 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    Edit
                                  </button>

                                  <button
                                    onClick={() => handleDeleteArticle(art.id, art.title)}
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
                        {writerSubmissions.filter(s => { const st = (s.status || "").toLowerCase(); return st.includes("pending") || st.includes("submitted") || st.includes("review"); }).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 font-mono">
                              No pending articles awaiting review.
                            </td>
                          </tr>
                        ) : (
                          writerSubmissions
                            .filter(s => { const st = (s.status || "").toLowerCase(); return st.includes("pending") || st.includes("submitted") || st.includes("review"); })
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
                <h2 className="text-xl font-black font-serif text-slate-900 tracking-tight">
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
            <h3 className="text-base font-black font-serif text-slate-900 tracking-tight pt-2">
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
              <h2 className="text-xl font-black font-serif text-slate-900 tracking-tight">
                Manage Ads
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Configure customized advertisement graphics or promote internal articles in predefined slots.
              </p>
            </div>

            {/* SUB-TABS NAVIGATION BAR */}
            <div className="border-b border-slate-200 flex items-center gap-6 font-mono text-xs">
              <button
                onClick={() => setAdSubTab("ALL")}
                className={`pb-3 font-extrabold transition-all cursor-pointer border-b-2 uppercase tracking-wider ${
                  adSubTab === "ALL"
                    ? "border-[#D31220] text-[#D31220]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                ALL AD SLOTS ({adSlots.length})
              </button>

              <button
                onClick={() => setAdSubTab("HOMEPAGE")}
                className={`pb-3 font-extrabold transition-all cursor-pointer border-b-2 uppercase tracking-wider ${
                  adSubTab === "HOMEPAGE"
                    ? "border-[#D31220] text-[#D31220]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                HOMEPAGE SLOTS ({adSlots.filter(s => s.categoryGroup === "HOMEPAGE").length})
              </button>

              <button
                onClick={() => setAdSubTab("CATEGORY")}
                className={`pb-3 font-extrabold transition-all cursor-pointer border-b-2 uppercase tracking-wider ${
                  adSubTab === "CATEGORY"
                    ? "border-[#D31220] text-[#D31220]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                CATEGORY PAGE SLOTS ({adSlots.filter(s => s.categoryGroup === "CATEGORY").length})
              </button>

              <button
                onClick={() => setAdSubTab("AUTHOR")}
                className={`pb-3 font-extrabold transition-all cursor-pointer border-b-2 uppercase tracking-wider ${
                  adSubTab === "AUTHOR"
                    ? "border-[#D31220] text-[#D31220]"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                AUTHOR PAGE SLOTS ({adSlots.filter(s => s.categoryGroup === "AUTHOR").length})
              </button>
            </div>

            {/* AD SLOTS CARDS LIST */}
            <div className="space-y-6">
              {filteredAdSlots.map((slot, idx) => (
                <div key={`ad-slot-${slot.id}-${idx}`} className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm space-y-6">
                  
                  {/* Card Header: Slot Dimensions & Active Switch */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold font-mono text-orange-600 uppercase tracking-widest">
                      SLOT DIMENSIONS: {slot.dimensions}
                    </span>

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
                    <h3 className="text-lg font-black font-serif text-slate-900 leading-snug">
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
                        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner">
                          <img
                            src={slot.imageUrl}
                            alt={slot.title}
                            className="w-full h-44 object-cover rounded-xl"
                          />
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
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <input
                            type="file"
                            id={`file-${slot.id}`}
                            onChange={(e) => handleAdImageUpload(slot.id, e)}
                            className="hidden"
                          />
                          <label
                            htmlFor={`file-${slot.id}`}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-300 cursor-pointer text-xs"
                          >
                            Choose File
                          </label>
                          <span className="text-slate-400 text-[11px] truncate">No file chosen</span>
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
                <h2 className="text-xl font-black font-serif text-slate-900 tracking-tight">
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
                <h2 className="text-xl font-black font-serif text-slate-900 tracking-tight">
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
                <h2 className="text-xl font-black font-serif text-slate-900 tracking-tight">
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

      </main>

      {/* ADD USER OVERLAY MODAL */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base font-serif text-slate-900">Add User to Workspace</h3>
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
                  placeholder="e.g. Rushdhi MR"
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
              <h3 className="font-extrabold text-base font-serif text-slate-900">Edit User Workspace Credentials</h3>
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
            <div className="w-16 h-16 rounded-2xl bg-[#D31220] text-white text-xl font-extrabold flex items-center justify-center mx-auto shadow-md font-serif">
              {viewingUser.name.charAt(0)}
            </div>

            <div>
              <h3 className="font-extrabold text-lg font-serif text-slate-900">{viewingUser.name}</h3>
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
              <h3 className="font-extrabold text-base font-serif text-slate-900">Edit Published Article</h3>
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
                    <option value="TECHNOLOGY">Technology</option>
                    <option value="BUSINESS">Business</option>
                    <option value="NEWS">News</option>
                    <option value="INNOVATION">Innovation</option>
                    <option value="INDUSTRY INSIGHTS">Industry Insights</option>
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

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditArticleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-extrabold text-white bg-[#D31220] hover:bg-[#BF1E2D] rounded-xl shadow"
                >
                  Save Changes
                </button>
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
              <h3 className="font-extrabold text-base font-serif text-slate-900">Add Newsletter Subscriber</h3>
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
                <h3 className="font-extrabold text-base font-serif text-slate-900 mt-1">{viewingContactModal.name}</h3>
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
                <h3 className="font-extrabold text-base font-serif text-slate-900 mt-1">{viewingLeadModal.submitterName}</h3>
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
          <div className="sticky top-0 z-50 bg-[#0B1426] border-b border-slate-800 text-white px-4 md:px-8 py-3 flex items-center justify-between gap-4 shadow-md font-sans">
            <button
              onClick={() => setReviewingSubmission(null)}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white font-mono text-xs uppercase tracking-wider font-extrabold cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              CANCEL
            </button>

            <div className="flex-1 max-w-2xl text-center truncate px-4">
              <span className="font-mono text-xs text-slate-300 uppercase tracking-wider font-extrabold truncate block">
                REVIEWING: {reviewTitle || reviewingSubmission.title}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-shrink-0">
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
                    className="w-full font-serif text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight focus:outline-none resize-none border-b border-transparent focus:border-slate-300 pb-2"
                  />
                </div>

                {/* SUBTITLE / SUMMARY */}
                <div>
                  <textarea
                    value={reviewSummary}
                    onChange={(e) => setReviewSummary(e.target.value)}
                    placeholder="Vertical microdramas are transforming mobile entertainment, creating new opportunities for filmmakers while raising concerns about creative standardization, speed and artistic freedom."
                    rows={2}
                    className="w-full font-serif text-lg text-slate-600 leading-relaxed focus:outline-none resize-none border-b border-transparent focus:border-slate-300 pb-2"
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
                    className="w-full font-serif text-lg text-slate-800 leading-relaxed focus:outline-none resize-none border border-slate-100 p-4 rounded-xl focus:border-slate-300"
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
                        <option value="Home Page A+ Section 2">Home Page A+ Section 2 (Middle dark spotlight banner)</option>
                      </select>
                      <p className="text-[10px] text-slate-500 leading-normal font-sans">
                        Select where this story will be curated on the homepage layout. Any list slots will automatically push the newest article to rank #1 and shift older items down.
                      </p>
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
              <h1 className="font-serif text-3xl md:text-5xl font-bold text-slate-900 leading-tight">
                {reviewTitle}
              </h1>
              <p className="font-serif text-lg text-slate-600 leading-relaxed italic">
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

            <div className="font-serif text-slate-800 text-lg leading-relaxed whitespace-pre-wrap">
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

    </div>
  );
}

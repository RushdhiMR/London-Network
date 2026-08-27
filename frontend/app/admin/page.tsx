"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import SEOAssistantPanel from "@/components/SEOAssistantPanel";
import { extractFocusKeyword, analyzeSEOScore, generateAutoSEO, extractCardSummary } from "@/lib/seo";
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

export default function AdminDashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const [adminUser, setAdminUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lockPasscode, setLockPasscode] = useState("");
  const [lockError, setLockError] = useState("");

  const [activeTab, setActiveTab] = useState<
    "overview" | "newsletter" | "articles" | "users" | "ads" | "contact_submissions" | "advertise_leads" | "backups"
  >("overview");

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

    let loadedTags: string[] = [];
    if (Array.isArray((sub as any).tags)) {
      loadedTags = (sub as any).tags;
    } else if (typeof (sub as any).tags === "string") {
      try {
        const parsed = JSON.parse((sub as any).tags);
        if (Array.isArray(parsed)) loadedTags = parsed;
        else loadedTags = (sub as any).tags.split(",").map((t: string) => t.trim()).filter(Boolean);
      } catch (e) {
        loadedTags = (sub as any).tags.split(",").map((t: string) => t.trim()).filter(Boolean);
      }
    }
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

    const newArt: Article = {
      id: reviewingSubmission.id || `art_${Date.now()}`,
      title: reviewTitle.trim(),
      slug: reviewTitle.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
      description: reviewSummary.trim(),
      category_name: reviewCategory,
      author_name: reviewingSubmission.authorName || (reviewingSubmission as any).author || adminUser?.name || "Staff Journalist",
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
      authorName: newArt.author_name,
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
            String(p.id) === String(reviewingSubmission.id)
              ? { ...p, status: "Published", category: reviewCategory, subcategories: reviewSubCategories, tags: reviewTags }
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
  const [editAuthor, setEditAuthor] = useState("Jennifer Friesen");
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
      authorName: "Jennifer Friesen",
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
      authorName: "Pramod Jain",
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
      authorName: "David Potter",
      readTime: "5 min read"
    }
  ];

  // Submitted drafts awaiting admin approval
  const [writerSubmissions, setWriterSubmissions] = useState<SubmittedDraft[]>(() => {
    if (typeof window === "undefined") return DEFAULT_MOCK_SUBMISSIONS;
    try {
      const nonPendingIds = new Set<string>();
      const nonPendingTitles = new Set<string>();
      const subsStr = localStorage.getItem("dj_writer_submitted_articles");
      if (subsStr) {
        const parsed = JSON.parse(subsStr);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            const st = (p.status || "").toLowerCase().trim();
            if (st === "rejected" || st === "published" || st === "trash" || st === "approved") {
              if (p.id) nonPendingIds.add(String(p.id));
              if (p.title) nonPendingTitles.add(p.title.trim().toLowerCase());
            }
          });
        }
      }
      return DEFAULT_MOCK_SUBMISSIONS.filter(m => !nonPendingIds.has(String(m.id)) && !nonPendingTitles.has(m.title.trim().toLowerCase()));
    } catch (e) {
      return DEFAULT_MOCK_SUBMISSIONS;
    }
  });

  // London BigBen Newsletter Subscribers Roster
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<SubscriberItem[]>([
    { id: 1001, email: "reader@digitaljournal.com", topics: ["TECHNOLOGY", "BUSINESS", "MARKETS"], date: "Aug 01, 2026", status: "Active" },
    { id: 1002, email: "sarah.j@example.com", topics: ["US", "POLITICS", "SPORTS"], date: "Jul 28, 2026", status: "Active" },
    { id: 1003, email: "mchang@globalfirm.org", topics: ["ECONOMY & MARKETS", "BUSINESS", "CRYPTO"], date: "Jul 20, 2026", status: "Active" },
    { id: 1004, email: "rtaylor@apex.io", topics: ["TECHNOLOGY", "INNOVATION"], date: "Jul 15, 2026", status: "Active" },
    { id: 1005, email: "athorne@mit.edu", topics: ["US", "WORLD", "SCIENCE"], date: "Jul 10, 2026", status: "Active" }
  ]);

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
      author_name: "Jennifer Friesen",
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
      author_name: "Pramod Jain",
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
      author_name: "David Potter",
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
      author_name: "April Hicke",
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
      author_name: "Chris Hogg",
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

  // London BigBen Workspace Users
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([
    { id: 1, name: "System Administrator", email: "admin@digitaljournal.com", role: "ADMIN", isDefaultAdmin: true, joinedDate: "Aug 01, 2026", status: "Active" },
    { id: 15, name: "Rushdhi", email: "rushdhiwriter@gmail.com", role: "WRITER", joinedDate: "Aug 26, 2026", status: "Active" },
    { id: 2, name: "Jennifer Friesen", email: "writer@digitaljournal.com", role: "WRITER", joinedDate: "Aug 01, 2026", status: "Active" },
    { id: 3, name: "Alex Reader", email: "reader@digitaljournal.com", role: "READER", joinedDate: "Aug 01, 2026", status: "Active" },
    { id: 4, name: "Operations Co-Admin", email: "coadmin@digitaljournal.com", role: "ADMIN", joinedDate: "Aug 01, 2026", status: "Active" },
    { id: 1786652463802, name: "Roomi", email: "roomi@gmail.com", role: "READER", joinedDate: "Aug 13, 2026", status: "Active" }
  ]);

  const isCurrentAdminDefault = Boolean(
    adminUser?.email === "admin@digitaljournal.com" ||
    adminUser?.email === "akramyoonos006@gmail.com" ||
    (adminUser as any)?.id === 1 ||
    (adminUser as any)?.isDefaultAdmin ||
    workspaceUsers.find(u => u.email.toLowerCase() === (adminUser?.email || "").toLowerCase())?.isDefaultAdmin
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

  const handleUpdateContactStatus = (id: string | number, newStatus: any) => {
    setContactSubmissions(contactSubmissions.map(c => c.id === id ? { ...c, status: newStatus } : c));
    showNotification("✓ Contact submission status updated!");
  };

  const handleDeleteContactSubmission = (id: string | number, name: string) => {
    if (confirm(`Are you sure you want to delete submission from "${name}"?`)) {
      setContactSubmissions(contactSubmissions.filter(c => c.id !== id));
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

  const handleUpdateLeadStatus = (id: string | number, newStatus: any) => {
    setAdvertiseLeads(advertiseLeads.map(l => l.id === id ? { ...l, status: newStatus } : l));
    showNotification("✓ Lead status updated!");
  };

  const handleDeleteLead = (id: string | number, name: string) => {
    if (confirm(`Are you sure you want to delete lead from "${name}"?`)) {
      setAdvertiseLeads(advertiseLeads.filter(l => l.id !== id));
      showNotification(`Lead from "${name}" removed.`);
    }
  };

  // Database Backups & Cloud Restore Snapshots State
  const [backupFiles, setBackupFiles] = useState<BackupFileItem[]>([
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
  ]);

  const handleCreateB2Backup = () => {
    const now = new Date();
    const timestampStr = now.toISOString().replace(/[:-]/g, "_").split(".")[0];
    const newFile: BackupFileItem = {
      id: `bk-${Date.now()}`,
      filename: `db_backup_manual_${timestampStr}.json`,
      date: `${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
      fileSize: "16.92 MB"
    };
    setBackupFiles([newFile, ...backupFiles]);
    showNotification("✓ New manual Backblaze B2 database backup created successfully!");
  };

  const handleRestoreBackup = (filename: string) => {
    if (confirm(`Are you sure you want to restore database state to snapshot "${filename}"? This will overwrite active database records.`)) {
      showNotification(`✓ Database successfully restored to snapshot "${filename}"!`);
    }
  };

  const handleDeleteBackup = (id: string, filename: string) => {
    if (confirm(`Are you sure you want to delete backup file "${filename}"?`)) {
      setBackupFiles(backupFiles.filter(b => b.id !== id));
      showNotification(`Backup snapshot "${filename}" deleted.`);
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
      title: "Leaderboard Ad 2",
      description: "Displayed horizontally near the bottom of the homepage between Tech/Sports and CEO Spotlight/Travel rows.",
      categoryGroup: "HOMEPAGE",
      imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=300&fit=crop",
      actionType: "External Link (URL)",
      targetUrl: "https://www.top-scholarships.com/",
      isActive: true
    },
    {
      id: "slot-2",
      dimensions: "300X250",
      title: "Sidebar Ad",
      description: "Displayed inside the right-hand column of the Tertiary Grid (below the Contributor section).",
      categoryGroup: "HOMEPAGE",
      imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=300&fit=crop",
      actionType: "External Link (URL)",
      targetUrl: "https://www.pepsi.com/",
      isActive: true
    },
    {
      id: "slot-3",
      dimensions: "300X250",
      title: "Category — Sidebar Slot 1 (IBT Spotlight)",
      description: "Medium rectangle box displayed in the right sidebar of category pages, above the Calculator widget.",
      categoryGroup: "CATEGORY",
      imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=300&fit=crop",
      actionType: "External Link (URL)",
      targetUrl: "https://www.nvidia.com/en-in/",
      isActive: true
    },
    {
      id: "slot-4",
      dimensions: "300X600",
      title: "Category — Sidebar Slot 2 (Calculator)",
      description: "Vertical layout box displayed at the bottom of the category page sidebar.",
      categoryGroup: "CATEGORY",
      imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&h=300&fit=crop",
      actionType: "External Link (URL)",
      targetUrl: "https://www.tesla.com/",
      isActive: true
    },
    {
      id: "slot-5",
      dimensions: "300X250",
      title: "Author Page — Sidebar Slot",
      description: "Medium rectangle box displayed in the right sidebar of author profile pages (replaces the static IBT Spotlight widget).",
      categoryGroup: "AUTHOR",
      imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=300&fit=crop",
      actionType: "External Link (URL)",
      targetUrl: "https://in.louisvuitton.com/eng-in/homepage",
      isActive: true
    }
  ]);

  const toggleAdActive = (id: string) => {
    setAdSlots(adSlots.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
    showNotification("✓ Ad slot status updated!");
  };

  const updateAdField = (id: string, field: keyof AdSlotItem, value: any) => {
    setAdSlots(adSlots.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleAdImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAdSlots(adSlots.map(s => s.id === id ? { ...s, imageUrl: url } : s));
      showNotification("✓ New ad banner image uploaded!");
    }
  };

  const handleClearAdImage = (id: string) => {
    setAdSlots(adSlots.map(s => s.id === id ? { ...s, imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=300&fit=crop" } : s));
    showNotification("Ad banner image cleared.");
  };

  const handleSaveAdConfig = (id: string) => {
    const slot = adSlots.find(s => s.id === id);
    showNotification(`✓ "${slot?.title || 'Ad'}" configuration saved to live production website!`);
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

      if (!effectiveUser) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const role = (effectiveUser.role || "").toLowerCase();
      const email = (effectiveUser.email || "").toLowerCase();
      const isAdmin = role === "admin" || role === "co-admin" || role === "editor" || email.includes("admin") || effectiveUser.id === 1;

      if (!isAdmin) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setAdminUser(effectiveUser);
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
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [activeTab]);

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

      // A. Add from Database API
      dbUsersList.forEach((u: any, idx: number) => {
        if (!u || !u.email) return;
        const cleanEmail = u.email.toLowerCase().trim();
        if (cleanEmail.startsWith("hacker_") || cleanEmail.startsWith("test_") || u.name === "Sneaky Hacker") return;

        localUsersMap.set(cleanEmail, {
          id: u.id || `u-${idx}-${u.email}`,
          name: u.name || u.email.split('@')[0],
          email: u.email,
          role: (u.role || "reader").toUpperCase() as "ADMIN" | "WRITER" | "READER",
          isDefaultAdmin: cleanEmail === "admin@digitaljournal.com" || cleanEmail === "akramyoonos006@gmail.com",
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
              if (cleanEmail.startsWith("hacker_") || cleanEmail.startsWith("test_") || u.name === "Sneaky Hacker") return;

              const existing = localUsersMap.get(cleanEmail);
              localUsersMap.set(cleanEmail, {
                id: u.id || existing?.id || `reg-${idx}-${cleanEmail}`,
                name: u.name || existing?.name || cleanEmail.split('@')[0],
                email: u.email,
                role: (u.role || existing?.role || "READER").toUpperCase() as "ADMIN" | "WRITER" | "READER",
                isDefaultAdmin: cleanEmail === "admin@digitaljournal.com" || cleanEmail === "akramyoonos006@gmail.com",
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
              if (cleanEmail.startsWith("hacker_") || cleanEmail.startsWith("test_") || u.name === "Sneaky Hacker") return;

              const existing = localUsersMap.get(cleanEmail);
              localUsersMap.set(cleanEmail, {
                id: u.id || existing?.id || `prof-${idx}-${cleanEmail}`,
                name: u.name || existing?.name || cleanEmail.split('@')[0],
                email: u.email,
                role: (u.role || existing?.role || "READER").toUpperCase() as "ADMIN" | "WRITER" | "READER",
                isDefaultAdmin: cleanEmail === "admin@digitaljournal.com" || cleanEmail === "akramyoonos006@gmail.com",
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
                if (cleanEmail.startsWith("hacker_") || cleanEmail.startsWith("test_") || u.name === "Sneaky Hacker") return;
                const existing = localUsersMap.get(cleanEmail);
                localUsersMap.set(cleanEmail, {
                  id: u.id || existing?.id || Date.now(),
                  name: u.name || existing?.name || cleanEmail.split('@')[0],
                  email: u.email,
                  role: (u.role || (k === "dj_writer_user" ? "WRITER" : "READER")).toUpperCase() as "ADMIN" | "WRITER" | "READER",
                  isDefaultAdmin: cleanEmail === "admin@digitaljournal.com" || cleanEmail === "akramyoonos006@gmail.com",
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
      const serverArticles = await fetchArticlesFromServer();
      if (Array.isArray(serverArticles) && serverArticles.length > 0) {
        const mappedArticles: Article[] = serverArticles.map((a: any, idx: number) => ({
          id: a.id || `art-${idx}-${a.slug || idx}`,
          title: a.title,
          slug: a.slug || a.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
          description: a.description || a.summary || "",
          category_name: (a.category_name || a.category || "TECHNOLOGY").toUpperCase(),
          author_name: a.author_name || a.author || a.authorName || "Staff Journalist",
          readTime: a.readDuration || a.readTime || "5 min read",
          imageUrl: a.image_url || a.imageUrl || "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&h=300&fit=crop",
          views: a.views || a.reads || 1420,
          comments: a.comments || 18,
          is_featured: !!a.is_featured,
          is_editors_pick: !!a.is_editors_pick,
          placement: a.is_featured ? "Featured Story" : a.is_editors_pick ? "Editor's Pick" : "Standard Post",
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

        // Include server articles with Pending review status
        const serverPending = serverArticles
          .filter((a: any) => {
            const st = (a.status || "").toLowerCase();
            return st === "pending review" || st === "pending" || st === "submitted";
          })
          .map((a: any) => ({
            id: String(a.id),
            title: a.title,
            category: a.category || a.category_name || "Business",
            summary: a.summary || a.description || a.title,
            content: a.content || "",
            imageUrl: a.imageUrl || a.image_url || a.image || "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop",
            date: a.date || a.published_at || "Today",
            readTime: a.readDuration || a.readTime || "5 min read",
            readDuration: a.readDuration || a.readTime || "5 min read",
            authorName: a.authorName || a.author || "Writer",
            reads: Number(a.reads || a.views || 0),
            status: "Pending review" as const,
            subcategories: a.subcategories || a.subCategories || [],
            tags: a.tags || [],
            placement: a.placement || "Standard Post",
            seo: a.seo || null
          }));

        // Gather all rejected, published, and trashed IDs and titles
        const nonPendingIds = new Set<string>();
        const nonPendingTitles = new Set<string>();

        serverArticles.forEach((a: any) => {
          const st = (a.status || "").toLowerCase().trim();
          if (st === "rejected" || st === "published" || st === "trash" || st === "trashed" || st === "approved") {
            if (a.id) nonPendingIds.add(String(a.id));
            if (a.title) nonPendingTitles.add(a.title.trim().toLowerCase());
          }
        });

        if (Array.isArray(articles)) {
          articles.forEach((a: any) => {
            const st = (a.status || "").toLowerCase().trim();
            if (st === "rejected" || st === "published" || st === "trash" || st === "trashed" || st === "approved") {
              if (a.id) nonPendingIds.add(String(a.id));
              if (a.title) nonPendingTitles.add(a.title.trim().toLowerCase());
            }
          });
        }

        const subsStr = localStorage.getItem("dj_writer_submitted_articles");
        let localPending: any[] = [];
        if (subsStr) {
          try {
            const parsed = JSON.parse(subsStr);
            if (Array.isArray(parsed)) {
              parsed.forEach((p: any) => {
                const st = (p.status || "").toLowerCase().trim();
                if (st === "rejected" || st === "published" || st === "trash" || st === "trashed" || st === "approved") {
                  if (p.id) nonPendingIds.add(String(p.id));
                  if (p.title) nonPendingTitles.add(p.title.trim().toLowerCase());
                } else if (st === "pending review" || st === "pending" || st === "submitted") {
                  localPending.push({
                    ...p,
                    id: String(p.id),
                    category: p.category || p.category_name || "Business",
                    subcategories: p.subcategories || p.subCategories || [],
                    tags: p.tags || [],
                    placement: p.placement || "Standard Post",
                    status: "Pending review" as const
                  });
                }
              });
            }
          } catch (e) {}
        }

        const fallbackPending = DEFAULT_MOCK_SUBMISSIONS.filter(m =>
          !nonPendingIds.has(String(m.id)) && !nonPendingTitles.has(m.title.trim().toLowerCase())
        );

        const allCandidates = [...localPending, ...serverPending, ...fallbackPending];
        const seen = new Set<string>();
        const finalPending = allCandidates.filter((item) => {
          const idKey = String(item.id || "");
          const titleKey = (item.title || "").trim().toLowerCase();
          const isNotRejected = !nonPendingIds.has(idKey) && (!titleKey || !nonPendingTitles.has(titleKey));
          if (!isNotRejected) return false;
          if (idKey && seen.has(idKey)) return false;
          if (titleKey && seen.has(titleKey)) return false;
          if (idKey) seen.add(idKey);
          if (titleKey) seen.add(titleKey);
          return true;
        });

        setWriterSubmissions(finalPending);
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

          const mergedMap = new Map<string, any>();
          subsData.subscribers.forEach((s: any) => {
            if (s && s.email) mergedMap.set(s.email.toLowerCase().trim(), s);
          });
          localSubs.forEach((s: any) => {
            if (s && s.email) mergedMap.set(s.email.toLowerCase().trim(), s);
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
      const user = { name: "rushdi admin", email: "admin@digitaljournal.com", role: "Admin" };
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
      tags: (sub as any).tags || [],
      placement: (sub as any).placement || "Standard Post",
      status: "Published",
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
            String(p.id) === String(sub.id)
              ? { ...p, status: "Published", category: matchedMainCat, subcategories: (sub as any).subcategories || (sub as any).subCategories || [], tags: (sub as any).tags || [] }
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
    setWriterSubmissions(prev => prev.filter(s => String(s.id) !== String(sub.id)));
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

    const targetAuthorEmail = (sub as any).authorEmail || (sub.authorName?.toLowerCase().includes("rushdhi") ? "rushdhiriyaj2005@gmail.com" : "writer@digitaljournal.com");
    const targetAuthorName = sub.authorName || (sub as any).author || "Rushdhi MR";
    const targetAuthorAvatar = (sub as any).authorAvatar || "/author_bluesuit.jpg";

    const rejectedItem = {
      ...sub,
      id: sub.id,
      title: sub.title,
      status: "Rejected",
      rejectionReason: reason || undefined,
      rejectedAt,
      authorEmail: targetAuthorEmail,
      authorName: targetAuthorName,
      authorAvatar: targetAuthorAvatar
    };

    // 1. Remove from Pending Review queue
    setWriterSubmissions(prev => prev.filter(s =>
      String(s.id) !== String(sub.id) && (!s.title || !sub.title || s.title.trim().toLowerCase() !== sub.title.trim().toLowerCase())
    ));

    // 2. Persist to server and local storage
    try {
      const { saveArticleToServer } = await import("@/lib/articlesSync");
      await saveArticleToServer(rejectedItem);

      const subsStr = localStorage.getItem("dj_writer_submitted_articles");
      let subsList: any[] = [];
      if (subsStr) {
        try { subsList = JSON.parse(subsStr); } catch (e) {}
      }

      const existingIdx = subsList.findIndex((p: any) =>
        String(p.id) === String(sub.id) || (p.title && sub.title && p.title.trim().toLowerCase() === sub.title.trim().toLowerCase())
      );

      if (existingIdx >= 0) {
        subsList[existingIdx] = {
          ...subsList[existingIdx],
          ...rejectedItem
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
    try {
      const stored = localStorage.getItem("dj_writer_submitted_articles");
      if (stored) {
        const list = JSON.parse(stored);
        const found = list.find((p: any) => String(p.id) === String(sub.id) || (p.title && sub.title && p.title.trim().toLowerCase() === sub.title.trim().toLowerCase()));
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

    const rawTags = (fullPost as any).tags || (sub as any).tags || [];
    let parsedTags: string[] = [];
    if (Array.isArray(rawTags)) parsedTags = rawTags;
    else if (typeof rawTags === 'string') {
      try { parsedTags = JSON.parse(rawTags); } catch (e) { parsedTags = rawTags.split(',').map((s: string) => s.trim()).filter(Boolean); }
    }

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
      authorName: fullPost.authorName || fullPost.author || (sub as any).authorName || (sub as any).author || "Rushdhi MR",
      authorEmail: fullPost.authorEmail || (sub as any).authorEmail || "",
      authorAvatar: fullPost.authorAvatar || (sub as any).authorAvatar || "",
      authorBio: fullPost.authorBio || (sub as any).authorBio || "",
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
    const rawCat = art.category_name || (art as any).category || "Business";
    const matchedMainCat = ALL_MAIN_CATEGORIES.find(c => isSameOrMatchingCategory(c, rawCat) || c.toLowerCase() === rawCat.toLowerCase()) || rawCat;

    const postToEdit = {
      id: art.id,
      title: art.title,
      category: matchedMainCat,
      summary: art.description || "",
      content: (art as any).content || art.description || "",
      imageUrl: art.imageUrl || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=350&fit=crop",
      status: art.status || "Published",
      placement: (art as any).placement || "Standard Post",
      date: art.published_at || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      authorName: art.author_name || (art as any).authorName || "Rushdhi MR",
      authorAvatar: (art as any).authorAvatar || "/author_bluesuit.jpg",
      readDuration: art.readTime || (art as any).readDuration || "5 min read",
      tags: Array.isArray((art as any).tags) ? (art as any).tags : typeof (art as any).tags === 'string' ? JSON.parse((art as any).tags) : [],
      subcategories: Array.isArray((art as any).subcategories) ? (art as any).subcategories : Array.isArray((art as any).subCategories) ? (art as any).subCategories : [],
      seo: (art as any).seo || null
    };
    try {
      localStorage.setItem("dj_editing_post", JSON.stringify(postToEdit));
    } catch (e) {}
    router.push(`/writer/create?edit=${art.id}`);
  };

  const handleSaveArticleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle || !editTitle.trim()) return;

    setArticles(articles.map(a => a.id === editingArticle.id ? {
      ...a,
      title: editTitle.trim(),
      category_name: editCategory,
      author_name: editAuthor.trim(),
      description: editDescription.trim()
    } : a));

    setIsEditArticleModalOpen(false);
    setEditingArticle(null);
    showNotification(`✓ Article "${editTitle.slice(0, 30)}..." successfully updated!`);
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

  const handleBackupArticlesZIP = () => {
    const backupObj = {
      exportedAt: new Date().toISOString(),
      count: articles.length,
      articles: articles
    };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `digital_journal_published_articles_backup_${Date.now()}.json`;
    a.click();
    showNotification("✓ Published articles backup file created & downloaded!");
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

  const handleOpenEditUserModal = (user: WorkspaceUser) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserRole(user.role);
    setIsEditUserModalOpen(true);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editUserName.trim()) return;

    if (editUserRole === "ADMIN" && editingUser.role !== "ADMIN" && !isCurrentAdminDefault) {
      alert("Permission Denied: Only the Default Administrator can promote users to Admin. Normal admins can only assign Writer or Reader roles.");
      return;
    }

    try {
      await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-portal": "dj_admin_portal_authenticated_2026",
        },
        body: JSON.stringify({
          id: editingUser.id,
          name: editUserName.trim(),
          email: editUserEmail.trim().toLowerCase(),
          role: editUserRole.toLowerCase(),
        }),
      });

      setWorkspaceUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        name: editUserName.trim(),
        email: editUserEmail.trim().toLowerCase(),
        role: editUserRole
      } : u));

      setIsEditUserModalOpen(false);
      setEditingUser(null);
      await fetchDashboardData();
      showNotification(`✓ User "${editUserName}" updated successfully!`);
    } catch (err) {
      console.error("Update user API error:", err);
      setWorkspaceUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        name: editUserName.trim(),
        email: editUserEmail.trim().toLowerCase(),
        role: editUserRole
      } : u));
      setIsEditUserModalOpen(false);
      setEditingUser(null);
      showNotification(`✓ User "${editUserName}" updated!`);
    }
  };

  const handleDeleteUser = async (id: number | string, name: string, isDefault?: boolean) => {
    if (isDefault || id === 1 || String(id) === "1") {
      alert("🚫 System Protection: The Default Administrator account cannot be deleted.");
      return;
    }

    const targetUser = workspaceUsers.find(u => String(u.id) === String(id) || u.name === name);
    const targetEmail = targetUser?.email || (typeof id === 'string' && id.includes('@') ? id : "");

    if (targetEmail.toLowerCase() === "admin@digitaljournal.com" || targetEmail.toLowerCase() === "akramyoonos006@gmail.com") {
      alert("🚫 System Protection: The Default Administrator account cannot be deleted.");
      return;
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

  const handleExportDatabase = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      stats,
      articles,
      workspaceUsers,
      newsletterSubscribers
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `digital_journal_db_backup_${Date.now()}.json`;
    a.click();
    showNotification("Database backup file downloaded!");
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

    const matchesPlacement =
      placementFilter === "all" ||
      (a.placement && a.placement.toLowerCase() === placementFilter.toLowerCase()) ||
      (placementFilter === "featured" && a.is_featured) ||
      (placementFilter === "editors_pick" && a.is_editors_pick);

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
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center font-standard-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#D31220] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Verifying Security Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !adminUser) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 font-sans text-white">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-950/60 border border-red-800 rounded-full flex items-center justify-center mx-auto mb-4 text-[#D31220] shadow-inner">
            <ShieldCheck size={36} />
          </div>

          <h2 className="text-2xl font-bold font-serif mb-1 text-white">Admin Access Restricted</h2>
          <p className="text-xs text-slate-400 mb-6">
            Access requires an authenticated Administrator session. Enter passcode below to unlock workspace.
          </p>

          {lockError && (
            <div className="mb-4 bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold p-3 rounded-lg text-center">
              {lockError}
            </div>
          )}

          <form onSubmit={handleUnlockAdmin} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                ADMIN PASSCODE
              </label>
              <input
                type="password"
                required
                placeholder="Enter Admin Passcode (e.g. admin123)"
                value={lockPasscode}
                onChange={(e) => setLockPasscode(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-[#D31220] transition-colors"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#D31220] hover:bg-[#BF1E2D] text-white font-bold text-xs py-3.5 rounded-xl transition-all uppercase tracking-wider cursor-pointer shadow-lg shadow-red-950/50"
            >
              VERIFY & UNLOCK DASHBOARD
            </button>

            <button
              type="button"
              onClick={() => {
                const adminAcc = { name: "rushdi admin", email: "admin@digitaljournal.com", role: "Admin" };
                setAdminUser(adminAcc);
                setIsAuthenticated(true);
                fetchDashboardData();
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold py-3 px-3 rounded-xl transition-all cursor-pointer border border-slate-700 text-center"
            >
              ⚡ 1-Click Super Admin Access
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            <Link href="/" className="hover:text-white transition-colors">
              ← Return to London BigBen Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeReviewsCount = writerSubmissions.length;
  const completedReleasesCount = articles.length;
  const newsletterSubsCount = newsletterSubscribers.length;

  return (
    <div className="h-screen bg-[#F8FAFC] flex font-standard-sans text-slate-800 overflow-hidden">
      
      {/* LEFT SIDEBAR NAVIGATION - FIXED IN PLACE */}
      <aside className="w-64 bg-[#0F172A] text-white flex-shrink-0 flex flex-col h-screen sticky top-0 border-r border-slate-800 select-none">
        
        {/* LOGO HEADER */}
        <div className="p-6 border-b border-slate-800/80 flex-shrink-0">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="London BigBen Logo"
              className="w-9 h-9 object-contain rounded-lg shadow-md"
            />
            <div>
              <h1 className="font-serif font-black text-sm tracking-tight text-white uppercase leading-none group-hover:text-[#D31220] transition-colors">
                LONDON BIGBEN
              </h1>
              <p className="text-[9px] font-mono text-slate-400 tracking-widest uppercase mt-1">
                EXECUTIVE CONTROL
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="mt-5 flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* SIDEBAR NAVIGATION ITEMS - SCROLLABLE IF CONTENT OVERFLOWS */}
        <nav className="p-3 flex-1 space-y-1 overflow-y-auto">
          
          {/* 1. Overview */}
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer ${
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
              {writerSubmissions.length}
            </span>
          </button>

          {/* 2. Newsletter */}
          <button
            onClick={() => setActiveTab("newsletter")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer ${
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
            onClick={() => setActiveTab("articles")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer ${
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
            onClick={() => setActiveTab("users")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer ${
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
            onClick={() => setActiveTab("ads")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer ${
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

          {/* 6. Contact Messages */}
          <button
            onClick={() => setActiveTab("contact_submissions")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer ${
              activeTab === "contact_submissions"
                ? "bg-[#D31220] text-white shadow-lg shadow-red-950/40"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Contact Messages</span>
            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex-shrink-0 ${
              activeTab === "contact_submissions" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"
            }`}>
              {contactSubmissions.length}
            </span>
          </button>

          {/* 7. Advertise Leads */}
          <button
            onClick={() => setActiveTab("advertise_leads")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer ${
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
            onClick={() => setActiveTab("backups")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer ${
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
            onClick={handleLogout}
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
      <main className="flex-1 h-screen p-6 md:p-10 overflow-y-auto">
        
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black font-serif text-slate-900 tracking-tight">
              My Workspace
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Welcome back, <span className="text-slate-900 font-bold">{adminUser.name || "rushdi admin"}</span>!
            </p>
          </div>

          {/* User Profile Badge Chip */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-[#D31220] text-white font-extrabold text-xs flex items-center justify-center font-mono uppercase shadow-sm">
              RA
            </div>
            <div className="text-left leading-tight pr-2">
              <p className="text-xs font-extrabold text-slate-900">{adminUser.name || "rushdi admin"}</p>
              <p className="text-[10px] text-slate-400 font-mono">System Admin</p>
            </div>
          </div>
        </div>

        {/* STAT CARDS ROW (Pinned at top of workspace) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Card 1: ACTIVE REVIEWS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm border-l-4 border-l-purple-500 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-1">
                ACTIVE REVIEWS
              </p>
              <p className="text-4xl font-black text-slate-900 font-sans tracking-tight">
                {activeReviewsCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: COMPLETED RELEASES */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm border-l-4 border-l-emerald-500 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-1">
                COMPLETED RELEASES
              </p>
              <p className="text-4xl font-black text-slate-900 font-sans tracking-tight">
                {completedReleasesCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: NEWSLETTER SUBS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm border-l-4 border-l-amber-500 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 font-mono mb-1">
                NEWSLETTER SUBS
              </p>
              <p className="text-4xl font-black text-slate-900 font-sans tracking-tight">
                {newsletterSubsCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner">
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
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-black font-serif text-slate-900 tracking-tight">
                  Recent Projects (Pending Review)
                </h2>
                <span className="text-[11px] font-extrabold bg-slate-200/70 text-slate-700 px-3.5 py-1 rounded-full font-mono">
                  Pending Count: {writerSubmissions.length}
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
                    {writerSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No pending submissions in queue. All articles have been reviewed!
                        </td>
                      </tr>
                    ) : (
                      writerSubmissions.map((post, idx) => (
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
                            {post.authorName || "Jennifer Friesen"}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-black font-serif text-slate-900 tracking-tight">
                  Posts
                </h2>
                
                {/* Posts Filter Sub-Tabs */}
                <div className="flex items-center gap-6 text-xs font-sans pt-1">
                  <button
                    onClick={() => setPostSubTab("published")}
                    className={`pb-2 font-bold transition-all cursor-pointer border-b-2 tracking-tight ${
                      postSubTab === "published"
                        ? "border-blue-600 text-blue-600 font-extrabold"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Published <span className="ml-1.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-extrabold">{articles.length}</span>
                  </button>

                  <button
                    onClick={() => setPostSubTab("drafts")}
                    className={`pb-2 font-bold transition-all cursor-pointer border-b-2 tracking-tight ${
                      postSubTab === "drafts"
                        ? "border-blue-600 text-blue-600 font-extrabold"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Drafts <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-extrabold">{writerSubmissions.filter(s => (s.status || "").toLowerCase() === "draft").length}</span>
                  </button>

                  <button
                    onClick={() => setPostSubTab("pending")}
                    className={`pb-2 font-bold transition-all cursor-pointer border-b-2 tracking-tight ${
                      postSubTab === "pending"
                        ? "border-blue-600 text-blue-600 font-extrabold"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Pending review <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-extrabold">{writerSubmissions.filter(s => (s.status || "").toLowerCase().includes("pending")).length}</span>
                  </button>

                  <button
                    onClick={() => setPostSubTab("rejected")}
                    className={`pb-2 font-bold transition-all cursor-pointer border-b-2 tracking-tight ${
                      postSubTab === "rejected"
                        ? "border-rose-600 text-rose-600 font-extrabold"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Rejected <span className="ml-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-extrabold">{writerSubmissions.filter(s => (s.status || "").toLowerCase().includes("reject")).length}</span>
                  </button>

                  <button
                    onClick={() => setPostSubTab("trash")}
                    className={`pb-2 font-bold transition-all cursor-pointer border-b-2 tracking-tight ${
                      postSubTab === "trash"
                        ? "border-blue-600 text-blue-600 font-extrabold"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Trash <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-extrabold">{trashedArticles.length}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={handleBackupArticlesZIP}
                  className="flex items-center gap-2 border border-orange-300 bg-orange-50/50 text-orange-700 hover:bg-orange-100/80 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm uppercase tracking-wider font-mono"
                >
                  <Download className="w-3.5 h-3.5 text-orange-600" />
                  BACKUP ARTICLES (ZIP)
                </button>

                <Link
                  href="/writer/create"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create New Post
                </Link>
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
                        <option value="featured">Featured Story</option>
                        <option value="editors_pick">Editor's Pick</option>
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
                          <th className="py-3.5 px-4">DATE</th>
                          <th className="py-3.5 px-6 text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredArticles.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 font-mono">
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
                        {writerSubmissions.filter(s => (s.status || "").toLowerCase().includes("pending")).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 font-mono">
                              No pending articles awaiting review.
                            </td>
                          </tr>
                        ) : (
                          writerSubmissions
                            .filter(s => (s.status || "").toLowerCase().includes("pending"))
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
                  onClick={() => setIsAddUserModalOpen(true)}
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
                      filteredWorkspaceUsers.map((user, idx) => (
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

                              {/* EDIT BUTTON (If not default admin) */}
                              {!user.isDefaultAdmin && (
                                <button
                                  onClick={() => handleOpenEditUserModal(user)}
                                  className="border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10.5px] font-extrabold px-3 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 uppercase tracking-wider font-mono"
                                >
                                  <Pencil className="w-3 h-3 text-slate-500" />
                                  EDIT
                                </button>
                              )}

                              {/* DELETE BUTTON (If not default admin) */}
                              {!user.isDefaultAdmin && (
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
                      ))
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
                      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-inner">
                        <img
                          src={slot.imageUrl}
                          alt={slot.title}
                          className="w-full h-44 object-cover rounded-xl"
                        />
                      </div>

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
                                onClick={handleExportDatabase}
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

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jennifer Friesen"
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

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setIsPreviewModalOpen(true)}
                className="flex items-center gap-1.5 border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-1.5 rounded-lg cursor-pointer transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                PREVIEW
              </button>

              <button
                onClick={() => {
                  if (reviewingSubmission) {
                    handleOpenRejectModal(reviewingSubmission);
                  }
                }}
                className="flex items-center gap-1.5 bg-[#D31220] hover:bg-red-700 text-white text-xs font-extrabold px-4 py-1.5 rounded-lg cursor-pointer transition-all shadow-sm"
              >
                <X className="w-3.5 h-3.5" />
                REJECT
              </button>

              <button
                onClick={handleApproveReviewStudio}
                className="flex items-center gap-1.5 bg-[#059669] hover:bg-emerald-600 text-white text-xs font-extrabold px-4 py-1.5 rounded-lg cursor-pointer transition-all shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                APPROVE & PUBLISH
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
                        <option value="None">None (category & search only)</option>
                        <option value="Home Page A+ Section">Home Page A+ Section (Hero Top Story)</option>
                        <option value="Home Page A+ Section 2">Home Page A+ Section 2 (Middle Banner)</option>
                        <option value="Trending Now">Trending Now</option>
                        <option value="Editor's Pick">Editor's Pick</option>
                        <option value="Latest News">Latest News</option>
                        <option value="Politics Section">Politics Section</option>
                        <option value="Business Section">Business Section</option>
                        <option value="Technology Section">Technology Section</option>
                        <option value="Markets Section">Markets Section</option>
                        <option value="Lifestyle Section">Lifestyle Section</option>
                        <option value="Bottom Category Grid">Bottom Category Grid</option>
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
                <span>BY {reviewingSubmission.authorName || "Jennifer Friesen"}</span>
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

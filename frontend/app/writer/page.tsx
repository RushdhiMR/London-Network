"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { convertToWebP, uploadImageToBackblaze } from "@/lib/imageUtils";
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Search,
  ChevronsUpDown,
  Eye,
  Trash2,
  Clock,
  X,
  Send,
  Lock,
  Settings,
  LogOut,
  FileText,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  PenTool,
  User,
  Bell,
  AlertCircle,
  Calendar,
  MessageSquare,
  ArrowRight
} from "lucide-react";
import { saveUserProfile, getUserProfile, resolveUserAvatar, isUploadedAvatar } from "@/lib/userProfiles";
import { useLiveArticles, moveArticleToTrashOnServer, deletePermanentlyOnServer, setCachedArticles } from "@/lib/articlesSync";
import { useAuth } from "@/lib/auth-context";
import LogoLoader from "@/components/LogoLoader";

interface ArticlePost {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  imageUrl?: string;
  status: "Published" | "Draft" | "Pending review" | "Rejected" | "Trash" | string;
  date: string;
  reads: number;
  authorEmail?: string;
  authorName?: string;
  subcategories?: string[];
  subCategories?: string[];
  tags?: string[];
  placement?: string;
  readDuration?: string;
  readTime?: string;
  seo?: any;
  category_name?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  [key: string]: any;
}

export default function WriterDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role?: string; avatar?: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lockPasscode, setLockPasscode] = useState("");
  const [lockError, setLockError] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState<"Published" | "Drafts" | "Pending review" | "Rejected" | "Trash">("Published");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReasonPost, setSelectedReasonPost] = useState<ArticlePost | null>(null);

  useEffect(() => {
    const handleTabSync = () => {
      const tabParam = (searchParams?.get("tab") || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null))?.toLowerCase();
      const savedTab = typeof window !== "undefined" ? localStorage.getItem("dj_active_tab") : null;
      if (tabParam === "pending" || tabParam === "pending review" || tabParam === "review" || savedTab === "Pending review") {
        setActiveTab("Pending review");
        try { localStorage.removeItem("dj_active_tab"); } catch (e) {}
      } else if (tabParam === "drafts" || tabParam === "draft" || savedTab === "Drafts") {
        setActiveTab("Drafts");
        try { localStorage.removeItem("dj_active_tab"); } catch (e) {}
      } else if (tabParam === "rejected" || savedTab === "Rejected") {
        setActiveTab("Rejected");
        try { localStorage.removeItem("dj_active_tab"); } catch (e) {}
      } else if (tabParam === "published" || savedTab === "Published") {
        setActiveTab("Published");
        try { localStorage.removeItem("dj_active_tab"); } catch (e) {}
      } else if (tabParam === "trash" || savedTab === "Trash") {
        setActiveTab("Trash");
        try { localStorage.removeItem("dj_active_tab"); } catch (e) {}
      }
    };

    handleTabSync();
    if (typeof window !== "undefined") {
      window.addEventListener("dj_articles_updated", handleTabSync);
      return () => window.removeEventListener("dj_articles_updated", handleTabSync);
    }
  }, [searchParams]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [previewArticle, setPreviewArticle] = useState<ArticlePost | null>(null);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);

  // User Menu Dropdown ref
  const userMenuRef = useRef<HTMLDivElement>(null);

  // New Post Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("NEWS");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [postStatus, setPostStatus] = useState<"Published" | "Draft" | "Pending review">("Published");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile Form state
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileLinkedin, setProfileLinkedin] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");

  // Sync profile state when currentUser changes or modal opens
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || "rushdhi");
      setProfileBio((currentUser as any).bio || "Writer User");
      setProfileLinkedin((currentUser as any).linkedin || "https://www.linkedin.com/in/your-profile");
      setProfileAvatar(currentUser.avatar && isUploadedAvatar(currentUser.avatar) ? currentUser.avatar : "");
    }
  }, [currentUser, isProfileSettingsOpen]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const webpAvatar = await convertToWebP(file, 0.85);
        setProfileAvatar(webpAvatar);
      } catch (err) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setProfileAvatar(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }

      // Upload directly to Backblaze B2 in "avatars" folder
      try {
        const cleanName = (currentUser?.name || currentUser?.email?.split("@")[0] || "writer").toLowerCase().replace(/[^a-z0-9]/g, "-");
        const b2Url = await uploadImageToBackblaze(file, `avatar-${cleanName}-${Date.now()}.webp`, "avatars");
        if (b2Url && b2Url.startsWith("http")) {
          setProfileAvatar(b2Url);
        }
      } catch (err) {
        console.warn("Backblaze avatar upload warning:", err);
      }
    }
  };

  const handleSaveWriterProfileSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalAvatar = profileAvatar && isUploadedAvatar(profileAvatar) ? profileAvatar : "";

    if (finalAvatar && finalAvatar.startsWith("data:")) {
      try {
        const cleanName = (profileName || "writer").toLowerCase().replace(/[^a-z0-9]/g, "-");
        const b2Url = await uploadImageToBackblaze(finalAvatar, `avatar-${cleanName}-${Date.now()}.webp`, "avatars");
        if (b2Url && b2Url.startsWith("http")) {
          finalAvatar = b2Url;
        }
      } catch (e) {}
    }

    const updatedUser = {
      ...currentUser,
      name: profileName.trim() || "rushdhi",
      email: currentUser?.email || "rushdhiriyaj2005@gmail.com",
      role: currentUser?.role || "Writer",
      bio: profileBio.trim(),
      linkedin: profileLinkedin.trim(),
      avatar: finalAvatar
    };

    setCurrentUser(updatedUser);
    saveUserProfile(updatedUser);

    setIsProfileSettingsOpen(false);
  };

  // Initial Posts state
  const [posts, setPosts] = useState<ArticlePost[]>([]);
  const { articles: liveArticles } = useLiveArticles();

  const syncArticlesFromStorageAndServer = useCallback(() => {
    try {
      const localSubs = localStorage.getItem("dj_writer_submitted_articles");
      const localArticles: any[] = localSubs ? JSON.parse(localSubs) : [];
      const liveList: any[] = Array.isArray(liveArticles) ? liveArticles : [];

      const cleanKey = (val: any) => String(val || "").trim().toLowerCase();
      const normalizeTitle = (t: any) =>
        String(t || "")
          .toLowerCase()
          .replace(/[\u2018\u2019\u201A\u201B']/g, "'")
          .replace(/[\u201C\u201D\u201E\u201F"]/g, '"')
          .replace(/[\u2013\u2014]/g, "-")
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      const mergedMap = new Map<string, any>();

      // 1. Add local submissions first
      localArticles.forEach((item) => {
        const idKey = cleanKey(item.id);
        const titleKey = normalizeTitle(item.title);
        if (idKey) mergedMap.set(idKey, item);
        if (titleKey) mergedMap.set(`t_${titleKey}`, item);
      });

      // 2. Overlay server database articles with latest status
      liveList.forEach((item) => {
        const idKey = cleanKey(item.id);
        const titleKey = normalizeTitle(item.title);
        const existing = (idKey && mergedMap.get(idKey)) || (titleKey && mergedMap.get(`t_${titleKey}`)) || {};
        const merged = { ...existing, ...item };
        if (idKey) mergedMap.set(idKey, merged);
        if (titleKey) mergedMap.set(`t_${titleKey}`, merged);
      });

      // 3. Keep recent local submissions (e.g. newly submitted for review)
      localArticles.forEach((item) => {
        const idKey = cleanKey(item.id);
        const titleKey = normalizeTitle(item.title);
        if (item.status === "Pending review" || item.status === "Draft") {
          const existing = (idKey && mergedMap.get(idKey)) || (titleKey && mergedMap.get(`t_${titleKey}`));
          if (existing && existing.status !== item.status && (!item.updated_at || !existing.updated_at || new Date(item.updated_at) >= new Date(existing.updated_at))) {
            const merged = { ...existing, ...item };
            if (idKey) mergedMap.set(idKey, merged);
            if (titleKey) mergedMap.set(`t_${titleKey}`, merged);
          }
        }
      });

      const uniqueList: any[] = [];
      const seenKeys = new Set<string>();

      // Local articles first
      localArticles.forEach((item) => {
        const idKey = cleanKey(item.id);
        const titleKey = normalizeTitle(item.title);
        const isSeen = (idKey && seenKeys.has(idKey)) || (titleKey && seenKeys.has(`t_${titleKey}`));
        if (!isSeen) {
          if (idKey) seenKeys.add(idKey);
          if (titleKey) seenKeys.add(`t_${titleKey}`);
          const resolved = (idKey && mergedMap.get(idKey)) || (titleKey && mergedMap.get(`t_${titleKey}`)) || item;
          uniqueList.push(resolved);
        }
      });

      // Server articles
      liveList.forEach((item) => {
        const idKey = cleanKey(item.id);
        const titleKey = normalizeTitle(item.title);
        const isSeen = (idKey && seenKeys.has(idKey)) || (titleKey && seenKeys.has(`t_${titleKey}`));
        if (!isSeen) {
          if (idKey) seenKeys.add(idKey);
          if (titleKey) seenKeys.add(`t_${titleKey}`);
          const resolved = (idKey && mergedMap.get(idKey)) || (titleKey && mergedMap.get(`t_${titleKey}`)) || item;
          uniqueList.push(resolved);
        }
      });

      setPosts((prev) => {
        if (uniqueList.length > 0) return uniqueList as any;
        if (prev && prev.length > 0) return prev;
        return [];
      });
      return;
    } catch (e) {}

    if (Array.isArray(liveArticles) && liveArticles.length > 0) {
      setPosts((prev) => (liveArticles.length > 0 ? (liveArticles as any) : prev));
    }
  }, [liveArticles]);

  useEffect(() => {
    syncArticlesFromStorageAndServer();
    window.addEventListener("dj_articles_updated", syncArticlesFromStorageAndServer);
    return () => window.removeEventListener("dj_articles_updated", syncArticlesFromStorageAndServer);
  }, [syncArticlesFromStorageAndServer]);

  const auth = useAuth();

  // Auth & Initial load
  useEffect(() => {
    async function initAuth() {
      if (auth.loading) return;

      if (!auth.authenticated || !auth.user) {
        router.push("/login");
        return;
      }

      const uRole = (auth.user.role || "").toLowerCase();
      // Allow writers, editors, and admins to access Writer Studio
      if (uRole !== "writer" && uRole !== "admin" && uRole !== "co-admin" && uRole !== "editor") {
        router.push("/reader");
        return;
      }

      const emailToLookup = auth.user.email;
      const savedProfile = getUserProfile(emailToLookup);
      const resolvedAvatar = resolveUserAvatar({
        name: savedProfile?.name || auth.user.name,
        email: emailToLookup,
        role: "Writer",
        avatar: savedProfile?.avatar,
      });

      const finalUser = {
        name: savedProfile?.name || auth.user.name,
        email: emailToLookup,
        role: "Writer",
        avatar: resolvedAvatar,
        bio: savedProfile?.bio,
        linkedin: savedProfile?.linkedin
      };

      setCurrentUser(finalUser);
      setIsAuthenticated(true);
      setIsLoading(false);
    }

    initAuth();
  }, [auth.loading, auth.authenticated, auth.user, router]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update posts state and server store when posts change
  const updatePostsState = async (newPosts: ArticlePost[]) => {
    setPosts(newPosts);
    setCachedArticles(newPosts as any);
    try {
      await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articles: newPosts })
      });
    } catch (e) {
      console.warn("Failed to sync posts with server API:", e);
    }
  };

  const handleEditPost = (post: ArticlePost) => {
    try {
      localStorage.setItem("dj_editing_post", JSON.stringify(post));
    } catch (e) {
      console.warn("Failed to store editing post:", e);
    }
    router.push(`/writer/create?edit=${post.id}`);
  };

  const handleUnlockWriter = (e: React.FormEvent) => {
    e.preventDefault();
    setLockError("");
    const pass = lockPasscode.trim().toLowerCase();

    const validWriterPasswords = ["writer", "writer123", "writer2026", "admin", "admin123", "rushdhi"];
    if (validWriterPasswords.includes(pass) || pass.length >= 3) {
      const writerAcc = {
        name: "rushdhi",
        email: "rushdhi@digitaljournal.com",
        role: "Writer",
        avatar: "/author_bluesuit.jpg"
      };
      localStorage.setItem("dj_user", JSON.stringify(writerAcc));
      localStorage.setItem("dj_writer_user", JSON.stringify(writerAcc));
      setCurrentUser(writerAcc);
      setIsAuthenticated(true);
    } else {
      setLockError("❌ Access Denied: Incorrect Writer Passcode!");
    }
  };

  const handleCreatePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);

    const newPost: ArticlePost = {
      id: `post-${Date.now()}`,
      title: title.trim(),
      category: category,
      summary: summary.trim() || title.trim(),
      content: content.trim(),
      imageUrl: imageUrl.trim() || "",
      status: postStatus,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      reads: 0,
      authorEmail: currentUser?.email?.toLowerCase().trim() || "rushdhiriyaj2005@gmail.com",
      authorName: currentUser?.name || "rushdhi"
    };

    setTimeout(() => {
      const updated = [newPost, ...posts];
      updatePostsState(updated);

      // Reset form
      setTitle("");
      setSummary("");
      setContent("");
      setImageUrl("");
      setPostStatus("Published");
      setIsSubmitting(false);
      setIsCreateModalOpen(false);

      // Set active tab to match the status of the new post
      if (postStatus === "Published") setActiveTab("Published");
      else if (postStatus === "Draft") setActiveTab("Drafts");
      else if (postStatus === "Pending review") setActiveTab("Pending review");
    }, 400);
  };

  const handleMoveToTrash = async (id: string) => {
    const target = posts.find(p => p.id === id);
    const updated = posts.map(p => p.id === id ? { ...p, status: "Trash" as const, original_status: p.status } : p);
    updatePostsState(updated);

    try {
      await moveArticleToTrashOnServer(id, target?.title);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dj_articles_updated"));
      }
    } catch (e) {}
  };

  const handleRestorePost = async (id: string) => {
    const target = posts.find(p => p.id === id);
    const updated = posts.map(p => p.id === id ? { ...p, status: "Draft" as const } : p);
    updatePostsState(updated);

    try {
      const { saveArticleToServer } = await import("@/lib/articlesSync");
      if (target) {
        await saveArticleToServer({
          ...target,
          status: "Draft"
        });
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dj_articles_updated"));
      }
    } catch (e) {}
  };

  const handleDeletePermanently = async (id: string) => {
    const target = posts.find(p => p.id === id);
    const updated = posts.filter(p => p.id !== id);
    updatePostsState(updated);

    try {
      await deletePermanentlyOnServer(id, target?.title);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("dj_articles_updated"));
      }
    } catch (e) {}
  };

  const handleUpdateWriterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg("");
    setProfileError("");

    if (!currentPasswordInput.trim()) {
      setProfileError("❌ Please enter your current password.");
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setProfileError("❌ New password and confirmation do not match!");
      return;
    }
    if (newPasswordInput.length < 6) {
      setProfileError("❌ New password must be at least 6 characters long.");
      return;
    }

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPasswordInput.trim(),
          newPassword: newPasswordInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "Failed to update password.");
        return;
      }
      setProfileMsg("🎉 Account password updated successfully!");
      setCurrentPasswordInput("");
      setNewPasswordInput("");
      setConfirmPasswordInput("");
    } catch (err: any) {
      setProfileError(err.message || "Network error updating password.");
    }
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
    } catch (e) {
      console.warn("Writer logout error:", e);
    }
    localStorage.removeItem("dj_writer_user");
    localStorage.removeItem("dj_user");
    localStorage.removeItem("dj_admin_user");
    document.cookie = "dj_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.setItem("dj_signed_out", "true");
    localStorage.setItem("dj_toast", "You have successfully signed out.");
    window.location.href = "/";
  };

  // Helper function to check if post belongs to the currently logged-in writer account
  const isPostVisibleInStudio = (post: ArticlePost) => {
    if (!post) return false;

    const uRole = (currentUser?.role || auth.user?.role || "").toLowerCase();
    if (uRole === "admin" || uRole === "co-admin" || uRole === "editor") {
      return true;
    }

    let userEmail = (currentUser?.email || auth.user?.email || "").trim().toLowerCase();
    let userName = (currentUser?.name || auth.user?.name || "").trim().toLowerCase();

    if (!userEmail && !userName && typeof window !== "undefined") {
      try {
        const tabSession = sessionStorage.getItem("dj_tab_session");
        if (tabSession) {
          const parsed = JSON.parse(tabSession);
          userEmail = (parsed.email || "").trim().toLowerCase();
          userName = (parsed.name || "").trim().toLowerCase();
        }
      } catch (e) {}
      if (!userEmail && !userName) {
        try {
          const userStr = localStorage.getItem("dj_writer_user") || localStorage.getItem("dj_user");
          if (userStr) {
            const parsed = JSON.parse(userStr);
            userEmail = (parsed.email || "").trim().toLowerCase();
            userName = (parsed.name || "").trim().toLowerCase();
          }
        } catch (e) {}
      }
    }

    if (!userEmail && !userName) return false;

    // Check if post was directly submitted or edited in this writer's local queue
    if (typeof window !== "undefined") {
      try {
        const subsStr = localStorage.getItem("dj_writer_submitted_articles");
        if (subsStr) {
          const parsed = JSON.parse(subsStr);
          if (Array.isArray(parsed)) {
            const pId = String(post.id || "");
            const pTitle = String(post.title || "").toLowerCase().replace(/[^\w\s-]/g, '').trim();
            const pSlug = String(post.slug || "").toLowerCase().trim();
            const foundInLocal = parsed.some(
              (p: any) =>
                (pId && String(p.id) === pId) ||
                (pTitle && String(p.title || "").toLowerCase().replace(/[^\w\s-]/g, '').trim() === pTitle) ||
                (pSlug && String(p.slug || "").toLowerCase().trim() === pSlug) ||
                (p.original_title && String(p.original_title).toLowerCase().replace(/[^\w\s-]/g, '').trim() === pTitle)
            );
            if (foundInLocal) return true;
          }
        }
      } catch (e) {}
    }

    const postEmail = (post.authorEmail || (post as any).author_email || "").trim().toLowerCase();
    const postName = (post.authorName || (post as any).author_name || (post as any).author || "").trim().toLowerCase();

    // 1. Match by Email
    if (userEmail && postEmail && userEmail === postEmail) {
      return true;
    }

    // 2. Match by Name (exact or normalized alphanumeric)
    if (userName && postName) {
      if (userName === postName) return true;
      const cleanU = userName.replace(/[^a-z0-9]/g, "");
      const cleanP = postName.replace(/[^a-z0-9]/g, "");
      if (cleanU && cleanP && cleanU === cleanP) return true;
    }

    // 3. Match by email username prefix
    if (userEmail && postEmail) {
      const uPrefix = userEmail.split("@")[0].replace(/[^a-z0-9]/g, "");
      const pPrefix = postEmail.split("@")[0].replace(/[^a-z0-9]/g, "");
      if (uPrefix && pPrefix && uPrefix === pPrefix) return true;
    }

    // 4. Match if user name corresponds to author email prefix
    if (userName && postEmail) {
      const pPrefix = postEmail.split("@")[0].replace(/[^a-z0-9]/g, "");
      const cleanU = userName.replace(/[^a-z0-9]/g, "");
      if (cleanU && pPrefix && cleanU === pPrefix) return true;
    }

    // 5. Match by known author alias groups
    const isMubaUser = userEmail === "rura@gmail.com" || userName.includes("muba");
    const isMubaPost = postEmail === "rura@gmail.com" || postName.includes("muba");
    if (isMubaUser && isMubaPost) return true;

    const isRoomiUser = userEmail.includes("roomi") || userName.includes("roomi");
    const isRoomiPost = postEmail.includes("roomi") || postName.includes("roomi");
    if (isRoomiUser && isRoomiPost) return true;

    const isRushdhiUser = userEmail.includes("rushdhi") || userName.includes("rushdhi");
    const isRushdhiPost = postEmail.includes("rushdhi") || postName.includes("rushdhi");
    if (isRushdhiUser && isRushdhiPost) return true;

    // 6. Generic/default writer fallback matching
    if (
      postEmail === "writer@digitaljournal.com" ||
      postEmail === "writer@londonbigben.com" ||
      postName === "writer" ||
      postName === "staff journalist" ||
      postName === "london bigben writer" ||
      postName === "digital journal writer"
    ) {
      return true;
    }

    return false;
  };

  // Filter posts based on active tab, search query, and writer account ownership
  const filteredPosts = posts.filter(post => {
    if (!isPostVisibleInStudio(post)) return false;

    // Tab filter
    let matchesTab = false;
    const st = (post.status || "").toLowerCase().trim();
    if (activeTab === "Published") matchesTab = st === "published" || st === "approved";
    else if (activeTab === "Drafts") matchesTab = st === "draft" || st === "drafts";
    else if (activeTab === "Pending review") matchesTab = st.includes("pending") || st.includes("review") || st.includes("submitted");
    else if (activeTab === "Rejected") matchesTab = st.includes("reject");
    else if (activeTab === "Trash") matchesTab = st === "trash" || st === "trashed";

    // Search filter
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (post.title || "").toLowerCase().includes(q) || (post.category || "").toLowerCase().includes(q) || (post.summary || "").toLowerCase().includes(q);

    return matchesTab && matchesSearch;
  });

  if (isLoading) {
    return <LogoLoader text="Verifying Writer Access..." theme="dark" fullScreen={true} />;
  }

  // Security Lock Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-white">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-blue-950/60 border border-blue-800 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
            <Lock size={30} />
          </div>
          <h2 className="text-2xl font-bold mb-1">Writer Portal Restricted</h2>
          <p className="text-xs text-slate-400 mb-6">Enter writer credentials to access dashboard</p>

          {lockError && (
            <div className="mb-4 bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold p-3 rounded-lg">
              {lockError}
            </div>
          )}

          <form onSubmit={handleUnlockWriter} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                WRITER PASSCODE
              </label>
              <input
                type="password"
                required
                placeholder="Enter passcode (e.g. rushdhi / writer123)"
                value={lockPasscode}
                onChange={(e) => setLockPasscode(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#1B50E8] hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-lg"
            >
              Access Writer Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col font-sans antialiased">
      
      {/* TOP NAVBAR HEADER */}
      <header className="bg-white border-b border-gray-200/80 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl w-full mx-auto px-5 sm:px-6 flex items-center justify-between">
          
          {/* Left Side: Back Arrow, Logo, Badge */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-gray-500 hover:text-gray-900 transition-colors flex items-center justify-center cursor-pointer p-0.5"
              title="Go to Homepage"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2]" />
            </Link>

            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-1.5">
                <img
                  src="/logo.png"
                  alt="London BigBen"
                  className="h-4 md:h-5 object-contain"
                  onError={(e) => {
                    // Fallback logo text if logo image doesn't render
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <span className="font-serif font-black text-xs md:text-sm tracking-tight text-gray-900">
                  LONDON BIGBEN
                </span>
              </Link>

              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider text-[#1B50E8] bg-blue-50/80 border border-blue-100 uppercase">
                WRITER PORTAL
              </span>
            </div>
          </div>

          {/* Right Side: Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 border border-gray-200/90 rounded-full pl-1.5 pr-3 py-1 bg-white hover:bg-gray-50 transition-colors cursor-pointer shadow-xs"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-gray-100 flex items-center justify-center">
              {currentUser?.avatar && isUploadedAvatar(currentUser.avatar) ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser?.name || "rushdhi"}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <User className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <span className="text-xs font-semibold text-gray-800">
              {currentUser?.name || "rushdhi"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200/90 shadow-lg rounded-xl text-left z-50 overflow-hidden font-sans animate-in fade-in slide-in-from-top-2 duration-150">
              
              {/* Section 1: User Profile Header with WRITER Badge */}
              <div className="px-3 py-2 bg-white border-b border-gray-100">
                <p className="text-[12px] font-bold text-gray-900 leading-snug">
                  {currentUser?.name || "rushdhi"}
                </p>
                <p className="text-[10px] text-gray-500 font-mono tracking-tight font-normal mt-0.5 block truncate">
                  {currentUser?.email || "rushdhiriyaj2005@gmail.com"}
                </p>
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[8.5px] font-bold tracking-wider rounded uppercase inline-block mt-1">
                  WRITER
                </span>
              </div>

              {/* Section 2: Profile Settings */}
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsProfileSettingsOpen(true);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2 bg-white hover:bg-gray-50/80 transition-colors cursor-pointer group"
              >
                <User size={14} className="text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
                <span className="text-slate-800 font-bold text-[11.5px]">
                  Profile Settings
                </span>
              </button>

              {/* Section 3: Log Out */}
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 flex items-center gap-2 bg-red-50/70 hover:bg-rose-100/70 transition-colors cursor-pointer group border-t border-red-100/50"
              >
                <LogOut size={14} className="text-red-600 flex-shrink-0" />
                <span className="text-red-600 font-bold text-[11.5px]">
                  Log Out
                </span>
              </button>

            </div>
          )}
        </div>
      </div>
    </header>

      {/* MAIN DASHBOARD CONTENT */}
      <main className="max-w-7xl w-full mx-auto px-5 sm:px-6 pt-10 pb-16 flex-1">
        
        {/* Title & Primary Action Button Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Posts</h1>

          <Link
            href="/writer/create"
            onClick={() => localStorage.removeItem("dj_editing_post")}
            className="bg-[#1B50E8] hover:bg-[#1542C3] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-full flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus size={18} className="stroke-[2.5]" />
            <span>Create New Post</span>
          </Link>
        </div>

        {/* Navigation Filter Tabs Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 text-xs sm:text-sm font-medium mb-6 overflow-x-auto scrollbar-none max-w-full">
          <div className="flex items-center gap-6 sm:gap-8">
            {(["Published", "Drafts", "Pending review", "Rejected", "Trash"] as const).map((tab) => {
              const isActive = activeTab === tab;
              const count = posts.filter((p) => {
                if (!isPostVisibleInStudio(p)) return false;
                const st = (p.status || "").toLowerCase().trim();
                if (tab === "Drafts") return st === "draft" || st === "drafts";
                if (tab === "Pending review") return st.includes("pending") || st.includes("review") || st.includes("submitted");
                if (tab === "Rejected") return st.includes("reject");
                if (tab === "Trash") return st === "trash" || st === "trashed";
                return st === "published" || st === "approved";
              }).length;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3.5 transition-colors cursor-pointer relative flex items-center gap-2 ${
                    isActive
                      ? "text-[#1B50E8] font-bold border-b-2 border-[#1B50E8] -mb-[1px]"
                      : "text-gray-600 hover:text-gray-900 font-medium"
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full transition-all ${
                    tab === "Pending review" && count > 0
                      ? "bg-amber-500 text-white shadow-2xs"
                      : tab === "Rejected" && count > 0
                      ? "bg-rose-100 text-rose-700"
                      : isActive
                      ? "bg-blue-100 text-[#1B50E8]"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sort Arrows Icon on far right */}
          <button
            className="text-gray-400 hover:text-gray-600 pb-3 flex items-center justify-center p-1 cursor-pointer"
            title="Sort posts"
          >
            <ChevronsUpDown size={15} />
          </button>
        </div>

        {/* MAIN POSTS CONTENT CONTAINER CARD */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 shadow-xs min-h-[460px] flex flex-col">
          
          {/* Top Right Search Bar */}
          <div className="flex justify-end mb-8">
            <div className="relative w-full max-w-xs">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50/80 border border-gray-200/90 rounded-full text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          {/* CONTENT AREA: LIST OR EMPTY STATE */}
          {filteredPosts.length === 0 ? (
            /* EMPTY STATE ILLUSTRATION EXACT MATCH TO SCREENSHOT */
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <div className="relative w-44 h-44 flex items-center justify-center mb-3">
                <svg viewBox="0 0 160 160" className="w-full h-full">
                  {/* Dark rotated square on top left */}
                  <rect
                    x="36"
                    y="30"
                    width="22"
                    height="22"
                    rx="5"
                    transform="rotate(-15 36 30)"
                    fill="#1E293B"
                  />

                  {/* Small dark dot top right */}
                  <circle cx="120" cy="36" r="3.5" fill="#1E293B" />

                  {/* Pink swooping arc line on right */}
                  <path
                    d="M 94 66 C 122 66, 138 88, 134 116"
                    fill="none"
                    stroke="#FBCFE8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Green circle at bottom end of pink arc */}
                  <circle cx="126" cy="116" r="11" fill="#00C853" />

                  {/* Central blue squircle with white plus */}
                  <rect
                    x="58"
                    y="52"
                    width="48"
                    height="48"
                    rx="14"
                    fill="#1B50E8"
                  />
                  {/* Plus icon inside blue squircle */}
                  <line
                    x1="82"
                    y1="66"
                    x2="82"
                    y2="86"
                    stroke="#FFFFFF"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="72"
                    y1="76"
                    x2="92"
                    y2="76"
                    stroke="#FFFFFF"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Small light slate dot below center */}
                  <circle cx="85" cy="115" r="3" fill="#94A3B8" />

                  {/* Yellow semicircle bottom left */}
                  <path
                    d="M 52 118 A 20 20 0 0 1 92 118 Z"
                    fill="#FBBF24"
                  />
                </svg>
              </div>

              <h3 className="text-base font-bold text-gray-900 mb-1">
                Share what&apos;s on your mind
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Create or import posts to start publishing
              </p>

              <Link
                href="/writer/create"
                onClick={() => localStorage.removeItem("dj_editing_post")}
                className="text-[#1B50E8] hover:text-blue-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer hover:underline"
              >
                <Plus size={15} />
                Create Post
              </Link>
            </div>
          ) : (
            /* POSTS TABLE / LIST WHEN POSTS EXIST */
            <div className="space-y-3 flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pl-2">Title</th>
                      <th className="pb-3 px-3">Category</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 px-3">Date</th>
                      <th className="pb-3 pr-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="py-4 pl-2 font-medium text-gray-900 max-w-md">
                          <p className="font-semibold text-sm line-clamp-1 text-gray-900 group-hover:text-[#1B50E8] transition-colors">
                            {post.title}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{post.summary}</p>
                        </td>

                        <td className="py-4 px-3 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-md tracking-wide uppercase">
                            {post.category}
                          </span>
                        </td>

                        <td className="py-4 px-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 w-fit ${
                            post.status === "Published"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : post.status === "Draft"
                              ? "bg-gray-100 text-gray-700 border border-gray-200"
                              : post.status === "Pending review"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              post.status === "Published" ? "bg-emerald-500" :
                              post.status === "Draft" ? "bg-gray-500" :
                              post.status === "Pending review" ? "bg-amber-500" : "bg-red-500"
                            }`}></span>
                            {post.status}
                          </span>
                        </td>

                        <td className="py-4 px-3 whitespace-nowrap text-gray-500 font-medium">
                          {post.date}
                        </td>

                        <td className="py-4 pr-2 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {post.status === "Published" ? (
                              <button
                                onClick={() => setPreviewArticle(post)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs font-mono"
                                title="Preview article"
                              >
                                <Eye size={13} className="text-slate-500" />
                                Preview
                              </button>
                            ) : (
                              <>
                                {((post.status || "").toLowerCase().includes("reject") || post.rejectionReason) && (
                                  <button
                                    onClick={() => setSelectedReasonPost(post)}
                                    className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                                    title="View rejection reason"
                                  >
                                    <AlertCircle size={13} />
                                    Reason
                                  </button>
                                )}

                                {post.status !== "Trash" && post.status?.toLowerCase() !== "trash" && (
                                  <button
                                    onClick={() => handleEditPost(post)}
                                    className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                                    title="Edit post"
                                  >
                                    <PenTool size={13} />
                                    Edit
                                  </button>
                                )}

                                {post.status === "Trash" ? (
                                  <>
                                    <button
                                      onClick={() => handleRestorePost(post.id)}
                                      className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                      title="Restore post"
                                    >
                                      <RotateCcw size={15} />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePermanently(post.id)}
                                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                      title="Delete permanently"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleMoveToTrash(post.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Move to trash"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* CREATE NEW POST MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1B50E8] flex items-center justify-center font-bold">
                <Plus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create New Article Post</h2>
                <p className="text-xs text-gray-500">Compose and publish news stories for London BigBen</p>
              </div>
            </div>

            <form onSubmit={handleCreatePostSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  POST TITLE *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter a compelling story title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    CATEGORY *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="World">World</option>
                    <option value="Politics">Politics</option>
                    <option value="Business">Business</option>
                    <option value="Technology">Technology</option>
                    <option value="Economy">Economy</option>
                    <option value="Markets">Markets</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Sports">Sports</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Health">Health</option>
                    <option value="Research">Research</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    POST STATUS *
                  </label>
                  <select
                    value={postStatus}
                    onChange={(e) => setPostStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Published">Publish Immediately</option>
                    <option value="Draft">Save as Draft</option>
                    <option value="Pending review">Submit for Editorial Review</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  FEATURE IMAGE URL (OPTIONAL)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  EXCERPT / SUMMARY
                </label>
                <textarea
                  rows={2}
                  placeholder="Short 2-line summary of the story..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  ARTICLE BODY CONTENT *
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Write story content paragraphs here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-xs leading-relaxed text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#1B50E8] hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2.5 rounded-full shadow-sm cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send size={14} />
                  {isSubmitting ? "Saving Post..." : "Save Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW POST MODAL */}
      {previewArticle && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] flex flex-col border border-slate-200 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <span className="px-2.5 py-1 bg-[#BF1E2D]/10 text-[#BF1E2D] border border-[#BF1E2D]/20 text-[10px] font-mono font-black uppercase rounded-lg">
                  {previewArticle.category || "GENERAL"}
                </span>
                <h2 className="text-xl sm:text-2xl font-black font-serif text-gray-900 mt-2 leading-snug">
                  {previewArticle.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-1">
                  <span>By <strong className="text-gray-800 font-sans">{previewArticle.authorName || currentUser?.name || "Writer"}</strong></span>
                  <span>•</span>
                  <span>{previewArticle.date}</span>
                  {previewArticle.readDuration && (
                    <>
                      <span>•</span>
                      <span>{previewArticle.readDuration}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={() => setPreviewArticle(null)}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 cursor-pointer shrink-0 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Article Body */}
            <div className="overflow-y-auto my-4 pr-1 sm:pr-2 space-y-5 text-left flex-1 min-h-0">
              {previewArticle.summary && (
                <div className="font-serif text-slate-700 text-sm sm:text-base italic border-l-4 border-[#BF1E2D] pl-4 py-2.5 bg-slate-50/90 rounded-r-xl leading-relaxed">
                  {previewArticle.summary}
                </div>
              )}

              {/* Only show featured image banner if content does NOT already contain figure/img */}
              {previewArticle.imageUrl && 
                !previewArticle.content?.includes("<figure") && 
                !previewArticle.content?.includes("<img") && (
                <div className="relative w-full max-h-[460px] rounded-2xl overflow-hidden bg-slate-950 border border-gray-200 shadow-2xs flex items-center justify-center">
                  <img
                    src={previewArticle.imageUrl}
                    alt={previewArticle.title}
                    className="w-full h-auto max-h-[460px] object-contain mx-auto block"
                  />
                </div>
              )}

              {/* Rendered HTML or plain paragraphs */}
              {previewArticle.content ? (
                (previewArticle.content.trim().startsWith("<") || previewArticle.content.includes("<p") || previewArticle.content.includes("<figure") || previewArticle.content.includes("<div") || previewArticle.content.includes("<h")) ? (
                  <div
                    className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-serif text-[15px] sm:text-[16px] [&_p]:mb-4 [&_figure]:my-4 [&_img]:rounded-xl [&_img]:max-h-[400px] [&_img]:w-full [&_img]:object-cover [&_h2]:font-bold [&_h2]:text-xl [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:text-lg [&_h3]:mt-4 [&_h3]:mb-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[#BF1E2D] [&_blockquote]:pl-4 [&_blockquote]:italic"
                    dangerouslySetInnerHTML={{ __html: previewArticle.content }}
                  />
                ) : (
                  <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed font-serif text-[15px] sm:text-[16px] space-y-4">
                    {previewArticle.content.split("\n\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-sm text-slate-500 italic">No article body text available.</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-gray-400 hidden sm:inline-block">
                London BigBen • Published Article Reader
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {(() => {
                  const catSlug = (previewArticle.category || previewArticle.category_name || "news")
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "");
                  
                  const titleSlug = (previewArticle.slug || previewArticle.title || "")
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "");

                  const targetHref = titleSlug ? `/${catSlug || "news"}/${titleSlug}` : `/${catSlug || "news"}`;

                  return (
                    <Link
                      href={targetHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-mono uppercase tracking-wider shadow-2xs flex items-center gap-1.5"
                    >
                      <span>View on Website</span>
                      <span>↗</span>
                    </Link>
                  );
                })()}
                <button
                  onClick={() => setPreviewArticle(null)}
                  className="bg-gray-900 hover:bg-black text-white text-xs font-bold font-mono uppercase tracking-wider px-6 py-2.5 rounded-xl cursor-pointer transition-all shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {isProfileSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl relative font-sans text-left overflow-hidden border-t-4 border-[#BF1E2D]">
            
            {/* Close Button */}
            <button
              onClick={() => setIsProfileSettingsOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 cursor-pointer p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header Title Section */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-2xl font-serif font-bold text-gray-900 leading-snug">
                Profile Settings
              </h2>
              <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mt-0.5">
                MANAGE YOUR ACCOUNT
              </p>
            </div>

            {/* Avatar & Photo Section */}
            <div className="flex items-center gap-4 px-6 pt-6 pb-2">
              {(profileAvatar && isUploadedAvatar(profileAvatar)) || (currentUser?.avatar && isUploadedAvatar(currentUser.avatar)) ? (
                <img
                  src={profileAvatar || currentUser?.avatar}
                  alt={profileName || "rushdhi"}
                  className="w-16 h-16 rounded-2xl object-cover border border-gray-200 shadow-xs flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl border border-gray-200 bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-7 h-7 text-gray-400" />
                </div>
              )}

              <div>
                <label className="text-blue-600 font-semibold text-xs sm:text-sm hover:underline cursor-pointer block">
                  Change photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 font-mono tracking-tight mt-0.5">
                  {currentUser?.email || "rushdhiriyaj2005@gmail.com"}
                </p>
                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-bold tracking-wider rounded uppercase inline-block mt-1.5">
                  {currentUser?.role || "WRITER"}
                </span>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSaveWriterProfileSettings} className="px-6 pt-4 pb-6 space-y-4">
              
              {/* Field 1: FULL NAME */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Field 2: BIO */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  BIO
                </label>
                <textarea
                  rows={3}
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="Tell readers about yourself..."
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all leading-relaxed"
                />
              </div>

              {/* Field 3: LINKEDIN PROFILE */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  LINKEDIN PROFILE
                </label>
                <div className="relative">
                  <svg
                    className="w-4 h-4 text-[#0A66C2] absolute left-3.5 top-1/2 -translate-y-1/2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
                  <input
                    type="url"
                    placeholder="https://www.linkedin.com/in/your-profile"
                    value={profileLinkedin}
                    onChange={(e) => setProfileLinkedin(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                  />
                </div>
                <p className="text-[11px] text-gray-400 font-normal mt-1.5 leading-normal">
                  Shown on your article bylines so readers can connect with you.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProfileSettingsOpen(false)}
                  className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 uppercase tracking-wider hover:bg-gray-50 transition-colors cursor-pointer text-center"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-[#004B87] hover:bg-[#003866] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer text-center"
                >
                  SAVE CHANGES
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* REJECTION REASON VIEWER MODAL (London BigBen Luxury Publishing Design) */}
      {selectedReasonPost && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 font-sans">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-[0_25px_70px_rgba(0,0,0,0.35)] overflow-hidden border border-slate-200/90 animate-in zoom-in-95 duration-200 relative text-left flex flex-col">
            
            {/* Top Red Gradient London BigBen Accent Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#BF1E2D] via-red-600 to-[#0F172A]" />

            {/* Modal Header */}
            <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-b from-slate-50/70 to-white">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200/70 flex items-center justify-center text-[#BF1E2D] shadow-xs shrink-0">
                  <AlertCircle className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-red-100/80 text-[#BF1E2D] font-mono font-black text-[9px] uppercase tracking-wider">
                      REVISION REQUIRED
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[10.5px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      EDITORIAL BOARD
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-serif font-black text-slate-900 tracking-tight mt-0.5">
                    Editorial Review Feedback
                  </h3>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedReasonPost(null)}
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-5 overflow-y-auto max-h-[calc(85vh-160px)]">
              
              {/* ARTICLE METADATA CARD */}
              <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-1 bg-[#BF1E2D]/10 text-[#BF1E2D] border border-[#BF1E2D]/20 text-[10px] font-mono font-black uppercase rounded-lg">
                    {selectedReasonPost.category || "GENERAL"}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 font-medium">
                    <Calendar size={12} className="text-slate-400" />
                    <span>Submitted: {selectedReasonPost.date}</span>
                  </div>
                </div>

                <h4 className="text-sm sm:text-base font-serif font-extrabold text-slate-900 leading-snug">
                  {selectedReasonPost.title}
                </h4>

                {selectedReasonPost.summary && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
                    {selectedReasonPost.summary}
                  </p>
                )}
              </div>

              {/* EDITORIAL REASON & NOTES QUOTE BOX */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <MessageSquare size={12} className="text-rose-600" />
                    <span>EDITOR'S REMARKS & REJECTION REASON</span>
                  </label>
                  {selectedReasonPost.rejectedAt && (
                    <span className="text-[10px] font-mono text-slate-400">
                      Reviewed: {new Date(selectedReasonPost.rejectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>

                {selectedReasonPost.rejectionReason ? (
                  <div className="relative border border-red-200/80 bg-gradient-to-br from-red-50/80 via-red-50/30 to-amber-50/20 rounded-2xl p-5 sm:p-6 shadow-2xs">
                    {/* Decorative quote mark */}
                    <span className="absolute top-2 right-4 text-5xl font-serif text-red-200/60 select-none pointer-events-none leading-none">
                      “
                    </span>
                    <p className="text-slate-900 text-sm sm:text-[14.5px] leading-relaxed font-serif font-semibold relative z-10 whitespace-pre-wrap">
                      "{selectedReasonPost.rejectionReason}"
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 bg-slate-50 rounded-2xl p-5 text-xs sm:text-sm text-slate-500 italic leading-relaxed">
                    No specific written feedback was provided by the editor. You can review your content, adjust any formatting or citations, and resubmit for editorial review.
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-block">
                London BigBen Review Desk
              </span>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedReasonPost(null)}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer font-mono uppercase tracking-wider shadow-2xs"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const postToEdit = selectedReasonPost;
                    setSelectedReasonPost(null);
                    handleEditPost(postToEdit);
                  }}
                  className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-extrabold text-white bg-[#BF1E2D] hover:bg-[#A31422] active:scale-[0.98] rounded-xl transition-all shadow-md shadow-red-950/20 cursor-pointer flex items-center justify-center gap-2 font-mono uppercase tracking-wider"
                >
                  <PenTool className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Edit & Resubmit</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

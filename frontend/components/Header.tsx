"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, ChevronDown, User, Mail, Menu, X, PenTool, LogOut, Settings, BookOpen, ShieldCheck, Bell } from "lucide-react";
import { saveUserProfile, getUserProfile, resolveUserAvatar, isUploadedAvatar } from "@/lib/userProfiles";
import { uploadImageToBackblaze } from "@/lib/imageUtils";
import { useLiveArticles } from "@/lib/articlesSync";
import { useAuth } from "@/lib/auth-context";
import { getAllSearchableArticles, searchArticlesByQuery, SearchableArticle } from "@/lib/searchArticles";

const megaMenuData: Record<string, {
  diveDeeper: string[];
  latestNews: string[];
  guides: string[];
}> = {
  WORLD: {
    diveDeeper: ["International", "Diplomacy", "Global Economy"],
    latestNews: [
      "International data privacy standards updated after cross-border audits",
      "Scientific research consortium publishes open-access genome study",
      "Urban infrastructure plans integrate smart power grids in major cities"
    ],
    guides: [
      "A journalist's guide to verifying digital source materials",
      "How to read and interpret complex statistical research reports"
    ]
  },
  POLITICS: {
    diveDeeper: ["Elections", "Policy", "Governance"],
    latestNews: [
      "EU & US leaders sign historic defense and trade agreement",
      "Public transportation systems roll out unified digital ticketing",
      "Education systems adapt curricula to include basic AI literacy"
    ],
    guides: [
      "Understanding public policy impact on engineering standards",
      "Best practices for data collection and public interest reporting"
    ]
  },
  BUSINESS: {
    diveDeeper: ["Companies", "Corporate News", "Entrepreneurship", "Startups"],
    latestNews: [
      "Canada's Conexiom bets that the future of AI lies in automation",
      "Lightworks, Scotiabank, Sun Life and TELUS launch AI Consortium",
      "Canada's AI adoption problem meets its youth employment problem"
    ],
    guides: [
      "Your complete guide to sparking innovation in a digital age",
      "You can't innovate successfully without the right company culture"
    ]
  },
  TECHNOLOGY: {
    diveDeeper: ["Artificial Intelligence", "Cybersecurity", "Innovations", "Robotics"],
    latestNews: [
      "Silicon Valley chip manufacturers announce breakthrough updates",
      "New quantum computing clusters open to public cloud preview",
      "Cybersecurity protocols updated globally to counter multi-vector threats"
    ],
    guides: [
      "Best practices for secure software development life cycle",
      "Comprehensive cloud migration checklist for enterprise architecture"
    ]
  }
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const loginHref = pathname && pathname !== "/login" && pathname !== "/register"
    ? `/login?redirect=${encodeURIComponent(pathname)}`
    : "/login";

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role?: string; avatar?: string; bio?: string; linkedin?: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // ── Real-time date / location / weather ──────────────────────────────────
  const [currentDate, setCurrentDate] = useState("");
  const [locationName, setLocationName] = useState("");
  const [weatherTemp, setWeatherTemp] = useState<number | null>(null);
  const [weatherCode, setWeatherCode] = useState<number | null>(null);

  const getWeatherIcon = (code: number | null): string => {
    if (code === null) return "⛅";
    if (code === 0) return "☀️";
    if (code <= 2) return "🌤️";
    if (code === 3) return "☁️";
    if (code <= 49) return "🌫️";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "❄️";
    if (code <= 82) return "🌦️";
    if (code <= 99) return "⛈️";
    return "⛅";
  };

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }));
    };
    updateDate();
    const dateTimer = setInterval(updateDate, 60000);

    const fetchLocationAndWeather = async () => {
      try {
        const geoRes = await fetch("https://ipapi.co/json/", { cache: "no-store" });
        if (!geoRes.ok) throw new Error("geo fetch failed");
        const geo = await geoRes.json();
        const city = geo.city || "";
        const country = geo.country_name || "";
        setLocationName(city && country ? `${city}, ${country}` : city || country || "");

        if (geo.latitude && geo.longitude) {
          const wxRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,weathercode&temperature_unit=celsius`,
            { cache: "no-store" }
          );
          if (!wxRes.ok) throw new Error("weather fetch failed");
          const wx = await wxRes.json();
          setWeatherTemp(Math.round(wx.current.temperature_2m));
          setWeatherCode(wx.current.weathercode);
        }
      } catch {
        // silently ignore – keep previous values
      }
    };
    fetchLocationAndWeather();
    const wxTimer = setInterval(fetchLocationAndWeather, 600000);

    return () => {
      clearInterval(dateTimer);
      clearInterval(wxTimer);
    };
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  const languages = [
    { code: "/auto/en", label: "English" },
    { code: "/auto/fr", label: "Français" },
    { code: "/auto/es", label: "Español" },
    { code: "/auto/de", label: "Deutsch" },
    { code: "/auto/ar", label: "العربية" },
    { code: "/auto/zh-CN", label: "中文" },
    { code: "/auto/hi", label: "हिन्दी" },
    { code: "/auto/pt", label: "Português" },
    { code: "/auto/ru", label: "Русский" },
    { code: "/auto/ja", label: "日本語" },
  ];

  const [selectedLang, setSelectedLang] = useState("English");

  // Restore saved language on mount
  useEffect(() => {
    const saved = localStorage.getItem("lbn_lang_label");
    if (saved) setSelectedLang(saved);
  }, []);

  const applyLanguage = (code: string, label: string) => {
    setSelectedLang(label);
    setIsLangOpen(false);
    localStorage.setItem("lbn_lang_label", label);
    // Set Google Translate cookie
    const domain = window.location.hostname === "localhost" ? "localhost" : window.location.hostname;
    document.cookie = `googtrans=${code};path=/;domain=${domain}`;
    document.cookie = `googtrans=${code};path=/`;
    window.location.reload();
  };

  // Profile Form state
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileLinkedin, setProfileLinkedin] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [allSearchArticles, setAllSearchArticles] = useState<SearchableArticle[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [articleNotifications, setArticleNotifications] = useState<{ id: string; title: string; status: string; date: string }[]>([]);
  const { articles: liveArticles } = useLiveArticles();

  useEffect(() => {
    setAllSearchArticles(getAllSearchableArticles());
  }, [liveArticles]);

  useEffect(() => {
    if (Array.isArray(liveArticles)) {
      setArticleNotifications(liveArticles as any);
    }
  }, [liveArticles]);

  // Close all menus/dropdowns on route navigation
  useEffect(() => {
    setActiveMenu(null);
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
    setIsNotificationsOpen(false);
    setIsLangOpen(false);
    setIsSearchFocused(false);
  }, [pathname]);

  // Close notifications & search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync profile state when currentUser or modal opens
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || "rushdhi");
      setProfileBio(currentUser.bio || "Writer User");
      setProfileLinkedin(currentUser.linkedin || "https://www.linkedin.com/in/your-profile");
      setProfileAvatar(currentUser.avatar && isUploadedAvatar(currentUser.avatar) ? currentUser.avatar : "");
    }
  }, [currentUser, isProfileSettingsOpen]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 1. Instant local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setProfileAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);

      // 2. Direct upload to Backblaze B2 in "avatars" folder
      try {
        const cleanName = (currentUser?.name || currentUser?.email?.split("@")[0] || "user").toLowerCase().replace(/[^a-z0-9]/g, "-");
        const b2Url = await uploadImageToBackblaze(file, `avatar-${cleanName}-${Date.now()}.webp`, "avatars");
        if (b2Url && b2Url.startsWith("http")) {
          setProfileAvatar(b2Url);
        }
      } catch (err) {
        console.warn("Backblaze avatar upload warning:", err);
      }
    }
  };

  const handleSaveProfileSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalAvatar = profileAvatar && isUploadedAvatar(profileAvatar) ? profileAvatar : "";

    // If avatar is still a data URL, upload to Backblaze B2 before saving
    if (finalAvatar && finalAvatar.startsWith("data:")) {
      try {
        const cleanName = (profileName || "user").toLowerCase().replace(/[^a-z0-9]/g, "-");
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("dj_auth_change"));
    }

    setToastMessage("🎉 Profile settings saved successfully!");
    setIsProfileSettingsOpen(false);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const auth = useAuth();

  useEffect(() => {
    try {
      router.prefetch("/search");
    } catch (e) {}
  }, [router]);

  useEffect(() => {
    if (auth.user) {
      const savedProfile = getUserProfile(auth.user.email);
      const normalizedRole = (auth.user.role || "").toLowerCase();
      const displayRole = normalizedRole === 'admin' ? 'Admin' : normalizedRole === 'writer' ? 'Writer' : 'Reader';
      const rawAvatar = savedProfile?.avatar || auth.user.avatar;
      const resolvedAvatar = resolveUserAvatar({
        name: savedProfile?.name || auth.user.name,
        email: auth.user.email,
        role: displayRole,
        avatar: isUploadedAvatar(rawAvatar) ? rawAvatar : undefined,
      });

      setCurrentUser({
        name: savedProfile?.name || auth.user.name,
        email: auth.user.email,
        role: displayRole,
        avatar: isUploadedAvatar(resolvedAvatar) ? resolvedAvatar : "",
        bio: savedProfile?.bio,
        linkedin: savedProfile?.linkedin
      });
    } else {
      setCurrentUser(null);
    }

    const savedToast = localStorage.getItem("dj_toast");
    if (savedToast) {
      setToastMessage(savedToast);
      localStorage.removeItem("dj_toast");
      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    }
  }, [auth.user]);

  const handleSignOut = async () => {
    try {
      await auth.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    localStorage.removeItem("dj_user");
    localStorage.removeItem("dj_admin_user");
    localStorage.removeItem("dj_writer_user");
    localStorage.removeItem("dj_user_profile");
    localStorage.setItem("dj_toast", "👋 You have successfully signed out.");
    setCurrentUser(null);
    setIsUserDropdownOpen(false);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  };

  const isCurrentCategoryActive = (cat: { name: string; href: string }) => {
    if (!pathname) return false;
    const currentPath = pathname.toLowerCase();
    const catName = cat.name.toLowerCase();

    if (catName === "world") {
      return (
        currentPath === "/news/world" ||
        currentPath === "/world" ||
        currentPath.startsWith("/news/world/") ||
        currentPath.startsWith("/world/") ||
        ["/china", "/united-states", "/europe", "/britain", "/middle-east", "/africa", "/asia"].some(r => currentPath === r || currentPath.startsWith(r + "/"))
      );
    }
    if (catName === "politics") {
      return currentPath === "/news/politics" || currentPath === "/politics" || currentPath.startsWith("/news/politics/") || currentPath.startsWith("/politics/");
    }
    if (catName === "business") {
      return currentPath === "/business" || currentPath.startsWith("/business/");
    }
    if (catName === "technology") {
      return currentPath === "/technology" || currentPath.startsWith("/technology/");
    }
    if (catName === "economy") {
      return currentPath === "/news/economy" || currentPath === "/economy" || currentPath.startsWith("/news/economy/") || currentPath.startsWith("/economy/");
    }
    if (catName === "markets") {
      return currentPath === "/news/markets" || currentPath === "/markets" || currentPath.startsWith("/news/markets/") || currentPath.startsWith("/markets/");
    }
    if (catName === "lifestyle") {
      return currentPath === "/news/lifestyle" || currentPath === "/lifestyle" || currentPath.startsWith("/news/lifestyle/") || currentPath.startsWith("/lifestyle/");
    }
    if (catName === "sports") {
      return currentPath === "/news/sports" || currentPath === "/sports" || currentPath.startsWith("/news/sports/") || currentPath.startsWith("/sports/");
    }
    if (catName === "entertainment") {
      return currentPath === "/news/entertainment" || currentPath === "/entertainment" || currentPath.startsWith("/news/entertainment/") || currentPath.startsWith("/entertainment/");
    }
    if (catName === "health") {
      return currentPath === "/news/health" || currentPath === "/health" || currentPath.startsWith("/news/health/") || currentPath.startsWith("/health/");
    }
    if (catName === "research") {
      return currentPath === "/industry-insights" || currentPath === "/research" || currentPath.startsWith("/industry-insights/") || currentPath.startsWith("/research/");
    }
    return currentPath === cat.href.toLowerCase();
  };

  const navCategories = [
    { name: "World", href: "/news/world", hasSub: true },
    { name: "Politics", href: "/news/politics", hasSub: false },
    { name: "Business", href: "/business", hasSub: false },
    { name: "Technology", href: "/technology", hasSub: false },
    { name: "Economy", href: "/news/economy", hasSub: false },
    { name: "Markets", href: "/news/markets", hasSub: false },
    { name: "Lifestyle", href: "/news/lifestyle", hasSub: false },
    { name: "Sports", href: "/news/sports", hasSub: false },
    { name: "Entertainment", href: "/news/entertainment", hasSub: false },
    { name: "Health", href: "/news/health", hasSub: false },
    { name: "Research", href: "/industry-insights", hasSub: false },
  ];

  const [trendingTopics, setTrendingTopics] = useState([
    { name: "Cybersecurity Breach", href: "/search?q=Cybersecurity+Breach" },
    { name: "AI Regulation", href: "/search?q=AI+Regulation" },
    { name: "Global Markets", href: "/search?q=Global+Markets" },
    { name: "Clean Energy", href: "/search?q=Clean+Energy" },
    { name: "Space Economy", href: "/search?q=Space+Economy" },
    { name: "Inflation Rate", href: "/search?q=Inflation+Rate" }
  ]);

  useEffect(() => {
    const syncTrending = () => {
      try {
        const saved = localStorage.getItem("dj_trending_words");
        if (saved) {
          const list = JSON.parse(saved);
          if (Array.isArray(list) && list.length > 0) {
            const active = list
              .filter((item: any) => item.status === "Active")
              .map((item: any) => ({
                name: item.word,
                href: item.url || `/search?q=${encodeURIComponent(item.word)}`
              }));
            if (active.length > 0) {
              setTrendingTopics(active);
            }
          }
        }
      } catch (e) {}
    };
    syncTrending();
    window.addEventListener("storage", syncTrending);
    window.addEventListener("dj_trending_words_change", syncTrending);
    return () => {
      window.removeEventListener("storage", syncTrending);
      window.removeEventListener("dj_trending_words_change", syncTrending);
    };
  }, []);

  const worldRegionsList = [
    { name: "China", href: "/china" },
    { name: "United States", href: "/united-states" },
    { name: "Europe", href: "/europe" },
    { name: "Britain", href: "/britain" },
    { name: "Middle East", href: "/middle-east" },
    { name: "Africa", href: "/africa" },
    { name: "Asia", href: "/asia" },
  ];

  return (
    <header className="relative w-full bg-white text-gray-900 font-sans">
      
      {/* Sign-in Toast Banner */}
      {toastMessage && (
        <div className="w-full bg-[#BF1E2D] text-white text-[12px] font-bold py-2 px-4 text-center flex items-center justify-center gap-3">
          <span>✓ {toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white ml-2 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* ================= ROW 1 (FIXED TOP): BRAND LOGO, SEARCH, & ACTION BUTTONS ================= */}
      <div className="fixed top-0 left-0 right-0 z-50 w-full bg-white border-b border-gray-200 shadow-xs">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between gap-2 sm:gap-6 relative z-50 w-full min-w-0">
        
        {/* LOGO & BRAND */}
        <Link href="/" className="flex items-center group shrink-0 py-0.5" aria-label="London BigBen">
          <Image
            src="/header_logo.png"
            alt="London BigBen Network"
            width={240}
            height={42}
            className="h-7 sm:h-9 md:h-10 w-auto max-w-[165px] sm:max-w-none object-contain transition-transform group-hover:scale-[1.02]"
            priority
          />
        </Link>

        {/* SEARCH INPUT BAR (Instant navigation link to /search, hidden when already on /search) */}
        {pathname !== "/search" ? (
          <div className="hidden md:block relative flex-1 max-w-[460px] lg:max-w-[540px] mx-4 lg:mx-8">
            <Link
              href="/search"
              prefetch={true}
              className="flex items-center justify-between w-full pl-4 pr-3.5 py-2 text-[13px] border border-gray-300 rounded-full bg-gray-50/70 hover:bg-white hover:border-[#BF1E2D] text-gray-400 hover:text-gray-700 transition-all cursor-pointer shadow-2xs group"
              aria-label="Open Search"
            >
              <span className="truncate select-none">
                Search for news, topics, companies...
              </span>
              <span className="text-gray-400 group-hover:text-[#BF1E2D] transition-colors ml-2 shrink-0">
                <Search size={16} strokeWidth={2.2} />
              </span>
            </Link>
          </div>
        ) : (
          <div className="hidden md:block flex-1 mx-4 lg:mx-8" />
        )}

        {/* RIGHT ACTION BUTTONS */}
        <div className="flex items-center gap-2 sm:gap-3.5 text-[13px] font-medium shrink-0">
          
          {/* Newsletter Signup Button */}
          <Link
            href="/newsletters"
            className="hidden lg:inline-flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white font-bold text-[12px] px-3.5 py-2 rounded-md transition-colors whitespace-nowrap shadow-xs"
          >
            <Mail size={14} />
            <span>Newsletter Signup</span>
          </Link>

          {/* User Sign In / Profile Dropdown (BOTH MOBILE & DESKTOP) */}
          {currentUser ? (
            <div className="relative block z-[100]" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen((prev) => !prev)}
                className="relative flex items-center gap-1.5 cursor-pointer focus:outline-none p-0.5 rounded-full hover:ring-2 hover:ring-[#BF1E2D]/20 transition-all bg-gray-100"
                aria-label="User Account Menu"
              >
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full overflow-hidden border border-gray-300 shadow-xs bg-gray-100 flex-shrink-0">
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name || "rushdhi"}
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <User size={18} className="text-[#BF1E2D]" />
                  )}
                  {/* Green status online dot */}
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white absolute bottom-0 right-0 shadow-xs z-10"></span>
                </div>
              </button>

              {/* USER ACCOUNT DROPDOWN POPOVER */}
              {isUserDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 shadow-xl rounded-xl text-left z-[1000] overflow-hidden font-sans animate-in fade-in slide-in-from-top-1 duration-150">
                  
                  {/* Section 1: User Profile Header */}
                  <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-[12.5px] font-extrabold text-slate-900 leading-snug tracking-tight truncate">
                      {currentUser.name || "rushdi admin"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono tracking-tight mt-0.5 truncate">
                      {currentUser.email || "rushdhi5002@gmail.com"}
                    </p>
                  </div>

                  {/* Admin Option: Admin Control Panel */}
                  {((currentUser.role || "").toLowerCase() === "admin" || (currentUser.role || "").toLowerCase() === "co-admin" || (currentUser.email || "").toLowerCase().includes("admin")) && (
                    <Link
                      href="/admin"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="px-3.5 py-2 flex items-center gap-2.5 border-b border-slate-100 hover:bg-red-50/50 transition-colors cursor-pointer group"
                    >
                      <ShieldCheck size={15} className="text-[#D31220] flex-shrink-0" />
                      <span className="text-[#D31220] font-bold text-xs tracking-tight">
                        Admin Control Panel
                      </span>
                    </Link>
                  )}

                  {/* Author Workspace Option */}
                  {((currentUser.role || "").toLowerCase() === "writer" || (currentUser.role || "").toLowerCase() === "editor" || (currentUser.email || "").toLowerCase().includes("writer")) && (
                    <Link
                      href="/writer"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="px-3.5 py-2 flex items-center gap-2.5 border-b border-slate-100 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <PenTool size={15} className="text-[#1B50E8] flex-shrink-0" />
                      <span className="text-[#1B50E8] font-bold text-xs tracking-tight">
                        Author Workspace
                      </span>
                    </Link>
                  )}

                  {/* Reader Dashboard Option */}
                  {((currentUser.role || "").toLowerCase() === "reader" || (currentUser.role || "").toLowerCase() === "user" || (!(currentUser.role || "").toLowerCase().includes("writer") && !(currentUser.role || "").toLowerCase().includes("admin") && !(currentUser.role || "").toLowerCase().includes("editor") && !(currentUser.email || "").toLowerCase().includes("writer") && !(currentUser.email || "").toLowerCase().includes("admin"))) && (
                    <Link
                      href="/reader"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="px-3.5 py-2 flex items-center gap-2.5 border-b border-slate-100 hover:bg-red-50/40 transition-colors cursor-pointer group"
                    >
                      <BookOpen size={15} className="text-[#BF1E2D] flex-shrink-0" />
                      <span className="text-[#BF1E2D] font-bold text-xs tracking-tight">
                        Reader Dashboard
                      </span>
                    </Link>
                  )}

                  {/* Profile Settings Option */}
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      setIsProfileSettingsOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <User size={15} className="text-slate-400 group-hover:text-slate-700 flex-shrink-0" />
                    <span className="text-slate-800 font-bold text-xs tracking-tight">
                      Profile Settings
                    </span>
                  </button>

                  {/* Sign Out Terminal Option */}
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3.5 py-2 flex items-center gap-2.5 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <LogOut size={15} className="text-slate-400 group-hover:text-slate-700 flex-shrink-0" />
                    <span className="text-slate-800 font-bold text-xs tracking-tight">
                      Sign Out Terminal
                    </span>
                  </button>

                </div>
              )}
            </div>
          ) : (
            <Link 
              href={loginHref} 
              className="flex items-center gap-1.5 text-gray-800 hover:text-[#BF1E2D] font-bold text-xs sm:text-sm px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              <User size={17} strokeWidth={2.2} className="text-[#BF1E2D]" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}

          {/* Red Subscribe Button */}
          <Link
            href="/subscribe"
            className="bg-[#BF1E2D] hover:bg-red-700 text-white font-bold text-[10px] sm:text-[12px] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md transition-colors whitespace-nowrap shadow-xs uppercase tracking-wider flex items-center justify-center shrink-0"
          >
            Subscribe
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-gray-800 hover:text-[#BF1E2D] p-1 rounded-md hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

        </div>

      </div>
    </div>

      {/* Spacer placeholder matching fixed Row 1 height */}
      <div className="h-[58px] sm:h-[68px] w-full" aria-hidden="true" />

      {/* ================= ROW 2: CATEGORY NAVIGATION BAR ================= */}
      <div className="w-full border-b border-gray-200 bg-white relative z-40 overflow-visible">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 flex items-center justify-between gap-4 w-full min-w-0 overflow-visible">
          
          {/* Main Horizontal Category Nav Items */}
          <nav className="flex items-center gap-4 sm:gap-5 md:gap-6 lg:gap-6 xl:gap-7 py-2.5 sm:py-3 text-[12px] sm:text-[13.5px] font-bold overflow-x-auto md:overflow-visible scrollbar-none flex-1 min-w-0 pr-4">
            {navCategories.map((cat) => {
              const isWorld = cat.name === "World";
              const isWorldActive = isWorld && activeMenu === "WORLD";
              const isActive = isCurrentCategoryActive(cat);

              return (
                <div
                  key={cat.name}
                  className="relative flex items-center group shrink-0"
                  onMouseEnter={() => {
                    if (isWorld) {
                      setActiveMenu("WORLD");
                    } else {
                      setActiveMenu(null);
                    }
                  }}
                  onMouseLeave={() => setActiveMenu(null)}
                >
                  <Link
                    href={cat.href}
                    onClick={() => {
                      setActiveMenu(null);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-1 pb-0.5 px-1 sm:px-1.5 transition-colors font-bold whitespace-nowrap ${
                      isActive
                        ? "text-gray-900 border-b-2 border-[#BF1E2D]"
                        : "text-gray-800 hover:text-[#BF1E2D] border-b-2 border-transparent"
                    }`}
                  >
                    <span>{cat.name}</span>
                    {isWorld && (
                      <ChevronDown
                        size={12}
                        strokeWidth={2.5}
                        className="text-gray-500 group-hover:text-[#BF1E2D] transition-transform duration-200 group-hover:rotate-180"
                      />
                    )}
                  </Link>

                  {/* Dropdown Menu on Hover for World (Countries & Regions List) */}
                  {isWorld && (
                    <div 
                      onMouseEnter={() => setActiveMenu("WORLD")}
                      onMouseLeave={() => setActiveMenu(null)}
                      className={`absolute top-full left-0 pt-2 w-[230px] sm:w-[250px] z-[100] transition-all duration-200 before:content-[''] before:absolute before:-top-3 before:left-0 before:right-0 before:h-5 ${
                        isWorldActive
                          ? "opacity-100 visible pointer-events-auto translate-y-0"
                          : "opacity-0 invisible pointer-events-none -translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:pointer-events-auto group-hover:translate-y-0"
                      }`}
                    >
                      <div className="bg-white border border-gray-200/90 shadow-2xl rounded-2xl p-3.5 text-left font-sans ring-1 ring-black/5">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-150">
                          <h4 className="text-[11px] font-extrabold uppercase text-[#BF1E2D] tracking-wider">
                            World Categories
                          </h4>
                          <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider">Regions</span>
                        </div>

                        <div className="space-y-0.5">
                          {worldRegionsList.map((region, i) => (
                            <Link
                              key={i}
                              href={region.href}
                              onClick={() => setActiveMenu(null)}
                              className="flex items-center justify-between py-2 px-3 rounded-xl text-[12.5px] font-bold text-gray-800 hover:bg-red-50/80 hover:text-[#BF1E2D] group/item cursor-pointer transition-colors"
                            >
                              <span className="group-hover/item:text-[#BF1E2D]">{region.name}</span>
                              <span className="text-gray-300 group-hover/item:text-[#BF1E2D] text-[11px] font-bold transition-colors">›</span>
                            </Link>
                          ))}
                        </div>

                        <div className="pt-2 mt-2 border-t border-gray-150 flex items-center justify-between">
                          <Link
                            href="/news/world"
                            onClick={() => setActiveMenu(null)}
                            className="text-[11px] font-extrabold text-[#BF1E2D] hover:underline flex items-center gap-1"
                          >
                            <span>View all World coverage →</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Far Right Language Selector */}
          <div className="hidden lg:flex items-center pl-4 border-l border-gray-200 relative flex-shrink-0" ref={langDropdownRef}>
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-1.5 text-[12.5px] font-bold text-gray-700 hover:text-[#BF1E2D] cursor-pointer py-1 px-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <span>🌐</span>
              <span>{selectedLang}</span>
              <ChevronDown size={12} strokeWidth={2.5} className="text-gray-400" />
            </button>

            {isLangOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => applyLanguage(lang.code, lang.label)}
                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold transition-colors ${
                      selectedLang === lang.label
                        ? "bg-red-50 text-[#BF1E2D]"
                        : "text-gray-700 hover:bg-red-50 hover:text-[#BF1E2D]"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ================= ROW 3: TRENDING TOPICS & WEATHER UTILITY BAR ================= */}
      <div className="w-full bg-[#F8F9FA] border-b border-gray-200 py-1.5 text-xs font-medium text-gray-700">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 flex items-center justify-between gap-4 min-w-0">
          
          {/* LEFT: TRENDING LABEL & TOPICS */}
          <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto scrollbar-none py-0.5 min-w-0 flex-1">
            <span className="bg-[#BF1E2D]/10 text-[#BF1E2D] font-extrabold uppercase text-[10px] sm:text-[11px] px-2 py-0.5 rounded tracking-wider shrink-0">
              TRENDING
            </span>

            <div className="flex items-center gap-2 sm:gap-2.5 text-[12px] whitespace-nowrap text-gray-700 shrink-0">
              {trendingTopics.map((topic, index) => (
                <div key={topic.name} className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  <Link href={topic.href} className="hover:text-[#BF1E2D] transition-colors font-medium">
                    {topic.name}
                  </Link>
                  {index < trendingTopics.length - 1 && <span className="text-gray-300">•</span>}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: DATE, LOCATION & WEATHER WIDGET — desktop */}
          <div className="hidden lg:flex items-center gap-3 text-[11.5px] text-gray-500 font-medium shrink-0">
            {currentDate && <span>{currentDate}</span>}
            {currentDate && locationName && <span className="text-gray-300">•</span>}
            {locationName && <span>{locationName}</span>}
            {(locationName || currentDate) && weatherTemp !== null && <span className="text-gray-300">•</span>}
            
            {/* Weather Pill */}
            {weatherTemp !== null && (
              <div className="flex items-center gap-1 text-gray-800 font-semibold cursor-pointer hover:text-[#BF1E2D] bg-white px-2 py-0.5 rounded border border-gray-200 shadow-2xs transition-colors">
                <span className="text-xs">{getWeatherIcon(weatherCode)}</span>
                <span>{weatherTemp}°C</span>
                <ChevronDown size={11} strokeWidth={2.5} className="text-gray-400" />
              </div>
            )}
          </div>

          {/* MOBILE: Compact weather pill only (right side of trending bar) */}
          {weatherTemp !== null && (
            <div className="lg:hidden flex items-center gap-1 text-gray-800 font-semibold bg-white px-2 py-0.5 rounded border border-gray-200 shadow-2xs shrink-0">
              <span className="text-xs">{getWeatherIcon(weatherCode)}</span>
              <span className="text-[11px]">{weatherTemp}°C</span>
            </div>
          )}

        </div>

        {/* MOBILE/TABLET ONLY: Date & Location row below trending strip */}
        {(currentDate || locationName) && (
          <div className="lg:hidden max-w-[1400px] mx-auto px-3 sm:px-6 pb-1 flex items-center gap-1.5 text-[10.5px] text-gray-400 font-medium flex-wrap">
            {currentDate && <span>{currentDate}</span>}
            {currentDate && locationName && <span className="text-gray-300">•</span>}
            {locationName && <span>{locationName}</span>}
          </div>
        )}
      </div>

      {/* MOBILE DRAWER */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white text-gray-900 border-t border-gray-200 py-4 px-4 space-y-4 shadow-2xl animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-65px)] overflow-y-auto">
          
          {/* Mobile Search Button (Instant navigation link to /search, hidden on /search page) */}
          {pathname !== "/search" && (
            <Link
              href="/search"
              prefetch={true}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between w-full pl-4 pr-3.5 py-2.5 text-xs border border-gray-300 rounded-full bg-gray-50 text-gray-500 hover:text-gray-900 cursor-pointer"
            >
              <span>Search news, topics, companies...</span>
              <Search size={16} className="text-gray-400" />
            </Link>
          )}

          {/* Action Row 1: Subscribe & Newsletter */}
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href="/subscribe"
              onClick={() => setIsMobileMenuOpen(false)}
              className="bg-[#BF1E2D] hover:bg-red-700 text-white text-center font-extrabold text-xs py-2.5 rounded-md shadow-xs uppercase tracking-wider flex items-center justify-center gap-1"
            >
              <span>Subscribe Now</span>
            </Link>

            <Link
              href="/newsletters"
              onClick={() => setIsMobileMenuOpen(false)}
              className="bg-gray-900 hover:bg-black text-white text-center font-bold text-xs py-2.5 rounded-md shadow-xs flex items-center justify-center gap-1"
            >
              <Mail size={14} />
              <span>Newsletter</span>
            </Link>
          </div>

          {/* User Profile Section in Mobile Drawer */}
          {currentUser ? (
            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200 space-y-3 font-sans">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#BF1E2D] text-white font-bold flex items-center justify-center text-sm shadow-xs uppercase overflow-hidden shrink-0">
                  {currentUser.avatar && (currentUser.avatar.startsWith("/") || currentUser.avatar.startsWith("data:") || currentUser.avatar.startsWith("http")) ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{(currentUser.name || "U").charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {currentUser.name || "rushdhi"}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate font-mono">
                    {currentUser.email || "rushdhiriyaj2005@gmail.com"}
                  </p>
                  <span className="inline-block mt-0.5 px-2 py-0.2 bg-red-100 text-[#BF1E2D] font-extrabold text-[8.5px] uppercase tracking-wider rounded">
                    {currentUser.role || "READER"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-gray-200">
                {(currentUser.role === "Admin" || currentUser.role === "Co-Admin" || (currentUser.email || "").toLowerCase().includes("admin")) && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 py-2.5 px-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                  >
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}

                {(() => {
                  const email = (currentUser.email || "").toLowerCase().trim();
                  const userRole = (currentUser.role || "").toLowerCase().trim();
                  const isSystemWriterOrAdmin =
                    userRole === "writer" ||
                    userRole === "editor" ||
                    userRole === "admin" ||
                    userRole === "co-admin" ||
                    email === "writer@digitaljournal.com" ||
                    email === "coadmin@digitaljournal.com" ||
                    email.includes("admin") ||
                    email.includes("writer");

                  let isApproved = isSystemWriterOrAdmin;
                  if (!isApproved && email && typeof window !== "undefined") {
                    const savedProfile = getUserProfile(email);
                    const profileRole = (savedProfile?.role || "").toLowerCase().trim();
                    if (profileRole === "writer" || profileRole === "editor" || profileRole === "admin" || profileRole === "co-admin") {
                      isApproved = true;
                    } else {
                      const writersListStr = localStorage.getItem("dj_writers_list");
                      if (writersListStr) {
                        try {
                          const wList: any[] = JSON.parse(writersListStr);
                          isApproved = wList.some((w: any) => w.email && w.email.toLowerCase().trim() === email && (w.status === "Active" || !w.status));
                        } catch (e) {
                          console.warn(e);
                        }
                      }
                    }
                  }

                  if (isApproved) {
                    return (
                      <Link
                        href="/writer"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2.5 py-2.5 px-3 bg-blue-50/80 text-[#1B50E8] rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        <PenTool size={16} className="text-[#1B50E8]" />
                        <span>Author Workspace</span>
                      </Link>
                    );
                  }
                  return (
                    <Link
                      href="/reader"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 py-2.5 px-3 bg-red-50/80 text-[#BF1E2D] rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                    >
                      <BookOpen size={16} className="text-[#BF1E2D]" />
                      <span>Reader Dashboard</span>
                    </Link>
                  );
                })()}

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsProfileSettingsOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 py-2.5 px-3 bg-white text-slate-800 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors text-left"
                >
                  <User size={16} className="text-slate-500" />
                  <span>Profile Settings</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 py-2.5 px-3 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors text-left"
                >
                  <LogOut size={16} className="text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1 pb-2 border-b border-gray-100">
              <Link
                href={loginHref}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 text-center font-bold text-xs py-2.5 rounded-md border border-gray-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <User size={15} className="text-[#BF1E2D]" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 bg-slate-900 hover:bg-black text-white text-center font-bold text-xs py-2.5 rounded-md flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Register Account</span>
              </Link>
            </div>
          )}

          {/* Category Navigation Links */}
          <div className="pt-1">
            <h5 className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider mb-2">
              Browse Categories
            </h5>
            <div className="grid grid-cols-2 gap-2">
              {navCategories.map((cat) => (
                <Link
                  key={cat.name}
                  href={cat.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 px-3 text-xs font-bold text-gray-800 bg-gray-50 hover:bg-red-50 hover:text-[#BF1E2D] rounded-md transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile Language Selector */}
          <div className="pt-1 border-t border-gray-100">
            <h5 className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider mb-2">
              Language
            </h5>
            <div className="grid grid-cols-2 gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { applyLanguage(lang.code, lang.label); setIsMobileMenuOpen(false); }}
                  className={`text-left py-2 px-3 text-xs font-bold rounded-md transition-colors ${
                    selectedLang === lang.label
                      ? "bg-red-50 text-[#BF1E2D]"
                      : "text-gray-800 bg-gray-50 hover:bg-red-50 hover:text-[#BF1E2D]"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Profile Settings Modal matching user screenshot */}
      {isProfileSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl relative text-left overflow-hidden border-t-[5px] border-[#BF1E2D]">
            
            {/* Close Button */}
            <button
              onClick={() => setIsProfileSettingsOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header Title Section */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <h2 className="text-[22px] font-serif font-bold text-slate-900 leading-snug">
                Profile Settings
              </h2>
              <p className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase mt-0.5 font-sans">
                MANAGE YOUR ACCOUNT
              </p>
            </div>

            {/* Avatar & Photo Section */}
            <div className="flex items-center gap-4 px-6 pt-6 pb-2">
              {(profileAvatar && isUploadedAvatar(profileAvatar)) || (currentUser?.avatar && isUploadedAvatar(currentUser.avatar)) ? (
                <img
                  src={profileAvatar || currentUser?.avatar}
                  alt={profileName || "User"}
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-2xs flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <User size={28} className="text-slate-400" />
                </div>
              )}

              <div>
                <label className="text-[#005691] font-bold text-xs sm:text-sm hover:underline cursor-pointer block">
                  Change photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-slate-500 font-sans tracking-tight mt-0.5">
                  {currentUser?.email || "nestosuper2024@gmail.com"}
                </p>
                <span className={`px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider rounded uppercase inline-block mt-1.5 font-sans ${
                  (currentUser?.role || "").toUpperCase() === "ADMIN"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : (currentUser?.role || "").toUpperCase() === "WRITER"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}>
                  {(currentUser?.role || "READER").toUpperCase()}
                </span>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSaveProfileSettings} className="px-6 pt-4 pb-6 space-y-4 font-sans">
              
              {/* Field 1: FULL NAME */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[#005691] focus:ring-1 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Field 2: BIO */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  BIO
                </label>
                <textarea
                  rows={3}
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="New London BigBen subscriber via Google."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[#005691] focus:ring-1 focus:ring-blue-100 transition-all leading-relaxed"
                />
              </div>

              {/* Field 3: LINKEDIN PROFILE */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  LINKEDIN PROFILE
                </label>
                <div className="relative rounded-xl border-2 border-[#005691] px-3.5 py-2.5 flex items-center gap-2.5 bg-white shadow-2xs focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <svg
                    className="w-5 h-5 text-[#005691] fill-[#005691] flex-shrink-0"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
                  <input
                    type="url"
                    placeholder="https://www.linkedin.com/in/your-profile"
                    value={profileLinkedin}
                    onChange={(e) => setProfileLinkedin(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-normal mt-1.5 leading-normal">
                  Shown on your article bylines so readers can connect with you.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProfileSettingsOpen(false)}
                  className="flex-1 py-3.5 px-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase tracking-wider hover:bg-slate-50 transition-colors cursor-pointer text-center"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 px-4 bg-[#005691] hover:bg-[#00416d] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer text-center"
                >
                  SAVE CHANGES
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </header>
  );
}
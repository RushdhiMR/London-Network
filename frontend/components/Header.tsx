"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, ChevronDown, User, Mail, Menu, X, PenTool, LogOut, Settings, BookOpen, ShieldCheck, Bell, Globe } from "lucide-react";
import { saveUserProfile, getUserProfile, resolveUserAvatar, isUploadedAvatar } from "@/lib/userProfiles";
import { uploadImageToBackblaze } from "@/lib/imageUtils";
import { useLiveArticles } from "@/lib/articlesSync";
import { useAuth } from "@/lib/auth-context";
import { getAllSearchableArticles, searchArticlesByQuery, SearchableArticle, fetchAllSearchableArticlesAsync, articlesToSearchable } from "@/lib/searchArticles";

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

interface HeaderProps {
  showProgressBar?: boolean;
}

export default function Header({ showProgressBar = false }: HeaderProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const loginHref = pathname && pathname !== "/login" && pathname !== "/register"
    ? `/login?redirect=${encodeURIComponent(pathname)}`
    : "/login";

  const [readingProgress, setReadingProgress] = useState(0);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestedArticles, setSuggestedArticles] = useState<SearchableArticle[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const searchRequestIdRef = useRef(0);
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const headerSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role?: string; avatar?: string; bio?: string; linkedin?: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMobileUserDropdownOpen, setIsMobileUserDropdownOpen] = useState(false);
  const [isMobileWorldOpen, setIsMobileWorldOpen] = useState(false);
  const [isMobileLanguagesOpen, setIsMobileLanguagesOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const row2ContainerRef = useRef<HTMLDivElement>(null);
  const worldBtnRef = useRef<HTMLDivElement>(null);
  const worldDropdownRef = useRef<HTMLDivElement>(null);
  const worldCloseTimer = useRef<NodeJS.Timeout | null>(null);
  const [worldDropdownLeft, setWorldDropdownLeft] = useState<number | null>(null);

  // Category navigation swipe & drag-scrolling state
  const categoryNavRef = useRef<HTMLElement>(null);
  const isNavDragging = useRef(false);
  const navStartX = useRef(0);
  const navScrollLeft = useRef(0);
  const hasMovedNav = useRef(false);

  const handleCategoryMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return;
    if (!categoryNavRef.current) return;
    isNavDragging.current = true;
    hasMovedNav.current = false;
    navStartX.current = e.pageX - categoryNavRef.current.offsetLeft;
    navScrollLeft.current = categoryNavRef.current.scrollLeft;
  };

  const updateWorldPos = useCallback(() => {
    if (worldBtnRef.current && row2ContainerRef.current) {
      const btnRect = worldBtnRef.current.getBoundingClientRect();
      const containerRect = row2ContainerRef.current.getBoundingClientRect();
      const calculatedLeft = btnRect.left - containerRect.left;
      const maxLeft = Math.max(8, (containerRect.width || window.innerWidth) - 240);
      setWorldDropdownLeft(Math.min(Math.max(8, calculatedLeft), maxLeft));
    }
  }, []);

  const handleCategoryMouseLeave = () => {
    isNavDragging.current = false;
  };

  const handleCategoryMouseUp = () => {
    isNavDragging.current = false;
  };

  const handleCategoryMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return;
    if (!isNavDragging.current || !categoryNavRef.current) return;
    const x = e.pageX - categoryNavRef.current.offsetLeft;
    const walk = (x - navStartX.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMovedNav.current = true;
    }
    categoryNavRef.current.scrollLeft = navScrollLeft.current - walk;
    updateWorldPos();
  };

  const handleWorldOpen = useCallback(() => {
    if (worldCloseTimer.current) {
      clearTimeout(worldCloseTimer.current);
      worldCloseTimer.current = null;
    }
    updateWorldPos();
    setActiveMenu("WORLD");
  }, [updateWorldPos]);

  const handleWorldClose = useCallback(() => {
    if (worldCloseTimer.current) {
      clearTimeout(worldCloseTimer.current);
    }
    worldCloseTimer.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  }, []);

  const toggleWorldMenu = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (worldCloseTimer.current) {
      clearTimeout(worldCloseTimer.current);
      worldCloseTimer.current = null;
    }
    setActiveMenu((prev) => {
      if (prev === "WORLD") {
        return null;
      } else {
        updateWorldPos();
        return "WORLD";
      }
    });
  }, [updateWorldPos]);

  useEffect(() => {
    const handleResize = () => {
      if (activeMenu === "WORLD") {
        updateWorldPos();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeMenu, updateWorldPos]);

  useEffect(() => {
    return () => {
      if (worldCloseTimer.current) {
        clearTimeout(worldCloseTimer.current);
      }
    };
  }, []);

  // ── Real-time date / country / weather ──────────────────────────────────
  const [currentDate, setCurrentDate] = useState("");
  const [countryName, setCountryName] = useState("");
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
    const dateTimer = setInterval(updateDate, 30000);

    const fetchCountryAndWeather = async () => {
      try {
        // 1. Primary: Server-side weather & location endpoint (no CORS/ad-blocker blocks)
        const res = await fetch("/api/weather", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (data.country) setCountryName(data.country);
            if (data.temp !== undefined && data.temp !== null) setWeatherTemp(data.temp);
            if (data.weatherCode !== undefined && data.weatherCode !== null) setWeatherCode(data.weatherCode);
            return;
          }
        }
      } catch {
        // Continue to client-side fallback
      }

      // 2. Client-side fallback via ipwho.is + Open-Meteo
      try {
        const geoRes = await fetch("https://ipwho.is/", { cache: "no-store" });
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (geo.success !== false && geo.country) {
            setCountryName(geo.country);
            if (geo.latitude && geo.longitude) {
              const wxRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,weathercode&temperature_unit=celsius`,
                { cache: "no-store" }
              );
              if (wxRes.ok) {
                const wx = await wxRes.json();
                if (wx?.current?.temperature_2m !== undefined) {
                  setWeatherTemp(Math.round(wx.current.temperature_2m));
                  setWeatherCode(wx.current.weathercode ?? 1);
                  return;
                }
              }
            }
          }
        }
      } catch {
        // Continue to timezone fallback
      }

      // 3. Fallback country detection from browser timezone
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        if (tz.includes("Colombo")) setCountryName("Sri Lanka");
        else if (tz.includes("London")) setCountryName("United Kingdom");
        else if (tz.includes("New_York") || tz.includes("Los_Angeles") || tz.includes("Chicago")) setCountryName("United States");
        else if (tz.includes("/")) {
          const region = tz.split("/")[1]?.replace(/_/g, " ");
          if (region) setCountryName(region);
        }
      } catch { }
    };

    fetchCountryAndWeather();
    const wxTimer = setInterval(fetchCountryAndWeather, 300000); // refresh every 5 min

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
  const row1Ref = useRef<HTMLDivElement>(null);
  const [row1Height, setRow1Height] = useState<number | null>(null);

  useEffect(() => {
    if (!row1Ref.current) return;
    const updateHeight = () => {
      if (row1Ref.current) {
        setRow1Height(row1Ref.current.offsetHeight);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(row1Ref.current);
    return () => ro.disconnect();
  }, []);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [allSearchArticles, setAllSearchArticles] = useState<SearchableArticle[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [articleNotifications, setArticleNotifications] = useState<{ id: string; title: string; status: string; date: string }[]>([]);
  const { articles: liveArticles } = useLiveArticles();

  useEffect(() => {
    if (Array.isArray(liveArticles) && liveArticles.length > 0) {
      setAllSearchArticles(articlesToSearchable(liveArticles));
    } else {
      setAllSearchArticles(getAllSearchableArticles());
    }
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
    setIsMobileWorldOpen(false);
    setIsUserDropdownOpen(false);
    setIsNotificationsOpen(false);
    setIsLangOpen(false);
    setIsSearchFocused(false);
  }, [pathname]);

  // Close notifications, search dropdown, & world menu on click/touch outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (
        worldDropdownRef.current &&
        !worldDropdownRef.current.contains(event.target as Node) &&
        worldBtnRef.current &&
        !worldBtnRef.current.contains(event.target as Node)
      ) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
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
      } catch (e) { }
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
    } catch (e) { }
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

    let savedToast: string | null = null;
    try {
      savedToast = sessionStorage.getItem("dj_toast") || localStorage.getItem("dj_toast");
      if (sessionStorage.getItem("dj_toast")) sessionStorage.removeItem("dj_toast");
      if (localStorage.getItem("dj_toast")) localStorage.removeItem("dj_toast");
    } catch (e) { }
    if (savedToast) {
      setToastMessage(savedToast);
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
    try {
      sessionStorage.setItem("dj_toast", "👋 You have successfully signed out.");
    } catch (e) { }
    setCurrentUser(null);
    setIsUserDropdownOpen(false);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchFocused(false);
    const query = searchQuery.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  };

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
      setSuggestedArticles([]);
      setIsSearchLoading(false);
      return;
    }

    setIsSearchLoading(true);
    if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);

    const requestId = ++searchRequestIdRef.current;
    searchDebounceTimerRef.current = setTimeout(async () => {
      try {
        let pool = allSearchArticles;
        if (!pool || pool.length === 0) {
          pool = await fetchAllSearchableArticlesAsync();
          setAllSearchArticles(pool);
        }
        if (searchRequestIdRef.current !== requestId) return;

        const results = searchArticlesByQuery(pool, q);
        if (searchRequestIdRef.current === requestId) {
          setSuggestedArticles(results.slice(0, 6));
          setIsSearchLoading(false);
        }
      } catch {
        if (searchRequestIdRef.current === requestId) {
          setSuggestedArticles([]);
          setIsSearchLoading(false);
        }
      }
    }, 220);

    return () => {
      if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
    };
  }, [searchQuery, allSearchArticles]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDesktop = headerSearchRef.current && headerSearchRef.current.contains(target);
      const insideMobile = mobileSearchRef.current && mobileSearchRef.current.contains(target);
      if (!insideDesktop && !insideMobile) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setIsSearchFocused(false);
  }, [pathname]);

  // Scroll progress / Article reading completion tracking (only active on article pages)
  useEffect(() => {
    if (!showProgressBar) {
      setReadingProgress(0);
      return;
    }

    let ticking = false;

    const calculateProgress = () => {
      const scrollY = window.scrollY;
      if (scrollY <= 0) {
        setReadingProgress(0);
        return;
      }

      const articleEl =
        document.getElementById("article-content-body") ||
        document.getElementById("article-read-container");

      if (articleEl) {
        const rect = articleEl.getBoundingClientRect();
        const articleTop = rect.top + scrollY;
        const articleHeight = articleEl.offsetHeight;
        // Total scrollable distance for the article
        const maxScroll = Math.max(1, articleTop + articleHeight - window.innerHeight);

        if (scrollY >= maxScroll) {
          setReadingProgress(100);
        } else {
          const pct = (scrollY / maxScroll) * 100;
          setReadingProgress(Math.min(100, Math.max(3, pct)));
        }
      } else {
        // Page scroll progress for homepage, category, and other pages
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (maxScroll > 0) {
          const pct = (scrollY / maxScroll) * 100;
          setReadingProgress(Math.min(100, Math.max(3, pct)));
        } else {
          setReadingProgress(0);
        }
      }
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          calculateProgress();
          ticking = false;
        });
        ticking = true;
      }
    };

    calculateProgress();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [pathname, showProgressBar]);

  const isCurrentCategoryActive = (cat: { name: string; href: string }) => {
    if (!pathname) return false;
    const currentPath = pathname.toLowerCase();
    const catName = cat.name.toLowerCase();

    if (currentPath === cat.href.toLowerCase() || currentPath === `/category/${catName}` || currentPath.startsWith(`/category/${catName}/`)) {
      return true;
    }

    if (catName === "world") {
      return (
        currentPath === "/category/world" ||
        currentPath.startsWith("/category/world/") ||
        currentPath === "/news/world" ||
        currentPath.startsWith("/news/world/") ||
        ["china", "united-states", "europe", "britain", "middle-east", "africa", "asia"].some(r => currentPath === `/category/${r}` || currentPath.startsWith(`/category/${r}/`) || currentPath === `/${r}` || currentPath.startsWith(`/${r}/`))
      );
    }
    return currentPath === cat.href.toLowerCase() || currentPath === `/${catName}` || currentPath.startsWith(`/${catName}/`);
  };

  const navCategories = [
    { name: "World", href: "/category/world", hasSub: true },
    { name: "Politics", href: "/category/politics", hasSub: false },
    { name: "Business", href: "/category/business", hasSub: false },
    { name: "Technology", href: "/category/technology", hasSub: false },
    { name: "Economy", href: "/category/economy", hasSub: false },
    { name: "Markets", href: "/category/markets", hasSub: false },
    { name: "Lifestyle", href: "/category/lifestyle", hasSub: false },
    { name: "Sports", href: "/category/sports", hasSub: false },
    { name: "Entertainment", href: "/category/entertainment", hasSub: false },
    { name: "Health", href: "/category/health", hasSub: false },
    { name: "Research", href: "/category/research", hasSub: false },
    { name: "Interview", href: "/category/interview", hasSub: false },
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
        if (saved && saved.trim()) {
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
      } catch (e) { }
    };
    syncTrending();
    // NOTE: Do NOT listen to the native "storage" event — it fires in OTHER
    // browser tabs and would cause cross-tab reloads. Only use the tab-local
    // custom event for in-tab trending updates.
    window.addEventListener("dj_trending_words_change", syncTrending);
    return () => {
      window.removeEventListener("dj_trending_words_change", syncTrending);
    };
  }, []);

  const worldRegionsList = [
    { name: "World News", href: "/category/world" },
    { name: "China", href: "/category/china" },
    { name: "United States", href: "/category/united-states" },
    { name: "Europe", href: "/category/europe" },
    { name: "Britain", href: "/category/britain" },
    { name: "Middle East", href: "/category/middle-east" },
    { name: "Africa", href: "/category/africa" },
    { name: "Asia", href: "/category/asia" },
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
      <div ref={row1Ref} className="fixed top-0 left-0 right-0 z-50 w-full bg-white border-b border-gray-200 shadow-xs">
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

          {/* SEARCH INPUT BAR (hidden when already on /search) */}
          {pathname !== "/search" ? (
            <div ref={headerSearchRef} className="hidden md:block relative flex-1 max-w-[340px] lg:max-w-[400px] xl:max-w-[540px] mx-2 lg:mx-4 xl:mx-8">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  placeholder="Search for news, topics, companies..."
                  className="w-full pl-4 pr-16 py-2 text-[13px] border border-gray-300 rounded-full bg-gray-50/70 hover:bg-white focus:bg-white hover:border-[#BF1E2D] focus:border-[#BF1E2D] text-gray-800 placeholder-gray-400 transition-all outline-none shadow-2xs group"
                  aria-label="Search"
                />
                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery("");
                      setSuggestedArticles([]);
                      setIsSearchLoading(false);
                    }}
                    className="absolute right-9 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer p-0.5"
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#BF1E2D] transition-colors cursor-pointer"
                  aria-label="Submit search"
                >
                  <Search size={16} strokeWidth={2.2} />
                </button>
              </form>

              {/* Suggestions Dropdown */}
              {isSearchFocused && searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200/90 overflow-hidden z-50 py-2 divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-150">
                  {isSearchLoading ? (
                    /* Skeleton Loader while suggestions are loading */
                    <div className="px-4 py-3 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-gray-400 font-bold mb-1">
                        <span>Searching articles...</span>
                        <span className="w-2 h-2 rounded-full bg-[#BF1E2D] animate-ping" />
                      </div>
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="flex items-center gap-3 animate-pulse py-1">
                          <div className="w-10 h-10 bg-gray-200 rounded-lg shrink-0" />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="h-3.5 bg-gray-200 rounded-sm w-4/5" />
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 bg-red-100 rounded-sm w-16" />
                              <div className="h-2.5 bg-gray-100 rounded-sm w-24" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : suggestedArticles.length > 0 ? (
                    <>
                      <div className="px-4 py-1.5 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                        <span>Suggested Articles</span>
                        <span>{suggestedArticles.length} found</span>
                      </div>
                      <div className="py-1 max-h-[360px] overflow-y-auto">
                        {suggestedArticles.map((art) => (
                          <Link
                            key={art.id}
                            href={art.href}
                            onClick={() => setIsSearchFocused(false)}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50/60 transition-colors group cursor-pointer"
                          >
                            <img
                              src={art.image || "/argentina_vs_switzerland.png"}
                              alt={art.title}
                              onError={(e) => { e.currentTarget.src = "/argentina_vs_switzerland.png"; }}
                              className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-100"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#BF1E2D] line-clamp-1 transition-colors">
                                {art.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-gray-400 font-mono">
                                <span className="text-[#BF1E2D] font-bold">{art.category}</span>
                                {art.date && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">{art.date}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className="text-gray-300 group-hover:text-[#BF1E2D] shrink-0 text-xs transition-colors">
                              ↗
                            </span>
                          </Link>
                        ))}
                      </div>
                      <div className="px-4 pt-2 pb-1 bg-gray-50/70">
                        <button
                          type="button"
                          onClick={handleSearchSubmit}
                          className="w-full text-center text-xs font-bold text-[#BF1E2D] hover:underline flex items-center justify-center gap-1.5 py-1 cursor-pointer"
                        >
                          <span>See all results for &quot;{searchQuery}&quot;</span>
                          <Search size={13} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-5 text-center">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <Search size={18} />
                      </div>
                      <p className="text-xs font-bold text-gray-800">
                        No results found for &quot;{searchQuery}&quot;
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1 max-w-[280px] mx-auto">
                        Try searching for a different keyword, category, topic, or company name.
                      </p>
                      <button
                        type="button"
                        onClick={handleSearchSubmit}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Search size={13} />
                        <span>Search All Archives</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:block flex-1 mx-4 lg:mx-8" />
          )}

          {/* RIGHT ACTION BUTTONS */}
          <div className="flex items-center gap-2 sm:gap-3.5 text-[13px] font-medium shrink-0">

            {/* Newsletter Signup Button */}
            <Link
              href="/newsletters"
              className="hidden xl:inline-flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white font-bold text-[12px] px-3.5 py-2 rounded-md transition-colors whitespace-nowrap shadow-xs"
            >
              <Mail size={14} />
              <span>Newsletter Signup</span>
            </Link>

            {/* Red Subscribe Button */}
            <Link
              href="/subscribe"
              className="hidden md:flex bg-[#BF1E2D] hover:bg-red-700 text-white font-bold text-[10px] sm:text-[12px] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-md transition-colors whitespace-nowrap shadow-xs uppercase tracking-wider items-center justify-center shrink-0"
            >
              Subscribe
            </Link>

            {/* User Sign In / Profile Dropdown */}
            {currentUser ? (
              <div className="relative hidden md:block z-[100]" ref={userDropdownRef}>
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
                    {!((currentUser.role || "").toLowerCase() === "admin" || (currentUser.role || "").toLowerCase() === "co-admin" || (currentUser.email || "").toLowerCase().includes("admin")) &&
                      ((currentUser.role || "").toLowerCase() === "writer" || (currentUser.role || "").toLowerCase() === "editor" || (currentUser.email || "").toLowerCase().includes("writer")) && (
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
                className="hidden md:flex items-center gap-1.5 text-gray-800 hover:text-[#BF1E2D] font-bold text-xs sm:text-sm px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <User size={17} strokeWidth={2.2} className="text-[#BF1E2D]" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => {
                setActiveMenu(null);
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className="md:hidden text-gray-800 hover:text-[#BF1E2D] p-1 rounded-md hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

          </div>

        </div>

        {/* Article Reading Completion Bar */}
        {showProgressBar && readingProgress > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 w-full h-[3.5px] bg-transparent pointer-events-none z-50 overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full bg-[#BF1E2D] transition-[width] duration-75 ease-out"
              style={{ width: `${readingProgress}%` }}
            />
          </div>
        )}

      </div>

      {/* Spacer placeholder matching fixed Row 1 height */}
      <div style={{ height: row1Height ? `${row1Height}px` : undefined }} className="h-[58px] sm:h-[68px] md:h-[76px] w-full" aria-hidden="true" />

      {/* ================= ROW 2: CATEGORY NAVIGATION BAR ================= */}
      <div className="w-full border-b border-gray-200 bg-white relative z-40 overflow-visible">
        <div ref={row2ContainerRef} className="max-w-[1400px] mx-auto px-3 sm:px-6 flex items-center justify-between gap-4 w-full min-w-0 relative overflow-visible">

          {/* Main Horizontal Category Nav Items */}
          <nav
            ref={categoryNavRef}
            onScroll={updateWorldPos}
            onMouseDown={handleCategoryMouseDown}
            onMouseLeave={handleCategoryMouseLeave}
            onMouseUp={handleCategoryMouseUp}
            onMouseMove={handleCategoryMouseMove}
            className="flex items-center justify-between md:justify-start gap-1 sm:gap-3 md:gap-4 lg:gap-2.5 xl:gap-5 2xl:gap-6 py-2.5 sm:py-3 text-[12px] sm:text-[12.5px] lg:text-[12px] xl:text-[13px] 2xl:text-[13.5px] font-bold overflow-x-hidden md:overflow-x-auto scrollbar-none flex-1 min-w-0 md:pr-4 md:touch-pan-x select-none md:cursor-grab md:active:cursor-grabbing"
          >
            {navCategories.map((cat, index) => {
              const isWorld = cat.name === "World";
              const isWorldActive = isWorld && activeMenu === "WORLD";
              const isActive = isCurrentCategoryActive(cat);

              return (
                <div
                  key={cat.name}
                  ref={isWorld ? worldBtnRef : undefined}
                  className={`relative flex items-center group shrink-0 ${index >= 5 ? "hidden md:flex" : ""}`}
                >
                  <Link
                    href={cat.href}
                    onClick={(e) => {
                      if (hasMovedNav.current) {
                        e.preventDefault();
                        return;
                      }
                      if (isWorld) {
                        toggleWorldMenu(e);
                        return;
                      }
                      setActiveMenu(null);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-0.5 sm:gap-1 py-1 px-0.5 sm:px-1 lg:px-1.5 xl:px-2 transition-colors font-bold whitespace-nowrap border-t-2 border-transparent cursor-pointer ${isActive
                      ? "text-gray-900 border-b-2 border-[#BF1E2D]"
                      : "text-gray-800 hover:text-[#BF1E2D] border-b-2 border-transparent"
                      }`}
                  >
                    <span>{cat.name}</span>
                    {isWorld && (
                      <ChevronDown
                        size={12}
                        strokeWidth={2.5}
                        className={`text-gray-500 transition-transform duration-200 ${isWorldActive
                          ? "rotate-180 text-[#BF1E2D]"
                          : "group-hover:text-[#BF1E2D]"
                          }`}
                      />
                    )}
                  </Link>
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
              <Globe size={14} className="text-black shrink-0" strokeWidth={2} />
              <span>{selectedLang}</span>
              <ChevronDown size={12} strokeWidth={2.5} className="text-gray-400" />
            </button>

            {isLangOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => applyLanguage(lang.code, lang.label)}
                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold transition-colors ${selectedLang === lang.label
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

          {/* World Dropdown Menu: rendered outside <nav> so mobile overflow-x-auto does NOT clip it */}
          <div
            ref={worldDropdownRef}
            style={{
              left: worldDropdownLeft !== null ? `${worldDropdownLeft}px` : undefined,
            }}
            className={`absolute top-full left-3 sm:left-6 pt-2 w-[230px] sm:w-[250px] z-[100] transition-all duration-200 ${activeMenu === "WORLD"
              ? "opacity-100 visible pointer-events-auto translate-y-0"
              : "opacity-0 invisible pointer-events-none -translate-y-1"
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
                  href="/category/world"
                  onClick={() => setActiveMenu(null)}
                  className="text-[11px] font-extrabold text-[#BF1E2D] hover:underline flex items-center gap-1"
                >
                  <span>View all World coverage →</span>
                </Link>
              </div>
            </div>
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

          {/* RIGHT: DATE, COUNTRY & WEATHER WIDGET — desktop */}
          <div className="hidden lg:flex items-center gap-3 text-[11.5px] text-gray-500 font-medium shrink-0">
            {currentDate && <span>{currentDate}</span>}
            {currentDate && countryName && <span className="text-gray-300">•</span>}
            {countryName && <span>{countryName}</span>}
            {(countryName || currentDate) && weatherTemp !== null && <span className="text-gray-300">•</span>}

            {/* Weather Pill */}
            {weatherTemp !== null && (
              <div className="flex items-center gap-1 text-gray-800 font-semibold cursor-pointer hover:text-[#BF1E2D] bg-white px-2 py-0.5 rounded border border-gray-200 shadow-2xs transition-colors">
                <span>{weatherTemp}°C</span>
              </div>
            )}
          </div>

        </div>

        {/* MOBILE/TABLET ONLY: Date, Country & Weather row */}
        {(currentDate || countryName || weatherTemp !== null) && (
          <div className="lg:hidden max-w-[1400px] mx-auto px-3 sm:px-6 pb-1 pt-0.5 flex items-center justify-between gap-2 text-[10.5px] text-gray-500 font-medium">
            <div className="flex items-center gap-1.5 truncate min-w-0">
              {currentDate && <span className="truncate">{currentDate}</span>}
              {currentDate && countryName && <span className="text-gray-300 shrink-0">•</span>}
              {countryName && <span className="truncate text-gray-500">{countryName}</span>}
            </div>

            {weatherTemp !== null && (
              <div className="flex items-center gap-1 text-gray-800 font-semibold bg-white px-2 py-0.5 rounded border border-gray-200 shadow-2xs shrink-0">
                <span className="text-[11px]">{weatherTemp}°C</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MOBILE DRAWER */}
      {isMobileMenuOpen && (
        <div
          style={{
            top: row1Height ? `${row1Height}px` : undefined,
            maxHeight: row1Height ? `calc(100dvh - ${row1Height}px)` : undefined,
          }}
          className="md:hidden fixed top-[58px] sm:top-[68px] left-0 right-0 z-40 bg-white text-gray-900 border-t border-b border-gray-200 py-4 px-4 space-y-4 shadow-2xl animate-in slide-in-from-top-2 duration-200 max-h-[calc(100dvh-58px)] sm:max-h-[calc(100dvh-68px)] overflow-y-auto"
        >

          {/* Mobile Search Input */}
          {pathname !== "/search" && (
            <div ref={mobileSearchRef} className="relative w-full">
              <form
                onSubmit={(e) => {
                  setIsMobileMenuOpen(false);
                  setIsSearchFocused(false);
                  handleSearchSubmit(e);
                }}
                className="relative w-full"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  placeholder="Search for news, topics, companies..."
                  className="w-full pl-4 pr-16 py-2.5 text-xs border border-gray-300 rounded-full bg-gray-50 focus:bg-white text-gray-800 focus:border-[#BF1E2D] outline-none"
                />
                {searchQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery("");
                      setSuggestedArticles([]);
                      setIsSearchLoading(false);
                    }}
                    className="absolute right-9 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer p-0.5"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#BF1E2D]"
                  aria-label="Submit search"
                >
                  <Search size={16} />
                </button>
              </form>

              {/* Mobile Suggestions Dropdown */}
              {isSearchFocused && searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200/90 overflow-hidden z-50 py-2 divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-150">
                  {isSearchLoading ? (
                    <div className="px-4 py-3 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-gray-400 font-bold mb-1">
                        <span>Searching articles...</span>
                        <span className="w-2 h-2 rounded-full bg-[#BF1E2D] animate-ping" />
                      </div>
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="flex items-center gap-3 animate-pulse py-1">
                          <div className="w-9 h-9 bg-gray-200 rounded-lg shrink-0" />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="h-3.5 bg-gray-200 rounded-sm w-4/5" />
                            <div className="h-2.5 bg-red-100 rounded-sm w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : suggestedArticles.length > 0 ? (
                    <>
                      <div className="px-4 py-1.5 flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                        <span>Suggested Articles</span>
                        <span>{suggestedArticles.length} found</span>
                      </div>
                      <div className="py-1 max-h-[260px] overflow-y-auto">
                        {suggestedArticles.map((art) => (
                          <Link
                            key={art.id}
                            href={art.href}
                            onClick={() => {
                              setIsSearchFocused(false);
                              setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-red-50/60 transition-colors group cursor-pointer"
                          >
                            <img
                              src={art.image || "/argentina_vs_switzerland.png"}
                              alt={art.title}
                              onError={(e) => { e.currentTarget.src = "/argentina_vs_switzerland.png"; }}
                              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-100"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#BF1E2D] line-clamp-1 transition-colors">
                                {art.title}
                              </h4>
                              <span className="text-[10px] text-[#BF1E2D] font-bold font-mono">{art.category}</span>
                            </div>
                            <span className="text-gray-300 group-hover:text-[#BF1E2D] shrink-0 text-xs transition-colors">
                              ↗
                            </span>
                          </Link>
                        ))}
                      </div>
                      <div className="px-4 pt-2 pb-1 bg-gray-50/70">
                        <button
                          type="button"
                          onClick={(e) => {
                            setIsMobileMenuOpen(false);
                            setIsSearchFocused(false);
                            handleSearchSubmit(e);
                          }}
                          className="w-full text-center text-xs font-bold text-[#BF1E2D] hover:underline flex items-center justify-center gap-1.5 py-1 cursor-pointer"
                        >
                          <span>See all results for &quot;{searchQuery}&quot;</span>
                          <Search size={13} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-xs font-bold text-gray-800">
                        No results found for &quot;{searchQuery}&quot;
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          setIsMobileMenuOpen(false);
                          setIsSearchFocused(false);
                          handleSearchSubmit(e);
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Search size={13} />
                        <span>Search All Archives</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
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
            <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden font-sans transition-all">
              {/* Dropdown Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileUserDropdownOpen((prev) => !prev)}
                className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-gray-50/80 transition-colors cursor-pointer"
                aria-expanded={isMobileUserDropdownOpen}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-10 h-10 rounded-full bg-[#BF1E2D] text-white font-bold flex items-center justify-center text-sm shadow-xs uppercase overflow-hidden shrink-0 border border-gray-200">
                    {currentUser.avatar && (currentUser.avatar.startsWith("/") || currentUser.avatar.startsWith("data:") || currentUser.avatar.startsWith("http")) ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(currentUser.name || "U").charAt(0)}</span>
                    )}
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white absolute bottom-0 right-0 shadow-xs"></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {currentUser.name || "User"}
                      </p>
                      <span className="inline-flex items-center px-1.5 py-0.5 bg-red-50 text-[#BF1E2D] border border-red-100 font-extrabold text-[8.5px] uppercase tracking-wider rounded-md">
                        {currentUser.role || "READER"}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 truncate font-mono mt-0.5">
                      {currentUser.email || ""}
                    </p>
                  </div>
                </div>

                <div className={`w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 transition-transform duration-200 shrink-0 ${isMobileUserDropdownOpen ? "rotate-180 bg-red-50 text-[#BF1E2D]" : ""}`}>
                  <ChevronDown size={15} />
                </div>
              </button>

              {/* Collapsible Dropdown Menu */}
              {isMobileUserDropdownOpen && (
                <div className="px-2.5 pb-2.5 pt-1 space-y-1.5 border-t border-gray-100 bg-gray-50/50 animate-in fade-in slide-in-from-top-1 duration-150">
                  {(currentUser.role === "Admin" || currentUser.role === "Co-Admin" || (currentUser.email || "").toLowerCase().includes("admin")) && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 py-2 px-3 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-colors"
                    >
                      <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}

                  {(() => {
                    const email = (currentUser.email || "").toLowerCase().trim();
                    const userRole = (currentUser.role || "").toLowerCase().trim();
                    const isAdmin =
                      userRole === "admin" ||
                      userRole === "co-admin" ||
                      email.includes("admin");

                    if (isAdmin) {
                      return null;
                    }

                    const isSystemWriter =
                      userRole === "writer" ||
                      userRole === "editor" ||
                      email === "writer@digitaljournal.com" ||
                      email.includes("writer");

                    let isApproved = isSystemWriter;
                    if (!isApproved && email && typeof window !== "undefined") {
                      const savedProfile = getUserProfile(email);
                      const profileRole = (savedProfile?.role || "").toLowerCase().trim();
                      if (profileRole === "writer" || profileRole === "editor") {
                        isApproved = true;
                      } else {
                        const writersListStr = localStorage.getItem("dj_writers_list");
                        if (writersListStr && writersListStr.trim()) {
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
                          className="flex items-center gap-2.5 py-2 px-3 bg-blue-50/80 hover:bg-blue-100 text-[#1B50E8] rounded-lg text-xs font-bold transition-colors"
                        >
                          <PenTool size={15} className="text-[#1B50E8] shrink-0" />
                          <span>Author Workspace</span>
                        </Link>
                      );
                    }
                    return (
                      <Link
                        href="/reader"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2.5 py-2 px-3 bg-red-50/80 hover:bg-red-100 text-[#BF1E2D] rounded-lg text-xs font-bold transition-colors"
                      >
                        <BookOpen size={15} className="text-[#BF1E2D] shrink-0" />
                        <span>Reader Dashboard</span>
                      </Link>
                    );
                  })()}

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsProfileSettingsOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 py-2 px-3 bg-white hover:bg-gray-100 text-slate-800 border border-gray-200/80 rounded-lg text-xs font-bold transition-colors text-left cursor-pointer"
                  >
                    <User size={15} className="text-slate-500 shrink-0" />
                    <span>Profile Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-2.5 py-2 px-3 bg-red-50/80 hover:bg-red-100 text-red-700 border border-red-100 rounded-lg text-xs font-bold transition-colors text-left cursor-pointer"
                  >
                    <LogOut size={15} className="text-red-500 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
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

          {/* Category Navigation (Always open in Mobile Drawer) */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden font-sans transition-all">
            <div className="p-3 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Browse Categories
                </span>
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {navCategories.length}
                </span>
              </div>
            </div>

            <div className="px-2.5 pb-2.5 pt-2 space-y-2 bg-gray-50/50">
              {/* World category with dropdown */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setIsMobileWorldOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between py-2.5 px-3 text-xs font-bold text-gray-800 bg-white hover:bg-red-50 hover:text-[#BF1E2D] border border-gray-200/70 rounded-lg transition-colors shadow-2xs cursor-pointer"
                  aria-expanded={isMobileWorldOpen}
                >
                  <span className="flex items-center gap-1.5">
                    <span>World</span>
                    <span className="text-[9.5px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {worldRegionsList.length}
                    </span>
                  </span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-transform duration-200 ${isMobileWorldOpen ? "rotate-180 text-[#BF1E2D]" : "text-gray-400"}`}>
                    <ChevronDown size={14} />
                  </div>
                </button>

                {isMobileWorldOpen && (
                  <div className="p-2 space-y-1.5 bg-gray-50/80 rounded-lg border border-gray-200/70 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="grid grid-cols-2 gap-1.5">
                      {worldRegionsList.map((region, i) => (
                        <Link
                          key={i}
                          href={region.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center justify-between py-1.5 px-2.5 rounded-md text-[11.5px] font-semibold text-gray-700 bg-white hover:bg-red-50 hover:text-[#BF1E2D] border border-gray-200/50 transition-colors shadow-2xs"
                        >
                          <span>{region.name}</span>
                          <span className="text-gray-300 text-[10px]">›</span>
                        </Link>
                      ))}
                    </div>
                    <div className="pt-1.5 border-t border-gray-200/60">
                      <Link
                        href="/category/world"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-1 px-2 text-[11px] font-extrabold text-[#BF1E2D] hover:underline"
                      >
                        View all World coverage →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Rest of categories in 2-column format */}
              <div className="grid grid-cols-2 gap-2">
                {navCategories
                  .filter((cat) => cat.name !== "World")
                  .map((cat) => (
                    <Link
                      key={cat.name}
                      href={cat.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block py-2 px-3 text-xs font-bold text-gray-800 bg-white hover:bg-red-50 hover:text-[#BF1E2D] border border-gray-200/70 rounded-lg transition-colors shadow-2xs"
                    >
                      {cat.name}
                    </Link>
                  ))}
              </div>
            </div>
          </div>

          {/* Mobile Language Dropdown */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden font-sans transition-all">
            <button
              type="button"
              onClick={() => setIsMobileLanguagesOpen((prev) => !prev)}
              className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-gray-50/80 transition-colors cursor-pointer"
              aria-expanded={isMobileLanguagesOpen}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Language
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-[#BF1E2D] border border-red-100 font-bold text-[10px] rounded-md truncate">
                  <Globe size={11} className="text-black shrink-0" strokeWidth={2} />
                  <span>{selectedLang}</span>
                </span>
              </div>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 transition-transform duration-200 shrink-0 ${isMobileLanguagesOpen ? "rotate-180 bg-red-50 text-[#BF1E2D]" : ""}`}>
                <ChevronDown size={15} />
              </div>
            </button>

            {isMobileLanguagesOpen && (
              <div className="px-2.5 pb-2.5 pt-1 border-t border-gray-100 bg-gray-50/50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { applyLanguage(lang.code, lang.label); setIsMobileMenuOpen(false); }}
                      className={`text-left py-2 px-3 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${selectedLang === lang.label
                        ? "bg-red-50 text-[#BF1E2D] border-red-200 font-extrabold shadow-2xs"
                        : "text-gray-800 bg-white border-gray-200/70 hover:bg-red-50 hover:text-[#BF1E2D]"
                        }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                <span className={`px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider rounded uppercase inline-block mt-1.5 font-sans ${(currentUser?.role || "").toUpperCase() === "ADMIN"
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
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
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
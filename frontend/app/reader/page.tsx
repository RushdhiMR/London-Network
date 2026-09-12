"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  BookOpen,
  ArrowLeft,
  ChevronDown,
  Trash2,
  User,
  Settings,
  LogOut,
  CheckCircle2,
  PenTool,
  ShieldCheck,
  X,
  Lock,
  ExternalLink
} from "lucide-react";
import { getUserProfile, saveUserProfile, resolveUserAvatar, isUploadedAvatar } from "@/lib/userProfiles";
import { uploadImageToBackblaze } from "@/lib/imageUtils";

export default function ReaderDashboardPage() {
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    avatar?: string;
    role?: string;
    bio?: string;
  } | null>(null);

  const [savedArticles, setSavedArticles] = useState<any[]>([]);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Profile Settings Form State
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileLinkedin, setProfileLinkedin] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Direct upload to Backblaze B2 in "avatars" folder
      try {
        const cleanName = (currentUser?.name || currentUser?.email?.split("@")[0] || "reader").toLowerCase().replace(/[^a-z0-9]/g, "-");
        const b2Url = await uploadImageToBackblaze(file, `avatar-${cleanName}-${Date.now()}.webp`, "avatars");
        if (b2Url && b2Url.startsWith("http")) {
          setProfileAvatar(b2Url);
        }
      } catch (err) {
        console.warn("Backblaze avatar upload warning:", err);
      }
    }
  };

  const dropdownRef = useRef<HTMLDivElement>(null);

  const getUserBookmarkStorageKey = (userEmail?: string): string => {
    const activeEmail = userEmail || currentUser?.email || "guest";
    const sanitizedEmail = activeEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
    return `dj_bookmarks_${sanitizedEmail}`;
  };

  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.loading) return;

    if (!auth.authenticated || !auth.user) {
      router.push("/login");
      return;
    }

    const uRole = (auth.user.role || "").toLowerCase();
    if (uRole === "writer") {
      router.push("/writer");
      return;
    }
    if (uRole === "admin" || uRole === "co-admin") {
      router.push("/admin");
      return;
    }

    try {
      const activeEmail = auth.user.email;
      const savedProfile = getUserProfile(activeEmail);
      const displayRole = auth.user.role === "admin" ? "Admin" : auth.user.role === "writer" ? "Writer" : "Reader";

      const rawAvatar = savedProfile?.avatar || auth.user.avatar;
      const resolvedAvatar = resolveUserAvatar({
        name: savedProfile?.name || auth.user.name,
        email: activeEmail,
        role: displayRole,
        avatar: isUploadedAvatar(rawAvatar) ? rawAvatar : undefined,
      });

      const finalUser = {
        name: savedProfile?.name || auth.user.name,
        email: activeEmail,
        avatar: isUploadedAvatar(resolvedAvatar) ? resolvedAvatar : "",
        role: displayRole,
        bio: savedProfile?.bio || "Avid reader of global economics and technology innovation."
      };

      setCurrentUser(finalUser);
      setProfileName(finalUser.name);
      setProfileEmail(finalUser.email);
      setProfileBio(finalUser.bio);

      // Load Saved Articles for this user
      const key = getUserBookmarkStorageKey(activeEmail);
      const bookmarksStr = localStorage.getItem(key);
      if (bookmarksStr) {
        setSavedArticles(JSON.parse(bookmarksStr));
      } else {
        setSavedArticles([]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [auth.loading, auth.authenticated, auth.user, router]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRemoveBookmark = (titleToRemove: string) => {
    const userKey = getUserBookmarkStorageKey();
    const updated = savedArticles.filter((art) => art.title !== titleToRemove);
    setSavedArticles(updated);
    localStorage.setItem(userKey, JSON.stringify(updated));
    showToast("Article removed from your Saved Articles.");
  };

  const handleSignOut = async () => {
    try {
      await auth.logout();
    } catch (e) {
      console.warn("Reader logout error:", e);
    }
    localStorage.removeItem("dj_user");
    localStorage.removeItem("dj_admin_user");
    localStorage.removeItem("dj_writer_user");
    document.cookie = "dj_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.setItem("dj_signed_out", "true");
    localStorage.setItem("dj_toast", "You have successfully signed out.");
    window.location.href = "/";
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) {
      showToast("❌ Name and Email cannot be empty.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      showToast("❌ Password confirmation does not match.");
      return;
    }

    let finalAvatar = profileAvatar && isUploadedAvatar(profileAvatar) ? profileAvatar : "";

    if (finalAvatar && finalAvatar.startsWith("data:")) {
      try {
        const cleanName = (profileName || "reader").toLowerCase().replace(/[^a-z0-9]/g, "-");
        const b2Url = await uploadImageToBackblaze(finalAvatar, `avatar-${cleanName}-${Date.now()}.webp`, "avatars");
        if (b2Url && b2Url.startsWith("http")) {
          finalAvatar = b2Url;
        }
      } catch (e) {}
    }

    const updatedUser = {
      ...currentUser,
      name: profileName.trim(),
      email: profileEmail.trim(),
      bio: profileBio.trim(),
      linkedin: profileLinkedin.trim(),
      role: currentUser?.role || "Reader",
      avatar: finalAvatar
    };

    saveUserProfile(updatedUser);
    setCurrentUser(updatedUser);
    localStorage.setItem("dj_user", JSON.stringify(updatedUser));
    setIsProfileModalOpen(false);
    setNewPassword("");
    setConfirmPassword("");
    showToast("✓ Profile settings saved successfully!");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800 selection:bg-red-500 selection:text-white">
      
      {/* ================= TOP HEADER BAR MATCHING SCREENSHOT ================= */}
      <header className="bg-white border-b border-slate-200/90 py-3.5 px-4 md:px-10 flex items-center justify-between shadow-2xs relative z-30 font-sans">
        
        {/* Left: Back to News Link */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-[12.5px] font-medium text-slate-600 hover:text-black transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to News</span>
        </Link>

        {/* Center: Bold Serif Title "READERS DASHBOARD" */}
        <h1 className="font-serif text-[20px] sm:text-[24px] md:text-[26px] font-bold text-slate-900 uppercase tracking-[2.5px] text-center font-serif leading-none">
          READERS DASHBOARD
        </h1>

        {/* Right: User Profile Dropdown Pill ("Nesto Super v") */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-full px-3 py-1.5 transition-colors cursor-pointer text-left focus:outline-none"
            aria-label="User Account Menu"
          >
            {/* Avatar image */}
            <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-300/80 flex items-center justify-center">
              {currentUser?.avatar && isUploadedAvatar(currentUser.avatar) ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser?.name || "Nesto Super"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <User size={15} className="text-slate-400" />
              )}
            </div>
            
            {/* User Name */}
            <span className="text-[13px] font-bold text-slate-900 tracking-tight font-sans">
              {currentUser?.name || "Nesto Super"}
            </span>

            {/* Chevron icon */}
            <ChevronDown size={14} className="text-slate-400 flex-shrink-0 ml-0.5" />
          </button>

          {/* USER DROPDOWN MENU */}
          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 shadow-xl rounded-xl text-left z-50 overflow-hidden font-sans animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <p className="text-[13px] font-extrabold text-slate-900 leading-snug">
                  {currentUser?.name || "Nesto Super"}
                </p>
                <p className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                  {currentUser?.email || "reader@digitaljournal.com"}
                </p>
              </div>

              {/* Settings Action */}
              <button
                onClick={() => {
                  setIsUserDropdownOpen(false);
                  setIsProfileModalOpen(true);
                }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                <Settings size={15} className="text-slate-400" />
                <span className="text-[12.5px] font-bold">Profile Settings</span>
              </button>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 border-t border-slate-100 hover:bg-red-50/40 text-slate-700 hover:text-red-700 transition-colors cursor-pointer"
              >
                <LogOut size={15} className="text-slate-400" />
                <span className="text-[12.5px] font-bold">Sign Out</span>
              </button>
            </div>
          )}
        </div>

      </header>

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs font-bold py-2.5 px-6 rounded-full border border-zinc-700 shadow-2xl flex items-center justify-center gap-2 animate-bounce z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= MAIN DASHBOARD CONTENT ================= */}
      <main className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 md:px-10 py-8">
        
        {/* SUB-HEADER ROW: "📖 SAVED ARTICLES" AND "0 ARTICLES" PILL */}
        <div className="flex items-center justify-between mb-4 px-1">
          
          {/* Left: Book Icon + SAVED ARTICLES */}
          <div className="flex items-center gap-2 text-slate-900">
            <BookOpen className="w-5 h-5 text-[#BF1E2D]" strokeWidth={2.2} />
            <h2 className="text-[14px] md:text-[15px] font-extrabold uppercase tracking-wider font-sans text-slate-900">
              SAVED ARTICLES
            </h2>
          </div>

          {/* Right: "X ARTICLES" Count Pill */}
          <div className="bg-slate-100/90 border border-slate-200/90 text-slate-500 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-sans">
            {savedArticles.length} ARTICLES
          </div>

        </div>

        {/* ================= LARGE WHITE ROUNDED CARD CONTAINER MATCHING SCREENSHOT ================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-8 sm:p-12 md:p-16 min-h-[420px] flex items-center justify-center transition-all">
          
          {savedArticles.length === 0 ? (
            /* EMPTY STATE DISPLAY MATCHING SCREENSHOT EXACTLY */
            <div className="text-center max-w-md mx-auto py-8">
              
              {/* Circular light blue/slate icon container */}
              <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-2xs">
                <BookOpen size={30} strokeWidth={1.5} />
              </div>

              {/* No Saved Articles title */}
              <h3 className="font-bold text-[16.5px] text-slate-800 mb-1.5 font-sans tracking-tight">
                No Saved Articles
              </h3>

              {/* Explore publications subtitle */}
              <p className="text-[12.5px] text-slate-400 font-normal leading-relaxed max-w-sm mx-auto font-sans">
                Explore our publications and bookmark your favorite articles to read them here later.
              </p>

              {/* Action Link to browse stories */}
              <div className="mt-6">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 bg-[#BF1E2D] hover:bg-red-700 text-white font-bold text-[12px] uppercase tracking-wider px-6 py-2.5 rounded-lg transition-colors shadow-xs"
                >
                  <span>Explore Publications</span>
                  <ExternalLink size={14} />
                </Link>
              </div>

            </div>
          ) : (
            /* POPULATED SAVED ARTICLES LIST */
            <div className="w-full space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="font-serif text-[18px] font-bold text-slate-900">
                  Your Reading List ({savedArticles.length})
                </h3>
                <span className="text-[12px] text-slate-400 font-sans">
                  Account synced
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {savedArticles.map((art, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-white hover:shadow-sm transition-all group relative"
                  >
                    <Link
                      href={art.href}
                      className="relative w-full sm:w-[150px] h-[100px] flex-shrink-0 overflow-hidden bg-slate-100 rounded-lg border border-slate-200 block"
                    >
                      <img
                        src={art.image}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>

                    <div className="flex flex-col justify-between flex-1 pr-6">
                      <div>
                        <span className="text-[10px] font-bold text-[#BF1E2D] uppercase tracking-wider block mb-1">
                          {art.category}
                        </span>
                        <Link
                          href={art.href}
                          className="font-serif text-[15px] font-bold text-slate-900 hover:text-[#BF1E2D] transition-colors leading-snug line-clamp-2"
                        >
                          {art.title}
                        </Link>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans mt-3">
                        <span>{art.date}</span>
                        <Link
                          href={art.href}
                          className="text-[#BF1E2D] font-bold hover:underline flex items-center gap-1"
                        >
                          Read Article →
                        </Link>
                      </div>
                    </div>

                    {/* Trash remove button */}
                    <button
                      onClick={() => handleRemoveBookmark(art.title)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
                      title="Remove article"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </main>

      {/* ================= PROFILE SETTINGS MODAL MATCHING SCREENSHOT ================= */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl relative text-left overflow-hidden border-t-[5px] border-[#BF1E2D]">
            
            {/* Close Button */}
            <button
              onClick={() => setIsProfileModalOpen(false)}
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
                  alt={profileName || "Nesto Super"}
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
            <form onSubmit={handleSaveProfile} className="px-6 pt-4 pb-6 space-y-4 font-sans">
              
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
                  onClick={() => setIsProfileModalOpen(false)}
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

    </div>
  );
}

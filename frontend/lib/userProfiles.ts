export interface UserProfileData {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  role?: string;
  linkedin?: string;
  [key: string]: any;
}

/**
 * Persists updated user profile information (name, avatar, bio, role) permanently
 * across sign-outs and sign-ins keyed by email address.
 */
export function saveUserProfile(user: UserProfileData) {
  if (!user || !user.email) return;
  const emailKey = user.email.toLowerCase().trim();

  try {
    const safeSetItem = (k: string, v: string) => {
      try {
        localStorage.setItem(k, v);
      } catch (err) {
        // Handle storage quota limit gracefully
      }
    };

    // 1. Save to central dj_user_profiles_db
    const existingDbStr = localStorage.getItem("dj_user_profiles_db");
    let profilesDb: Record<string, UserProfileData> = {};
    if (existingDbStr && existingDbStr.trim()) {
      try {
        profilesDb = JSON.parse(existingDbStr);
      } catch (e) {
        profilesDb = {};
      }
    }
    
    const updatedProfile = {
      ...profilesDb[emailKey],
      ...user,
      email: emailKey
    };

    profilesDb[emailKey] = updatedProfile;
    safeSetItem("dj_user_profiles_db", JSON.stringify(profilesDb));

    // 2. Also save to dj_user_profile for active profile lookup
    safeSetItem("dj_user_profile", JSON.stringify(updatedProfile));

    // 3. Update registered users list if present
    const regStr = localStorage.getItem("dj_registered_users");
    if (regStr) {
      try {
        const regList: any[] = JSON.parse(regStr);
        const idx = regList.findIndex((u) => u.email && u.email.toLowerCase().trim() === emailKey);
        if (idx !== -1) {
          regList[idx] = { ...regList[idx], ...updatedProfile };
        } else {
          regList.push(updatedProfile);
        }
        safeSetItem("dj_registered_users", JSON.stringify(regList));
      } catch (e) {}
    }

    // 4. Update device google accounts
    const deviceStr = localStorage.getItem("dj_device_google_accounts");
    if (deviceStr) {
      try {
        const deviceList: any[] = JSON.parse(deviceStr);
        const idx = deviceList.findIndex((a) => a.email && a.email.toLowerCase().trim() === emailKey);
        if (idx !== -1) {
          deviceList[idx].name = user.name || deviceList[idx].name;
          if (user.avatar) {
            deviceList[idx].avatar = user.avatar;
          }
        }
        safeSetItem("dj_device_google_accounts", JSON.stringify(deviceList));
      } catch (e) {}
    }

    // 5. Update active user session object if email matches
    ["dj_user", "dj_writer_user"].forEach((key) => {
      const activeStr = localStorage.getItem(key);
      if (activeStr) {
        try {
          const activeObj = JSON.parse(activeStr);
          if (activeObj?.email && activeObj.email.toLowerCase().trim() === emailKey) {
            if (user.name) activeObj.name = user.name;
            if (user.avatar) activeObj.avatar = user.avatar;
            if (user.bio) activeObj.bio = user.bio;
            localStorage.setItem(key, JSON.stringify(activeObj));
          }
        } catch (e) {}
      }
    });

    // 6. Update all submitted and cached articles by this author so their authorAvatar matches
    if (user.avatar) {
      ["dj_writer_submitted_articles", "dj_live_articles_cache"].forEach((storageKey) => {
        const articlesStr = localStorage.getItem(storageKey);
        if (articlesStr) {
          try {
            const articlesList: any[] = JSON.parse(articlesStr);
            let updated = false;
            articlesList.forEach((art) => {
              const matchesEmail = art.authorEmail && art.authorEmail.toLowerCase().trim() === emailKey;
              const matchesName = user.name && art.authorName && art.authorName.toLowerCase().trim() === user.name.toLowerCase().trim();
              const matchesRushdhi = emailKey.includes("rushdhi") && (art.authorName || "").toLowerCase().includes("rushdhi");

              if (matchesEmail || matchesName || matchesRushdhi) {
                art.authorAvatar = user.avatar;
                if (user.name) art.authorName = user.name;
                updated = true;
              }
            });
            if (updated) {
              localStorage.setItem(storageKey, JSON.stringify(articlesList));
              window.dispatchEvent(new Event("dj_articles_updated"));
            }
          } catch (e) {}
        }
      });
    }

    // 7. Sync with database via API (which uploads base64 to Backblaze B2)
    if (typeof window !== "undefined") {
      fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile)
      })
        .then((res) => {
          if (!res.ok) return null;
          return res.json().catch(() => null);
        })
        .then((data) => {
          if (!data) return;
          if (data && data.success && data.user && data.user.avatar && data.user.avatar !== updatedProfile.avatar) {
            const b2Profile = { ...updatedProfile, avatar: data.user.avatar };
            try {
              const existingDb = localStorage.getItem("dj_user_profiles_db");
              const dbObj = (existingDb && existingDb.trim()) ? JSON.parse(existingDb) : {};
              dbObj[emailKey] = b2Profile;
              safeSetItem("dj_user_profiles_db", JSON.stringify(dbObj));
              safeSetItem("dj_user_profile", JSON.stringify(b2Profile));
              ["dj_user", "dj_writer_user"].forEach((k) => {
                const s = localStorage.getItem(k);
                if (s && s.trim()) {
                  const o = JSON.parse(s);
                  if (o?.email && o.email.toLowerCase().trim() === emailKey) {
                    o.avatar = data.user.avatar;
                    safeSetItem(k, JSON.stringify(o));
                  }
                }
              });
              window.dispatchEvent(new CustomEvent("dj_profile_updated", { detail: b2Profile }));
            } catch (e) {}
          }
        })
        .catch(() => {});
    }

    // 8. Dispatch custom profile update event for instant component re-rendering
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dj_profile_updated", { detail: updatedProfile }));
    }
  } catch (err) {
    console.warn("Failed to persist user profile:", err);
  }
}

/**
 * Retrieves the saved custom profile (name, avatar image, bio, role) for an email address.
 */
export function getUserProfile(email?: string | null): UserProfileData | null {
  if (!email || typeof window === "undefined") return null;
  const emailKey = email.toLowerCase().trim();

  try {
    // 1. Central profiles DB
    const existingDbStr = localStorage.getItem("dj_user_profiles_db");
    if (existingDbStr && existingDbStr.trim()) {
      try {
        const profilesDb: Record<string, UserProfileData> = JSON.parse(existingDbStr);
        if (profilesDb[emailKey]) {
          return profilesDb[emailKey];
        }
      } catch (e) {}
    }

    // 2. Active profile object
    const activeProfStr = localStorage.getItem("dj_user_profile");
    if (activeProfStr) {
      try {
        const p: UserProfileData = JSON.parse(activeProfStr);
        if (p.email && p.email.toLowerCase().trim() === emailKey) {
          return p;
        }
      } catch (e) {}
    }

    // 3. Registered users list
    const regStr = localStorage.getItem("dj_registered_users");
    if (regStr) {
      try {
        const regList: any[] = JSON.parse(regStr);
        const found = regList.find((u) => u.email && u.email.toLowerCase().trim() === emailKey);
        if (found) return found;
      } catch (e) {}
    }

    // 4. Session user objects
    for (const key of ["dj_user", "dj_writer_user", "dj_active_user"]) {
      const userStr = localStorage.getItem(key);
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u.email && u.email.toLowerCase().trim() === emailKey) return u;
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn("Failed to retrieve user profile:", err);
  }

  return null;
}

/**
 * Resolves the real profile avatar image for an author by name or email across all profile stores.
 */
export function getAuthorAvatarByNameOrEmail(name?: string, email?: string): string | null {
  if (typeof window === "undefined") return null;

  const cleanName = (name || "").toLowerCase().trim();
  const cleanEmail = (email || "").toLowerCase().trim();
  if (!cleanName && !cleanEmail) return null;

  const isNameMatch = (target: string): boolean => {
    if (!target) return false;
    const s1 = cleanName ? cleanName.replace(/[^a-z0-9]/g, "").toLowerCase() : "";
    const s2 = target.replace(/[^a-z0-9]/g, "").toLowerCase();
    if (!s2) return false;
    if (s1 && (s1 === s2 || s1.includes(s2) || s2.includes(s1))) return true;
    if ((s1.includes("rushdhi") || cleanEmail.includes("rushdhi")) && (s2.includes("rushdhi") || target.toLowerCase().includes("rushdhi"))) return true;
    return false;
  };

  try {
    // 1. Check active writer / user session
    for (const key of ["dj_writer_user", "dj_user", "dj_active_user", "dj_user_profile"]) {
      const userStr = localStorage.getItem(key);
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u.avatar && u.avatar.length > 5 && !u.avatar.includes("cart") && !u.avatar.includes("admin_profile")) {
            const uName = (u.name || "").toLowerCase().trim();
            const uEmail = (u.email || "").toLowerCase().trim();
            if ((cleanEmail && uEmail === cleanEmail) || isNameMatch(uName) || isNameMatch(uEmail)) {
              return u.avatar;
            }
          }
        } catch (e) {}
      }
    }

    // 2. Check central profiles DB
    const existingDbStr = localStorage.getItem("dj_user_profiles_db");
    if (existingDbStr) {
      try {
        const profilesDb: Record<string, UserProfileData> = JSON.parse(existingDbStr);
        if (cleanEmail && profilesDb[cleanEmail]?.avatar && profilesDb[cleanEmail].avatar!.length > 5 && !profilesDb[cleanEmail].avatar!.includes("cart")) {
          return profilesDb[cleanEmail].avatar!;
        }
        for (const p of Object.values(profilesDb)) {
          if (!p || !p.avatar || p.avatar.length <= 5 || p.avatar.includes("cart")) continue;
          const pName = (p.name || "").toLowerCase().trim();
          const pEmail = (p.email || "").toLowerCase().trim();
          if ((cleanEmail && pEmail === cleanEmail) || isNameMatch(pName) || isNameMatch(pEmail)) {
            return p.avatar;
          }
        }
      } catch (e) {}
    }

    // 3. Check registered users list
    const regStr = localStorage.getItem("dj_registered_users");
    if (regStr) {
      try {
        const regList: any[] = JSON.parse(regStr);
        for (const u of regList) {
          if (!u || !u.avatar || u.avatar.length <= 5 || u.avatar.includes("cart")) continue;
          const uName = (u.name || "").toLowerCase().trim();
          const uEmail = (u.email || "").toLowerCase().trim();
          if ((cleanEmail && uEmail === cleanEmail) || isNameMatch(uName) || isNameMatch(uEmail)) {
            return u.avatar;
          }
        }
      } catch (e) {}
    }

    // 4. Check device Google accounts
    const deviceStr = localStorage.getItem("dj_device_google_accounts");
    if (deviceStr) {
      try {
        const deviceList: any[] = JSON.parse(deviceStr);
        for (const d of deviceList) {
          if (!d || !d.avatar || d.avatar.length <= 5 || d.avatar.includes("cart")) continue;
          const dName = (d.name || "").toLowerCase().trim();
          const dEmail = (d.email || "").toLowerCase().trim();
          if ((cleanEmail && dEmail === cleanEmail) || isNameMatch(dName) || isNameMatch(dEmail)) {
            return d.avatar;
          }
        }
      } catch (e) {}
    }

    // 5. Check submitted/live articles for author's uploaded authorAvatar
    for (const key of ["dj_writer_submitted_articles", "dj_live_articles_cache"]) {
      const artStr = localStorage.getItem(key);
      if (artStr) {
        try {
          const artList: any[] = JSON.parse(artStr);
          for (const art of artList) {
            const avatar = art.authorAvatar || art.author_avatar || art.authorImage;
            if (!avatar || avatar.length <= 5 || avatar.includes("cart")) continue;
            const aName = (art.authorName || art.author_name || art.author || "").toLowerCase().trim();
            const aEmail = (art.authorEmail || art.author_email || "").toLowerCase().trim();
            if (cleanEmail && aEmail === cleanEmail) return avatar;
            if (isNameMatch(aName)) return avatar;
          }
        } catch (e) {}
      }
    }
  } catch (err) {
    console.warn("Failed to get author avatar by name/email:", err);
  }

  return null;
}

/**
 * Retrieves the full profile details (name, avatar, bio, role) set by a writer across profile stores.
 */
export function getAuthorFullProfileByNameOrEmail(name?: string, email?: string): UserProfileData | null {
  if (typeof window === "undefined") return null;

  const cleanName = (name || "").toLowerCase().trim();
  const cleanEmail = (email || "").toLowerCase().trim();
  if (!cleanName && !cleanEmail) return null;

  const isNameMatch = (target: string): boolean => {
    if (!target) return false;
    const s1 = cleanName ? cleanName.replace(/[^a-z0-9]/g, "").toLowerCase() : "";
    const s2 = target.replace(/[^a-z0-9]/g, "").toLowerCase();
    if (!s2) return false;
    if (s1 && (s1 === s2 || s1.includes(s2) || s2.includes(s1))) return true;
    if ((s1.includes("rushdhi") || cleanEmail.includes("rushdhi")) && (s2.includes("rushdhi") || target.toLowerCase().includes("rushdhi"))) return true;
    return false;
  };

  try {
    for (const key of ["dj_writer_user", "dj_user", "dj_active_user", "dj_user_profile"]) {
      const sessionStr = localStorage.getItem(key);
      if (sessionStr) {
        try {
          const uObj: UserProfileData = JSON.parse(sessionStr);
          const uName = (uObj.name || "").toLowerCase().trim();
          const uEmail = (uObj.email || "").toLowerCase().trim();
          if ((cleanEmail && uEmail === cleanEmail) || isNameMatch(uName) || isNameMatch(uEmail)) {
            return { ...uObj, role: uObj.role || "Writer" };
          }
        } catch (e) {}
      }
    }

    const existingDbStr = localStorage.getItem("dj_user_profiles_db");
    if (existingDbStr) {
      try {
        const profilesDb: Record<string, UserProfileData> = JSON.parse(existingDbStr);
        if (cleanEmail && profilesDb[cleanEmail]) return profilesDb[cleanEmail];
        for (const p of Object.values(profilesDb)) {
          if (!p) continue;
          const pName = (p.name || "").toLowerCase().trim();
          const pEmail = (p.email || "").toLowerCase().trim();
          if ((cleanEmail && pEmail === cleanEmail) || isNameMatch(pName) || isNameMatch(pEmail)) return p;
        }
      } catch (e) {}
    }

    const regStr = localStorage.getItem("dj_registered_users");
    if (regStr) {
      try {
        const regList: any[] = JSON.parse(regStr);
        for (const u of regList) {
          if (!u) continue;
          const uName = (u.name || "").toLowerCase().trim();
          const uEmail = (u.email || "").toLowerCase().trim();
          if ((cleanEmail && uEmail === cleanEmail) || isNameMatch(uName) || isNameMatch(uEmail)) return u;
        }
      } catch (e) {}
    }
  } catch (e) {}

  return null;
}

export function isUploadedAvatar(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length <= 5) return false;
  if (
    trimmed.includes("author_bluesuit") ||
    trimmed.includes("author_woman") ||
    trimmed.includes("author_glasses") ||
    trimmed.includes("author_beard") ||
    trimmed.includes("cart") ||
    trimmed.includes("admin_profile")
  ) {
    return false;
  }
  return true;
}

/**
 * Universally resolves the consistent, synchronized avatar for any user across Homepage, Writer, Reader, and Admin portals.
 * Returns empty string if the user did not upload a custom avatar.
 */
export function resolveUserAvatar(user?: { name?: string; role?: string; email?: string; avatar?: string } | null): string {
  if (!user) return "";

  // 1. Check saved user profile in database/localStorage by email or name FIRST
  // If this author has an active account or saved profile image, that ALWAYS takes priority!
  if (user.email || user.name) {
    const saved = getUserProfile(user.email);
    if (saved?.avatar && isUploadedAvatar(saved.avatar)) {
      return saved.avatar;
    }
    const resolved = getAuthorAvatarByNameOrEmail(user.name, user.email);
    if (resolved && isUploadedAvatar(resolved)) {
      return resolved;
    }
  }

  // 2. Direct valid avatar on user object if user uploaded one
  if (user.avatar && isUploadedAvatar(user.avatar)) {
    return user.avatar;
  }

  return "";
}

/**
 * Checks whether an email address is already registered to ensure strict 1 user per email.
 */
export function isEmailAlreadyRegistered(email?: string | null): { exists: boolean; role?: string; user?: any } {
  if (!email) return { exists: false };
  const target = email.toLowerCase().trim();

  try {
    // 1. Check central profiles DB
    const existingDbStr = typeof window !== "undefined" ? localStorage.getItem("dj_user_profiles_db") : null;
    if (existingDbStr && existingDbStr.trim()) {
      try {
        const profilesDb: Record<string, UserProfileData> = JSON.parse(existingDbStr);
        if (profilesDb[target]) {
          return { exists: true, role: profilesDb[target].role, user: profilesDb[target] };
        }
      } catch (e) {}
    }

    // 2. Check registered users list
    const regStr = typeof window !== "undefined" ? localStorage.getItem("dj_registered_users") : null;
    if (regStr && regStr.trim()) {
      try {
        const regList: any[] = JSON.parse(regStr);
        if (Array.isArray(regList)) {
          const found = regList.find((u) => u.email && u.email.toLowerCase().trim() === target);
          if (found) {
            return { exists: true, role: found.role, user: found };
          }
        }
      } catch (e) {}
    }

    // 3. Check writers list
    const writerStr = typeof window !== "undefined" ? localStorage.getItem("dj_writers_list") : null;
    if (writerStr && writerStr.trim()) {
      try {
        const writerList: any[] = JSON.parse(writerStr);
        if (Array.isArray(writerList)) {
          const found = writerList.find((w) => w.email && w.email.toLowerCase().trim() === target);
          if (found) {
            return { exists: true, role: "Writer", user: found };
          }
        }
      } catch (e) {}
    }

    // 4. Check co-admins list
    const coStr = typeof window !== "undefined" ? localStorage.getItem("dj_co_admins_list") : null;
    if (coStr && coStr.trim()) {
      try {
        const coList: any[] = JSON.parse(coStr);
        if (Array.isArray(coList)) {
          const found = coList.find((c) => c.email && c.email.toLowerCase().trim() === target);
          if (found) {
            return { exists: true, role: "Co-Admin", user: found };
          }
        }
      } catch (e) {}
    }
  } catch (err) {
    console.warn("Failed to check duplicate email:", err);
  }

  return { exists: false };
}

/**
 * Checks if an email is marked as deleted/blacklisted by the administrator.
 */
export function isEmailDeletedOnClient(email?: string | null): boolean {
  if (!email || typeof window === "undefined") return false;
  const target = email.toLowerCase().trim();
  try {
    const blStr = localStorage.getItem("dj_deleted_users_blacklist");
    if (blStr && blStr.trim()) {
      const list: string[] = JSON.parse(blStr);
      if (Array.isArray(list)) {
        return list.some((e) => e.toLowerCase().trim() === target);
      }
    }
  } catch (e) {}
  return false;
}

const inMemoryBookmarkCache: Record<string, string> = {};

/**
 * Frees up localStorage space when quota is reached by purging non-critical caches
 * and truncating oversized transient items.
 */
function freeBulkyLocalStorageSpace() {
  if (typeof window === "undefined") return;

  // 1. Remove non-essential transient caches
  const transientKeys = [
    "dj_articles_cache",
    "dj_recent_searches",
    "dj_editing_post",
    "dj_trashed_articles",
    "dj_deleted_articles",
    "dj_live_articles_cache",
  ];
  for (const k of transientKeys) {
    try {
      localStorage.removeItem(k);
    } catch (e) {}
  }

  // 2. Remove bulky comment caches
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("dj_article_comments_") || k.startsWith("temp_"))) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {}

  // 3. Prune bulky data URLs or oversized drafts in dj_writer_submitted_articles
  try {
    const writerStr = localStorage.getItem("dj_writer_submitted_articles");
    if (writerStr && writerStr.length > 25000) {
      const parsed = JSON.parse(writerStr);
      if (Array.isArray(parsed)) {
        const trimmed = parsed.slice(0, 10).map((a: any) => ({
          ...a,
          image: typeof a?.image === "string" && a.image.startsWith("data:") ? "" : a.image,
          content: typeof a?.content === "string" && a.content.length > 5000 ? a.content.slice(0, 5000) : a.content,
        }));
        localStorage.setItem("dj_writer_submitted_articles", JSON.stringify(trimmed));
      }
    }
  } catch (e) {}
}

/**
 * Deduplicates bookmarks by unique ID and title so an article can never appear twice.
 */
export function deduplicateBookmarkList(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const deduplicated: any[] = [];

  for (const item of list) {
    if (!item) continue;
    const itemId = String(item?.id || item?.article_id || "").trim();
    const itemTitle = String(item?.title || "").trim().toLowerCase();

    if (itemId && seenIds.has(itemId)) continue;
    if (itemTitle && itemTitle !== "untitled article" && seenTitles.has(itemTitle)) continue;

    if (itemId) seenIds.add(itemId);
    if (itemTitle && itemTitle !== "untitled article") seenTitles.add(itemTitle);
    deduplicated.push(item);
  }
  return deduplicated;
}

/**
 * Safely reads bookmarks for a user, checking localStorage, sessionStorage,
 * and an in-memory fallback, and automatically deduplicates entries.
 */
export function safeGetBookmarksFromStorage(key: string): any[] {
  if (typeof window === "undefined" || !key) return [];
  try {
    let raw = localStorage.getItem(key);
    if (!raw && typeof sessionStorage !== "undefined") {
      raw = sessionStorage.getItem(key);
    }
    if (!raw && inMemoryBookmarkCache[key]) {
      raw = inMemoryBookmarkCache[key];
    }
    if (raw && raw.trim()) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return deduplicateBookmarkList(parsed);
    }
  } catch (e) {}
  return [];
}

/**
 * Saves reader bookmarks safely to storage with automatic quota cleanup
 * and fallbacks to prevent QuotaExceededError. Deduplicates list before storing.
 */
export function safeSaveBookmarksToStorage(key: string, list: any[]): boolean {
  if (typeof window === "undefined" || !key) return false;

  // Deduplicate before saving to prevent duplicate articles
  const deduplicated = deduplicateBookmarkList(Array.isArray(list) ? list : []);

  // 1. Sanitize list into lightweight bookmarks without heavy data URLs
  const cleaned = deduplicated.slice(0, 30).map((item) => {
    const rawImg = item?.image || "";
    const safeImg = typeof rawImg === "string" && !rawImg.startsWith("data:") && rawImg.length < 500 ? rawImg : "";
    return {
      id: String(item?.id || ""),
      title: String(item?.title || "Article").slice(0, 250),
      category: String(item?.category || "GENERAL").slice(0, 50),
      href: String(item?.href || "/").slice(0, 250),
      date: String(item?.date || "Recent").slice(0, 50),
      image: safeImg,
      savedAt: String(item?.savedAt || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })),
    };
  });

  const serialized = JSON.stringify(cleaned);
  inMemoryBookmarkCache[key] = serialized;

  // Always mirror to sessionStorage as a safe secondary quota
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(key, serialized);
    }
  } catch (e) {}

  // 2. Attempt writing to localStorage
  try {
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    // Quota reached: free up bulky cache items and retry
    freeBulkyLocalStorageSpace();

    try {
      localStorage.setItem(key, serialized);
      return true;
    } catch (err2) {
      // 3. Compact fallback: remove images and take top 20
      try {
        const compact = cleaned.slice(0, 20).map(({ id, title, category, href, date, savedAt }) => ({
          id, title, category, href, date, savedAt
        }));
        const compactSerialized = JSON.stringify(compact);
        inMemoryBookmarkCache[key] = compactSerialized;
        try {
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(key, compactSerialized);
          }
        } catch (e) {}

        localStorage.setItem(key, compactSerialized);
        return true;
      } catch (err3) {
        // Fallback silently without throwing or calling console.error which triggers Next.js dev overlay
        return true;
      }
    }
  }
}

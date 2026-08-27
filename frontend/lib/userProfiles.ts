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
    const profilesDb: Record<string, UserProfileData> = existingDbStr ? JSON.parse(existingDbStr) : {};
    
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

    // 7. Sync with database via API
    if (typeof window !== "undefined") {
      fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile)
      }).catch((err) => console.warn("Database profile sync warning:", err));
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
    if (existingDbStr) {
      const profilesDb: Record<string, UserProfileData> = JSON.parse(existingDbStr);
      if (profilesDb[emailKey]) {
        return profilesDb[emailKey];
      }
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
            if ((cleanEmail && uEmail === cleanEmail) || (cleanName && (uName === cleanName || uName.includes(cleanName) || cleanName.includes(uName)))) {
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
          if (cleanEmail && pEmail === cleanEmail) return p.avatar;
          if (cleanName && (pName === cleanName || pName.includes(cleanName) || cleanName.includes(pName))) return p.avatar;
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
          if (cleanEmail && uEmail === cleanEmail) return u.avatar;
          if (cleanName && (uName === cleanName || uName.includes(cleanName) || cleanName.includes(uName))) return u.avatar;
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
          if (cleanEmail && dEmail === cleanEmail) return d.avatar;
          if (cleanName && (dName === cleanName || dName.includes(cleanName) || cleanName.includes(dName))) return d.avatar;
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
            if (cleanName && (aName === cleanName || aName.includes(cleanName) || cleanName.includes(aName))) return avatar;
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

  try {
    for (const key of ["dj_writer_user", "dj_user", "dj_active_user", "dj_user_profile"]) {
      const sessionStr = localStorage.getItem(key);
      if (sessionStr) {
        try {
          const uObj: UserProfileData = JSON.parse(sessionStr);
          const uName = (uObj.name || "").toLowerCase().trim();
          const uEmail = (uObj.email || "").toLowerCase().trim();
          if ((cleanEmail && uEmail === cleanEmail) || (cleanName && (uName === cleanName || uName.includes(cleanName) || cleanName.includes(uName)))) {
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
          if (cleanEmail && pEmail === cleanEmail) return p;
          if (cleanName && (pName === cleanName || pName.includes(cleanName) || cleanName.includes(pName))) return p;
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
          if (cleanEmail && uEmail === cleanEmail) return u;
          if (cleanName && (uName === cleanName || uName.includes(cleanName) || cleanName.includes(uName))) return u;
        }
      } catch (e) {}
    }
  } catch (e) {}

  return null;
}

/**
 * Universally resolves the consistent, synchronized avatar for any user across Homepage, Writer, Reader, and Admin portals.
 */
export function resolveUserAvatar(user?: { name?: string; role?: string; email?: string; avatar?: string } | null): string {
  if (!user) return "/author_bluesuit.jpg";

  // 1. Direct valid avatar on user object
  if (user.avatar && user.avatar.length > 5 && !user.avatar.includes("cart") && !user.avatar.includes("admin_profile")) {
    return user.avatar;
  }

  // 2. Check saved user profile in database/localStorage by email or name
  if (user.email || user.name) {
    const saved = getUserProfile(user.email);
    if (saved?.avatar && saved.avatar.length > 5 && !saved.avatar.includes("cart")) {
      return saved.avatar;
    }
    const resolved = getAuthorAvatarByNameOrEmail(user.name, user.email);
    if (resolved && resolved.length > 5 && !resolved.includes("cart")) {
      return resolved;
    }
  }

  // 3. Fallbacks for default demo authors
  const name = (user.name || "").toLowerCase().trim();
  const role = (user.role || "").toLowerCase().trim();

  if (name.includes("jennifer") || name.includes("friesen") || name.includes("sarah")) {
    return "/author_woman.jpg";
  }
  if (name.includes("april") || name.includes("hicke")) {
    return "/author_glasses.jpg";
  }
  if (name.includes("chris") || name.includes("hogg") || role === "admin") {
    return "/author_beard.jpg";
  }

  return "/author_bluesuit.jpg";
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
    if (existingDbStr) {
      const profilesDb: Record<string, UserProfileData> = JSON.parse(existingDbStr);
      if (profilesDb[target]) {
        return { exists: true, role: profilesDb[target].role, user: profilesDb[target] };
      }
    }

    // 2. Check registered users list
    const regStr = typeof window !== "undefined" ? localStorage.getItem("dj_registered_users") : null;
    if (regStr) {
      const regList: any[] = JSON.parse(regStr);
      const found = regList.find((u) => u.email && u.email.toLowerCase().trim() === target);
      if (found) {
        return { exists: true, role: found.role, user: found };
      }
    }

    // 3. Check writers list
    const writerStr = typeof window !== "undefined" ? localStorage.getItem("dj_writers_list") : null;
    if (writerStr) {
      const writerList: any[] = JSON.parse(writerStr);
      const found = writerList.find((w) => w.email && w.email.toLowerCase().trim() === target);
      if (found) {
        return { exists: true, role: "Writer", user: found };
      }
    }

    // 4. Check co-admins list
    const coStr = typeof window !== "undefined" ? localStorage.getItem("dj_co_admins_list") : null;
    if (coStr) {
      const coList: any[] = JSON.parse(coStr);
      const found = coList.find((c) => c.email && c.email.toLowerCase().trim() === target);
      if (found) {
        return { exists: true, role: "Co-Admin", user: found };
      }
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
    if (blStr) {
      const list: string[] = JSON.parse(blStr);
      return list.some((e) => e.toLowerCase().trim() === target);
    }
  } catch (e) {}
  return false;
}

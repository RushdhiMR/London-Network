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

    // 6. Update all submitted articles by this author so their authorAvatar matches
    if (user.avatar) {
      const articlesStr = localStorage.getItem("dj_writer_submitted_articles");
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
            localStorage.setItem("dj_writer_submitted_articles", JSON.stringify(articlesList));
            window.dispatchEvent(new Event("dj_articles_updated"));
          }
        } catch (e) {}
      }
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
    const existingDbStr = localStorage.getItem("dj_user_profiles_db");
    if (existingDbStr) {
      const profilesDb: Record<string, UserProfileData> = JSON.parse(existingDbStr);
      if (profilesDb[emailKey]) {
        return profilesDb[emailKey];
      }
      
      // Fallback cross-alias lookup for Rushdhi MR
      if (emailKey.includes("rushdhi") || emailKey.includes("writer@digitaljournal.com")) {
        const aliases = ["writer@digitaljournal.com", "rushdhiriyaj2005@gmail.com", "rushdhi", "rushdhi-mr"];
        for (const alias of aliases) {
          if (profilesDb[alias]) return profilesDb[alias];
        }
      }
    }

    // Check registered users list
    const regStr = localStorage.getItem("dj_registered_users");
    if (regStr) {
      const regList: any[] = JSON.parse(regStr);
      const found = regList.find((u) => u.email && u.email.toLowerCase().trim() === emailKey);
      if (found) {
        return found;
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
    // 1. Check active writer user session first
    const writerStr = localStorage.getItem("dj_writer_user");
    if (writerStr) {
      try {
        const w = JSON.parse(writerStr);
        if (w.avatar && w.avatar.length > 5 && !w.avatar.includes("cart") && !w.avatar.includes("admin_profile")) {
          const wName = (w.name || "").toLowerCase().trim();
          const wEmail = (w.email || "").toLowerCase().trim();
          if ((cleanEmail && wEmail === cleanEmail) || (cleanName && (wName === cleanName || wName.includes(cleanName) || cleanName.includes(wName)))) {
            return w.avatar;
          }
          if (cleanName.includes("rushdhi") && (wName.includes("rushdhi") || wEmail.includes("rushdhi"))) {
            return w.avatar;
          }
        }
      } catch (e) {}
    }

    // 2. Check writers list
    const writersListStr = localStorage.getItem("dj_writers_list");
    if (writersListStr) {
      try {
        const wList: any[] = JSON.parse(writersListStr);
        for (const w of wList) {
          if (!w || !w.avatar || w.avatar.length <= 5 || w.avatar.includes("cart") || w.avatar.includes("admin_profile")) continue;
          const wName = (w.name || "").toLowerCase().trim();
          const wEmail = (w.email || "").toLowerCase().trim();
          if ((cleanEmail && wEmail === cleanEmail) || (cleanName && (wName === cleanName || wName.includes(cleanName) || cleanName.includes(wName)))) {
            return w.avatar;
          }
          if (cleanName.includes("rushdhi") && (wName.includes("rushdhi") || wEmail.includes("rushdhi"))) {
            return w.avatar;
          }
        }
      } catch (e) {}
    }

    // 3. Check central profiles DB (strictly excluding reader profiles)
    const existingDbStr = localStorage.getItem("dj_user_profiles_db");
    if (existingDbStr) {
      const profilesDb: Record<string, UserProfileData> = JSON.parse(existingDbStr);
      // Check direct email key
      if (cleanEmail && profilesDb[cleanEmail]?.avatar && profilesDb[cleanEmail].avatar!.length > 5 && !profilesDb[cleanEmail].avatar!.includes("cart") && !profilesDb[cleanEmail].avatar!.includes("admin_profile")) {
        const pRole = (profilesDb[cleanEmail].role || "").toLowerCase();
        if (!pRole.includes("reader")) {
          return profilesDb[cleanEmail].avatar!;
        }
      }
      // Check all profile entries by name or email
      for (const p of Object.values(profilesDb)) {
        if (!p || !p.avatar || p.avatar.length <= 5 || p.avatar.includes("cart") || p.avatar.includes("admin_profile")) continue;
        const pRole = (p.role || "").toLowerCase();
        if (pRole.includes("reader")) continue;

        const pName = (p.name || "").toLowerCase().trim();
        const pEmail = (p.email || "").toLowerCase().trim();
        if (cleanEmail && pEmail === cleanEmail) return p.avatar;
        if (cleanName && (pName === cleanName || pName.includes(cleanName) || cleanName.includes(pName))) return p.avatar;
        if (cleanName.includes("rushdhi") && (pName.includes("rushdhi") || pEmail.includes("rushdhi"))) return p.avatar;
      }
    }

    // 4. Check active user profile only if role is writer or journalist
    const activeProfStr = localStorage.getItem("dj_user_profile");
    if (activeProfStr) {
      const activeProf: UserProfileData = JSON.parse(activeProfStr);
      const profRole = (activeProf.role || "").toLowerCase();
      if (!profRole.includes("reader") && activeProf.avatar && activeProf.avatar.length > 5 && !activeProf.avatar.includes("cart") && !activeProf.avatar.includes("admin_profile")) {
        const pName = (activeProf.name || "").toLowerCase().trim();
        const pEmail = (activeProf.email || "").toLowerCase().trim();
        if ((cleanEmail && pEmail === cleanEmail) || (cleanName && (pName === cleanName || pName.includes(cleanName) || cleanName.includes(pName)))) {
          return activeProf.avatar;
        }
        if (cleanName.includes("rushdhi") && (pName.includes("rushdhi") || pEmail.includes("rushdhi"))) {
          return activeProf.avatar;
        }
      }
    }

    // 5. Check active session user objects (excluding reader role)
    for (const key of ["dj_user", "dj_writer_user"]) {
      const userStr = localStorage.getItem(key);
      if (userStr) {
        const userObj = JSON.parse(userStr);
        const uRole = (userObj.role || "").toLowerCase();
        if (uRole.includes("reader")) continue;

        if (userObj.avatar && userObj.avatar.length > 5 && !userObj.avatar.includes("cart") && !userObj.avatar.includes("admin_profile")) {
          const uName = (userObj.name || "").toLowerCase().trim();
          const uEmail = (userObj.email || "").toLowerCase().trim();
          if ((cleanEmail && uEmail === cleanEmail) || (cleanName && (uName === cleanName || uName.includes(cleanName) || cleanName.includes(uName)))) {
            return userObj.avatar;
          }
          if (cleanName.includes("rushdhi") && (uName.includes("rushdhi") || uEmail.includes("rushdhi"))) {
            return userObj.avatar;
          }
        }
      }
    }

    // 6. Check submitted/live articles for writer's real uploaded authorAvatar
    for (const key of ["dj_writer_submitted_articles", "dj_live_articles_cache"]) {
      const artStr = localStorage.getItem(key);
      if (artStr) {
        try {
          const artList: any[] = JSON.parse(artStr);
          for (const art of artList) {
            const avatar = art.authorAvatar || art.author_avatar || art.authorImage;
            if (!avatar || avatar.length <= 5 || avatar.includes("cart") || avatar.includes("admin_profile")) continue;
            const aName = (art.authorName || art.author_name || art.author || "").toLowerCase().trim();
            const aEmail = (art.authorEmail || art.author_email || "").toLowerCase().trim();
            if (cleanEmail && aEmail === cleanEmail) return avatar;
            if (cleanName && (aName === cleanName || aName.includes(cleanName) || cleanName.includes(aName))) return avatar;
            if (cleanName.includes("rushdhi") && (aName.includes("rushdhi") || aEmail.includes("rushdhi"))) return avatar;
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
    // 1. Priority 1: Check active writer session
    const writerSessionStr = localStorage.getItem("dj_writer_user");
    if (writerSessionStr) {
      const wObj: UserProfileData = JSON.parse(writerSessionStr);
      const wName = (wObj.name || "").toLowerCase().trim();
      const wEmail = (wObj.email || "").toLowerCase().trim();
      if ((cleanEmail && wEmail === cleanEmail) || (cleanName && (wName === cleanName || wName.includes(cleanName) || cleanName.includes(wName)))) {
        return {
          ...wObj,
          role: wObj.role || "Writer"
        };
      }
    }

    // 2. Priority 2: Check writers list
    const writersListStr = localStorage.getItem("dj_writers_list");
    if (writersListStr) {
      const wList: any[] = JSON.parse(writersListStr);
      for (const w of wList) {
        if (!w) continue;
        const wName = (w.name || "").toLowerCase().trim();
        const wEmail = (w.email || "").toLowerCase().trim();
        if ((cleanEmail && wEmail === cleanEmail) || (cleanName && (wName === cleanName || wName.includes(cleanName) || cleanName.includes(wName)))) {
          return {
            ...w,
            role: w.role || "Writer"
          };
        }
      }
    }

    // 3. Priority 3: Check central profiles DB (strictly excluding reader profiles)
    const existingDbStr = localStorage.getItem("dj_user_profiles_db");
    if (existingDbStr) {
      const profilesDb: Record<string, UserProfileData> = JSON.parse(existingDbStr);
      if (cleanEmail && profilesDb[cleanEmail]) {
        const p = profilesDb[cleanEmail];
        const roleLower = (p.role || "").toLowerCase();
        if (!roleLower.includes("reader")) {
          return p;
        }
      }
      for (const p of Object.values(profilesDb)) {
        if (!p) continue;
        const roleLower = (p.role || "").toLowerCase();
        if (roleLower.includes("reader")) continue;

        const pName = (p.name || "").toLowerCase().trim();
        const pEmail = (p.email || "").toLowerCase().trim();
        if (cleanEmail && pEmail === cleanEmail) return p;
        if (cleanName && (pName === cleanName || pName.includes(cleanName) || cleanName.includes(pName))) return p;
        if (cleanName.includes("rushdhi") && (pName.includes("rushdhi") || pEmail.includes("rushdhi"))) return p;
      }
    }

    // 4. Priority 4: Check registered users list (excluding reader profiles)
    const regStr = localStorage.getItem("dj_registered_users");
    if (regStr) {
      const regList: any[] = JSON.parse(regStr);
      for (const u of regList) {
        if (!u) continue;
        const roleLower = (u.role || "").toLowerCase();
        if (roleLower.includes("reader")) continue;

        const uName = (u.name || "").toLowerCase().trim();
        const uEmail = (u.email || "").toLowerCase().trim();
        if (cleanEmail && uEmail === cleanEmail) return u;
        if (cleanName && (uName === cleanName || uName.includes(cleanName) || cleanName.includes(uName))) return u;
        if (cleanName.includes("rushdhi") && (uName.includes("rushdhi") || uEmail.includes("rushdhi"))) return u;
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Universally resolves the consistent, synchronized avatar for any user across Homepage, Writer, Reader, and Admin portals.
 */
export function resolveUserAvatar(user?: { name?: string; role?: string; email?: string; avatar?: string } | null): string {
  if (!user) return "/author_woman.jpg";

  // 1. Return custom uploaded/saved avatar if present
  if (user.avatar && user.avatar.length > 5 && !user.avatar.includes("cart")) {
    return user.avatar;
  }

  // 2. Check saved user profile in database/localStorage
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

  // 3. Deterministic fallbacks
  const name = (user.name || "").toLowerCase().trim();
  const role = (user.role || "").toLowerCase().trim();

  if (name.includes("jennifer") || name.includes("friesen") || name.includes("muba") || name.includes("sarah") || name.includes("woman")) {
    return "/author_woman.jpg";
  }
  if (name.includes("april") || name.includes("hicke")) {
    return "/author_glasses.jpg";
  }
  if (name.includes("chris") || name.includes("hogg") || role === "admin") {
    return "/author_beard.jpg";
  }
  if (name.includes("rushdhi")) {
    return "/author_bluesuit.jpg";
  }
  if (name.includes("pramod") || name.includes("jain")) {
    return "/author_bluesuit.jpg";
  }

  if (role === "admin") return "/author_beard.jpg";
  return "/author_woman.jpg";
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

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

export interface User {
  id: number;
  name: string;
  email: string;
  role: "reader" | "writer" | "admin";
  provider: string;
  avatar?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  role: "reader" | "writer" | "admin" | null;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authenticated: false,
  role: null,
  refreshUser: async () => null,
  logout: async () => {},
});

const SESSION_TAB_KEY = "dj_tab_session";

/**
 * Saves the current user to sessionStorage (tab-isolated).
 * This prevents cross-tab contamination while the HTTP-only cookie handles server auth.
 */
function saveTabSession(user: User | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      sessionStorage.setItem(SESSION_TAB_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_TAB_KEY);
    }
  } catch (e) {}
}

/**
 * Reads the cached user from sessionStorage (tab-isolated).
 */
function getTabSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_TAB_KEY);
    if (raw) return JSON.parse(raw) as User;
  } catch (e) {}
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialise from sessionStorage immediately to avoid flicker on refresh
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      return getTabSession();
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  // Track whether we've done the first server fetch for this tab
  const didFetch = useRef(false);

  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          const fetchedUser: User = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: (data.user.role || "reader").toLowerCase() as "reader" | "writer" | "admin",
            provider: data.user.provider || "local",
          };

          // If there's already a cached tab session for a DIFFERENT user,
          // keep the existing tab session rather than overwriting it.
          // This preserves independent sessions across tabs.
          const existing = getTabSession();
          if (existing && existing.id !== fetchedUser.id) {
            // This tab has its own session — respect it, don't overwrite
            setUser(existing);
            setLoading(false);
            return existing;
          }

          setUser(fetchedUser);
          saveTabSession(fetchedUser);
          setLoading(false);
          return fetchedUser;
        }
      }
    } catch (err) {
      console.warn("[AuthContext] Error fetching current user session:", err);
    }

    // Only clear if there's no cached tab session
    const existing = getTabSession();
    if (!existing) {
      setUser(null);
      saveTabSession(null);
    } else {
      setUser(existing);
    }
    setLoading(false);
    return getTabSession();
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.warn("[AuthContext] Logout API error:", e);
    }
    setUser(null);
    saveTabSession(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("dj_auth_change"));
    }
  }, []);

  /**
   * Called after a successful login in this tab.
   * Updates the tab session with the newly logged-in user.
   */
  const loginToTab = useCallback((loggedInUser: User) => {
    setUser(loggedInUser);
    saveTabSession(loggedInUser);
  }, []);

  useEffect(() => {
    // On mount: if we already have a tab session, use it and validate in background
    if (!didFetch.current) {
      didFetch.current = true;
      const cached = getTabSession();
      if (cached) {
        setLoading(false);
        // Validate with server in background — only update if same user
        fetch("/api/auth/me", { cache: "no-store" })
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (data?.authenticated && data?.user) {
              if (cached.id === data.user.id) {
                const updated: User = {
                  id: data.user.id,
                  name: data.user.name,
                  email: data.user.email,
                  role: (data.user.role || "reader").toLowerCase() as User["role"],
                  provider: data.user.provider || "local",
                };
                setUser(updated);
                saveTabSession(updated);
              }
            }
          })
          .catch(() => {});
      } else {
        fetchCurrentUser();
      }
    }

    const handleAuthEvent = () => {
      // Only re-fetch if this tab has no session (e.g., after explicit logout)
      const cached = getTabSession();
      if (!cached) {
        fetchCurrentUser();
      }
    };

    // Listen for explicit login events dispatched from the login page
    const handleLoginEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as User;
      if (detail) {
        setUser(detail);
        saveTabSession(detail);
        setLoading(false);
      }
    };

    window.addEventListener("dj_auth_change", handleAuthEvent);
    window.addEventListener("dj_tab_login", handleLoginEvent);
    return () => {
      window.removeEventListener("dj_auth_change", handleAuthEvent);
      window.removeEventListener("dj_tab_login", handleLoginEvent);
    };
  }, [fetchCurrentUser]);

  const value = {
    user,
    loading,
    authenticated: !!user,
    role: user ? user.role : null,
    refreshUser: fetchCurrentUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Call this after a successful login to bind the user to this tab's session.
 * Dispatches a tab-scoped login event that AuthProvider listens for.
 */
export function dispatchTabLogin(user: User) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SESSION_TAB_KEY, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent("dj_tab_login", { detail: user }));
  }
}

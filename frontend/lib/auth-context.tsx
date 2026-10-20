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
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authenticated: false,
  role: null,
  refreshUser: async () => null,
  logout: async () => {},
  getToken: () => null,
});

export const TAB_SESSION_STORAGE_KEY = "dj_tab_session";

export function getTabSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TAB_SESSION_STORAGE_KEY);
    if (!raw || !raw.trim()) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") return parsed.token || null;
  } catch {
    const raw = sessionStorage.getItem(TAB_SESSION_STORAGE_KEY);
    return raw || null;
  }
  return null;
}

export function getTabSessionUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(TAB_SESSION_STORAGE_KEY);
    if (!raw || !raw.trim()) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.user) return parsed.user;
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const didFetch = useRef(false);

  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    if (typeof window === "undefined") {
      setLoading(false);
      return null;
    }

    try {
      // Tab-isolated authentication: check this specific tab's sessionStorage
      const token = getTabSessionToken();
      const cachedUser = getTabSessionUser();

      if (!token) {
        // This tab has NO active login session -> explicitly unauthenticated!
        // We do NOT call /api/auth/me without a token because browser cookies
        // are shared across tabs and would erroneously log this tab in.
        setUser(null);
        setLoading(false);
        return null;
      }

      // If we have a cached user for this tab, show it immediately (prevent UI flash)
      if (cachedUser) {
        setUser(cachedUser);
      }

      // Validate token with server to ensure account is active and role is up-to-date
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          const fetchedUser: User = {
            id: data.user.id || 1,
            name: data.user.name,
            email: data.user.email,
            role: (data.user.role || "reader").toLowerCase() as "reader" | "writer" | "admin",
            provider: data.user.provider || "local",
            avatar: data.user.avatar,
            bio: data.user.bio,
          };

          // Save refreshed user to this tab's session
          sessionStorage.setItem(TAB_SESSION_STORAGE_KEY, JSON.stringify({ token, user: fetchedUser }));
          setUser(fetchedUser);
          setLoading(false);
          return fetchedUser;
        }
      }

      // If token validation fails, clear only this tab's session
      sessionStorage.removeItem(TAB_SESSION_STORAGE_KEY);
    } catch (err) {
      console.warn("[AuthContext] Error validating tab session:", err);
    }

    setUser(null);
    setLoading(false);
    return null;
  }, []);

  const logout = useCallback(async () => {
    const token = getTabSessionToken();
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      });
    } catch (e) {
      console.warn("[AuthContext] Logout API error:", e);
    }

    // Clear only this tab's session
    setUser(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(TAB_SESSION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!didFetch.current) {
      didFetch.current = true;
      fetchCurrentUser();
    }

    const handleLoginEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.user) {
        setUser(detail.user);
        setLoading(false);
      } else if (detail && detail.email) {
        setUser(detail);
        setLoading(false);
      }
    };

    window.addEventListener("dj_tab_login", handleLoginEvent);
    return () => {
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
    getToken: getTabSessionToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Dispatches active user session update to this tab.
 * Persists login state strictly to this tab's sessionStorage.
 */
export function dispatchTabLogin(user: User, token?: string) {
  if (typeof window !== "undefined") {
    if (token) {
      try {
        sessionStorage.setItem(TAB_SESSION_STORAGE_KEY, JSON.stringify({ token, user }));
      } catch (e) {}
    }
    window.dispatchEvent(new CustomEvent("dj_tab_login", { detail: { user, token } }));
  }
}

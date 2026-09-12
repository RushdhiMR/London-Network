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
 * Saves user strictly to sessionStorage so each browser tab has its own independent login.
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
 * Reads user strictly from this tab's sessionStorage.
 */
function getTabSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const rawTab = sessionStorage.getItem(SESSION_TAB_KEY);
    if (rawTab) {
      const parsed = JSON.parse(rawTab);
      if (parsed && (parsed.email || parsed.name)) return parsed as User;
    }
  } catch (e) {}
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialise strictly from this tab's sessionStorage
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      return getTabSession();
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const didFetch = useRef(false);

  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const currentTabUser = getTabSession();

      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
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
          };

          // If this tab already has its own active user, keep this tab's user
          if (currentTabUser && currentTabUser.email !== fetchedUser.email) {
            setUser(currentTabUser);
            setLoading(false);
            return currentTabUser;
          }

          setUser(fetchedUser);
          saveTabSession(fetchedUser);
          setLoading(false);
          return fetchedUser;
        }
      }
    } catch (err) {
      console.warn("[AuthContext] Error fetching server session:", err);
    }

    const existing = getTabSession();
    if (existing) {
      setUser(existing);
      setLoading(false);
      return existing;
    }

    setUser(null);
    saveTabSession(null);
    setLoading(false);
    return null;
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
  }, []);

  useEffect(() => {
    if (!didFetch.current) {
      didFetch.current = true;
      const cached = getTabSession();
      if (cached) {
        setUser(cached);
        setLoading(false);
      } else {
        fetchCurrentUser();
      }
    }

    const handleLoginEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as User;
      if (detail) {
        setUser(detail);
        saveTabSession(detail);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Call this after a successful login to bind the user strictly to this tab.
 */
export function dispatchTabLogin(user: User) {
  if (typeof window !== "undefined") {
    saveTabSession(user);
    window.dispatchEvent(new CustomEvent("dj_tab_login", { detail: user }));
  }
}

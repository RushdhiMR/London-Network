"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import PageSkeletonLoader from "@/components/PageSkeletonLoader";
import { resetArticlesFetchCache } from "@/lib/articlesSync";

// Event name that page-level components dispatch once their real data is loaded.
export const PAGE_DATA_READY_EVENT = "dj_page_data_ready";

// Browser-side flag: captures whether the ready event fired before the effect
// had a chance to register its listener. This fixes the production race condition
// where Vercel's fast servers resolve fetches during the hydration tick — before
// GlobalPageLoader's useEffect([mounted, pathname]) has run and attached the
// window listener. On each pathname change this flag is cleared so stale state
// from a previous route never bleeds into the next route.
// Stored on `window` so articlesSync.ts can also set it without a circular import.
declare global {
  interface Window {
    __djPageDataReadyPath?: string | null;
  }
}

const STATIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/about",
  "/contact",
  "/contact-us",
  "/privacy",
  "/privacy-policy",
  "/terms",
  "/terms-and-conditions",
  "/cookie-policy",
  "/cookies",
  "/editorial",
  "/editorial-policy",
  "/advertise",
  "/advertise-with-us",
  "/journal-of-record",
  // Dynamic routes (/, /news, /business, /newsletters, /subscribe, /reader, /writer, /admin, etc.)
  // must wait for real database/API data and dispatchPageDataReady().
];

function isStaticRoute(path: string): boolean {
  if (!path) return false;
  const p = path.toLowerCase();
  return STATIC_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

export default function GlobalPageLoader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  // Ref to track the pathname for which the effect has already been run,
  // avoiding setState calls during the render phase (React 18 anti-pattern for side-effects).
  const effectPathRef = useRef<string | null>(null);

  // On first render (SSR → client hydration), mark mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset and re-register data-ready listener on each pathname change.
  useEffect(() => {
    if (!mounted) return;

    const isStatic = isStaticRoute(pathname);

    // Reset fetch cache and window flag when navigating to a new route.
    // Only do this when the pathname actually changes to avoid double-running.
    if (effectPathRef.current !== pathname) {
      effectPathRef.current = pathname;
      resetArticlesFetchCache();
      if (typeof window !== "undefined") window.__djPageDataReadyPath = null;
    }

    // For static routes (login, terms, etc.), content is ready immediately
    if (isStatic) {
      setDataReady(true);
      return;
    }

    // Dynamic data route: show skeleton until dispatchPageDataReady() is called.
    setDataReady(false);

    const handleDataReady = () => {
      setDataReady(true);
    };

    window.addEventListener(PAGE_DATA_READY_EVENT, handleDataReady);

    // If dispatchPageDataReady() was already called before this effect ran
    // (Vercel production race: fast server resolves data during hydration tick),
    // the window flag will already match the current pathname.
    if (typeof window !== "undefined" && window.__djPageDataReadyPath === pathname) {
      setDataReady(true);
    }

    // Safety fallback: only if the network completely hangs (12 seconds),
    // show the page so it never stays permanently stuck on the skeleton.
    const fallback = setTimeout(() => {
      setDataReady(true);
    }, 12000);

    return () => {
      window.removeEventListener(PAGE_DATA_READY_EVENT, handleDataReady);
      clearTimeout(fallback);
    };
  }, [mounted, pathname]);

  const isStatic = isStaticRoute(pathname);
  const showSkeleton = !mounted || (!dataReady && !isStatic);

  return (
    <>
      {showSkeleton && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <PageSkeletonLoader />
        </div>
      )}
      <div className={showSkeleton ? "opacity-0 pointer-events-none select-none invisible h-0 overflow-hidden" : "opacity-100 visible transition-opacity duration-150"}>
        {children}
      </div>
    </>
  );
}

/**
 * Call this from any page-level component once its real data has been loaded
 * and set into state. This signals GlobalPageLoader to hide the skeleton.
 *
 * Also sets the window flag so GlobalPageLoader can detect the event
 * even if it fired before the window listener was registered (production race fix).
 */
export function dispatchPageDataReady() {
  if (typeof window !== "undefined") {
    // Record the current pathname so GlobalPageLoader can detect a missed event
    // even if the window event fired before the listener was registered.
    window.__djPageDataReadyPath = window.location.pathname;
    window.dispatchEvent(new Event(PAGE_DATA_READY_EVENT));
  }
}

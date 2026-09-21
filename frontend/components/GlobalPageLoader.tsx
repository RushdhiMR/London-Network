"use client";

import React, { useState, useEffect } from "react";
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
  "/subscribe",
  "/newsletters",
  "/journal-of-record",
];

function isStaticRoute(path: string): boolean {
  if (!path) return false;
  const p = path.toLowerCase();
  return STATIC_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

export default function GlobalPageLoader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const [dataReady, setDataReady] = useState(false);

  // Synchronous route change reset during render:
  // If pathname has changed, immediately reset dataReady to false BEFORE any child paints!
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setDataReady(isStaticRoute(pathname));
    resetArticlesFetchCache();
    // Clear the window flag so the new route starts fresh.
    if (typeof window !== "undefined") window.__djPageDataReadyPath = null;
  }

  // On first render (SSR → client hydration), mark mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Manage dataReady event listener and safety timeout on route changes
  useEffect(() => {
    if (!mounted) return;

    // For static routes (login, terms, etc.), content is ready immediately
    if (isStaticRoute(pathname)) {
      setDataReady(true);
      return;
    }

    // Production race-condition fix: if the ready event already fired before
    // this effect had a chance to register its listener, detect it here and
    // immediately mark data as ready without waiting for a future event.
    if (typeof window !== "undefined" && window.__djPageDataReadyPath === pathname) {
      setDataReady(true);
      // Still attach the listener below in case the component re-runs this effect.
    }

    // Dynamic data route: wait for real database/API data to arrive
    const handleDataReady = () => {
      setDataReady(true);
    };

    window.addEventListener(PAGE_DATA_READY_EVENT, handleDataReady);

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
 * Also sets the module-level flag so GlobalPageLoader can detect the event
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

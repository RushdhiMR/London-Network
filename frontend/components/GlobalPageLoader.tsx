"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import PageSkeletonLoader from "@/components/PageSkeletonLoader";
import { resetArticlesFetchCache } from "@/lib/articlesSync";

// Event name that page-level components dispatch once their real data is loaded.
export const PAGE_DATA_READY_EVENT = "dj_page_data_ready";

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
 */
export function dispatchPageDataReady() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PAGE_DATA_READY_EVENT));
  }
}

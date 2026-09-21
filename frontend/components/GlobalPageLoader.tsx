"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import PageSkeletonLoader from "@/components/PageSkeletonLoader";

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
  "/admin",
  "/writer",
  "/reader",
];

function isStaticRoute(path: string): boolean {
  if (!path) return false;
  const p = path.toLowerCase();
  return STATIC_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

export default function GlobalPageLoader({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const pathname = usePathname();

  // On first render (SSR → client hydration), mark mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Manage dataReady state on route changes
  useEffect(() => {
    if (!mounted) return;

    // For static routes (login, terms, etc.) or dashboards, content is ready immediately
    if (isStaticRoute(pathname)) {
      setDataReady(true);
      return;
    }

    // For dynamic data routes, reset dataReady so skeleton shows until data is loaded
    setDataReady(false);

    const handleDataReady = () => {
      setDataReady(true);
    };

    window.addEventListener(PAGE_DATA_READY_EVENT, handleDataReady);

    // Safety fallback: if no component fires the event within 1.5 seconds,
    // show the page anyway so it never stays stuck on the skeleton.
    const fallback = setTimeout(() => {
      setDataReady(true);
    }, 1500);

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
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto pointer-events-none">
          <PageSkeletonLoader />
        </div>
      )}
      <div className={showSkeleton ? "opacity-0 pointer-events-none select-none" : "opacity-100 transition-opacity duration-150"}>
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

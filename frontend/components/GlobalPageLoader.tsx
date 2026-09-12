"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import PageSkeletonLoader from "@/components/PageSkeletonLoader";

export default function GlobalPageLoader({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setIsNavigating(true);
    const navTimer = setTimeout(() => {
      setIsNavigating(false);
    }, 150);
    return () => clearTimeout(navTimer);
  }, [pathname]);

  const showSkeleton = !mounted || isNavigating;

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

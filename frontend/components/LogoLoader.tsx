"use client";

import PageSkeletonLoader from "@/components/PageSkeletonLoader";

interface LogoLoaderProps {
  text?: string;
  theme?: "light" | "dark";
  fullScreen?: boolean;
}

export default function LogoLoader(_props: LogoLoaderProps) {
  return <PageSkeletonLoader />;
}

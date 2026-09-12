"use client";

import Image from "next/image";

interface LogoLoaderProps {
  text?: string;
  theme?: "light" | "dark";
  fullScreen?: boolean;
}

export default function LogoLoader({
  text = "Loading...",
  theme = "light",
  fullScreen = true,
}: LogoLoaderProps) {
  const isDark = theme === "dark";

  return (
    <div
      role="status"
      aria-label="Loading page"
      className={`flex flex-col items-center justify-center transition-opacity duration-300 ${
        fullScreen ? "fixed inset-0 z-50 min-h-screen w-screen" : "w-full min-h-[300px]"
      } ${
        isDark ? "bg-[#0F172A] text-slate-200" : "bg-white text-gray-700"
      }`}
    >
      <div className="flex flex-col items-center justify-center p-6 text-center select-none">
        {/* LOGO CONTAINER WITH SUBTLE ANIMATION */}
        <div className="relative mb-5 transition-transform duration-500 animate-logo-pulse">
          <Image
            src="/header_logo.png"
            alt="London Network"
            width={260}
            height={52}
            priority
            className={`w-[180px] sm:w-[220px] md:w-[260px] h-auto object-contain transition-all ${
              isDark ? "brightness-110 drop-shadow-[0_2px_8px_rgba(255,255,255,0.08)]" : ""
            }`}
          />
        </div>

        {/* MINIMAL SUBTLE PROGRESS ACCENT BAR */}
        <div className={`w-28 sm:w-36 h-[2px] rounded-full overflow-hidden mb-3.5 relative ${
          isDark ? "bg-slate-800" : "bg-gray-100"
        }`}>
          <div
            className="absolute top-0 bottom-0 left-0 w-1/2 bg-[#D31220] rounded-full animate-loading-bar"
          />
        </div>

        {/* REFINED MINIMAL TEXT */}
        {text && (
          <p className={`text-[11px] sm:text-xs font-semibold tracking-widest uppercase transition-colors font-sans ${
            isDark ? "text-slate-400" : "text-gray-400"
          }`}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

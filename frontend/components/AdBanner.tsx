"use client";

import { useLiveAdSlots } from "@/lib/articlesSync";

interface AdBannerProps {
  label?: string;
  slotId?: string;
  className?: string;
}

export default function AdBanner({ label = "ADVERTISEMENT", slotId, className = "" }: AdBannerProps) {
  const { adSlots } = useLiveAdSlots();

  const isSlot2 = (slotId && slotId.includes("2")) || label.toUpperCase().includes("SLOT 2");
  const isSlot3 = (slotId && slotId.includes("3")) || label.toUpperCase().includes("SLOT 3");

  const matchingSlot = adSlots.find((s) => {
    if (slotId && s.id === slotId) return true;
    if (isSlot2 && (s.id === "slot-1" || s.title.includes("Slot 2"))) return true;
    if (isSlot3 && (s.id === "slot-2" || s.title.includes("Slot 3"))) return true;
    return false;
  });

  if (matchingSlot && matchingSlot.isActive && matchingSlot.imageUrl) {
    const isExternal = (matchingSlot.actionType || "").toLowerCase().includes("external") || (matchingSlot.targetUrl || "").startsWith("http");
    return (
      <div className={`w-full max-w-[1400px] mx-auto px-4 md:px-6 my-8 ${className}`}>
        <a
          href={matchingSlot.targetUrl || "#"}
          target={isExternal ? "_blank" : "_self"}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="block group relative overflow-hidden"
        >
          <div className="relative w-full h-[150px] sm:h-[180px] md:h-[220px] bg-[#111827] border border-gray-800 flex items-center justify-center overflow-hidden">
            <img
              src={matchingSlot.imageUrl}
              alt={matchingSlot.title}
              className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
            />
            <div className="absolute top-2 left-3 bg-black/80 backdrop-blur-xs px-2 py-0.5 border border-white/10 text-[9px] font-mono tracking-widest uppercase text-white">
              {label}
            </div>
          </div>
        </a>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-[1400px] mx-auto px-4 md:px-6 my-8 ${className}`}>
      <div className="w-full bg-[#111827] border border-gray-800 rounded-none py-10 md:py-12 px-6 flex flex-col items-center justify-center text-center shadow-xs">
        <span className="text-[10px] font-mono tracking-widest uppercase text-[#D31220] font-extrabold mb-1">
          {label}
        </span>
        <p className="text-xs font-mono tracking-widest text-gray-400 uppercase">
          London BigBen Premium Sponsor Banner
        </p>
      </div>
    </div>
  );
}

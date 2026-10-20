"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { SiRumble } from "react-icons/si";

export default function Footer() {
  const [activeEdition, setActiveEdition] = useState("United States");

  const newsCategories = [
    { name: "World", href: "/news/world" },
    { name: "Politics", href: "/news/politics" },
    { name: "Business", href: "/business" },
    { name: "Technology", href: "/technology" },
    { name: "Economy", href: "/news/economy" },
    { name: "Markets", href: "/news/markets" },
    { name: "Lifestyle", href: "/news/lifestyle" },
    { name: "Sports", href: "/news/sports" },
    { name: "Entertainment", href: "/news/entertainment" },
    { name: "Health", href: "/news/health" },
    { name: "Research", href: "/industry-insights" },
    { name: "Interview", href: "/interview" },
  ];

  const regionLinks = [
    { name: "China", href: "/china" },
    { name: "United States", href: "/united-states" },
    { name: "Europe", href: "/europe" },
    { name: "Britain", href: "/britain" },
    { name: "Middle East", href: "/middle-east" },
    { name: "Africa", href: "/africa" },
    { name: "Asia", href: "/asia" },
  ];

  const companyLinks = [
    { name: "About us", href: "/about" },
    { name: "Contact us", href: "/contact" },
    { name: "Terms & Conditions", href: "/terms" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Cookie Policy", href: "/cookies" },
    { name: "Editorial Policy", href: "/editorial-policy" },
    { name: "Advertise with us", href: "/advertise" },
    { name: "RSS Feed", href: "/sitemap.xml" },
  ];

  const editions = [
    "United States",
    "United Kingdom",
    "Australia",
    "India",
    "Singapore",
  ];

  return (
    <footer className="bg-black text-white mt-20 border-t border-zinc-900 relative select-none">
      {/* Top 3px Brand Accent Bar */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#BF1E2D] via-[#D31220] to-[#8B0E19]" />

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* BRAND TOP ROW */}
        <div className="py-8 border-b border-zinc-800">
          <div className="max-w-xl">
            <Link
              href="/"
              className="inline-block transition-transform hover:opacity-95"
              aria-label="London BigBen Network Home"
            >
              <Image
                src="/footer_logo.png"
                alt="London BigBen Network"
                width={260}
                height={48}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="mt-3 text-[13px] text-zinc-400 leading-relaxed font-sans">
              Independent international journalism, verified market intelligence, and fearless editorial analysis from London, Washington, and global financial centers.
            </p>
          </div>
        </div>

        {/* 5-COLUMN NAVIGATION GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10 py-12 border-b border-zinc-800 text-left">
          
          {/* COLUMN 1: NEWS & COVERAGE */}
          <div>
            <h3 className="flex items-center gap-2 text-[12px] font-mono font-bold tracking-widest text-white mb-4 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#BF1E2D]" />
              NEWS &amp; COVERAGE
            </h3>
            <ul className="space-y-2.5 text-[13px]">
              {newsCategories.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-zinc-400 hover:text-white hover:translate-x-1 transition-all inline-block"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 2: REGIONAL DESKS */}
          <div>
            <h3 className="flex items-center gap-2 text-[12px] font-mono font-bold tracking-widest text-white mb-4 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              REGIONS
            </h3>
            <ul className="space-y-2.5 text-[13px]">
              {regionLinks.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-zinc-400 hover:text-white hover:translate-x-1 transition-all inline-block"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 3: COMPANY */}
          <div>
            <h3 className="flex items-center gap-2 text-[12px] font-mono font-bold tracking-widest text-white mb-4 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              COMPANY
            </h3>
            <ul className="space-y-2.5 text-[13px]">
              {companyLinks.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-zinc-400 hover:text-white hover:translate-x-1 transition-all inline-block"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 4: EDITIONS (LEFT OF FOLLOW & CONNECT) */}
          <div>
            <h3 className="flex items-center gap-2 text-[12px] font-mono font-bold tracking-widest text-white mb-4 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              EDITIONS
            </h3>
            <ul className="space-y-2.5 text-[13px]">
              {editions.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => setActiveEdition(item)}
                    className={`transition-all hover:translate-x-1 inline-block text-left cursor-pointer ${
                      activeEdition === item
                        ? "text-white font-bold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 5: FOLLOW & CONNECT (ONE COLUMN) */}
          <div>
            <h3 className="flex items-center gap-2 text-[12px] font-mono font-bold tracking-widest text-white mb-4 uppercase">
              FOLLOW &amp; CONNECT
            </h3>
            <ul className="space-y-2.5 text-[13px]">
              <li>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-zinc-400 hover:text-white hover:translate-x-1 transition-all group"
                >
                  <FaFacebook className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#1877F2] transition-colors shrink-0" />
                  <span>Facebook</span>
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-zinc-400 hover:text-white hover:translate-x-1 transition-all group"
                >
                  <FaLinkedin className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#0A66C2] transition-colors shrink-0" />
                  <span>LinkedIn</span>
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-zinc-400 hover:text-white hover:translate-x-1 transition-all group"
                >
                  <FaInstagram className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#E4405F] transition-colors shrink-0" />
                  <span>Instagram</span>
                </a>
              </li>
              <li>
                <a
                  href="https://rumble.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-zinc-400 hover:text-white hover:translate-x-1 transition-all group"
                >
                  <SiRumble className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors shrink-0" />
                  <span>Rumble</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* BOTTOM METADATA & COPYRIGHT STRIP */}
        <div className="py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-[11.5px] leading-relaxed text-center md:text-left text-zinc-500 font-sans">
            &copy; Copyright 2026 London BigBen Network Media LLC. All Rights Reserved. All standard legal notices apply.
          </p>
          <div className="flex items-center gap-2 text-[11.5px] text-zinc-500 font-sans">
            <span className="text-zinc-500">Official Press &amp; Media:</span>
            <a
              href="mailto:press@londonbigben.com"
              className="text-zinc-400 hover:text-[#BF1E2D] font-mono font-bold underline transition-colors"
            >
              press@londonbigben.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";
import { SiRumble } from "react-icons/si";
import { Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white text-gray-900 mt-20 pt-16 pb-12 border-t border-gray-200">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* 5-COLUMN NAVIGATION GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 lg:gap-12 pb-14 text-left">
          
          {/* COLUMN 1: NEWS */}
          <div>
            <h3 className="text-[13px] font-bold text-gray-900 tracking-wider mb-4 uppercase">
              NEWS
            </h3>
            <ul className="space-y-2.5 text-[13px] text-gray-600">
              <li>
                <Link href="/news/world" className="hover:text-[#BF1E2D] transition-colors">
                  World
                </Link>
              </li>
              <li>
                <Link href="/news/politics" className="hover:text-[#BF1E2D] transition-colors">
                  Politics
                </Link>
              </li>
              <li>
                <Link href="/business" className="hover:text-[#BF1E2D] transition-colors">
                  Business
                </Link>
              </li>
              <li>
                <Link href="/technology" className="hover:text-[#BF1E2D] transition-colors">
                  Technology
                </Link>
              </li>
              <li>
                <Link href="/news/economy" className="hover:text-[#BF1E2D] transition-colors">
                  Economy
                </Link>
              </li>
              <li>
                <Link href="/news/markets" className="hover:text-[#BF1E2D] transition-colors">
                  Markets
                </Link>
              </li>
              <li>
                <Link href="/news/lifestyle" className="hover:text-[#BF1E2D] transition-colors">
                  Lifestyle
                </Link>
              </li>
              <li>
                <Link href="/news/sports" className="hover:text-[#BF1E2D] transition-colors">
                  Sports
                </Link>
              </li>
              <li>
                <Link href="/news/entertainment" className="hover:text-[#BF1E2D] transition-colors">
                  Entertainment
                </Link>
              </li>
              <li>
                <Link href="/news/health" className="hover:text-[#BF1E2D] transition-colors">
                  Health
                </Link>
              </li>
              <li>
                <Link href="/industry-insights" className="hover:text-[#BF1E2D] transition-colors">
                  Research
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMN 2: FEATURED */}
          <div>
            <h3 className="text-[13px] font-bold text-gray-900 tracking-wider mb-4 uppercase">
              FEATURED
            </h3>
            <ul className="space-y-2.5 text-[13px] text-gray-600">
              <li>
                <Link href="/china" className="hover:text-[#BF1E2D] transition-colors">
                  China
                </Link>
              </li>
              <li>
                <Link href="/united-states" className="hover:text-[#BF1E2D] transition-colors">
                  United States
                </Link>
              </li>
              <li>
                <Link href="/europe" className="hover:text-[#BF1E2D] transition-colors">
                  Europe
                </Link>
              </li>
              <li>
                <Link href="/britain" className="hover:text-[#BF1E2D] transition-colors">
                  Britain
                </Link>
              </li>
              <li>
                <Link href="/middle-east" className="hover:text-[#BF1E2D] transition-colors">
                  Middle East
                </Link>
              </li>
              <li>
                <Link href="/africa" className="hover:text-[#BF1E2D] transition-colors">
                  Africa
                </Link>
              </li>
              <li>
                <Link href="/asia" className="hover:text-[#BF1E2D] transition-colors">
                  Asia
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMN 3: ABOUT */}
          <div>
            <h3 className="text-[13px] font-bold text-gray-900 tracking-wider mb-4 uppercase">
              ABOUT
            </h3>
            <ul className="space-y-2.5 text-[13px] text-gray-600">
              <li>
                <Link href="/about" className="hover:text-[#BF1E2D] transition-colors">
                  About us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#BF1E2D] transition-colors">
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/about#terms" className="hover:text-[#BF1E2D] transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/about#privacy" className="hover:text-[#BF1E2D] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/about#cookies" className="hover:text-[#BF1E2D] transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/about#editorial" className="hover:text-[#BF1E2D] transition-colors">
                  Editorial Policy
                </Link>
              </li>
              <li>
                <Link href="/advertise" className="hover:text-[#BF1E2D] transition-colors">
                  Advertise with us
                </Link>
              </li>
              <li>
                <Link href="/sitemap.xml" className="hover:text-[#BF1E2D] transition-colors">
                  RSS Feed
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMN 4: EDITIONS */}
          <div>
            <h3 className="text-[13px] font-bold text-gray-900 tracking-wider mb-4 uppercase">
              EDITIONS
            </h3>
            <ul className="space-y-2.5 text-[13px]">
              <li>
                <span className="text-gray-900 font-medium cursor-default">
                  United States
                </span>
              </li>
              <li>
                <span className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
                  Australia
                </span>
              </li>
              <li>
                <span className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
                  India
                </span>
              </li>
              <li>
                <span className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
                  Singapore
                </span>
              </li>
              <li>
                <span className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
                  United Kingdom
                </span>
              </li>
            </ul>
          </div>

          {/* COLUMN 5: FOLLOW US */}
          <div>
            <h3 className="text-[13px] font-bold text-gray-900 tracking-wider mb-4 uppercase">
              FOLLOW US
            </h3>
            <ul className="space-y-2.5 text-[13px] text-gray-600">
              <li>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 hover:text-[#BF1E2D] transition-colors group"
                >
                  <FaFacebook className="w-4 h-4 text-gray-400 group-hover:text-[#BF1E2D] transition-colors shrink-0" />
                  <span>Facebook</span>
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 hover:text-[#BF1E2D] transition-colors group"
                >
                  <FaLinkedin className="w-4 h-4 text-gray-400 group-hover:text-[#BF1E2D] transition-colors shrink-0" />
                  <span>LinkedIn</span>
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 hover:text-[#BF1E2D] transition-colors group"
                >
                  <FaInstagram className="w-4 h-4 text-gray-400 group-hover:text-[#BF1E2D] transition-colors shrink-0" />
                  <span>Instagram</span>
                </a>
              </li>
              <li>
                <a
                  href="https://rumble.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 hover:text-[#BF1E2D] transition-colors group"
                >
                  <SiRumble className="w-4 h-4 text-[#66B032] shrink-0" />
                  <span>Rumble</span>
                </a>
              </li>
              <li>
                <Link
                  href="/newsletters"
                  className="inline-flex items-center gap-2.5 hover:text-[#BF1E2D] transition-colors group"
                >
                  <Mail className="w-4 h-4 text-gray-400 group-hover:text-[#BF1E2D] transition-colors shrink-0" />
                  <span>Newsletter</span>
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* BOTTOM SECTION: DIVIDER, CENTERED LOGO, COPYRIGHT */}
        <div className="border-t border-gray-200/90 pt-8 pb-3 flex flex-col items-center justify-center text-center">
          <Link href="/" className="inline-block group mb-3" aria-label="London BigBen Network Home">
            <Image
              src="/header_logo.png"
              alt="London BigBen Network"
              width={220}
              height={40}
              className="h-8 md:h-9 w-auto object-contain mx-auto transition-transform group-hover:scale-[1.02]"
            />
          </Link>
          <p className="text-[11px] sm:text-[12px] text-gray-400 leading-relaxed max-w-2xl text-center">
            &copy; Copyright 2026 London BigBen Network Media LLC. All Rights Reserved. All standard legal notices apply.
          </p>
        </div>
      </div>
    </footer>
  );
}

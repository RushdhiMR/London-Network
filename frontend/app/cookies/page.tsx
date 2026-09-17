"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronDown, ChevronUp, Globe, Mail, MapPin, Phone } from "lucide-react";

interface TocItem {
  id: string;
  label: string;
}

const tocItems: TocItem[] = [
  { id: "introduction", label: "Introduction" },
  { id: "what-are-cookies", label: "1. What Are Cookies?" },
  { id: "types-of-cookies", label: "2. Types of Cookies We Use" },
  { id: "how-we-use-cookies", label: "3. How We Use Cookies" },
  { id: "managing-cookies", label: "4. Managing Cookies" },
  { id: "changes-to-policy", label: "5. Changes to This Policy" },
  { id: "contact-us", label: "6. Contact Us" },
];

export default function CookiePolicyPage() {
  const [activeId, setActiveId] = useState<string>("introduction");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;

      for (let i = tocItems.length - 1; i >= 0; i--) {
        const section = document.getElementById(tocItems[i].id);
        if (section) {
          const top = section.offsetTop;
          if (scrollPosition >= top) {
            setActiveId(tocItems[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -110;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveId(id);
      setMobileTocOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col justify-between selection:bg-red-100 selection:text-[#BF1E2D]">
      <Header />

      <main className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* TOP HEADER SECTION */}
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.22em] text-[#BF1E2D] mb-3 inline-flex items-center gap-1.5">
            LEGAL DOCUMENT &bull; COOKIE POLICY
          </p>
          <h1 className="font-serif font-black text-3xl sm:text-5xl md:text-[52px] text-slate-900 tracking-tight leading-[1.1] mb-3">
            Cookie Policy
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-500 uppercase">
            LAST UPDATED: JUNE 30, 2024
          </p>
        </div>

        {/* TOP DIVIDER LINE */}
        <div className="w-full border-t-2 border-slate-900 mb-10 sm:mb-12" />

        {/* MOBILE TABLE OF CONTENTS COLLAPSIBLE ACCORDION */}
        <div className="lg:hidden mb-8 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
          <button
            onClick={() => setMobileTocOpen(!mobileTocOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white text-left font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200"
          >
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#BF1E2D]" />
              Cookie Policy Sections
            </span>
            {mobileTocOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          {mobileTocOpen && (
            <div className="p-3 bg-white space-y-1 max-h-72 overflow-y-auto">
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full text-left text-xs py-2 px-3 rounded transition-colors ${
                    activeId === item.id
                      ? "bg-red-50 text-[#BF1E2D] font-bold border-l-2 border-[#BF1E2D]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MAIN TWO-COLUMN CONTENT LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* LEFT COLUMN: STICKY TABLE OF CONTENTS */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-28">
            <div className="bg-white border border-slate-200/90 rounded-lg p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                <Globe className="w-3.5 h-3.5 text-[#1e3a8a]" />
                <h2 className="text-[11.5px] font-extrabold uppercase tracking-wider text-slate-900">
                  COOKIE POLICY SECTIONS
                </h2>
              </div>
              <nav className="space-y-1">
                {tocItems.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full text-left text-[13px] py-1.5 px-3 rounded transition-all duration-150 block truncate ${
                        isActive
                          ? "bg-red-50/90 text-[#BF1E2D] font-bold border-l-2 border-[#BF1E2D] pl-2.5 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* RIGHT COLUMN: MAIN LEGAL DOCUMENT TEXT */}
          <article className="lg:col-span-8 space-y-10 text-slate-700 text-[14px] sm:text-[14.5px] leading-relaxed">
            
            {/* INTRODUCTION */}
            <section id="introduction" className="scroll-mt-28">
              <h2 className="font-serif font-bold text-2xl text-slate-900 mb-4 tracking-tight">
                Introduction
              </h2>
              <div className="space-y-4">
                <p>
                  This Cookie Policy explains how <strong className="text-slate-900 font-semibold">London BigBen Network</strong> (&ldquo;London BigBen Network&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) uses cookies and similar tracking technologies when you visit our website and use our online services.
                </p>
                <p>
                  By continuing to use our website, you consent to our use of cookies as described in this Cookie Policy, unless you disable them through your browser settings. You can review our full <Link href="/privacy" className="text-[#BF1E2D] hover:underline font-medium">Privacy Policy</Link> and <Link href="/terms" className="text-[#BF1E2D] hover:underline font-medium">Terms and Conditions</Link> for additional details on data protection.
                </p>
              </div>
            </section>

            {/* 1. WHAT ARE COOKIES? */}
            <section id="what-are-cookies" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">1.</span>
                <span>What Are Cookies?</span>
              </h2>
              <div className="space-y-3">
                <p>
                  Cookies are small text files that are placed on your computer, smartphone, or other device when you visit a website. They help websites function properly, improve user experience, remember preferences, and provide analytical information.
                </p>
                <p>
                  Cookies do not generally contain information that personally identifies you, but they may be linked to personal information that you voluntarily provide.
                </p>
              </div>
            </section>

            {/* 2. TYPES OF COOKIES WE USE */}
            <section id="types-of-cookies" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-4 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">2.</span>
                <span>Types of Cookies We Use</span>
              </h2>
              
              {/* 5 STYLED CARDS MATCHING SCREENSHOT */}
              <div className="space-y-3.5">
                
                {/* CARD 1: ESSENTIAL COOKIES */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-md p-4 sm:p-5">
                  <h3 className="text-[12px] font-extrabold uppercase tracking-wider text-slate-900 mb-1.5">
                    ESSENTIAL COOKIES
                  </h3>
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                    These cookies are necessary for the operation of our website. They enable core features such as page navigation, secure access, account login, and website functionality. These cookies cannot be disabled.
                  </p>
                </div>

                {/* CARD 2: PERFORMANCE AND ANALYTICS COOKIES */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-md p-4 sm:p-5">
                  <h3 className="text-[12px] font-extrabold uppercase tracking-wider text-slate-900 mb-1.5">
                    PERFORMANCE AND ANALYTICS COOKIES
                  </h3>
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                    These cookies help us understand how visitors interact with our website by collecting anonymous statistical information such as pages visited, time spent, traffic sources, device type, browser settings, and geographic region.
                  </p>
                </div>

                {/* CARD 3: FUNCTIONALITY COOKIES */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-md p-4 sm:p-5">
                  <h3 className="text-[12px] font-extrabold uppercase tracking-wider text-slate-900 mb-1.5">
                    FUNCTIONALITY COOKIES
                  </h3>
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                    These cookies remember your preferences and settings, including language selection, region, login preferences, and display settings, providing a more personalized browsing experience.
                  </p>
                </div>

                {/* CARD 4: ADVERTISING COOKIES */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-md p-4 sm:p-5">
                  <h3 className="text-[12px] font-extrabold uppercase tracking-wider text-slate-900 mb-1.5">
                    ADVERTISING COOKIES
                  </h3>
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                    Advertising cookies may be used to display relevant advertisements based on your interests and browsing activity, measure campaign effectiveness, and limit ad repetitions.
                  </p>
                </div>

                {/* CARD 5: THIRD-PARTY COOKIES */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-md p-4 sm:p-5">
                  <h3 className="text-[12px] font-extrabold uppercase tracking-wider text-slate-900 mb-1.5">
                    THIRD-PARTY COOKIES
                  </h3>
                  <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                    Some features on our website rely on trusted third-party services such as analytics providers, embedded videos, social media feeds, and advertising networks. These third parties may place cookies on your device. London BigBen Network does not control these third-party cookies.
                  </p>
                </div>

              </div>
            </section>

            {/* 3. HOW WE USE COOKIES */}
            <section id="how-we-use-cookies" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">3.</span>
                <span>How We Use Cookies</span>
              </h2>
              <p>
                We use cookies to operate and secure our website, remember user preferences, improve website performance, analyze visitor behavior, enhance user experience, measure website traffic, support marketing activities, and detect fraud.
              </p>
            </section>

            {/* 4. MANAGING COOKIES */}
            <section id="managing-cookies" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">4.</span>
                <span>Managing Cookies</span>
              </h2>
              <div className="space-y-3.5">
                <p>
                  Most web browsers allow you to control cookies through their settings. You may choose to accept all cookies, reject non-essential cookies, delete existing cookies, or receive notifications before cookies are stored.
                </p>
                <div className="p-4 bg-slate-50 border-l-3 border-[#BF1E2D] rounded-r-md">
                  <p className="font-bold text-slate-900 text-[13.5px] sm:text-[14px]">
                    Please note that disabling certain cookies may affect the functionality and performance of our website.
                  </p>
                </div>
              </div>
            </section>

            {/* 5. CHANGES TO THIS POLICY */}
            <section id="changes-to-policy" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">5.</span>
                <span>Changes to This Policy</span>
              </h2>
              <p>
                We may update this Cookie Policy periodically to reflect changes in technology, legal requirements, or our business practices. The updated version will be posted on this page with a revised &ldquo;Last Updated&rdquo; date.
              </p>
            </section>

            {/* 6. CONTACT US */}
            <section id="contact-us" className="scroll-mt-28 border-t border-slate-100 pt-8">
              <h2 className="font-serif font-bold text-xl sm:text-[22px] text-slate-900 mb-3.5 tracking-tight flex items-baseline gap-2">
                <span className="text-[#BF1E2D] font-serif font-black">6.</span>
                <span>Contact Us</span>
              </h2>
              <p className="mb-5">
                If you have any questions about this Cookie Policy or our cookie practices, please contact us:
              </p>

              {/* CONTACT CARD BOX MATCHING SCREENSHOT */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-6 sm:p-7 max-w-lg shadow-xs">
                <h3 className="font-serif font-bold text-lg text-slate-900 mb-3">
                  London BigBen Network
                </h3>

                <div className="space-y-2.5 text-xs sm:text-[13px] text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <span>
                      Canary Wharf, 25 Bank Street<br />
                      London, E14 5JP, United Kingdom
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <a
                      href="mailto:privacy@londonbigben.com"
                      className="text-slate-900 font-medium hover:text-[#BF1E2D] transition-colors"
                    >
                      privacy@londonbigben.com
                    </a>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>+44 20 7946 0192</span>
                  </div>
                </div>

                {/* LOGO IN CONTACT BOX */}
                <div className="mt-6 pt-5 border-t border-slate-200/80 flex items-center justify-center">
                  <Image
                    src="/header_logo.png"
                    alt="London BigBen Network"
                    width={180}
                    height={36}
                    className="h-7 w-auto object-contain"
                  />
                </div>
              </div>
            </section>

          </article>

        </div>
      </main>

      <Footer />
    </div>
  );
}

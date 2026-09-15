"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { MapPin, Mail } from "lucide-react";

export default function AboutUsPage() {
  const coverageTopics = [
    { label: "U.S. News", href: "/news" },
    { label: "World News", href: "/news/world" },
    { label: "Politics", href: "/news/politics" },
    { label: "Business & Economy", href: "/business" },
    { label: "Technology", href: "/technology" },
    { label: "Science", href: "/technology" },
    { label: "Health", href: "/news/health" },
    { label: "Education", href: "/news" },
    { label: "Environment", href: "/news" },
    { label: "Sports", href: "/news/sports" },
    { label: "Entertainment", href: "/news/entertainment" },
    { label: "Lifestyle", href: "/news/lifestyle" },
    { label: "Opinion & Editorials", href: "/search?q=Opinion" },
    { label: "Press Releases", href: "/search?q=Press+Releases" },
    { label: "Sponsored Content", href: "/advertise" },
  ];

  const editorialValues = [
    {
      title: "Accuracy & Fact-Checking",
      description: "Rigorous fact-checking and verify-first reporting on all articles."
    },
    {
      title: "Editorial Independence",
      description: "Free from corporate bias, external influence, or political agendas."
    },
    {
      title: "Transparency & Accountability",
      description: "Openly correcting mistakes and revealing information sources."
    },
    {
      title: "Fairness & Balance",
      description: "Presenting multi-dimensional viewpoints and stories without prejudice."
    },
    {
      title: "Respect for Diversity",
      description: "Representing varied perspectives and amplifying underrepresented voices."
    },
    {
      title: "Ethical Journalism",
      description: "Following professional standard ethics and respect for privacy."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col justify-between">
      <Header />

      <main className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* HEADER SECTION */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#BF1E2D] mb-2.5">
            ESTABLISHED 2026 &bull; EDITORIAL PROFILE
          </p>
          <h1 className="font-serif font-black text-3xl sm:text-4xl md:text-5xl text-slate-900 tracking-tight mb-3">
            About London BigBen Network
          </h1>
          <p className="font-serif italic text-base sm:text-lg text-slate-500 leading-relaxed">
            &ldquo;Delivering Trusted News. Empowering Informed Communities.&rdquo;
          </p>
        </div>

        {/* TOP DIVIDER LINE */}
        <div className="w-full border-t-2 border-slate-900 mb-10 sm:mb-12" />

        {/* TWO-COLUMN CONTENT LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-start">
          
          {/* LEFT COLUMN: MAIN EDITORIAL CONTENT (8 cols) */}
          <div className="lg:col-span-8 space-y-8 sm:space-y-10">
            
            {/* CARD 1: WHO WE ARE */}
            <section className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif font-bold text-2xl sm:text-[26px] text-slate-900 mb-4 tracking-tight">
                Who We Are
              </h2>
              <div className="space-y-4 text-slate-600 text-[13.5px] sm:text-[14px] leading-relaxed">
                <p>
                  Welcome to <strong className="text-slate-900 font-semibold">London BigBen Network</strong>, an independent digital news platform dedicated to delivering accurate, timely, and impactful journalism. Our mission is to provide readers with reliable news coverage, insightful analysis, and balanced reporting on the stories that matter most locally, nationally, and around the world.
                </p>
                <p>
                  We strive to uphold the highest standards of journalistic integrity while embracing innovation in digital media. Our newsroom is committed to factual reporting, editorial independence, and responsible storytelling that informs, educates, and inspires.
                </p>
              </div>
            </section>

            {/* CARD 2: WHAT WE COVER */}
            <section className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif font-bold text-2xl sm:text-[26px] text-slate-900 mb-2 tracking-tight">
                What We Cover
              </h2>
              <div className="w-full border-b border-slate-100 pb-2 mb-4">
                <p className="text-slate-500 text-xs sm:text-[13px]">
                  London BigBen Network publishes dynamic, professional content across a comprehensive range of critical topics:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-2">
                {coverageTopics.map((topic) => (
                  <Link
                    key={topic.label}
                    href={topic.href}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 text-[12.5px] font-medium text-slate-700 hover:text-[#BF1E2D] transition-colors group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#BF1E2D] shrink-0 group-hover:scale-125 transition-transform" />
                    <span className="truncate">{topic.label}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* CARD 3: OUR EDITORIAL VALUES */}
            <section className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif font-bold text-2xl sm:text-[26px] text-slate-900 mb-2 tracking-tight">
                Our Editorial Values
              </h2>
              <p className="text-slate-500 text-xs sm:text-[13px] mb-5">
                Every story published by London BigBen Network is guided by our core journalistic values:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mb-6">
                {editorialValues.map((val) => (
                  <div
                    key={val.title}
                    className="p-4 rounded-md border border-slate-200/75 bg-slate-50/60"
                  >
                    <h3 className="font-bold text-[13px] sm:text-[13.5px] text-slate-900 mb-1 tracking-tight">
                      {val.title}
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-[12.5px] leading-relaxed">
                      {val.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-slate-500 italic text-xs leading-relaxed">
                  Our editorial team follows strict review processes to ensure our reporting meets professional standards and serves the public interest.
                </p>
              </div>
            </section>

          </div>

          {/* RIGHT COLUMN: SIDEBAR (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* BOX 1: OUR MISSION */}
            <div className="bg-[#f0f5fa] border border-[#d6e4f2] rounded-lg p-6 shadow-2xs">
              <h2 className="font-serif font-bold text-lg text-[#1e3a8a] mb-2.5 tracking-tight">
                Our Mission
              </h2>
              <p className="text-[#2d4a6f] text-xs sm:text-[13px] leading-relaxed">
                Our mission is to empower individuals through credible journalism by providing fair, accurate, and accessible news. We believe that informed citizens build stronger communities, and we are dedicated to making trustworthy information available to everyone.
              </p>
            </div>

            {/* BOX 2: OUR VISION */}
            <div className="bg-[#fff5f5] border border-[#fbdcdc] rounded-lg p-6 shadow-2xs">
              <h2 className="font-serif font-bold text-lg text-[#BF1E2D] mb-2.5 tracking-tight">
                Our Vision
              </h2>
              <p className="text-[#6b3535] text-xs sm:text-[13px] leading-relaxed">
                We aim to become one of the most trusted digital news platforms globally by delivering high-quality journalism, embracing technological innovation, and fostering meaningful public dialogue.
              </p>
            </div>

            {/* BOX 3: CONTACT US */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
              <h2 className="font-serif font-bold text-lg text-slate-900 tracking-tight">
                Contact Us
              </h2>

              {/* Location */}
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-bold text-[13px] text-slate-900 leading-snug">
                    London BigBen Headquarters
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                    Canary Wharf, 25 Bank Street<br />
                    London, E14 5JP<br />
                    United Kingdom
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3 pt-2">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    EMAIL INQUIRY
                  </span>
                  <a
                    href="mailto:editorial@londonbigben.com"
                    className="text-xs font-bold text-[#1B50E8] hover:text-[#BF1E2D] transition-colors"
                  >
                    editorial@londonbigben.com
                  </a>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-[11px] text-slate-400 italic leading-relaxed">
                  We will make reasonable efforts to respond to inquiries in a timely manner.
                </p>
              </div>
            </div>

            {/* BOX 4: STAY CONNECTED */}
            <div className="bg-slate-950 text-white rounded-lg p-6 sm:p-7 text-center shadow-md">
              <h2 className="font-serif font-bold text-xl text-white mb-2 tracking-tight">
                Stay Connected
              </h2>
              <p className="text-slate-300 text-xs leading-relaxed mb-5">
                Join our London BigBen Network community to receive weekly summaries, breaking alerts, and professional editor highlights.
              </p>
              <Link
                href="/newsletters"
                className="block w-full py-2.5 px-4 bg-[#BF1E2D] hover:bg-[#a51926] text-white font-bold text-xs uppercase tracking-wider rounded transition-colors shadow-xs"
              >
                SUBSCRIBE NOW
              </Link>
            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}

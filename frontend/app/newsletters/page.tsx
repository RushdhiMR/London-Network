"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Check, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, Filter, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { dispatchPageDataReady } from "@/components/GlobalPageLoader";

interface NewsletterItem {
  id: string;
  title: string;
  schedule: string;
  description: string;
  subcategories: string[];
}

function NewslettersContent() {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatchPageDataReady();
  }, []);

  const newsletters: NewsletterItem[] = [
    {
      id: "world",
      title: "World",
      schedule: "Daily digest",
      description: "Global reporting across key geopolitical regions, transatlantic diplomacy, and international affairs.",
      subcategories: ["China", "United States", "Europe", "Britain", "Middle East", "Africa", "Asia"]
    },
    {
      id: "politics",
      title: "Politics",
      schedule: "Daily updates",
      description: "Objective analysis of parliamentary debates, legislative votes, election cycles, and regulatory reforms.",
      subcategories: ["Global Diplomacy", "Legislation", "Governance", "Elections"]
    },
    {
      id: "business",
      title: "Business",
      schedule: "Weekly summary",
      description: "Get the latest on companies, corporate news, startup trends, and leadership shifts.",
      subcategories: ["Companies", "Corporate News", "Entrepreneurship", "Startups", "Leadership"]
    },
    {
      id: "technology",
      title: "Technology",
      schedule: "Daily updates",
      description: "Deep dive into artificial intelligence developments, cybersecurity protocols, innovations, and space technology.",
      subcategories: ["Artificial Intelligence", "Cybersecurity", "Innovations", "Space Technology"]
    },
    {
      id: "economy",
      title: "Economy",
      schedule: "Twice a week",
      description: "Tracking macroeconomic trends, central bank rate decisions, fiscal policy, inflation, and global trade.",
      subcategories: ["Macroeconomics", "Inflation", "Central Banks", "Fiscal Policy"]
    },
    {
      id: "markets",
      title: "Markets",
      schedule: "Daily updates",
      description: "Live updates from Wall Street, international stock exchanges, commodity movements, and crypto assets.",
      subcategories: ["Stocks & Indices", "Commodities", "Currencies", "Crypto & Digital Assets"]
    },
    {
      id: "interview",
      title: "Interviews",
      schedule: "Weekly conversations",
      description: "Candid, high-impact conversations with global leaders, founders, policymakers, and industry architects shaping modern commerce and society.",
      subcategories: ["Global Leaders", "Founders", "Policymakers", "Leadership", "Innovators"]
    },
    {
      id: "lifestyle",
      title: "Lifestyle",
      schedule: "Weekly summary",
      description: "Curated features on contemporary culture, luxury living, architectural design, travel, and personal wellness.",
      subcategories: ["Culture", "Real Estate", "Luxury Living", "Travel", "Design"]
    },
    {
      id: "sports",
      title: "Sports",
      schedule: "Daily digest",
      description: "Match highlights, tournament coverage, transfer news, and athlete analysis across global leagues.",
      subcategories: ["Football", "Global Tournaments", "Tennis", "Motorsports", "Athletics"]
    },
    {
      id: "entertainment",
      title: "Entertainment",
      schedule: "Twice a week",
      description: "Coverage of cinema releases, streaming debuts, music charts, pop culture, and industry box office figures.",
      subcategories: ["Cinema", "Streaming", "Music", "Pop Culture", "Box Office"]
    },
    {
      id: "health",
      title: "Health",
      schedule: "Weekly updates",
      description: "Breakthrough medical research, biotechnology advancements, public health policies, and healthcare tech.",
      subcategories: ["Biotechnology", "Medical Research", "Public Health", "Healthcare Tech"]
    },
    {
      id: "research",
      title: "Research & Industry Insights",
      schedule: "Twice a week",
      description: "Logistical advancements, supply chain analytics, and operational metrics across major industries.",
      subcategories: ["Agriculture", "Tourism", "Financial Services", "Transportation", "Logistics"]
    }
  ];

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const qEmail = searchParams?.get("email");
    if (qEmail) {
      setEmail(qEmail);
    } else if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlEmail = urlParams.get("email");
      if (urlEmail) {
        setEmail(urlEmail);
      }
    }
  }, [searchParams]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === newsletters.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(newsletters.map((n) => n.id));
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    const chosenTopics = selectedIds.map((id) => {
      const found = newsletters.find((n) => n.id === id);
      return found ? found.title.toUpperCase() : id.toUpperCase();
    });

    const finalTopics = chosenTopics.length > 0 ? chosenTopics : ["ALL NEWS"];

    try {
      await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), topics: finalTopics })
      });

      // Also persist to localStorage for instant client synchronization
      if (typeof window !== "undefined") {
        try {
          const subsStr = localStorage.getItem("dj_newsletter_subscribers");
          let subsList: any[] = [];
          if (subsStr && subsStr.trim()) {
            try {
              subsList = JSON.parse(subsStr);
            } catch {}
          }
          if (!Array.isArray(subsList)) subsList = [];

          const existingIdx = subsList.findIndex(
            (s: any) => s.email.toLowerCase() === email.trim().toLowerCase()
          );
          const dateFormatted = new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric"
          });
          if (existingIdx >= 0) {
            subsList[existingIdx].topics = Array.from(
              new Set([...(subsList[existingIdx].topics || []), ...finalTopics])
            );
            subsList[existingIdx].date = dateFormatted;
          } else {
            subsList.unshift({
              id: Date.now(),
              email: email.trim().toLowerCase(),
              topics: finalTopics,
              date: dateFormatted,
              status: "Active"
            });
          }
          localStorage.setItem("dj_newsletter_subscribers", JSON.stringify(subsList));
          window.dispatchEvent(new Event("dj_newsletter_subscribers_updated"));
        } catch (e) {}
      }
    } catch (err) {
      console.warn("Newsletter signup error:", err);
    }

    setSubscribed(true);
    setTimeout(() => {
      setSubscribed(false);
      setEmail("");
      setSelectedIds([]);
    }, 4500);
  };

  const isAllSelected = selectedIds.length === newsletters.length;

  return (
    <main className="min-h-screen bg-[#FDFDFD] font-sans text-gray-900 selection:bg-red-100 selection:text-red-900">
      <Header />

      {/* ── TOP HERO HEADER SECTION (Human-Crafted Editorial Masthead - White Background) ── */}
      <section className="relative bg-white text-zinc-900 border-t-4 border-[#BF1E2D] border-b border-zinc-200 py-14 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="relative max-w-[1240px] mx-auto text-center">
          {/* Authentic Newsroom Kicker & Dateline */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-serif uppercase tracking-[0.22em] text-zinc-500 mb-5">
            <span className="h-px w-6 sm:w-12 bg-zinc-300" />
            <span className="text-[#BF1E2D] font-bold tracking-[0.25em]">London BigBen</span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-700 font-sans tracking-widest text-[10.5px]">Editorial Briefings</span>
            <span className="text-zinc-300 hidden sm:inline">•</span>
            <span className="text-zinc-500 font-sans tracking-wider text-[10px] hidden sm:inline">Delivered to Inbox</span>
            <span className="h-px w-6 sm:w-12 bg-zinc-300" />
          </div>

          {/* Editorial Display Headline with High-Craft Typography */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-extrabold tracking-tight font-serif leading-[1.15] text-zinc-950 max-w-4xl mx-auto">
            Let the Best of London BigBen{" "}
            <span className="font-serif italic font-normal text-[#BF1E2D]">
              Come to You
            </span>
          </h1>

          {/* Subdeck with Editorial Authority */}
          <p className="mt-4 text-sm sm:text-[15.5px] text-zinc-600 max-w-2xl mx-auto leading-relaxed font-sans">
            Select from our 12 specialized daily and weekly briefings. Receive objective geopolitical analysis, financial intelligence, breakthrough technology reporting, and candid executive interviews.
          </p>

          {/* Editorial Trust Markers */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-y-2 gap-x-5 text-xs text-zinc-600 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#BF1E2D]" />
              12 Specialized Editions
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              100% Free • No Paywalls
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              Written by Journalists
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              One-Click Unsubscribe
            </span>
          </div>

          {/* Interactive Curation Toolbar */}
          <div className="mt-8 pt-6 border-t border-zinc-200 max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-zinc-600 text-center sm:text-left">
              {selectedIds.length === 0 ? (
                <div>
                  <p className="font-semibold text-zinc-900">Curate your personal reading list</p>
                  <p className="text-[11px] text-zinc-500">Click any card below or select all 12 at once</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-zinc-900">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 mr-2 animate-pulse" />
                    {selectedIds.length} of {newsletters.length} briefings chosen
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate max-w-xs">
                    {newsletters.filter(n => selectedIds.includes(n.id)).map(n => n.title).join(", ")}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={selectAll}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer border ${
                  isAllSelected
                    ? "bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200"
                    : "bg-[#BF1E2D] border-[#BF1E2D] hover:bg-red-700 text-white shadow-sm"
                }`}
              >
                {isAllSelected ? "Clear Selections" : `Select All (${newsletters.length})`}
              </button>

              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={scrollToForm}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-800 bg-white border border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span>Subscribe ({selectedIds.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#BF1E2D]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN NEWSLETTERS GRID ── */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 py-12 md:py-16">
        {/* Section Heading Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-zinc-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 font-serif tracking-tight">
              Choose Your Briefings
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Customize your daily digest. You can adjust your subscription preferences at any time.
            </p>
          </div>

          <button
            type="button"
            onClick={selectAll}
            className="self-start sm:self-auto text-xs font-bold text-[#BF1E2D] hover:text-red-800 transition-colors uppercase tracking-wider cursor-pointer"
          >
            {isAllSelected ? "Clear All" : `Select All (${newsletters.length})`}
          </button>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {newsletters.map((n) => {
            const isChecked = selectedIds.includes(n.id);
            return (
              <div
                key={n.id}
                onClick={() => toggleSelect(n.id)}
                className={`relative p-5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group select-none ${
                  isChecked
                    ? "border-[#BF1E2D] bg-red-50/20 shadow-md ring-2 ring-[#BF1E2D]/30"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                }`}
              >
                {/* Top Row: Schedule Pill & Custom Checkbox */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-100 px-2.5 py-0.5 rounded-full font-mono">
                      {n.schedule}
                    </span>

                    {/* Checkbox Indicator */}
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 ${
                        isChecked
                          ? "bg-[#BF1E2D] text-white shadow-xs"
                          : "border-2 border-zinc-300 group-hover:border-zinc-400 bg-white"
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif font-bold text-[19px] text-zinc-900 group-hover:text-[#BF1E2D] transition-colors leading-snug mb-2">
                    {n.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[13px] text-zinc-600 leading-relaxed font-sans mb-4">
                    {n.description}
                  </p>
                </div>

                {/* Subcategory Tag Pills */}
                <div className="pt-3 border-t border-zinc-100 flex flex-wrap gap-1.5 mt-auto">
                  {n.subcategories.map((sub) => (
                    <span
                      key={sub}
                      className="text-[10px] text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200/70 font-sans group-hover:border-zinc-300 transition-colors"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── HIGH-FIDELITY EDITORIAL REGISTRATION PASS (White Background) ── */}
        <div
          ref={formRef}
          className="mt-14 bg-white text-zinc-900 border-t-4 border-[#BF1E2D] border-x border-b border-zinc-200 p-6 sm:p-10 shadow-sm relative"
        >
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-zinc-200">
            <div className="flex items-center gap-3">
              <Image
                src="/icon.png"
                alt="London BigBen"
                width={32}
                height={32}
                className="w-8 h-8 object-contain shrink-0"
              />
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-700 block leading-none">
                  London BigBen Dispatch Desk
                </span>
                <span className="text-[10px] text-zinc-500 font-sans">
                  Subscriber Registry • Direct Delivery Edition
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-sans text-zinc-600 bg-zinc-50 px-3 py-1.5 border border-zinc-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Verified Editorial Transmission</span>
            </div>
          </div>

          {/* Two-Column Editorial Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Context & Live Selection Chips */}
            <div className="lg:col-span-6 space-y-4">
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold font-serif text-zinc-900 tracking-tight leading-snug">
                  Complete Your Subscription
                </h3>
                <p className="text-xs sm:text-[13px] text-zinc-600 mt-2 leading-relaxed font-sans">
                  Join over 140,000 discerning readers. Your selected editions are hand-curated and dispatched at 06:00 GMT with zero editorial compromise.
                </p>
              </div>

              {/* Dynamic Live Selected Briefings Box */}
              {selectedIds.length === 0 ? (
                <div className="p-4 bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 leading-relaxed font-sans">
                  <div className="flex items-center gap-2 font-semibold text-zinc-900 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#BF1E2D]" />
                    <span>Default: Flagship All-News Daily Briefing</span>
                  </div>
                  <p className="text-zinc-500 text-[11.5px]">
                    No specific briefings selected above. Entering your email will subscribe you to our comprehensive flagship morning edition covering all major topics.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-zinc-50 border border-zinc-200 text-xs font-sans">
                  <div className="flex items-center justify-between text-xs text-zinc-700 mb-2.5">
                    <span className="font-semibold text-zinc-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>{selectedIds.length} of {newsletters.length} Briefings Selected</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="text-[11px] text-[#BF1E2D] hover:text-red-800 underline cursor-pointer font-medium"
                    >
                      Clear & use Flagship
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {newsletters
                      .filter((n) => selectedIds.includes(n.id))
                      .map((n) => (
                        <span
                          key={n.id}
                          className="inline-flex items-center gap-1.5 text-[11px] bg-red-50 border border-red-200 text-[#BF1E2D] px-2.5 py-1 font-medium"
                        >
                          <span>{n.title}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(n.id);
                            }}
                            className="text-red-400 hover:text-[#BF1E2D] cursor-pointer"
                            title={`Remove ${n.title}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-zinc-500 font-sans">
                ✦ Unsubscribe or modify preferences with 1 click in any newsletter footer.
              </p>
            </div>

            {/* Right Column: Form & Confirmation */}
            <div className="lg:col-span-6 bg-zinc-50/80 border border-zinc-200 p-5 sm:p-6 flex flex-col justify-between">
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 mb-2">
                    Enter Your Email Address
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3.5 bg-white border border-zinc-300 focus-within:border-[#BF1E2D] focus-within:ring-1 focus-within:ring-[#BF1E2D] transition-all">
                    <Mail className="w-5 h-5 text-zinc-400 shrink-0" />
                    <input
                      type="email"
                      required
                      placeholder="name@organization.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent text-zinc-900 placeholder-zinc-400 focus:outline-none text-sm font-sans"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#BF1E2D] hover:bg-red-700 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider py-3.5 px-6 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 font-sans"
                >
                  <span>
                    {selectedIds.length > 0
                      ? `Sign Up Now (${selectedIds.length} Briefing${selectedIds.length > 1 ? "s" : ""})`
                      : "Sign Up Now (Flagship All-News)"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Success alert message */}
              {subscribed && (
                <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>✓ Subscribed successfully! Thank you for subscribing to London BigBen.</span>
                </div>
              )}

              {/* Terms and conditions notice */}
              <p className="text-[11.5px] text-zinc-500 mt-4 leading-relaxed font-sans">
                You can unsubscribe at any time. By signing up, you agree to London BigBen&apos;s{" "}
                <Link href="/terms" className="underline text-zinc-700 hover:text-zinc-900 font-semibold">
                  Terms and Conditions
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline text-zinc-700 hover:text-zinc-900 font-semibold">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function NewslettersPage() {
  return (
    <Suspense fallback={null}>
      <NewslettersContent />
    </Suspense>
  );
}

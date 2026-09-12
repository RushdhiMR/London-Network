"use client";

import Link from "next/link";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsletterBanner from "@/components/NewsletterBanner";

interface NewsletterItem {
  id: string;
  title: string;
  schedule: string;
  description: string;
  subcategories: string[];
}

export default function NewslettersPage() {
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    const chosenTopics = selectedIds.map(id => {
      const found = newsletters.find(n => n.id === id);
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
          if (subsStr) subsList = JSON.parse(subsStr);
          if (!Array.isArray(subsList)) subsList = [];

          const existingIdx = subsList.findIndex((s: any) => s.email.toLowerCase() === email.trim().toLowerCase());
          const dateFormatted = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
          if (existingIdx >= 0) {
            subsList[existingIdx].topics = Array.from(new Set([...(subsList[existingIdx].topics || []), ...finalTopics]));
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
          window.dispatchEvent(new Event("storage"));
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
    }, 4000);
  };

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Top Banner section */}
      <section className="bg-zinc-50 border-b border-zinc-200 py-12 text-center font-standard-sans">
        <h1 className="text-[28px] md:text-[34px] font-bold text-[#BF1E2D] uppercase tracking-[2px]">
          NEWSLETTERS
        </h1>
        <p className="text-[12px] text-zinc-500 mt-2">
          Stay up to date with our daily newsletters.
        </p>
      </section>

      {/* Main Body block */}
      <div className="max-w-[840px] mx-auto px-4 py-16 font-standard-sans">
        
        {/* Intro */}
        <div className="text-center mb-12">
          <h2 className="text-[24px] md:text-[28px] font-semibold text-zinc-900 leading-tight mb-4">
            Let the best of London BigBen news come to you.
          </h2>
          <p className="text-[13px] text-zinc-600 leading-relaxed max-w-2xl mx-auto font-normal">
            Select any of the free newsletters below. Then, enter your email address and click &quot;Sign Up Now.&quot;<br />
            Your newsletter subscriptions with us are subject to London BigBen&apos;s{" "}
            <Link href="#" className="underline text-[#BF1E2D] font-bold">Terms and Conditions</Link> and{" "}
            <Link href="#" className="underline text-[#BF1E2D] font-bold">Privacy Policy</Link>.
          </p>

          <button
            onClick={selectAll}
            className="mt-8 bg-[#BF1E2D] hover:bg-red-800 text-white font-bold text-[12px] px-6 py-3 tracking-wider uppercase cursor-pointer transition-colors rounded-none"
          >
            {selectedIds.length === newsletters.length ? "DESELECT ALL NEWSLETTERS" : "SELECT ALL NEWSLETTERS"}
          </button>
        </div>

        {/* Checkbox grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 border-t border-b border-zinc-200 py-12 my-12">
          {newsletters.map((n) => {
            const isChecked = selectedIds.includes(n.id);
            return (
              <div
                key={n.id}
                onClick={() => toggleSelect(n.id)}
                className="flex items-start gap-4 cursor-pointer group"
              >
                {/* Custom Checkbox */}
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // handled by div click
                    className="w-4.5 h-4.5 accent-[#BF1E2D] cursor-pointer"
                  />
                </div>
                {/* Content */}
                <div className="flex flex-col w-full">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-[16px] text-zinc-900 group-hover:text-[#BF1E2D] transition-colors leading-none">
                      {n.title}
                    </span>
                    <span className="text-[11px] italic text-zinc-400 font-sans font-normal">
                      {n.schedule}
                    </span>
                  </div>
                  
                  {/* Brief description */}
                  <p className="text-[12.5px] text-zinc-500 leading-relaxed font-sans font-normal mt-2">
                    {n.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom high-fidelity signup form */}
        <NewsletterBanner />

      </div>

      <Footer />
    </main>
  );
}

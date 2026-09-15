"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock } from "lucide-react";
import { useLiveArticles, isEditorsPick } from "@/lib/articlesSync";

export default function EditorsPicks() {
  const [activeTab, setActiveTab] = useState<"indices" | "commodities" | "currencies">("indices");
  const { articles: liveArticles = [] } = useLiveArticles();

  const getArticleTimestamp = (item: any): number => {
    if (!item) return 0;
    if (item.published_at || item.publishedAt) {
      const t = new Date(item.published_at || item.publishedAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (item.createdAt || item.created_at) {
      const t = new Date(item.createdAt || item.created_at).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (item.date && item.date !== "Just now" && item.date !== "Today" && item.date !== "Just published") {
      const t = new Date(item.date).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (item.updatedAt || item.updated_at) {
      const t = new Date(item.updatedAt || item.updated_at).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (typeof item.id === "number") return item.id;
    if (typeof item.id === "string") {
      const match = item.id.match(/\d{10,}/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > 0) return num;
      }
      const num = parseInt(item.id.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return 0;
  };

  const picks = (Array.isArray(liveArticles) ? liveArticles : []).filter(
    (a) => a && (a.status || "").toLowerCase() === "published" && isEditorsPick(a)
  );

  picks.sort((a, b) => getArticleTimestamp(b) - getArticleTimestamp(a));

  const displayPicks = picks.slice(0, 4).map((post, idx) => {
    const cat = (post.category || "BUSINESS").toUpperCase();
    const postSlug = (post.title || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
    return {
      id: `ed-pick-${post.id || idx}`,
      category: cat,
      title: post.title,
      readTime: post.readDuration || "5 MIN READ",
      image: post.imageUrl || post.image || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&h=380&fit=crop",
      href: `/${cat.toLowerCase()}/companies/${postSlug}?id=${post.id}`
    };
  });

  if (displayPicks.length === 0) {
    return null;
  }

  const marketTabs = {
    indices: [
      { symbol: "S&P 500", price: "4,510.04", change: "+0.62%", positive: true },
      { symbol: "NASDAQ", price: "14,150.65", change: "+0.53%", positive: true },
      { symbol: "DOW JONES", price: "34,112.27", change: "+0.48%", positive: true },
      { symbol: "FTSE 100", price: "7,524.35", change: "-0.12%", positive: false },
      { symbol: "DAX 40", price: "15,925.10", change: "-0.18%", positive: false },
      { symbol: "NIKKEI 225", price: "39,678.02", change: "+0.35%", positive: true }
    ],
    commodities: [
      { symbol: "Crude Oil (WTI)", price: "$78.45", change: "+1.20%", positive: true },
      { symbol: "Brent Crude", price: "$82.10", change: "+0.95%", positive: true },
      { symbol: "Gold (USD/oz)", price: "$2,380.50", change: "+0.45%", positive: true },
      { symbol: "Silver", price: "$30.75", change: "-0.30%", positive: false },
      { symbol: "Natural Gas", price: "$2.45", change: "-1.15%", positive: false },
      { symbol: "Copper", price: "$4.42", change: "+0.80%", positive: true }
    ],
    currencies: [
      { symbol: "EUR / USD", price: "1.0875", change: "+0.15%", positive: true },
      { symbol: "GBP / USD", price: "1.2940", change: "+0.22%", positive: true },
      { symbol: "USD / JPY", price: "154.20", change: "-0.35%", positive: false },
      { symbol: "USD / CAD", price: "1.3780", change: "-0.10%", positive: false },
      { symbol: "AUD / USD", price: "0.6680", change: "+0.40%", positive: true },
      { symbol: "BTC / USD", price: "$67,420.00", change: "+2.15%", positive: true }
    ]
  };

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 border-b border-gray-200 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* LEFT 4-CARD GRID (~75%) */}
        <div className="lg:col-span-9 flex flex-col justify-between h-full">
          
          {/* Section Title */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-6 bg-[#D31220]" />
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Editor&apos;s Picks
            </h2>
          </div>

          {/* 4 Enclosed White Card Containers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 flex-1">
            {displayPicks.map((item, idx) => (
              <article key={item.id} className="bg-white border border-gray-200 rounded-none p-3.5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full group cursor-pointer">
                <div>
                  {/* Image with Bottom-Left White Overlay Category Tag */}
                  <Link href={item.href} className="relative w-full aspect-[4/3] overflow-hidden rounded-none bg-gray-100 mb-3 block">
                    <img
                      src={item.image}
                      alt={item.title}
                      onError={(e) => {
                        const fallbacks = [
                          "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&h=380&fit=crop",
                          "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&h=380&fit=crop",
                          "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=500&h=380&fit=crop",
                          "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&h=380&fit=crop"
                        ];
                        const fallback = fallbacks[idx % fallbacks.length];
                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 rounded-none"
                    />
                    <span className="absolute bottom-2.5 left-2.5 bg-white text-[#D31220] text-[10px] font-black uppercase px-2.5 py-1 rounded-none shadow-sm tracking-wider">
                      {item.category}
                    </span>
                  </Link>

                  <h3 className="text-[14px] font-bold leading-snug text-gray-900 group-hover:text-[#D31220] transition-colors mb-3 line-clamp-3">
                    <Link href={item.href}>
                      {item.title}
                    </Link>
                  </h3>
                </div>

                {/* Footer Read Time */}
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider pt-2 border-t border-gray-100 mt-auto">
                  <Clock size={13} strokeWidth={2.2} className="text-gray-400" />
                  <span>{item.readTime}</span>
                </div>
              </article>
            ))}
          </div>

        </div>

        {/* RIGHT MARKET WATCH TABBED WIDGET (~25%) */}
        <div className="lg:col-span-3 border-t lg:border-t-0 border-l-0 lg:border-l border-gray-200 pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-between h-full">
          
          {/* Market Watch Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-[#D31220]" />
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Market Watch
            </h2>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-4 text-xs font-semibold border-b border-gray-200 pb-2 mb-3">
            <button
              onClick={() => setActiveTab("indices")}
              className={`cursor-pointer transition-colors ${
                activeTab === "indices"
                  ? "text-[#D31220] border-b-2 border-[#D31220] pb-2 font-bold"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              Indices
            </button>
            <button
              onClick={() => setActiveTab("commodities")}
              className={`cursor-pointer transition-colors ${
                activeTab === "commodities"
                  ? "text-[#D31220] border-b-2 border-[#D31220] pb-2 font-bold"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              Commodities
            </button>
            <button
              onClick={() => setActiveTab("currencies")}
              className={`cursor-pointer transition-colors ${
                activeTab === "currencies"
                  ? "text-[#D31220] border-b-2 border-[#D31220] pb-2 font-bold"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              Currencies
            </button>
          </div>

          {/* Tabbed Financial Items Table */}
          <div className="flex-1 flex flex-col justify-between divide-y divide-gray-100">
            {marketTabs[activeTab].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2.5">
                <span className="text-[12.5px] font-bold text-gray-900 uppercase">
                  {item.symbol}
                </span>
                <span className="text-[12px] font-medium text-gray-600 font-mono">
                  {item.price}
                </span>
                <span className={`text-[12px] font-bold flex items-center gap-0.5 font-mono ${
                  item.positive ? "text-emerald-600" : "text-red-600"
                }`}>
                  <span>{item.change}</span>
                  <span className="text-[10px]">{item.positive ? "▲" : "▼"}</span>
                </span>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}

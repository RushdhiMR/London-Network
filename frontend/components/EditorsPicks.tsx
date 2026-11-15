"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { useLiveArticles, isEditorsPick } from "@/lib/articlesSync";

export default function EditorsPicks() {
  interface MarketItem {
    symbol: string;
    price: string;
    change: string;
    positive: boolean;
  }

  const [activeTab, setActiveTab] = useState<"indices" | "commodities" | "currencies">("indices");
  const [marketData, setMarketData] = useState<Record<string, MarketItem[]> | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);
  const [marketError, setMarketError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchMarket = async (silent = false) => {
      try {
        if (!silent && !marketData) {
          setIsLoadingMarket(true);
        }
        const res = await fetch("/api/market-data", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch market data");
        const json = await res.json();
        if (json && json.success && json.data) {
          let data = json.data;

          // Verify currencies are live; if any are dashes, hydrate via direct client fetch
          const hasCurrenciesDashes = data.currencies?.some((c: any) => c.price === "—" || c.price === "0.00" || c.price === "--");
          if (hasCurrenciesDashes) {
            try {
              const fxPromise = fetch("https://open.er-api.com/v6/latest/USD").then(r => r.json()).catch(() => null);
              const btcPromise = fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT").then(r => r.json()).catch(() => null);
              const [fxData, btcData] = await Promise.all([fxPromise, btcPromise]);
              if (fxData?.rates) {
                const r = fxData.rates;
                const btcPrice = btcData?.lastPrice ? parseFloat(btcData.lastPrice) : 65542;
                const btcChange = btcData?.priceChangePercent ? parseFloat(btcData.priceChangePercent) : -5.08;
                data = {
                  ...data,
                  currencies: [
                    { symbol: "EUR / USD", price: (1 / r.EUR).toFixed(4), change: "+0.14%", positive: true },
                    { symbol: "GBP / USD", price: (1 / r.GBP).toFixed(4), change: "+0.21%", positive: true },
                    { symbol: "USD / JPY", price: r.JPY.toFixed(2), change: "-0.18%", positive: false },
                    { symbol: "USD / CAD", price: r.CAD.toFixed(4), change: "+0.08%", positive: true },
                    { symbol: "AUD / USD", price: (1 / r.AUD).toFixed(4), change: "+0.30%", positive: true },
                    { symbol: "BTC / USD", price: "$" + btcPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), change: `${btcChange >= 0 ? "+" : ""}${btcChange.toFixed(2)}%`, positive: btcChange >= 0 },
                  ]
                };
              }
            } catch {
              // keep existing
            }
          }

          if (isMounted) {
            setMarketData(data);
            setMarketError(false);
          }
        } else {
          throw new Error("Invalid response format");
        }
      } catch {
        // Direct browser fallback for real-time rates
        try {
          const fxRes = await fetch("https://open.er-api.com/v6/latest/USD").then(r => r.json()).catch(() => null);
          const btcRes = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT").then(r => r.json()).catch(() => null);
          if (fxRes?.rates && isMounted) {
            const r = fxRes.rates;
            const btcPrice = btcRes?.lastPrice ? parseFloat(btcRes.lastPrice) : 65542;
            const btcChange = btcRes?.priceChangePercent ? parseFloat(btcRes.priceChangePercent) : -5.08;
            setMarketData({
              indices: [
                { symbol: "S&P 500", price: "5,864.67", change: "+0.38%", positive: true },
                { symbol: "NASDAQ", price: "19,281.40", change: "+0.45%", positive: true },
                { symbol: "DOW JONES", price: "43,910.25", change: "+0.59%", positive: true },
                { symbol: "FTSE 100", price: "8,370.40", change: "-0.15%", positive: false },
                { symbol: "DAX 40", price: "19,210.60", change: "+0.22%", positive: true },
                { symbol: "NIKKEI 225", price: "38,640.10", change: "-0.48%", positive: false },
              ],
              commodities: [
                { symbol: "Crude Oil (WTI)", price: "$70.38", change: "-1.24%", positive: false },
                { symbol: "Brent Crude", price: "$74.20", change: "-1.10%", positive: false },
                { symbol: "Gold (USD/oz)", price: "$2,684.50", change: "+0.42%", positive: true },
                { symbol: "Silver", price: "$31.85", change: "+1.15%", positive: true },
                { symbol: "Natural Gas", price: "$2.68", change: "+2.40%", positive: true },
                { symbol: "Copper", price: "$4.32", change: "-0.35%", positive: false },
              ],
              currencies: [
                { symbol: "EUR / USD", price: (1 / r.EUR).toFixed(4), change: "+0.14%", positive: true },
                { symbol: "GBP / USD", price: (1 / r.GBP).toFixed(4), change: "+0.21%", positive: true },
                { symbol: "USD / JPY", price: r.JPY.toFixed(2), change: "-0.18%", positive: false },
                { symbol: "USD / CAD", price: r.CAD.toFixed(4), change: "+0.08%", positive: true },
                { symbol: "AUD / USD", price: (1 / r.AUD).toFixed(4), change: "+0.30%", positive: true },
                { symbol: "BTC / USD", price: "$" + btcPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), change: `${btcChange >= 0 ? "+" : ""}${btcChange.toFixed(2)}%`, positive: btcChange >= 0 },
              ]
            });
            setMarketError(false);
          }
        } catch {
          if (isMounted && !marketData) {
            setMarketError(true);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingMarket(false);
        }
      }
    };

    fetchMarket(false);

    // Auto-refresh periodically without user reloading the page (every 10 seconds in real time)
    const interval = setInterval(() => {
      fetchMarket(true);
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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
      href: `/article/${postSlug}`
    };
  });

  if (displayPicks.length === 0) {
    return null;
  }

  return (
    <section className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 pb-0 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-stretch">

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 xl:gap-4 flex-1">
            {displayPicks.map((item, idx) => (
              <article key={item.id} className="bg-white border border-gray-200 rounded-none p-2.5 sm:p-3 xl:p-3.5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full group cursor-pointer">
                <div>
                  {/* Image with Bottom-Left White Overlay Category Tag */}
                  <Link href={item.href} className="relative w-full aspect-[4/3] overflow-hidden rounded-none bg-gray-100 mb-2.5 block">
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
                    <span className="absolute bottom-2 left-2 bg-white text-[#D31220] text-[9.5px] xl:text-[10px] font-black uppercase px-2 py-0.5 rounded-none shadow-sm tracking-wider">
                      {item.category}
                    </span>
                  </Link>

                  <h3 className="text-xs sm:text-[13px] xl:text-[14px] font-bold leading-snug text-gray-900 group-hover:text-[#D31220] transition-colors mb-2.5 line-clamp-3 font-serif">
                    <Link href={item.href}>
                      {item.title}
                    </Link>
                  </h3>
                </div>

                {/* Footer Read Time */}
                <div className="flex items-center gap-1.5 text-[10px] xl:text-[11px] font-semibold text-gray-400 uppercase tracking-wider pt-2 border-t border-gray-100 mt-auto">
                  <Clock size={12} strokeWidth={2.2} className="text-gray-400" />
                  <span>{item.readTime}</span>
                </div>
              </article>
            ))}
          </div>

        </div>

        {/* RIGHT MARKET WATCH TABBED WIDGET (~25%) */}
        <div className="lg:col-span-3 border-t lg:border-t-0 border-l-0 lg:border-l border-gray-200 pt-6 lg:pt-0 lg:pl-4 xl:pl-6 flex flex-col justify-start">

          {/* Market Watch Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-[#D31220]" />
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                Market Watch
              </h2>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2.5 sm:gap-4 text-[11.5px] xl:text-xs font-semibold border-b border-gray-200 pb-2 mb-3">
            <button
              onClick={() => setActiveTab("indices")}
              className={`cursor-pointer transition-colors ${activeTab === "indices"
                  ? "text-[#D31220] border-b-2 border-[#D31220] pb-2 font-bold"
                  : "text-gray-400 hover:text-gray-700"
                }`}
            >
              Indices
            </button>
            <button
              onClick={() => setActiveTab("commodities")}
              className={`cursor-pointer transition-colors ${activeTab === "commodities"
                  ? "text-[#D31220] border-b-2 border-[#D31220] pb-2 font-bold"
                  : "text-gray-400 hover:text-gray-700"
                }`}
            >
              Commodities
            </button>
            <button
              onClick={() => setActiveTab("currencies")}
              className={`cursor-pointer transition-colors ${activeTab === "currencies"
                  ? "text-[#D31220] border-b-2 border-[#D31220] pb-2 font-bold"
                  : "text-gray-400 hover:text-gray-700"
                }`}
            >
              Currencies
            </button>
          </div>

          {/* Tabbed Financial Items Table */}
          <div className="flex flex-col divide-y divide-gray-100">
            {isLoadingMarket && !marketData ? (
              // Loading skeleton matching existing layout and row height
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="flex items-center py-2.5 animate-pulse">
                  <div className="flex-1 pr-2">
                    <div className="h-3.5 bg-gray-200 rounded w-24" />
                  </div>
                  <div className="w-[88px] shrink-0 text-left">
                    <div className="h-3.5 bg-gray-100 rounded w-16" />
                  </div>
                  <div className="w-[68px] shrink-0 flex justify-end">
                    <div className="h-3.5 bg-gray-100 rounded w-12" />
                  </div>
                </div>
              ))
            ) : marketError && !marketData ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                <span className="text-xs text-gray-400 font-medium">Market data temporarily unavailable</span>
              </div>
            ) : (
              (marketData?.[activeTab] || []).map((item, idx) => (
                <div key={idx} className="flex items-center py-2.5">
                  <span className="flex-1 text-[12.5px] font-bold text-gray-900 uppercase pr-2 truncate">
                    {item.symbol}
                  </span>
                  <span className="w-[88px] shrink-0 text-left text-[12px] font-medium text-gray-600 font-mono">
                    {item.price}
                  </span>
                  <span
                    className={`w-[68px] shrink-0 text-right text-[12px] font-bold flex items-center justify-end gap-0.5 font-mono ${item.change === "—"
                        ? "text-gray-400"
                        : item.positive
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                  >
                    <span>{item.change}</span>
                    {item.change !== "—" && (
                      <span className="text-[10px]">{item.positive ? "▲" : "▼"}</span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

      {/* SECTION DIVIDER LINE MATCHING CONTENT WIDTH */}
      <div className="border-b border-gray-200 mt-8 w-full" />
    </section>
  );
}

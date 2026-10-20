import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface MarketItemConfig {
  symbol: string;
  ticker: string;
  format: 'index' | 'commodity' | 'forex_4' | 'forex_2' | 'crypto';
}

const MARKET_CONFIG: Record<string, MarketItemConfig[]> = {
  indices: [
    { symbol: 'S&P 500', ticker: '^GSPC', format: 'index' },
    { symbol: 'NASDAQ', ticker: '^IXIC', format: 'index' },
    { symbol: 'DOW JONES', ticker: '^DJI', format: 'index' },
    { symbol: 'FTSE 100', ticker: '^FTSE', format: 'index' },
    { symbol: 'DAX 40', ticker: '^GDAXI', format: 'index' },
    { symbol: 'NIKKEI 225', ticker: '^N225', format: 'index' }
  ],
  commodities: [
    { symbol: 'Crude Oil (WTI)', ticker: 'CL=F', format: 'commodity' },
    { symbol: 'Brent Crude', ticker: 'BZ=F', format: 'commodity' },
    { symbol: 'Gold (USD/oz)', ticker: 'GC=F', format: 'commodity' },
    { symbol: 'Silver', ticker: 'SI=F', format: 'commodity' },
    { symbol: 'Natural Gas', ticker: 'NG=F', format: 'commodity' },
    { symbol: 'Copper', ticker: 'HG=F', format: 'commodity' }
  ],
  currencies: [
    { symbol: 'EUR / USD', ticker: 'EURUSD=X', format: 'forex_4' },
    { symbol: 'GBP / USD', ticker: 'GBPUSD=X', format: 'forex_4' },
    { symbol: 'USD / JPY', ticker: 'JPY=X', format: 'forex_2' },
    { symbol: 'USD / CAD', ticker: 'CAD=X', format: 'forex_4' },
    { symbol: 'AUD / USD', ticker: 'AUDUSD=X', format: 'forex_4' },
    { symbol: 'BTC / USD', ticker: 'BTC-USD', format: 'crypto' }
  ]
};

function formatPriceValue(val: number, format: MarketItemConfig['format']): string {
  if (format === 'forex_4') {
    return val.toFixed(4);
  }
  if (format === 'forex_2') {
    return val.toFixed(2);
  }
  if (format === 'commodity' || format === 'crypto') {
    return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface MarketItemData {
  symbol: string;
  price: string;
  change: string;
  positive: boolean;
}

let cachedMarketData: {
  timestamp: number;
  data: Record<string, MarketItemData[]>;
} | null = null;

const CACHE_TTL_MS = 25000; // 25 seconds in-memory cache

async function fetchTicker(item: MarketItemConfig): Promise<MarketItemData> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.ticker)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    signal: AbortSignal.timeout(5000)
  });

  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}`);
  }

  const text = await res.text();
  if (!text || !text.trim()) {
    throw new Error('Empty response');
  }
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response');
  }
  const meta = json?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  const prevClose = meta?.chartPreviousClose;

  if (typeof price !== 'number' || isNaN(price)) {
    throw new Error('Price not available');
  }

  const prev = typeof prevClose === 'number' && prevClose > 0 ? prevClose : price;
  const diffPercent = prev > 0 ? ((price - prev) / prev) * 100 : 0;
  const positive = diffPercent >= 0;
  const sign = positive ? '+' : '';

  return {
    symbol: item.symbol,
    price: formatPriceValue(price, item.format),
    change: `${sign}${diffPercent.toFixed(2)}%`,
    positive
  };
}

export async function GET() {
  const now = Date.now();

  if (cachedMarketData && now - cachedMarketData.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      updatedAt: cachedMarketData.timestamp,
      data: cachedMarketData.data
    });
  }

  const categories = Object.keys(MARKET_CONFIG);
  const resultData: Record<string, MarketItemData[]> = {};

  try {
    for (const cat of categories) {
      const items = MARKET_CONFIG[cat];
      const categoryResults = await Promise.allSettled(
        items.map((item) => fetchTicker(item))
      );

      resultData[cat] = categoryResults.map((res, index) => {
        const itemConfig = items[index];
        if (res.status === 'fulfilled') {
          return res.value;
        }

        // If fetch failed for this specific item, check if we have a recent cached value
        const prevCategory = cachedMarketData?.data?.[cat];
        const prevItem = prevCategory?.find((p) => p.symbol === itemConfig.symbol);
        if (prevItem) {
          return prevItem;
        }

        return {
          symbol: itemConfig.symbol,
          price: '—',
          change: '—',
          positive: true
        };
      });
    }

    cachedMarketData = {
      timestamp: now,
      data: resultData
    };

    return NextResponse.json({
      success: true,
      updatedAt: now,
      data: resultData
    });
  } catch (err: any) {
    if (cachedMarketData) {
      return NextResponse.json({
        success: true,
        updatedAt: cachedMarketData.timestamp,
        data: cachedMarketData.data
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Market data is temporarily unavailable'
      },
      { status: 503 }
    );
  }
}

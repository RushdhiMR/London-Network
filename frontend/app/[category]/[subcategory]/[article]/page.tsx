import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { generateSocialMetadata } from '@/lib/seoHelper';
import SubcategoryPage from '../page';

export const dynamicParams = true;

interface ThreeSegmentPageProps {
  params: Promise<{
    category: string;
    subcategory: string;
    article: string;
  }>;
}

export async function generateMetadata({ params }: ThreeSegmentPageProps): Promise<Metadata> {
  const resolved = await params;
  const effectiveCategory = (resolved.category === "news" && resolved.subcategory)
    ? resolved.subcategory
    : resolved.category;
  const articleSlug = resolved.article || resolved.subcategory;

  return generateSocialMetadata({
    category: effectiveCategory,
    subcategory: resolved.subcategory,
    articleSlug,
    rawPath: `/${resolved.category}/${resolved.subcategory}/${resolved.article}`,
  });
}

export async function generateStaticParams() {
  return [
    {
      category: "business",
      subcategory: "companies",
      article: "new-exclusive-decoration-design-fit-out-llc-structural-acrylic-pioneers-in-the-uae"
    },
    {
      category: "news",
      subcategory: "politics",
      article: "trump-declares-iran-ceasefire-over-raising-questions-about-the-next-phase-of-the-conflict"
    },
    {
      category: "news",
      subcategory: "markets",
      article: "us-stocks-end-higher-as-sk-hynixs-wall-street-debut-and-metas-ai-momentum-lift-markets"
    },
    {
      category: "news",
      subcategory: "world",
      article: "argentina-edge-switzerland-in-extra-time-to-set-up-world-cup-semi-final-clash-with-england"
    },
    {
      category: "news",
      subcategory: "politics",
      article: "trumps-hormuz-retreat-highlights-struggles-to-end-iran-conflict"
    },
    {
      category: "business",
      subcategory: "corporate-news",
      article: "ice-suspends-most-vehicle-stops-after-fatal-shootings-in-texas-and-maine"
    },
    {
      category: "industry-insights",
      subcategory: "health",
      article: "us-explosive-diarrhoea-outbreak-remains-unsolved-as-cases-near-7000"
    },
    {
      category: "news",
      subcategory: "markets",
      article: "crypto-news-today-july-15-bitcoin-reclaims-65000-jpmorgan-warns-of-hyperliquid-risks"
    },
    {
      category: "news",
      subcategory: "markets",
      article: "crypto-market-overview-bitcoin-stabilizes-zcash-targets-new-highs"
    },
    {
      category: "news",
      subcategory: "world",
      article: "us-announces-civilian-nuclear-deal-with-saudi-arabia"
    },
    {
      category: "news",
      subcategory: "markets",
      article: "as-canadians-turn-to-ai-for-mortgage-advice-experts-warn-about-privacy-risks"
    },
    {
      category: "news",
      subcategory: "markets",
      article: "tesla-shares-dip-after-profit-misses-expectations"
    },
    {
      category: "industry-insights",
      subcategory: "health",
      article: "your-ai-made-a-decision-and-canadian-regulators-want-to-know-how"
    },
    {
      category: "news",
      subcategory: "world",
      article: "dutch-students-unveil-world-first-solar-powered-ambulance"
    }
  ];
}

export default async function ThreeSegmentArticlePage({ params }: ThreeSegmentPageProps) {
  const resolved = await params;
  
  const effectiveCategory = (resolved.category === "news" && resolved.subcategory)
    ? resolved.subcategory
    : resolved.category;

  const articleSlug = resolved.article || resolved.subcategory;

  // Delegate rendering directly to the article page handler using the resolved article slug
  return SubcategoryPage({
    params: Promise.resolve({
      category: effectiveCategory,
      subcategory: articleSlug,
    }),
  });
}

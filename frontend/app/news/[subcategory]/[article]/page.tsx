import { Metadata } from 'next';
import { generateSocialMetadata } from '@/lib/seoHelper';
import SubcategoryPage from '@/app/[category]/[subcategory]/page';

export const dynamicParams = true;

interface NewsArticlePageProps {
  params: Promise<{
    subcategory: string;
    article: string;
  }>;
}

export async function generateMetadata({ params }: NewsArticlePageProps): Promise<Metadata> {
  const resolved = await params;
  return generateSocialMetadata({
    category: resolved.subcategory || 'news',
    subcategory: resolved.subcategory,
    articleSlug: resolved.article,
    rawPath: `/news/${resolved.subcategory}/${resolved.article}`,
  });
}

export async function generateStaticParams() {
  return [
    {
      subcategory: 'politics',
      article: 'trump-declares-iran-ceasefire-over-raising-questions-about-the-next-phase-of-the-conflict'
    },
    {
      subcategory: 'markets',
      article: 'us-stocks-end-higher-as-sk-hynixs-wall-street-debut-and-metas-ai-momentum-lift-markets'
    },
    {
      subcategory: 'world',
      article: 'argentina-edge-switzerland-in-extra-time-to-set-up-world-cup-semi-final-clash-with-england'
    },
    {
      subcategory: 'politics',
      article: 'trumps-hormuz-retreat-highlights-struggles-to-end-iran-conflict'
    },
    {
      subcategory: 'markets',
      article: 'crypto-news-today-july-15-bitcoin-reclaims-65000-jpmorgan-warns-of-hyperliquid-risks'
    },
    {
      subcategory: 'markets',
      article: 'crypto-market-overview-bitcoin-stabilizes-zcash-targets-new-highs'
    },
    {
      subcategory: 'world',
      article: 'us-announces-civilian-nuclear-deal-with-saudi-arabia'
    },
    {
      subcategory: 'markets',
      article: 'as-canadians-turn-to-ai-for-mortgage-advice-experts-warn-about-privacy-risks'
    },
    {
      subcategory: 'markets',
      article: 'tesla-shares-dip-after-profit-misses-expectations'
    },
    {
      subcategory: 'world',
      article: 'dutch-students-unveil-world-first-solar-powered-ambulance'
    }
  ];
}

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const resolved = await params;
  return SubcategoryPage({
    params: Promise.resolve({
      category: resolved.subcategory || 'news',
      subcategory: resolved.article,
    }),
  });
}

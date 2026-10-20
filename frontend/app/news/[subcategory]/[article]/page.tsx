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

import { redirect } from 'next/navigation';

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const resolved = await params;
  redirect(`/article/${resolved.article}`);
}

import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { generateSocialMetadata } from '@/lib/seoHelper';
import SubcategoryPage from '../page';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
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

export default async function ThreeSegmentArticlePage({ params }: ThreeSegmentPageProps) {
  const resolved = await params;
  const articleSlug = resolved.article || resolved.subcategory;
  redirect(`/article/${articleSlug}`);
}

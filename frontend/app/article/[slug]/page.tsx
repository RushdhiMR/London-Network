import { Metadata } from 'next';
import { generateSocialMetadata } from '@/lib/seoHelper';
import SubcategoryPage from '@/app/[category]/[subcategory]/page';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const resolved = await params;
  return generateSocialMetadata({
    articleSlug: resolved.slug,
    rawPath: `/article/${resolved.slug}`,
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const resolved = await params;
  const slug = resolved.slug;

  return SubcategoryPage({
    params: Promise.resolve({
      category: 'article',
      subcategory: slug,
    }),
  });
}

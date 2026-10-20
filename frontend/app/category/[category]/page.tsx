import CategoryPageLayout from "@/components/CategoryPageLayout";
import { getCategoryData } from "@/lib/categoryData";
import { Metadata } from "next";
import { generateSocialMetadata } from "@/lib/seoHelper";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const resolved = await params;
  return generateSocialMetadata({
    category: resolved.category,
    rawPath: `/category/${resolved.category}`,
  });
}

export async function generateStaticParams() {
  return [
    { category: "world" },
    { category: "politics" },
    { category: "business" },
    { category: "technology" },
    { category: "economy" },
    { category: "markets" },
    { category: "lifestyle" },
    { category: "sports" },
    { category: "entertainment" },
    { category: "health" },
    { category: "research" },
    { category: "china" },
    { category: "europe" },
    { category: "united-states" },
    { category: "britain" },
    { category: "middle-east" },
    { category: "africa" },
    { category: "asia" },
    { category: "interview" },
  ];
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  const categorySlug = (resolvedParams?.category || "lifestyle").toLowerCase().trim();
  const data = getCategoryData(categorySlug);

  return (
    <CategoryPageLayout
      categoryName={data.categoryName}
      categorySlug={categorySlug}
      categoryColor={data.categoryColor}
      infoBoxText={data.infoBoxText}
      featured={data.featured}
      secondaryArticles={data.secondaryArticles}
      guidesTitle={data.guidesTitle}
      guidesDescription={data.guidesDescription}
      guides={data.guides}
      newsTitle={data.newsTitle}
      newsDescription={data.newsDescription}
      newsArticles={data.newsArticles}
    />
  );
}

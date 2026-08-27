import CategoryPageLayout from "@/components/CategoryPageLayout";
import { getCategoryData } from "@/lib/categoryData";

interface DynamicCategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

export async function generateStaticParams() {
  return [
    { category: "world" },
    { category: "politics" },
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
  ];
}

export default async function DynamicCategoryPage({ params }: DynamicCategoryPageProps) {
  const resolvedParams = await params;
  const categorySlug = resolvedParams?.category || "lifestyle";
  const data = getCategoryData(categorySlug);

  return (
    <CategoryPageLayout
      categoryName={data.categoryName}
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

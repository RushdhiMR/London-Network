import CategoryPageLayout from "@/components/CategoryPageLayout";
import { getCategoryData } from "@/lib/categoryData";

interface NewsSubcategoryPageProps {
  params: Promise<{
    subcategory: string;
  }>;
}

export async function generateStaticParams() {
  return [
    { subcategory: "world" },
    { subcategory: "politics" },
    { subcategory: "economy" },
    { subcategory: "markets" },
    { subcategory: "lifestyle" },
    { subcategory: "sports" },
    { subcategory: "entertainment" },
    { subcategory: "health" },
    { subcategory: "research" },
    { subcategory: "china" },
    { subcategory: "europe" },
    { subcategory: "united-states" },
    { subcategory: "britain" },
    { subcategory: "middle-east" },
    { subcategory: "africa" },
    { subcategory: "asia" },
  ];
}

export default async function NewsSubcategoryPage({ params }: NewsSubcategoryPageProps) {
  const resolvedParams = await params;
  const subcategorySlug = resolvedParams?.subcategory || "world";
  const data = getCategoryData(subcategorySlug);

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

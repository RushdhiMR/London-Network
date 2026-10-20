import CategoryPageLayout from "@/components/CategoryPageLayout";
import { getCategoryData } from "@/lib/categoryData";
import SubcategoryPage from "@/app/[category]/[subcategory]/page";
import { Metadata } from "next";
import { generateSocialMetadata } from "@/lib/seoHelper";

export const dynamicParams = true;

interface NewsSubcategoryPageProps {
  params: Promise<{
    subcategory: string;
  }>;
}

export async function generateMetadata({ params }: NewsSubcategoryPageProps): Promise<Metadata> {
  const resolved = await params;
  return generateSocialMetadata({
    category: "news",
    subcategory: resolved.subcategory,
    articleSlug: resolved.subcategory,
    rawPath: `/news/${resolved.subcategory}`,
  });
}

const knownNewsSubcategories = [
  "world", "politics", "business", "technology", "economy", "markets", "lifestyle", "sports", "entertainment", "health", "research", "china", "europe", "united-states", "britain", "middle-east", "africa", "asia"
];

import { redirect } from "next/navigation";

export default async function NewsSubcategoryPage({ params }: NewsSubcategoryPageProps) {
  const resolvedParams = await params;
  const subcategorySlug = resolvedParams?.subcategory || "world";

  if (!knownNewsSubcategories.includes(subcategorySlug.toLowerCase())) {
    redirect(`/article/${subcategorySlug}`);
  }

  redirect(`/category/${subcategorySlug}`);
}

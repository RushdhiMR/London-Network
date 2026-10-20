import CategoryPageLayout from "@/components/CategoryPageLayout";
import { getCategoryData } from "@/lib/categoryData";
import { Metadata } from "next";
import { generateSocialMetadata } from "@/lib/seoHelper";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DynamicCategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

export async function generateMetadata({ params }: DynamicCategoryPageProps): Promise<Metadata> {
  const resolved = await params;
  return generateSocialMetadata({
    category: resolved.category,
    rawPath: `/${resolved.category}`,
  });
}

import { redirect } from "next/navigation";

export default async function DynamicCategoryPage({ params }: DynamicCategoryPageProps) {
  const resolvedParams = await params;
  const categorySlug = resolvedParams?.category || "lifestyle";
  redirect(`/category/${categorySlug}`);
}

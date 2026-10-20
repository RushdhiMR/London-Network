import CategoryPageLayout from '@/components/CategoryPageLayout';
import { Metadata } from 'next';
import { generateSocialMetadata } from '@/lib/seoHelper';

import { redirect } from 'next/navigation';

export async function generateMetadata(): Promise<Metadata> {
  return generateSocialMetadata({ category: "business", rawPath: "/business" });
}

export default function BusinessPage() {
  redirect('/category/business');
}

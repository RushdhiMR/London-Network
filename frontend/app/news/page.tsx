import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { generateSocialMetadata } from '@/lib/seoHelper';

export async function generateMetadata(): Promise<Metadata> {
  return generateSocialMetadata({ category: "news", rawPath: "/news" });
}

export default function NewsPage() {
  redirect('/category/news');
}

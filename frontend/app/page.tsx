"use client";

import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import EditorsPicks from '@/components/EditorsPicks';
import LatestNewsSection from '@/components/LatestNewsSection';
import PromoBanner from '@/components/PromoBanner';
import PoliticsSection from '@/components/PoliticsSection';
import BusinessGrid from '@/components/BusinessGrid';
import TechnologyGrid from '@/components/TechnologyGrid';
import VideoSection from '@/components/VideoSection';
import InterviewSection from '@/components/InterviewSection';
import MostReadSection from '@/components/MostReadSection';
import MarketsSection from '@/components/MarketsSection';
import LifeStyleSection from '@/components/LifeStyleSection';
import BottomCategoryGrid from '@/components/BottomCategoryGrid';
import Footer from '@/components/Footer';
import AdBanner from '@/components/AdBanner';

export default function Home() {
  return (
    <main className="min-h-screen bg-white font-sans text-gray-900 selection:bg-red-100 selection:text-red-900">
      {/* 1. Header Navigation */}
      <Header />

      {/* 2. Section 1: Hero & Main Story + Trending Now */}
      <HeroSection />

      {/* 3. Section 2: Editor's Picks & Market Watch Box */}
      <EditorsPicks />

      {/* 4. Section 3: Latest News Feed & Newsletter Widget */}
      <LatestNewsSection />

      {/* 5. Section 4: Home Page Ad Section 2 (Middle Banner) */}
      <PromoBanner />

      {/* 6. Section 5: Politics Section */}
      <PoliticsSection />

      {/* 7. Section 6: Business Section */}
      <BusinessGrid />

      {/* Advertisement Banner Above Videos Section */}
      <AdBanner label="ADVERTISEMENT" slotId="slot-technology" maxWidth="max-w-[728px]" />

      {/* Video Panel: Videos / Reels */}
      <VideoSection />

      {/* 8. Section 7: Technology Section */}
      <TechnologyGrid />

      {/* 9. Ad Slot 2 */}
      <AdBanner label="ADVERTISEMENT - SLOT 2" />

      {/* 10. Interview Section */}
      <InterviewSection />

      {/* Most Read Section */}
      <MostReadSection />

      {/* 11. Section 8: Markets Section */}
      <MarketsSection />

      {/* 12. Section 9: Life Style Section */}
      <LifeStyleSection />

      {/* 13. Ad Slot 3 */}
      <AdBanner label="ADVERTISEMENT - SLOT 3" />

      {/* 14. Section 10: Bottom Category 4-Column Grid */}
      <BottomCategoryGrid />

      {/* 15. Footer */}
      <Footer />
    </main>
  );
}

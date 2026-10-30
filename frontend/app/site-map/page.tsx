import { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Site Map | London BigBen Network",
  description: "A complete guide to sections, coverage, and services across London BigBen Network.",
};

interface SitemapSection {
  title: string;
  links: {
    name: string;
    href: string;
  }[];
}

const SITEMAP_SECTIONS: SitemapSection[] = [
  {
    title: "World",
    links: [
      { name: "World News", href: "/category/world" },
      { name: "United States", href: "/category/united-states" },
      { name: "China", href: "/category/china" },
      { name: "Europe", href: "/category/europe" },
      { name: "Britain", href: "/category/britain" },
      { name: "Middle East", href: "/category/middle-east" },
      { name: "Africa", href: "/category/africa" },
      { name: "Asia", href: "/category/asia" },
      { name: "Americas", href: "/category/world" },
    ],
  },
  {
    title: "Business",
    links: [
      { name: "Business", href: "/business" },
      { name: "Markets & Economics", href: "/news/markets" },
      { name: "Banking", href: "/business" },
      { name: "Investment", href: "/business" },
      { name: "Real Estate", href: "/business" },
      { name: "Tourism & Hospitality", href: "/business" },
      { name: "Agriculture", href: "/business" },
    ],
  },
  {
    title: "Finance & Economics",
    links: [
      { name: "Finance & Economics", href: "/news/economy" },
      { name: "Stock Markets", href: "/news/markets" },
      { name: "Cost of Living", href: "/news/economy" },
      { name: "Cryptocurrency", href: "/technology" },
    ],
  },
  {
    title: "Politics",
    links: [
      { name: "Politics", href: "/category/politics" },
      { name: "The White House", href: "/category/politics" },
      { name: "Congress", href: "/category/politics" },
      { name: "Elections", href: "/category/politics" },
      { name: "Law & Justice", href: "/category/politics" },
      { name: "International Relations", href: "/category/politics" },
      { name: "Human Rights", href: "/category/politics" },
    ],
  },
  {
    title: "Technology & Science",
    links: [
      { name: "Technology", href: "/technology" },
      { name: "Artificial Intelligence", href: "/technology" },
      { name: "Innovations", href: "/innovation" },
      { name: "Healthcare", href: "/news/health" },
      { name: "Energy", href: "/technology" },
    ],
  },
  {
    title: "Culture & Lifestyle",
    links: [
      { name: "Culture", href: "/news/lifestyle" },
      { name: "Entertainment", href: "/news/entertainment" },
      { name: "Sports", href: "/news/sports" },
      { name: "Opinions", href: "/interview" },
    ],
  },
  {
    title: "More",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Our Team", href: "/team" },
      { name: "Careers", href: "/contact" },
      { name: "Newsletters", href: "/newsletters" },
      { name: "Subscribe", href: "/subscribe" },
      { name: "Advertise", href: "/advertise" },
      { name: "Contact Us", href: "/contact" },
      { name: "Terms of Use", href: "/terms" },
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Cookie Policy", href: "/cookies" },
      { name: "Editorial Policy", href: "/editorial-policy" },
    ],
  },
  {
    title: "My Account",
    links: [
      { name: "Log In", href: "/login" },
      { name: "Sign Up / Register", href: "/register" },
      { name: "Saved Stories (Bookmarks)", href: "/reader" },
      { name: "Reader Dashboard", href: "/reader" },
      { name: "Manage Subscription", href: "/subscribe" },
    ],
  },
];

export default function SiteMapPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 max-w-[1240px] xl:max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* TOP HEADER */}
        <div>
          <h1 className="text-4xl sm:text-5xl lg:text-[46px] font-serif font-black text-slate-900 tracking-tight">
            Site map
          </h1>
          <p className="text-sm sm:text-[15px] text-slate-600 font-sans mt-3">
            A complete guide to sections, coverage, and services across London BigBen Network.
          </p>
        </div>

        {/* FULL WIDTH DIVIDER */}
        <div className="border-b border-slate-300 mt-6 sm:mt-8 mb-10 sm:mb-14" />

        {/* 4-COLUMN SECTIONS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 lg:gap-x-12 gap-y-12 sm:gap-y-14">
          {SITEMAP_SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="font-serif font-bold text-base sm:text-[17px] text-slate-900 pb-2 border-b border-slate-200 mb-3.5 tracking-tight">
                {section.title}
              </h2>
              <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-[13px] text-slate-600">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-slate-600 hover:text-[#BF1E2D] hover:underline transition-colors block"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}

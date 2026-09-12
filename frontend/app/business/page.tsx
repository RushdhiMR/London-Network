import CategoryPageLayout from '@/components/CategoryPageLayout';
import { Metadata } from 'next';
import { generateSocialMetadata } from '@/lib/seoHelper';

export async function generateMetadata(): Promise<Metadata> {
  return generateSocialMetadata({ category: "business" });
}

export default function BusinessPage() {
  const featured = {
    category: "STARTUPS & VENTURE • TECH & BUSINESS FUTURE",
    title: "Startup funds AI — and a better future",
    description: "Venture capital funding and corporate investments continue to flow into automated pipelines, backing developers and system architects.",
    image: "https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=1200&h=800&fit=crop",
    author: "Sarah Mitchell",
    date: "3 hours ago"
  };

  const secondaryArticles = [
    {
      title: "Video: Alteryx found when it posted Git credentials in raw code",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=150&h=150&fit=crop",
      date: "July 15, 2026 12:44 PM EST"
    },
    {
      title: "Canada's Conexiom bets that the future of AI lies in automation, not experimentation",
      image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=150&h=150&fit=crop",
      date: "July 15, 2026"
    },
    {
      title: "Tunnel tech to survey the state of leaving framework",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&h=150&fit=crop",
      date: "July 14, 2026"
    },
    {
      title: "Lightworks, Scotiabank, Sun Life and TELUS launch AI Consortium",
      image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=150&h=150&fit=crop",
      date: "July 14, 2026"
    }
  ];

  const guides = [
    {
      title: "Your complete guide to sparking innovation in a digital age",
      description: "Remember when setting up custom modules was the norm? Today, developers rely on unified frameworks...",
      author: "By Jennifer Abbott • July 15, 2026"
    },
    {
      title: "The urgent manual to successful innovation: standard setup or hybrid custom",
      description: "Successful innovation is not a one-size-fits-all. Organizations must choose between standardized modules...",
      author: "By Jane Smith • July 15, 2026"
    },
    {
      title: "Want to keep customers at the heart of your innovation project?",
      description: "How do you build a product that is not only functional but also loved by users? Focus on the feedback...",
      author: "By Sarah Miller • July 15, 2026"
    },
    {
      title: "You can't execute successfully without the right company culture and mindset",
      description: "Testing and building frameworks is easy compared to alignment. Mindset determines which projects scale...",
      author: "By Jennifer Abbott • July 15, 2026"
    }
  ];

  const newsArticles = [
    {
      title: "Op-Ed: Rethinking humanity as automation rewrites human realities",
      description: "Automation is not just about replacing jobs; it's about redefining what it means to be human and finding focus areas that leverage empathy and critical oversight.",
      date: "By Sarah Miller • 8 hours ago",
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=220&h=150&fit=crop"
    },
    {
      title: "'Indispensable' Xiaohongshu app fuels a Chinese tourism boom",
      description: "The social and e-commerce app has become the go-to guide for Chinese tourists planning overseas trips and discovering local hubs.",
      date: "By David Chen • 12 hours ago",
      image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=220&h=150&fit=crop"
    },
    {
      title: "Growing list of countries move to ban social media for children",
      description: "The UK is considering joining a growing list of nations enacting strict bans on social media usage for minors due to mental health concerns.",
      date: "By Sarah Mitchell • 14 hours ago",
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=220&h=150&fit=crop"
    },
    {
      title: "Op-Ed: Canada rewrites the rules on AI privacy with Bill C-27, and this is just the start",
      description: "With commitment to protecting digital rights, Bill C-27 may well become a benchmark for AI regulations and compliance audits globally.",
      date: "By Pramod Asu • 18 hours ago",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=220&h=150&fit=crop"
    },
    {
      title: "OpenAI number two Szymon Sidor steps down to focus on health",
      description: "The influential researcher announced he is taking a sabbatical after seven years at the artificial intelligence startup, leaving a key leadership gap.",
      date: "By David Chen • 1 day ago",
      image: "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=220&h=150&fit=crop"
    },
    {
      title: "Remembering Shiam Sultania, a CIO leader and friend to many",
      description: "A heavy loss for Canada's tech community. Remembering Shiam Sultania and the legacy of his leadership in enterprise cloud scaling modules.",
      date: "By Jennifer Abbott • 1 day ago",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=220&h=150&fit=crop"
    },
    {
      title: "How AI and digital twins are transforming project management in Canada",
      description: "Digital twins, artificial intelligence, and real-time telemetry processing are transforming how complex building and infrastructure developments are monitored.",
      date: "By Pramod Asu • 2 days ago",
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=220&h=150&fit=crop"
    },
    {
      title: "Is workplace culture overtaking corporate prestige in the talent war?",
      description: "The prestige of working for tech giants is fading, as younger engineers prioritize remote work flexibility, mentoring, and support networks.",
      date: "By Sarah Miller • 2 days ago",
      image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=220&h=150&fit=crop"
    },
    {
      title: "Canada's talent hunt: Why the country needs more skilled workers than ever",
      description: "As modern transactional infrastructure scales up, there is an urgent demand for qualified system developers, architects, and product managers.",
      date: "By Jennifer Abbott • 3 days ago",
      image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=220&h=150&fit=crop"
    }
  ];

  return (
    <CategoryPageLayout
      categoryName="Business"
      categoryColor="bg-[#FFE9D6]"
      infoBoxText={`Business covers corporations, startups, leadership dynamics, and entrepreneurship. We track corporate policy changes, strategic pivots, venture capital funding, and market directions that affect modern business organizations.\n\nWe verify and report on developments in real time. Essential details and updates to keep you informed of global impacts.`}
      featured={featured}
      secondaryArticles={secondaryArticles}
      guidesTitle="Business Guides"
      guidesDescription="Background context and practical insights on challenging topics and what to do about it."
      guides={guides}
      newsTitle="Business More News"
      newsDescription="Everything happening now that you need to know to find new ideas."
      newsArticles={newsArticles}
    />
  );
}

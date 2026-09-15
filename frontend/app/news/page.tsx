import CategoryPageLayout from '@/components/CategoryPageLayout';
import { Metadata } from 'next';
import { generateSocialMetadata } from '@/lib/seoHelper';

export async function generateMetadata(): Promise<Metadata> {
  return generateSocialMetadata({ category: "news", rawPath: "/news" });
}

export default function NewsPage() {
  const featured = {
    category: "AEROSPACE • SATELLITE NETWORK • SOVEREIGN INFRASTRUCTURE",
    title: "Space sovereignty: How Canada and Europe compare in the race for secure orbital infrastructure",
    description: "As space becomes more commercialized, governments seek to secure satellite infrastructure and launch capabilities, ensuring military and scientific communication nets are insulated from third-party interception.",
    image: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=1200&h=800&fit=crop",
    author: "Lisa Chen",
    date: "July 13, 2026"
  };

  const secondaryArticles = [
    {
      title: "Global semiconductor consortium announces 2nm chip manufacturing breakthrough",
      image: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&h=150&fit=crop",
      date: "July 16, 2026"
    },
    {
      title: "International data privacy framework approved for cross-border cloud audits",
      image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&h=150&fit=crop",
      date: "July 16, 2026"
    },
    {
      title: "Clean energy grids scale solar & wind storage capacity in major cities",
      image: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=150&h=150&fit=crop",
      date: "July 15, 2026"
    },
    {
      title: "Autonomous logistics networks deploy fleet tracking in North America",
      image: "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=150&h=150&fit=crop",
      date: "July 15, 2026"
    }
  ];

  const guides = [
    {
      title: "A journalist's guide to verifying digital source materials",
      description: "Verification techniques for digital media including metadata analysis, geographic cross-referencing...",
      author: "By Jane Smith • July 15, 2026"
    },
    {
      title: "How to read and interpret complex statistical research reports",
      description: "A methodology to evaluate researcher biases, sample size bounds, and correlation errors in public papers...",
      author: "By Sarah Miller • July 15, 2026"
    },
    {
      title: "Understanding public policy impact on engineering standards",
      description: "How new laws regarding data residency, privacy, and carbon output modify industrial code templates...",
      author: "By David Chen • July 15, 2026"
    },
    {
      title: "Best practices for data collection and public interest reporting",
      description: "Guidelines for secure leaks databases, protecting sources, and verifying corporate document breaches...",
      author: "By Jennifer Abbott • July 15, 2026"
    }
  ];

  const newsArticles = [
    {
      title: "Space sovereignty: How Canada and Europe compare in the race for secure orbital infrastructure",
      description: "Sovereign communication networks move to private satellite channels to counter third-party interception and data hacking.",
      date: "By Lisa Chen • 4 hours ago",
      image: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=220&h=150&fit=crop"
    },
    {
      title: "EU tells Meta to change Facebook, Instagram's 'addictive design'",
      description: "Regulators demand structural changes to social feeds or threaten heavy revenue fines for youth psychological health violations.",
      date: "By Agil Riaz • 14 hours ago",
      image: "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=220&h=150&fit=crop"
    },
    {
      title: "Music industry launches AI-generated content labels",
      description: "Songwriters and labels establish metadata tags to signal synthetic files on global streaming platforms and protect royalties.",
      date: "By Jessica Lee • 18 hours ago",
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=220&h=150&fit=crop"
    },
    {
      title: "Faster AI, tighter data, and the CIO in the middle",
      description: "CIOs navigate the corporate friction between rapid deployment timelines and strict local data boundaries and residency rules.",
      date: "By Pramod Asu • 1 day ago",
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=220&h=150&fit=crop"
    },
    {
      title: "Humanitarianism look to put the AI in aid",
      description: "Aid organizations explore machine learning tools to optimize disaster response efforts, mapping supply drop logistics.",
      date: "By Emily Hart • 2 days ago",
      image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=220&h=150&fit=crop"
    },
    {
      title: "Global regulatory boards align on uniform cross-border data transfer audits",
      description: "Privacy watchdogs execute combined audits to verify compliance and safety across transatlantic cloud services.",
      date: "By Sarah Miller • 2 days ago",
      image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=220&h=150&fit=crop"
    },
    {
      title: "Research consortium publishes open-access study on crop genetics",
      description: "Agricultural engineers release detailed genome files to help global farms grow climate-resilient strains and seeds.",
      date: "By April Hicke • 3 days ago",
      image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=220&h=150&fit=crop"
    },
    {
      title: "Smart power grids rolled out across five major metropolitan hubs",
      description: "Urban transit and energy systems integrate AI routing to balance supply nodes during peak load hours in dense sectors.",
      date: "By David Chen • 3 days ago",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=220&h=150&fit=crop"
    },
    {
      title: "Unified digital ticketing systems launched across regional rail networks",
      description: "Commuters gain contactless card access across multiple transport modes, reducing ticketing delays and queues.",
      date: "By Laura Adams • 4 days ago",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=220&h=150&fit=crop"
    },
    {
      title: "National curriculum updates mandate AI and data literacy basics in high schools",
      description: "Students will learn data privacy laws, algorithmic biases, and simple python scripting modules under new guidelines.",
      date: "By Shon Higgs • 5 days ago",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=220&h=150&fit=crop"
    }
  ];

  return (
    <CategoryPageLayout
      categoryName="News"
      categorySlug="news"
      categoryColor="bg-[#FFE552]"
      infoBoxText={`News brings you the latest stories, columns, and coverage from across the globe. We track policy changes, scientific breakthroughs, geopolitical events, and digital privacy regulations that affect developers, architects, and the broader tech community.\n\nWe verify and report on developments in real time. Essential details and updates to keep you informed of global impacts.`}
      featured={featured}
      secondaryArticles={secondaryArticles}
      guidesTitle="News Guides"
      guidesDescription="Background context and practical insights on challenging topics and what to do about it."
      guides={guides}
      newsTitle="News More News"
      newsDescription="Everything happening now that you need to know to find new ideas."
      newsArticles={newsArticles}
    />
  );
}

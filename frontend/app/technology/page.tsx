import CategoryPageLayout from '@/components/CategoryPageLayout';
import { Metadata } from 'next';
import { generateSocialMetadata } from '@/lib/seoHelper';

export async function generateMetadata(): Promise<Metadata> {
  return generateSocialMetadata({ category: "technology", rawPath: "/technology" });
}

export default function TechnologyPage() {
  const featured = {
    category: "REVIEW • BUSINESS & FINANCE • TECH & SCIENCE FUTURE",
    title: "Review: Has AI been chasing the wrong dream since Alan Turing?",
    description: "The search for true artificial intelligence is in a critical transition. Experts ask if we're chasing the wrong goals by emphasizing statistical prediction over symbolic reasoning models.",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=800&fit=crop",
    author: "Dr. Andrew Forde",
    date: "July 13, 2026"
  };

  const secondaryArticles = [
    {
      title: "Silicon photonics breakthrough promises 10x faster data center interconnects",
      image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=150&h=150&fit=crop",
      date: "July 16, 2026"
    },
    {
      title: "Alberta puts $50 million behind Amii's AI research",
      image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150&h=150&fit=crop",
      date: "July 9, 2026"
    },
    {
      title: "Why governance lets Thomson Reuters move faster on AI",
      image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=150&h=150&fit=crop",
      date: "July 2, 2026"
    },
    {
      title: "The AI procurement question hiding in your doctor's office",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=150&fit=crop",
      date: "June 26, 2026"
    }
  ];

  const guides = [
    {
      title: "The key technologies innovators use to drive digital transformation",
      description: "Digital transformation is reshaping industries by integrating advanced computing, automation, and intelligent workflows...",
      author: "By Pramod Asu • July 15, 2026"
    },
    {
      title: "How to keep your customers throughout your digital transformation",
      description: "Learn the best strategies to maintain client relationships and user retention during complex migration phases...",
      author: "By Pramod Asu • July 15, 2026"
    },
    {
      title: "Dialing into the future: How digital innovation is reshaping telecoms",
      description: "Telecom providers are redesigning core routing systems to accommodate massive 5G/6G data loads and Edge computation...",
      author: "By Pramod Asu • July 15, 2026"
    },
    {
      title: "How digital transformation is revolutionizing manufacturing",
      description: "Smart factory floor networks utilize real-time diagnostics and neural modules to increase production throughput...",
      author: "By Pramod Asu • July 15, 2026"
    }
  ];

  const newsArticles = [
    {
      title: "The era of the generalist board director is over",
      description: "As technologies scale, company boards require specialized expertise in cybersecurity, AI ethics, and systems engineering to mitigate multi-vector enterprise risks.",
      date: "By Emily Hart • 4 hours ago",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=220&h=150&fit=crop"
    },
    {
      title: "China's Moonshot AI chases 'DeepSeek' moment with math-focused model",
      description: "The Beijing-based startup is releasing a specialized reasoning framework designed to tackle complex mathematical algorithms and system designs dynamically.",
      date: "By Sarah Mitchell • 8 hours ago",
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=220&h=150&fit=crop"
    },
    {
      title: "Startups bet on AI, and a lesser future",
      description: "Venture pipelines are increasingly targeted at automation modules that require minimal oversight, prompting labor debates across major economies.",
      date: "By David Chen • 12 hours ago",
      image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=220&h=150&fit=crop"
    },
    {
      title: "Opposition to data centres grows in cramped urban Japan",
      description: "Local councils are voicing concerns over massive energy demands and water-cooling consumption in dense municipal sectors near high-density power grids.",
      date: "By Pramod Asu • 14 hours ago",
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=220&h=150&fit=crop"
    },
    {
      title: "Tokyo, Taipei lead tech losses as Asian markets suffer again",
      description: "Share prices of chip manufacturers and hardware suppliers dip amid trade regulations and scaling rate corrections in global semiconductor exports.",
      date: "By Agil Riaz • 18 hours ago",
      image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=220&h=150&fit=crop"
    },
    {
      title: "SpaceX abruptly scraps Starship test flight",
      description: "Ground telemetry systems flags a sensor anomaly during the final countdown checklist at the launchpad site, delaying the orbital path project.",
      date: "By Shon Higgs • 1 day ago",
      image: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=220&h=150&fit=crop"
    },
    {
      title: "Your next AI prompt comes with an energy bill: The growing environmental cost of chatbot use",
      description: "Training and serving massive multi-modal networks requires unprecedented grid allocation, prompting sustainability audits and cooling infrastructure refactoring.",
      date: "By Sarah Mitchell • 1 day ago",
      image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=220&h=150&fit=crop"
    },
    {
      title: "What Alberta found when it pointed 50 agents at its own code",
      description: "A pilot project reveals that agentic pipelines detected over 300 deprecated database links, orphan dependencies, and minor configuration safety bugs.",
      date: "By Pramod Asu • 2 days ago",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=220&h=150&fit=crop"
    },
    {
      title: "Peterborough to survey the state of Boeing's comeback",
      description: "Local aerospace components suppliers evaluate order backlogs and manufacturing timelines for aircraft wings, telemetry nodes, and structural units.",
      date: "By Lisa Chen • 2 days ago",
      image: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=220&h=150&fit=crop"
    },
    {
      title: "Young British hackers jailed for London transport cyberattack",
      description: "Two developers receive sentences after targeting public transit ticketing servers, modifying account balances, and accessing database history.",
      date: "By Shon Higgs • 3 days ago",
      image: "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=220&h=150&fit=crop"
    }
  ];

  return (
    <CategoryPageLayout
      categoryName="Technology"
      categorySlug="technology"
      categoryColor="bg-[#FFE9D6]"
      infoBoxText={`Technology is changing how organizations work, build, and compete. The main parts of influence, insight, and competitive advantage.\n\nFiguring out details in data nodes, and what it takes to get them working, makes technology builders working every day.`}
      featured={featured}
      secondaryArticles={secondaryArticles}
      guidesTitle="Technology Guides"
      guidesDescription="Background context and practical insights on challenging topics and what to do about it."
      guides={guides}
      newsTitle="Technology More News"
      newsDescription="Things happening now that you need to know to find new ideas."
      newsArticles={newsArticles}
    />
  );
}

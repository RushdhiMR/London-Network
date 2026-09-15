import CategoryPageLayout from '@/components/CategoryPageLayout';

export default function IndustryInsightsPage() {
  const featured = {
    category: "LOGISTICS • VC PIPELINES • GREEN SUSTAINABILITY",
    title: "Venture capital firms shift focus to sustainable tech sector pipelines",
    description: "Investors redirect capital toward companies that prioritize carbon capture, sustainable energy storage, and clean efficiency tech, moving away from high-burn consumer applications.",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&h=800&fit=crop",
    author: "Lisa Chen",
    date: "July 12, 2026"
  };

  const secondaryArticles = [
    {
      title: "Agricultural sensor arrays predict crop yield variations under climate shifts",
      image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=150&h=150&fit=crop",
      date: "July 15, 2026"
    },
    {
      title: "Regional tourism hubs deploy contactless digital pass networks",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&h=150&fit=crop",
      date: "July 14, 2026"
    },
    {
      title: "Financial services accelerate adoption of real-time fraud telemetry",
      image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=150&h=150&fit=crop",
      date: "July 13, 2026"
    },
    {
      title: "Transportation networks transition heavy freight fleets to hydrogen hybrid engines",
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=150&h=150&fit=crop",
      date: "July 13, 2026"
    }
  ];

  const guides = [
    {
      title: "Designing customer feedback loops that drive feature design",
      description: "Establishing clear mechanisms to channel user opinions directly to engineers helps prioritize product roadmaps...",
      author: "By Sarah Miller • July 15, 2026"
    },
    {
      title: "Transitioning from legacy monolithic systems to agile microservices",
      description: "Refactoring older frameworks into microservices reduces delivery bottlenecks and deployment collision rates...",
      author: "By Pramod Asu • July 15, 2026"
    },
    {
      title: "How remote leadership models are evolving to meet product goals",
      description: "Remote organizations need async communication paths to keep product pipelines moving without calendar fatigue...",
      author: "By Jane Smith • July 15, 2026"
    },
    {
      title: "Building a developer relations department from the ground up",
      description: "Hiring and enabling dev advocates to interface with public communities drives API adoption and open-source growth...",
      author: "By David Chen • July 15, 2026"
    }
  ];

  const newsArticles = [
    {
      title: "Venture capital firms shift focus to sustainable tech sector pipelines",
      description: "Carbon capture and energy efficiency storage startups capture the largest funding allocations this quarter, altering the VC landscape.",
      date: "By Lisa Chen • 4 hours ago",
      image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=220&h=150&fit=crop"
    },
    {
      title: "How remote leadership models are evolving to meet product goals",
      description: "Product managers adapt automated progress checks to keep developers shipping without co-location bottlenecks or status meetings.",
      date: "By Emily Hart • 8 hours ago",
      image: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=220&h=150&fit=crop"
    },
    {
      title: "Global logistics platforms integrate machine learning for routing",
      description: "Neural networks analyze maritime shipping logs, weather vectors, and fuel costs to suggest optimal trade lanes and carbon savings.",
      date: "By Pramod Asu • 14 hours ago",
      image: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=220&h=150&fit=crop"
    },
    {
      title: "Why corporate investment in developer experience yields positive ROI",
      description: "Investments in cleaner CI/CD pipelines, quick local setups, and internal documentation reduce dev friction and shipping delays.",
      date: "By Shon Higgs • 1 day ago",
      image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=220&h=150&fit=crop"
    },
    {
      title: "How digital transformation is revolutionizing remote banking in manufacturing",
      description: "Fintech modules embedded directly in supply networks allow transactions and supplier payrolls without traditional wire delays.",
      date: "By Sarah Miller • 2 days ago",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=220&h=150&fit=crop"
    },
    {
      title: "Supply chain bottlenecks ease as companies diversify sourcing locations",
      description: "Decentralizing components manufacturing to regional suppliers protects developers from assembly hardware delays and customs spikes.",
      date: "By Pramod Jain • 2 days ago",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=220&h=150&fit=crop"
    },
    {
      title: "Enterprise resource planning systems integrate predictive inventory alerts",
      description: "Smart modules query vendor databases automatically to schedule replenishment cycles when hardware supply thresholds drop.",
      date: "By Jane Smith • 3 days ago",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=220&h=150&fit=crop"
    },
    {
      title: "Why modern engineering teams are ditching traditional agile templates",
      description: "Developers pivot toward kanban-based continuous execution systems to avoid rigid sprint estimations and sync overheads.",
      date: "By David Chen • 3 days ago",
      image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=220&h=150&fit=crop"
    },
    {
      title: "Productivity metrics: Measuring developer value beyond simple commit counts",
      description: "Experts advise focusing on deployment velocity and peer code review speed rather than raw lines of code or ticket closures.",
      date: "By Laura Adams • 4 days ago",
      image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=220&h=150&fit=crop"
    },
    {
      title: "Sustainable data centers: Navigating the trade-offs of carbon neutral goals",
      description: "As computing demand increases, engineering teams evaluate green energy certificates and advanced datacenter cooling recycling models.",
      date: "By Shon Higgs • 5 days ago",
      image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=220&h=150&fit=crop"
    }
  ];

  return (
    <CategoryPageLayout
      categoryName="Industry Insights"
      categorySlug="research"
      categoryColor="bg-[#E2F0D9]"
      infoBoxText={`Industry Insights dives into the business trends, enterprise scaling, and strategic leadership that shape today's markets.\n\nHow executive choices, funding shifts, and logistical advancements translate into real-world returns and structural growth in highly competitive sectors.`}
      featured={featured}
      secondaryArticles={secondaryArticles}
      guidesTitle="Industry Insights Guides"
      guidesDescription="Background context and practical insights on challenging topics and what to do about it."
      guides={guides}
      newsTitle="Industry Insights More News"
      newsDescription="Everything happening now that you need to know to find new ideas."
      newsArticles={newsArticles}
    />
  );
}

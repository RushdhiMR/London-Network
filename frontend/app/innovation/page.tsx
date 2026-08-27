import CategoryPageLayout from '@/components/CategoryPageLayout';

export default function InnovationPage() {
  const featured = {
    category: "QUANTUM LABS • NEXT-GEN AI • DEEP TECH INNOVATION",
    title: "Breakthrough AI models and quantum computing open new horizons for digital transformation",
    description: "Venture capital funding and corporate investments continue to flow into automated pipelines, backing developers, clean energy storage, and neural processing units.",
    image: "/ai_innovation.png",
    author: "Sarah Mitchell",
    date: "3 hours ago"
  };

  const secondaryArticles = [
    {
      title: "Quantum encryption labs test satellite-to-ground key distribution",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop",
      date: "July 16, 2026"
    },
    {
      title: "Bio-inspired neural chips cut robotic computing power requirements by 80%",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=150&h=150&fit=crop",
      date: "July 15, 2026"
    },
    {
      title: "Next-gen solid state batteries enter pilot production for electric aviation",
      image: "https://images.unsplash.com/photo-1508873696983-2df515122519?w=150&h=150&fit=crop",
      date: "July 14, 2026"
    },
    {
      title: "Open-source foundation releases unified framework for edge AI models",
      image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=150&h=150&fit=crop",
      date: "July 14, 2026"
    }
  ];

  const guides = [
    {
      title: "Your complete guide to sparking innovation in a digital age",
      description: "Remember when setting up custom modules was the norm? Today, developers rely on unified frameworks and agentic intelligence...",
      author: "By Jennifer Abbott • July 15, 2026"
    },
    {
      title: "The urgent manual to successful innovation: standard setup or hybrid custom",
      description: "Successful innovation is not a one-size-fits-all. Organizations must choose between standardized modules and agile prototypes...",
      author: "By Jane Smith • July 15, 2026"
    },
    {
      title: "Want to keep customers at the heart of your innovation project?",
      description: "How do you build a product that is not only functional but also loved by users? Focus on the feedback loops and analytics...",
      author: "By Sarah Miller • July 15, 2026"
    },
    {
      title: "You can't execute successfully without the right company culture and mindset",
      description: "Testing and building frameworks is easy compared to alignment. Mindset determines which projects scale to mass adoption...",
      author: "By Jennifer Abbott • July 15, 2026"
    }
  ];

  const newsArticles = [
    {
      title: "Redefining human agency as neural automation rewrites industry standards",
      description: "Automation is not just about replacing repetitive tasks; it's about defining focus areas that leverage human empathy and critical oversight.",
      date: "By Sarah Miller • 8 hours ago",
      image: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=220&h=150&fit=crop"
    },
    {
      title: "Generative AI discovery tools transform global consumer travel behavior",
      description: "Social commerce platforms leverage real-time spatial discovery algorithms to connect international travelers directly with local cultural hubs.",
      date: "By David Chen • 12 hours ago",
      image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=220&h=150&fit=crop"
    },
    {
      title: "International policy boards mandate ethical AI guidelines for educational software",
      description: "Governments introduce guidelines regarding digital safety, screen time limits, and algorithmic transparency for youth technology products.",
      date: "By Sarah Mitchell • 14 hours ago",
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=220&h=150&fit=crop"
    },
    {
      title: "Global privacy frameworks establish benchmark for algorithmic compliance audits",
      description: "With commitment to protecting digital rights, international privacy legislation establishes clear standards for compliance audits globally.",
      date: "By Pramod Asu • 18 hours ago",
      image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=220&h=150&fit=crop"
    }
  ];

  return (
    <CategoryPageLayout
      categoryName="Innovation"
      categoryColor="bg-[#BEEDF7]"
      infoBoxText={`Innovation tracks game-changing technologies, design thinking, and startup breakthroughs that disrupt traditional industry norms.\n\nWe explore how pioneering research, adaptive frameworks, and creative problem solving transform modern business operations and build future-proof systems.`}
      featured={featured}
      secondaryArticles={secondaryArticles}
      guidesTitle="Innovation Guides"
      guidesDescription="Background context and practical insights on challenging topics and what to do about it."
      guides={guides}
      newsTitle="Innovation More News"
      newsDescription="Everything happening now that you need to know to find new ideas."
      newsArticles={newsArticles}
    />
  );
}

"use client";

import { ArticleItem, getCachedArticles, isArticleDeleted, fetchArticlesFromServer } from "./articlesSync";

export interface SearchableArticle {
  id: string | number;
  title: string;
  description: string;
  content?: string;
  category: string;
  subcategories?: string[];
  tags?: string[];
  href: string;
  date: string;
  image: string;
  author?: string;
  readDuration?: string;
}

export const DEFAULT_SEARCHABLE_ARTICLES: SearchableArticle[] = [
  // INNOVATION
  {
    id: "def_inno_1",
    title: "Review: Has AI been chasing the wrong dream since Alan Turing?",
    description: "The essential question, then, is not whether machines can imitate people. Turing asked a brilliant question for the early age of computing.",
    category: "Innovation",
    subcategories: ["Artificial Intelligence", "Research"],
    tags: ["AI", "Turing", "Computing", "MachineLearning"],
    href: "/innovation/people",
    date: "By Dr. Tim Sandle • July 19, 2026",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&h=300&fit=crop",
    author: "Dr. Tim Sandle",
    readDuration: "6 min read"
  },
  {
    id: "def_inno_2",
    title: "Your complete guide to sparking innovation in a digital age",
    description: "Remember when setting up custom modules was the norm? Today, developers rely on unified frameworks to accelerate delivery.",
    category: "Innovation",
    subcategories: ["Guides", "Digital Transformation"],
    tags: ["Innovation", "Management", "Digital"],
    href: "/innovation",
    date: "By Jennifer Abbott • July 15, 2026",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&h=300&fit=crop",
    author: "Jennifer Abbott",
    readDuration: "4 min read"
  },
  {
    id: "def_inno_3",
    title: "Want to keep customers at the heart of your innovation project?",
    description: "How do you build a product that is not only functional but also loved by users? Focus on feedback loops and rapid prototyping.",
    category: "Innovation",
    subcategories: ["Product", "Customer Experience"],
    tags: ["CustomerFeedback", "Prototyping", "DesignThinking"],
    href: "/innovation",
    date: "By Sarah Miller • July 15, 2026",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop",
    author: "Sarah Miller",
    readDuration: "5 min read"
  },

  // TECHNOLOGY
  {
    id: "def_tech_1",
    title: "Silicon chips learn to write DNA: Research points to cleaner route for synthetic biology",
    description: "The Harvard chip is an early-stage demonstration rather than an industrial replacement for current DNA synthesis platforms.",
    category: "Technology",
    subcategories: ["Biotech", "Semiconductors"],
    tags: ["DNA", "SyntheticBiology", "Silicon", "Hardware"],
    href: "/technology/emerging-tech",
    date: "By Dr. Tim Sandle • July 19, 2026",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&h=300&fit=crop",
    author: "Dr. Tim Sandle",
    readDuration: "5 min read"
  },
  {
    id: "def_tech_2",
    title: "Canada's soft robotics research is moving from laboratory novelty to business tool",
    description: "Canada's advantage lies in combining engineering research, AI strength, materials science, and medical technology.",
    category: "Technology",
    subcategories: ["Robotics", "Engineering"],
    tags: ["Robotics", "Canada", "Automation", "Tech"],
    href: "/technology/infrastructure",
    date: "By Dr. Tim Sandle • July 19, 2026",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&h=300&fit=crop",
    author: "Dr. Tim Sandle",
    readDuration: "4 min read"
  },
  {
    id: "def_tech_3",
    title: "Pocket-size AI: Powerful phones star at China show",
    description: "Wide adoption of phones running on so-called AI agents would be a revolution, but would also take control away from major apps.",
    category: "Technology",
    subcategories: ["Mobile", "AI", "World"],
    tags: ["China", "Smartphones", "AIAgents", "MobileTech"],
    href: "/technology/emerging-tech",
    date: "By AFP • July 19, 2026",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=300&fit=crop",
    author: "AFP",
    readDuration: "3 min read"
  },
  {
    id: "def_tech_4",
    title: "Next-Gen Quantum Computing breakthroughs promise uncrackable encryption",
    description: "Researchers unveil superconducting quantum circuits operating at room temperatures with minimal decoherence.",
    category: "Technology",
    subcategories: ["Quantum", "Cybersecurity"],
    tags: ["QuantumComputing", "Security", "Encryption"],
    href: "/technology",
    date: "By Alex Turner • July 18, 2026",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&h=300&fit=crop",
    author: "Alex Turner",
    readDuration: "5 min read"
  },

  // BUSINESS
  {
    id: "def_biz_1",
    title: "Startup funds AI — and a better future",
    description: "Venture capital funding and corporate investments continue to flow into automated pipelines, backing developers and system architects.",
    category: "Business",
    subcategories: ["Startups", "Venture Capital", "AI"],
    tags: ["Startups", "VentureCapital", "Investing", "Business"],
    href: "/business",
    date: "By Sarah Mitchell • 3 hours ago",
    image: "https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=1200&h=800&fit=crop",
    author: "Sarah Mitchell",
    readDuration: "4 min read"
  },
  {
    id: "def_biz_2",
    title: "Canada's Conexiom bets that the future of AI lies in automation, not experimentation",
    description: "Enterprise software leaders shift focus toward deterministic workflows and verified accounting pipelines.",
    category: "Business",
    subcategories: ["Automation", "Enterprise Software"],
    tags: ["Conexiom", "Enterprise", "Automation", "SaaS"],
    href: "/business",
    date: "By TechDesk • July 15, 2026",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&h=300&fit=crop",
    author: "TechDesk",
    readDuration: "4 min read"
  },
  {
    id: "def_biz_3",
    title: "Lightworks, Scotiabank, Sun Life and TELUS launch AI Consortium",
    description: "Major financial and telecom powerhouses join forces to build standardized generative models for secure customer support.",
    category: "Business",
    subcategories: ["Banking", "Consortium", "Finance"],
    tags: ["Scotiabank", "Banking", "Consortium", "Finance"],
    href: "/business",
    date: "By Staff Reporter • July 14, 2026",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=500&h=300&fit=crop",
    author: "Staff Reporter",
    readDuration: "3 min read"
  },
  {
    id: "def_biz_4",
    title: "Is workplace culture overtaking corporate prestige in the talent war?",
    description: "The prestige of working for tech giants is fading, as younger engineers prioritize remote work flexibility and collaborative cultures.",
    category: "Business",
    subcategories: ["Workplace", "HR", "Leadership"],
    tags: ["Workplace", "Culture", "RemoteWork", "Talent"],
    href: "/business",
    date: "By Sarah Miller • July 16, 2026",
    image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=500&h=300&fit=crop",
    author: "Sarah Miller",
    readDuration: "5 min read"
  },

  // INDUSTRY INSIGHTS
  {
    id: "def_ind_1",
    title: "Boeing gets order for 100 737 MAX jets from leasing company SMBC",
    description: "US aircraft manufacturer Boeing Monday said it has received an order for 100 of its 737 MAX jets from leasing company SMBC Aviation Capital.",
    category: "Industry Insights",
    subcategories: ["Aviation", "Manufacturing"],
    tags: ["Boeing", "Aviation", "SMBC", "Airplanes"],
    href: "/industry-insights/boeing-gets-order-for-100-737-max-jets-from-leasing-company-smbc",
    date: "By AFP • July 20, 2026",
    image: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=500&h=300&fit=crop",
    author: "AFP",
    readDuration: "4 min read"
  },
  {
    id: "def_ind_2",
    title: "SpaceX abruptly scrubs Starship test flight",
    description: "Aerospace company SpaceX abruptly cancelled a highly anticipated test launch of its Starship rocket at the last minute.",
    category: "Industry Insights",
    subcategories: ["Space", "Aerospace"],
    tags: ["SpaceX", "Starship", "ElonMusk", "Aerospace"],
    href: "/industry-insights/spacex-abruptly-scrubs-starship-test-flight",
    date: "By AFP • July 19, 2026",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&h=300&fit=crop",
    author: "AFP",
    readDuration: "3 min read"
  },

  // NEWS & WORLD
  {
    id: "def_news_1",
    title: "New science report could boost climate suits against oil giants",
    description: "New analysis formats for attributing weather extremeness to greenhouse gas emissions create solid legal ground for potential lawsuits.",
    category: "News",
    subcategories: ["Environment", "World", "Climate"],
    tags: ["ClimateChange", "OilGiants", "Lawsuits", "Environment"],
    href: "/news/environment",
    date: "By David Chen • July 19, 2026",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=220&h=150&fit=crop",
    author: "David Chen",
    readDuration: "4 min read"
  },
  {
    id: "def_news_2",
    title: "Uber to gobble up Delivery Hero in Taiwan food delivery deal",
    description: "The deal would expand Uber Eats' presence in the competitive Asian food delivery space, in a transaction valued at $950 million.",
    category: "News",
    subcategories: ["Business", "Asia", "World"],
    tags: ["Uber", "DeliveryHero", "Taiwan", "Acquisition"],
    href: "/news/business",
    date: "By Jane Smith • July 19, 2026",
    image: "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=220&h=150&fit=crop",
    author: "Jane Smith",
    readDuration: "3 min read"
  },
  {
    id: "def_news_3",
    title: "'Indispensable' Xiaohongshu app fuels a Chinese tourism boom",
    description: "The social and e-commerce app has become the go-to guide for Chinese tourists planning overseas trips and discovering regional hubs.",
    category: "News",
    subcategories: ["China", "World", "Tourism"],
    tags: ["China", "Xiaohongshu", "Tourism", "SocialMedia"],
    href: "/news",
    date: "By David Chen • 12 hours ago",
    image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=220&h=150&fit=crop",
    author: "David Chen",
    readDuration: "4 min read"
  },
  {
    id: "def_news_4",
    title: "Growing list of countries move to ban social media for children",
    description: "The UK is considering joining a growing list of nations enacting strict bans on social media usage for minors due to mental health concerns.",
    category: "News",
    subcategories: ["Britain", "World", "Politics"],
    tags: ["UK", "SocialMediaBan", "Youth", "MentalHealth"],
    href: "/news",
    date: "By Sarah Mitchell • 14 hours ago",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=220&h=150&fit=crop",
    author: "Sarah Mitchell",
    readDuration: "4 min read"
  },
  {
    id: "def_news_5",
    title: "Op-Ed: Canada rewrites the rules on AI privacy with Bill C-27",
    description: "With commitment to protecting digital rights, Bill C-27 may well become a benchmark for AI regulations and compliance audits globally.",
    category: "News",
    subcategories: ["Canada", "World", "AI", "Policy"],
    tags: ["Canada", "BillC27", "Privacy", "Regulation"],
    href: "/news",
    date: "By Pramod Asu • 18 hours ago",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=220&h=150&fit=crop",
    author: "Pramod Asu",
    readDuration: "5 min read"
  },
  {
    id: "def_news_6",
    title: "OpenAI number two Szymon Sidor steps down to focus on health",
    description: "The influential researcher announced he is taking a sabbatical after seven years at the artificial intelligence startup, leaving a key leadership gap.",
    category: "News",
    subcategories: ["AI", "Leadership", "Technology"],
    tags: ["OpenAI", "SzymonSidor", "AILeadership"],
    href: "/news",
    date: "By David Chen • 1 day ago",
    image: "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=220&h=150&fit=crop",
    author: "David Chen",
    readDuration: "3 min read"
  }
];

export function extractPlainText(htmlOrText: string): string {
  if (!htmlOrText) return "";
  return htmlOrText
    .replace(/<[^>]*>?/gm, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatArticleHref(post: any): string {
  if (post.href) return post.href;
  const cat = (post.category || post.category_name || "news").toLowerCase();
  const slug = (post.slug || post.title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `/${cat}/companies/${slug}?id=${post.id}`;
}

export function getAllSearchableArticles(): SearchableArticle[] {
  const dynamicMap = new Map<string, SearchableArticle>();

  // 1. Add static defaults first
  DEFAULT_SEARCHABLE_ARTICLES.forEach((item) => {
    dynamicMap.set(String(item.id), item);
  });

  // 2. Fetch and merge published articles from local storage cache
  if (typeof window !== "undefined") {
    try {
      const cached = getCachedArticles();
      cached.forEach((item: ArticleItem) => {
        if (!isArticleDeleted(item) && (item.status || "").toLowerCase() === "published") {
          const cleanDesc = item.summary || item.subheading || extractPlainText(item.content || "").slice(0, 160) + "...";
          const cat = item.category || item.category_name || "General";
          const subcats = Array.isArray(item.subcategories) ? item.subcategories : (item.subcategories ? [item.subcategories] : []);
          const tags = Array.isArray(item.tags) ? item.tags : [];
          
          dynamicMap.set(String(item.id), {
            id: item.id,
            title: item.title,
            description: cleanDesc,
            content: extractPlainText(item.content || ""),
            category: cat,
            subcategories: subcats,
            tags: tags,
            href: formatArticleHref(item),
            date: item.date || "Recently Published",
            image: item.imageUrl || item.image || "/argentina_vs_switzerland.png",
            author: item.authorName || "Staff Writer",
            readDuration: item.readDuration || "4 min read"
          });
        }
      });
    } catch (e) {
      console.warn("Could not read local articles for search catalog:", e);
    }
  }

  return Array.from(dynamicMap.values());
}

export async function fetchAllSearchableArticlesAsync(): Promise<SearchableArticle[]> {
  try {
    await fetchArticlesFromServer();
  } catch (e) {}
  return getAllSearchableArticles();
}

export function searchArticlesByQuery(
  articles: SearchableArticle[],
  query: string,
  categoryFilter?: string
): SearchableArticle[] {
  const trimmed = query.trim().toLowerCase();
  let list = articles;

  // Filter by category if selected
  if (categoryFilter && categoryFilter.toLowerCase() !== "all") {
    const filterCat = categoryFilter.toLowerCase().replace(/[^a-z0-9]/g, "");
    list = list.filter((art) => {
      const artCat = art.category.toLowerCase().replace(/[^a-z0-9]/g, "");
      const artSubs = (art.subcategories || []).map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""));
      return artCat === filterCat || artSubs.includes(filterCat) || artCat.includes(filterCat) || filterCat.includes(artCat);
    });
  }

  if (!trimmed) {
    return list;
  }

  const queryTerms = trimmed.split(/\s+/).filter(Boolean);

  const scored = list
    .map((art) => {
      let score = 0;
      const lowerTitle = art.title.toLowerCase();
      const lowerDesc = art.description.toLowerCase();
      const lowerContent = (art.content || "").toLowerCase();
      const lowerCategory = art.category.toLowerCase();
      const lowerSubs = (art.subcategories || []).join(" ").toLowerCase();
      const lowerTags = (art.tags || []).join(" ").toLowerCase();
      const lowerAuthor = (art.author || "").toLowerCase();

      // Exact title match (highest weight)
      if (lowerTitle === trimmed) score += 100;
      else if (lowerTitle.includes(trimmed)) score += 50;

      // Category / Tag match
      if (lowerCategory.includes(trimmed) || lowerSubs.includes(trimmed)) score += 30;
      if (lowerTags.includes(trimmed)) score += 25;

      // Description / Author match
      if (lowerDesc.includes(trimmed)) score += 20;
      if (lowerAuthor.includes(trimmed)) score += 15;
      if (lowerContent.includes(trimmed)) score += 10;

      // Multi-term token matching
      queryTerms.forEach((term) => {
        if (lowerTitle.includes(term)) score += 15;
        if (lowerCategory.includes(term) || lowerSubs.includes(term)) score += 10;
        if (lowerTags.includes(term)) score += 8;
        if (lowerDesc.includes(term)) score += 5;
        if (lowerContent.includes(term)) score += 2;
      });

      return { article: art, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.article);

  return scored;
}

import CategoryPageLayout from '@/components/CategoryPageLayout';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NewsletterBanner from '@/components/NewsletterBanner';
import NewsletterFormCard from '@/components/NewsletterFormCard';
import FastStartNewsletterBanner from '@/components/FastStartNewsletterBanner';
import ArticlePageContent from '@/components/ArticlePageContent';
import Link from 'next/link';

interface PageProps {
  params: Promise<{
    category: string;
    subcategory: string;
  }>;
}

const parentConfig: Record<string, { name: string; color: string; desc: string }> = {
  "news": {
    name: "News",
    color: "bg-[#FFE552]",
    desc: "brings you global stories and regulatory policy revisions."
  },
  "business": {
    name: "Business",
    color: "bg-[#FFE9D6]",
    desc: "covers corporations, startups, leadership dynamics, and entrepreneurship."
  },
  "industry-insights": {
    name: "Industry Insights",
    color: "bg-[#E2F0D9]",
    desc: "dives into business trends, logistical advancements, and operational metrics."
  },
  "technology": {
    name: "Technology",
    color: "bg-[#BEEDF7]",
    desc: "explores hardware, software, and systems engineering."
  },
  "innovation": {
    name: "Innovation",
    color: "bg-[#BEEDF7]",
    desc: "focuses on finding new ideas, design thinking, and startup pivots."
  },
  "events": {
    name: "Events",
    color: "bg-[#C6F7E9]",
    desc: "tracks developer summits and forum schedules."
  },
  "world": {
    name: "World",
    color: "bg-[#FFE552]",
    desc: "covers international developments, geopolitics, and global trends."
  },
  "politics": {
    name: "Politics",
    color: "bg-[#FFE552]",
    desc: "tracks policy reforms, government legislation, and civic governance."
  },
  "economy-markets": {
    name: "Economy & Markets",
    color: "bg-[#FFE9D6]",
    desc: "covers macroeconomic trends, market indices, commodities, and trade."
  },
  "markets": {
    name: "Markets",
    color: "bg-[#FFE9D6]",
    desc: "covers equities, commodities, forex, and cryptocurrency trends."
  },
  "economy": {
    name: "Economy",
    color: "bg-[#FFE9D6]",
    desc: "tracks central bank policies, inflation indices, and global trade."
  },
  "lifestyle": {
    name: "Lifestyle",
    color: "bg-[#E2F0D9]",
    desc: "explores modern living, culture, entertainment, and wellbeing."
  },
  "sports": {
    name: "Sports",
    color: "bg-[#C6F7E9]",
    desc: "delivers comprehensive match coverage, statistics, and athlete profiles."
  },
  "entertainment": {
    name: "Entertainment",
    color: "bg-[#FFE9D6]",
    desc: "covers cinema, music, arts, and digital media production."
  },
  "health": {
    name: "Health",
    color: "bg-[#E2F0D9]",
    desc: "tracks medical discoveries, wellness research, and public healthcare."
  },
  "research": {
    name: "Research",
    color: "bg-[#BEEDF7]",
    desc: "publishes open-access findings across science, technology, and engineering."
  },
  "europe": {
    name: "Europe",
    color: "bg-sky-50",
    desc: "covers diplomatic affairs, European Union policy, and regional economic developments."
  },
  "china": {
    name: "China",
    color: "bg-sky-50",
    desc: "tracks manufacturing trade, diplomatic summits, and cross-border developments in China."
  },
  "united-states": {
    name: "United States",
    color: "bg-sky-50",
    desc: "covers federal policy, elections, and national developments across the United States."
  },
  "britain": {
    name: "Britain",
    color: "bg-sky-50",
    desc: "tracks UK politics, Westminster legislation, and British industry trends."
  },
  "middle-east": {
    name: "Middle East",
    color: "bg-sky-50",
    desc: "covers Middle Eastern diplomacy, energy markets, and regional geopolitical developments."
  },
  "africa": {
    name: "Africa",
    color: "bg-sky-50",
    desc: "tracks African economic innovation, infrastructure projects, and trade agreements."
  },
  "asia": {
    name: "Asia",
    color: "bg-sky-50",
    desc: "covers Asia-Pacific tech hubs, manufacturing, and diplomatic partnerships."
  }
};

function getParentCategoryInfo(cat: string) {
  const norm = (cat || "").toLowerCase().trim();
  if (parentConfig[norm]) return parentConfig[norm];
  
  const formattedName = (cat || "News")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .replace(/\bAnd\b/g, "&");

  return {
    name: formattedName || "News",
    color: "bg-[#FFE9D6]",
    desc: `covers essential reporting and updates in ${formattedName}.`
  };
}

function formatSubcategory(str: string) {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .replace(/\bAnd\b/g, "&");
}

function formatSentenceCase(str: string) {
  const raw = str.split("-").join(" ");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const knownNewsArticles: Record<string, string> = {
  "airbus-puts-a-price-on-canadian-jet-fuel-security": "Airbus puts a price on Canadian jet fuel security",
  "venture-capital-firms-shift-focus-to-sustainable-tech-sector-pipelines": "Venture capital firms shift focus to sustainable tech sector pipelines",
  "how-remote-leadership-models-are-evolving-to-meet-product-goals": "How remote leadership models are evolving to meet product goals",
  "global-logistics-platforms-integrate-machine-learning-for-routing": "Global logistics platforms integrate machine learning for routing",
  "e-commerce-platforms-scale-up-localized-transaction-nodes": "E-commerce platforms scale up localized transaction nodes",
  "why-corporate-investment-in-developer-experience-yields-positive-roi": "Why corporate investment in developer experience yields positive ROI",
  "international-data-privacy-standards-updated-after-cross-border-audits": "International data privacy standards updated after cross-border audits",
  "scientific-research-consortium-publishes-open-access-genome-study": "Scientific research consortium publishes open-access genome study",
  "urban-infrastructure-plans-integrate-smart-power-grids-in-major-cities": "Urban infrastructure plans integrate smart power grids in major cities",
  "public-transportation-systems-roll-out-unified-digital-ticketing": "Public transportation systems roll out unified digital ticketing",
  "education-systems-adapt-curricula-to-include-basic-ai-literacy": "Education systems adapt curricula to include basic AI literacy",
  "canadas-conexiom-bets-that-the-future-of-ai-lies-in-automation-not-experimentation": "Canada's Conexiom bets that the future of AI lies in automation, not experimentation",
  "lightworks-scotiabank-sun-life-and-telus-launch-ai-consortium": "Lightworks, Scotiabank, Sun Life and TELUS launch AI Consortium",
  "canadas-ai-adoption-problem-meets-its-youth-employment-problem": "Canada's AI adoption problem meets its youth employment problem",
  "op-ed-rethinking-humanity-as-automation-rewrites-human-realities": "Op-Ed: Rethinking humanity as automation rewrites human realities",
  "indispensable-xiaohongshu-app-fuels-chinese-tourism": "‘Indispensable’ Xiaohongshu app fuels Chinese tourism",
  "silicon-valley-chip-manufacturers-announce-breakthrough-architectural-updates": "Silicon Valley chip manufacturers announce breakthrough architectural updates",
  "new-quantum-computing-clusters-open-to-public-cloud-developer-preview": "New quantum computing clusters open to public cloud developer preview",
  "open-source-database-platform-raises-record-funding-round-for-scaling": "Open-source database platform raises record funding round for scaling",
  "how-edge-computing-is-transforming-real-time-telemetry-processing": "How edge computing is transforming real-time telemetry processing",
  "cybersecurity-protocols-updated-globally-to-counter-multi-vector-threats": "Cybersecurity protocols updated globally to counter multi-vector threats",
  "what-to-eat-keep-bones-strong": "Here's what to eat to keep your bones strong (that's not just dairy)",
  "where-giant-sharks-swim-close-to-shore": "Where giant sharks swim so close to shore you can nearly touch them",
  "assam-worst-floods-in-years": "'It took everything from us': India's Assam faces worst floods in years",
  "china-fake-ai-videos-disasters": "China's new challenge as natural disasters strike - fake AI videos",
  "hong-kong-activist-uk-stay": "Hong Kong activist allowed to stay in UK after deportation threat",
  "chip-stocks-slide-us-asia": "Chip stocks slide in US and Asia as AI jitters rattle investors",
  "biden-ghostwriter-classified-documents": "'I just found all the classified stuff downstairs' - Biden to ghostwriter",
  "clean-energy-investments-record-high": "Clean energy investments hit record high as global transition accelerates",
  "lab-developing-sustainable-materials": "Inside the lab developing tomorrow's sustainable materials",
  "5g-expansion-transforms-industries": "5G expansion continues to transform industries worldwide",
  "future-of-work-hybrid-everything": "The future of work: How companies are adapting to hybrid everything",
  "small-businesses-compete-ai-world": "How small businesses can compete in an AI-driven world",
  "what-tools-business-should-take-from-a-massive-security-breach-to-prevent-future-attacks": "What tools business should take from a massive security breach to prevent future attacks"
};

function formatTitleFromSlug(slug: string): string {
  if (knownNewsArticles[slug]) return knownNewsArticles[slug];
  const words = slug.split("-");
  if (words.length === 0) return slug;
  return words
    .map((w, i) => {
      if (i === 0) return w.charAt(0).toUpperCase() + w.slice(1);
      const lower = w.toLowerCase();
      if (["ai", "roi", "kpi", "kpis", "smbc", "max"].includes(lower)) return w.toUpperCase();
      return w;
    })
    .join(" ");
}

const customNewsDatabase: Record<string, {
  title: string;
  authorName: string;
  authorAvatar: string;
  authorBio: string;
  date: string;
  image: string;
  caption: string;
  sections: { heading: string; paragraphs: string[] }[];
}> = {
  "new-exclusive-decoration-design-fit-out-llc-structural-acrylic-pioneers-in-the-uae": {
    title: "New exclusive decoration design fit out llc structural acrylic pioneers in the uae",
    authorName: "Jennifer Friesen",
    authorAvatar: "/author_woman.jpg",
    authorBio: "Jennifer Friesen is London BigBen's associate editor and Calgary Bureau lead.",
    date: "July 22, 2026 6:08 PM EDT",
    image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&h=750&fit=crop",
    caption: "Structural acrylic interior decoration fit-out installation in the UAE. — Photo courtesy of Exclusive Decoration LLC",
    sections: [
      {
        heading: "",
        paragraphs: [
          "DUBAI — New Exclusive Decoration Design Fit Out LLC has established itself as a leading pioneer in high-precision structural acrylic engineering and luxury interior fit-out projects across the United Arab Emirates.",
          "Architects and commercial developers are increasingly specifying transparent structural acrylic panels for atrium installations, underwater features, and high-end retail showcases."
        ]
      },
      {
        heading: "Structural Engineering & Interior Design Standards",
        paragraphs: [
          "The company's specialized engineering teams utilize optical-grade acrylic polymers engineered to withstand extreme thermal loads and structural pressures.",
          "Industry experts highlight that custom acrylic fit-out installations provide superior clarity, UV stability, and impact resistance compared to traditional heavy laminated glass."
        ]
      }
    ]
  },
  "venture-capital-firms-shift-focus-to-sustainable-tech-sector-pipelines": {
    title: "Venture capital firms shift focus to sustainable tech sector pipelines",
    authorName: "Jennifer Friesen",
    authorAvatar: "/author_woman.jpg",
    authorBio: "Jennifer Friesen is London BigBen's associate editor and Calgary Bureau lead.",
    date: "July 22, 2026 4:30 PM EDT",
    image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=750&fit=crop",
    caption: "Venture capital partners evaluate sustainable infrastructure portfolios. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Venture capital firms across North America are pivoting investment thesis parameters toward green computing and clean technology hardware pipelines.",
          "Recent funding allocations indicate a 35% growth in seed-stage backing for energy-efficient data processing architectures."
        ]
      },
      {
        heading: "Capital Allocation Shifts",
        paragraphs: [
          "Investors are prioritizing startups demonstrating verifiable carbon offset metrics and low-power silicon design.",
          "Institutional partners emphasize that long-term returns will be driven by operational compliance with international environmental standards."
        ]
      },
      {
        heading: "Sustainable Market Outlook",
        paragraphs: [
          "Emerging funds in Toronto, Vancouver, and Silicon Valley are establishing dedicated pools for sustainable software optimization tools."
        ]
      }
    ]
  },
  "how-remote-leadership-models-are-evolving-to-meet-product-goals": {
    title: "How remote leadership models are evolving to meet product goals",
    authorName: "Jennifer Friesen",
    authorAvatar: "/author_woman.jpg",
    authorBio: "Jennifer Friesen is London BigBen's associate editor and Calgary Bureau lead.",
    date: "July 21, 2026 2:15 PM EDT",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=750&fit=crop",
    caption: "Distributed engineering teams synchronize async product roadmaps. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Engineering leads and executive directors are overhauling synchronous management paradigms in favor of outcome-driven asynchronous workflows.",
          "By shifting focus from active hours to milestone velocity, distributed technology organizations report higher retention and accelerated delivery cycles."
        ]
      },
      {
        heading: "Asynchronous Coordination & Governance",
        paragraphs: [
          "Modern product teams rely on standardized architecture decision records (ADRs) and automated pull-request validation pipelines.",
          "Leadership teams conduct quarterly sync summits while maintaining day-to-day operations across multiple time zones."
        ]
      },
      {
        heading: "Impact on Product Delivery Velocity",
        paragraphs: [
          "Early data shows a 20% reduction in meeting overhead, allowing developers to dedicate uninterrupted blocks to complex problem-solving."
        ]
      }
    ]
  },
  "global-logistics-platforms-integrate-machine-learning-for-routing": {
    title: "Global logistics platforms integrate machine learning for routing",
    authorName: "Pramod Jain",
    authorAvatar: "/author_bluesuit.jpg",
    authorBio: "Pramod Jain reports on global supply chains, logistics telemetry, and enterprise cloud migrations.",
    date: "July 20, 2026 11:45 AM EDT",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=750&fit=crop",
    caption: "Automated distribution nodes optimize real-time transit routing schedules. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Freight operators and global supply chain hubs have begun deploying predictive machine learning algorithms to dynamically reroute cargo shipments.",
          "The automated routing engines analyze weather anomalies, port congestion indices, and fuel pricing fluctuations in real time."
        ]
      },
      {
        heading: "Real-Time Telemetry & Tracking",
        paragraphs: [
          "Logistics hubs report an 18% improvement in delivery timeline precision following the integration of edge sensor telemetry.",
          "Shipping dispatchers can now dynamically reassign regional freight containers prior to port arrival."
        ]
      }
    ]
  },
  "e-commerce-platforms-scale-up-localized-transaction-nodes": {
    title: "E-commerce platforms scale up localized transaction nodes",
    authorName: "Chris Hogg",
    authorAvatar: "/author_beard.jpg",
    authorBio: "Chris Hogg is an executive editor specializing in digital transformation and financial technology.",
    date: "July 19, 2026 6:10 PM EDT",
    image: "https://images.unsplash.com/photo-1556742049-0a670c480728?w=1200&h=750&fit=crop",
    caption: "Micro-fulfilment centers leverage localized payment processing microservices. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Major e-commerce platforms are deploying regional transaction processing nodes to reduce latency and satisfy sovereign data localization laws.",
          "By handling payment verification at edge points close to consumers, checkout speeds have improved by over 40%."
        ]
      },
      {
        heading: "Edge Infrastructure & Financial Compliance",
        paragraphs: [
          "Localized transaction clusters allow merchants to process regional currency settlements without routing packets through centralized international servers.",
          "Security teams note that decentralized nodes decrease exposure to single-point distributed denial-of-service (DDoS) outages."
        ]
      }
    ]
  },
  "why-corporate-investment-in-developer-experience-yields-positive-roi": {
    title: "Why corporate investment in developer experience yields positive ROI",
    authorName: "David Potter",
    authorAvatar: "/author_bluesuit.jpg",
    authorBio: "David Potter focuses on software architecture, DevOps tooling, and developer metrics.",
    date: "July 18, 2026 10:20 AM EDT",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=750&fit=crop",
    caption: "Internal developer platforms streamline software deployment pipelines. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Enterprise technology firms investing in dedicated Developer Experience (DevEx) teams report marked improvements in code release frequency and employee retention.",
          "Reducing cognitive load and eliminating internal tool friction directly correlates with faster product iterations."
        ]
      },
      {
        heading: "Quantifying Platform Engineering Returns",
        paragraphs: [
          "Organizations implementing self-service internal developer portals have cut onboarding times for new engineers from months to days.",
          "Automated testing environments and standardized CI/CD pipelines significantly lower post-release defect rates."
        ]
      }
    ]
  },
  "international-data-privacy-standards-updated-after-cross-border-audits": {
    title: "International data privacy standards updated after cross-border audits",
    authorName: "Jennifer Friesen",
    authorAvatar: "/author_woman.jpg",
    authorBio: "Jennifer Friesen is London BigBen's associate editor and Calgary Bureau lead.",
    date: "July 22, 2026 9:15 AM EDT",
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&h=750&fit=crop",
    caption: "Privacy regulators review compliance frameworks for international cloud transfers. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Global regulatory authorities have published revised data protection compliance benchmarks following a multi-nation audit of cloud infrastructure providers.",
          "The new framework enforces stricter data residency protocols and mandates transparent encryption key management for cross-border operations."
        ]
      },
      {
        heading: "Audit Findings & Policy Frameworks",
        paragraphs: [
          "Inspectors identified systemic gaps in third-party vendor access controls, prompting mandatory annual security reviews.",
          "Enterprise software providers must provide verifiable audit logs confirming data segregation across international data centers."
        ]
      }
    ]
  },
  "scientific-research-consortium-publishes-open-access-genome-study": {
    title: "Scientific research consortium publishes open-access genome study",
    authorName: "April Hicke",
    authorAvatar: "/author_glasses.jpg",
    authorBio: "April Hicke reports on biotechnology, scientific research, and open science initiatives.",
    date: "July 21, 2026 3:40 PM EDT",
    image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1200&h=750&fit=crop",
    caption: "Biomedical researchers analyze high-throughput genomic data sequences. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "An international coalition of biomedical research institutions has released a comprehensive, open-access genomic database to accelerate therapeutic development.",
          "The dataset includes over 500,000 sequenced samples, providing researchers worldwide with unprecedented insight into rare genetic variations."
        ]
      },
      {
        heading: "Open Science & Therapeutics Development",
        paragraphs: [
          "By removing paywalls and proprietary licensing restrictions, the consortium aims to democratize medical research and shorten drug discovery timelines."
        ]
      }
    ]
  },
  "urban-infrastructure-plans-integrate-smart-power-grids-in-major-cities": {
    title: "Urban infrastructure plans integrate smart power grids in major cities",
    authorName: "Pramod Jain",
    authorAvatar: "/author_bluesuit.jpg",
    authorBio: "Pramod Jain reports on global supply chains, smart infrastructure, and energy grids.",
    date: "July 20, 2026 1:30 PM EDT",
    image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&h=750&fit=crop",
    caption: "Smart power monitoring nodes monitor energy distribution across metropolitan sectors. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Metropolitan utility boards are upgrading municipal electrical grids with IoT sensor networks to balance load distribution during peak demand periods.",
          "The smart grid infrastructure automatically detects line faults, isolating localized outages and preventing cascading blackouts."
        ]
      }
    ]
  },
  "public-transportation-systems-roll-out-unified-digital-ticketing": {
    title: "Public transportation systems roll out unified digital ticketing",
    authorName: "Jennifer Lussier",
    authorAvatar: "/author_woman.jpg",
    authorBio: "Jennifer Lussier covers urban mobility, public sector technology, and smart transit.",
    date: "July 19, 2026 11:00 AM EDT",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&h=750&fit=crop",
    caption: "Transit commuters use contact-free digital passes across regional rail networks. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Transit agencies across major urban corridors have implemented a single contactless ticketing system across subways, buses, and commuter rail.",
          "The unified payment backend allows riders to tap credit cards or mobile wallets without purchasing physical transit cards."
        ]
      }
    ]
  },
  "education-systems-adapt-curricula-to-include-basic-ai-literacy": {
    title: "Education systems adapt curricula to include basic AI literacy",
    authorName: "Chris Hogg",
    authorAvatar: "/author_beard.jpg",
    authorBio: "Chris Hogg is an executive editor specializing in digital transformation and education policy.",
    date: "July 18, 2026 4:15 PM EDT",
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&h=750&fit=crop",
    caption: "High school students engage in practical data privacy and algorithm modules. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "School boards are introducing mandatory digital literacy and artificial intelligence fundamentals into secondary school coursework.",
          "Students learn data ethics, algorithmic bias evaluation, and responsible prompt design alongside foundational computer science concepts."
        ]
      }
    ]
  },
  "canadas-conexiom-bets-that-the-future-of-ai-lies-in-automation-not-experimentation": {
    title: "Canada's Conexiom bets that the future of AI lies in automation, not experimentation",
    authorName: "Jennifer Friesen",
    authorAvatar: "/author_woman.jpg",
    authorBio: "Jennifer Friesen is London BigBen's associate editor and Calgary Bureau lead.",
    date: "July 22, 2026 8:00 AM EDT",
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=750&fit=crop",
    caption: "Conexiom executive leadership outlines enterprise automation strategy. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Canadian tech pioneer Conexiom is doubling down on operational workflow automation, arguing that enterprises need deterministic efficiency rather than experimental chatbots.",
          "The company's document processing platform automates complex trade transactions for global distributors with 100% data accuracy."
        ]
      }
    ]
  },
  "lightworks-scotiabank-sun-life-and-telus-launch-ai-consortium": {
    title: "Lightworks, Scotiabank, Sun Life and TELUS launch AI Consortium",
    authorName: "Pramod Jain",
    authorAvatar: "/author_bluesuit.jpg",
    authorBio: "Pramod Jain reports on global supply chains, corporate partnerships, and AI alliances.",
    date: "July 21, 2026 10:45 AM EDT",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=750&fit=crop",
    caption: "Consortium founding partners announce Canadian AI research alliance. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Four of Canada's leading corporate institutions have partnered to create a national AI research consortium focused on commercial deployment and ethical governance.",
          "The alliance aims to pool engineering resources, fund university research labs, and keep Canadian AI talent within domestic tech ecosystems."
        ]
      }
    ]
  },
  "canadas-ai-adoption-problem-meets-its-youth-employment-problem": {
    title: "Canada's AI adoption problem meets its youth employment problem",
    authorName: "April Hicke",
    authorAvatar: "/author_glasses.jpg",
    authorBio: "April Hicke reports on technology adoption, workforce development, and economic policy.",
    date: "July 20, 2026 5:50 PM EDT",
    image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&h=750&fit=crop",
    caption: "Young technology graduates analyze market entry barriers in domestic tech sectors. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Economists warn that slow corporate AI adoption in traditional sectors is compounding entry-level job shortages for recent STEM graduates.",
          "Policy experts recommend government incentives to encourage mid-market companies to hire junior developers to drive digital modernization."
        ]
      }
    ]
  },
  "op-ed-rethinking-humanity-as-automation-rewrites-human-realities": {
    title: "Op-Ed: Rethinking humanity as automation rewrites human realities",
    authorName: "Chris Hogg",
    authorAvatar: "/author_beard.jpg",
    authorBio: "Chris Hogg is an executive editor specializing in digital transformation and technology ethics.",
    date: "July 19, 2026 1:15 PM EDT",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&h=750&fit=crop",
    caption: "Thought leaders examine ethical boundaries of pervasive automation. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "As automated decision engines assume control over credit scores, medical triage, and job screening, society must redefine the boundaries of human agency.",
          "Building technology that augments rather than replaces human empathy is the defining intellectual challenge of our era."
        ]
      }
    ]
  },
  "indispensable-xiaohongshu-app-fuels-chinese-tourism": {
    title: "‘Indispensable’ Xiaohongshu app fuels Chinese tourism",
    authorName: "Jennifer Lussier",
    authorAvatar: "/author_woman.jpg",
    authorBio: "Jennifer Lussier covers global travel trends, social platforms, and digital tourism.",
    date: "July 18, 2026 7:30 AM EDT",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&h=750&fit=crop",
    caption: "Tourists use social discovery platform Xiaohongshu for travel recommendations. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Social commerce platform Xiaohongshu (RED) has become the primary search engine for outbound Chinese travelers seeking niche cultural experiences.",
          "Canadian tourism boards are launching dedicated Xiaohongshu storefronts to connect directly with independent international visitors."
        ]
      }
    ]
  },
  "silicon-valley-chip-manufacturers-announce-breakthrough-architectural-updates": {
    title: "Silicon Valley chip manufacturers announce breakthrough architectural updates",
    authorName: "David Potter",
    authorAvatar: "/author_bluesuit.jpg",
    authorBio: "David Potter focuses on hardware architecture, semiconductor manufacturing, and chip design.",
    date: "July 22, 2026 11:20 AM EDT",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=750&fit=crop",
    caption: "Semiconductor wafer design features 2nm gate-all-around transistor architecture. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Leading semiconductor foundries have unveiled 2-nanometer ribbon field-effect transistor architectures, promising a 30% reduction in chip power consumption.",
          "The breakthrough allows mobile devices and edge data centers to process complex AI inference workloads with significantly lower thermal output."
        ]
      }
    ]
  },
  "new-quantum-computing-clusters-open-to-public-cloud-developer-preview": {
    title: "New quantum computing clusters open to public cloud developer preview",
    authorName: "April Hicke",
    authorAvatar: "/author_glasses.jpg",
    authorBio: "April Hicke reports on quantum computing, cloud architecture, and experimental software.",
    date: "July 21, 2026 9:00 AM EDT",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&h=750&fit=crop",
    caption: "Cryogenic quantum processor rig connected to cloud developer preview network. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Cloud providers have launched public developer previews for 1,000+ qubit superconducting quantum processing clusters.",
          "Software engineers can now run hybrid quantum-classical algorithms for materials science, cryptography stress testing, and molecular modeling."
        ]
      }
    ]
  },
  "open-source-database-platform-raises-record-funding-round-for-scaling": {
    title: "Open-source database platform raises record funding round for scaling",
    authorName: "David Potter",
    authorAvatar: "/author_bluesuit.jpg",
    authorBio: "David Potter focuses on software architecture, open-source platforms, and database engineering.",
    date: "July 20, 2026 2:45 PM EDT",
    image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=1200&h=750&fit=crop",
    caption: "Open-source database maintainers celebrate Series C funding milestone. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "A distributed SQL database startup has secured $120 million in Series C funding to expand enterprise support and cloud-managed database services.",
          "The project has accumulated over 45,000 GitHub stars, becoming the fastest-growing open-source data engine for high-concurrency applications."
        ]
      }
    ]
  },
  "how-edge-computing-is-transforming-real-time-telemetry-processing": {
    title: "How edge computing is transforming real-time telemetry processing",
    authorName: "Pramod Jain",
    authorAvatar: "/author_bluesuit.jpg",
    authorBio: "Pramod Jain reports on enterprise cloud migrations, IoT hardware, and edge computing.",
    date: "July 19, 2026 4:30 PM EDT",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=750&fit=crop",
    caption: "Industrial IoT gateways process telemetry data directly at field sensor sites. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Industrial facilities are migrating sensor data analytics from centralized cloud servers to edge processing hardware installed on factory floors.",
          "Filtering telemetry data at the device layer cuts network bandwidth expenses by 70% and enables instant sub-millisecond emergency shutdowns."
        ]
      }
    ]
  },
  "cybersecurity-protocols-updated-globally-to-counter-multi-vector-threats": {
    title: "Cybersecurity protocols updated globally to counter multi-vector threats",
    authorName: "Jennifer Friesen",
    authorAvatar: "/author_woman.jpg",
    authorBio: "Jennifer Friesen is London BigBen's associate editor and Calgary Bureau lead.",
    date: "July 18, 2026 8:15 AM EDT",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=750&fit=crop",
    caption: "Security Operations Center (SOC) engineers monitor network intrusion alerts. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "International cybersecurity agencies have issued updated zero-trust defense blueprints to protect critical infrastructure against automated multi-vector cyberattacks.",
          "The guidelines mandate continuous identity verification, micro-segmentation of internal networks, and real-time anomaly detection."
        ]
      }
    ]
  },
  "us-announces-civilian-nuclear-deal-with-saudi-arabia": {
    title: "US announces civilian nuclear deal with Saudi Arabia",
    authorName: "Frank Morgan",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&h=250&fit=crop",
    authorBio: "Frank Morgan is London BigBen's senior political correspondent covering transatlantic diplomacy.",
    date: "July 22, 2026 5:25 PM EDT",
    image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&h=750&fit=crop",
    caption: "U.S. and international diplomats announce bilateral civilian energy agreement terms. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "WASHINGTON — The United States and Saudi Arabia have finalized terms for a strategic civilian nuclear cooperation agreement, establishing non-proliferation frameworks and tech exchanges.",
          "The deal permits Saudi Arabia to develop civilian nuclear power infrastructure under strict International Atomic Energy Agency (IAEA) oversight and safety standards."
        ]
      },
      {
        heading: "Bilateral Cooperation & Non-Proliferation Safeguards",
        paragraphs: [
          "State Department officials confirmed that the bilateral accord includes binding non-proliferation protocols, ensuring all enriched material remains monitored.",
          "Energy experts believe the project will diversify Middle Eastern energy production while accelerating clean energy transitions across the region."
        ]
      }
    ]
  },
  "as-canadians-turn-to-ai-for-mortgage-advice-experts-warn-about-privacy-risks": {
    title: "As Canadians turn to AI for mortgage advice, experts warn about privacy risks and inaccurate guidance",
    authorName: "Sarah Miller",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&h=250&fit=crop",
    authorBio: "Sarah Miller covers international data privacy regulations, cross-border compliance, and digital rights.",
    date: "July 22, 2026 5:17 PM EDT",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=750&fit=crop",
    caption: "Canadian homeowners consult digital AI financial advice apps. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "TORONTO — Financial advisors and consumer privacy advocates warn that generative AI financial chatbots can produce inaccurate rate calculations and mishandle confidential financial data.",
          "A growing number of Canadians are relying on artificial intelligence tools to model mortgage refinancing and interest rate forecasts, prompting regulatory scrutiny."
        ]
      },
      {
        heading: "Data Governance & Consumer Protection Warnings",
        paragraphs: [
          "Financial regulators advise consumers never to upload confidential bank statements or personal identity numbers into unverified public AI models.",
          "Major Canadian financial institutions are rolling out verified, encrypted financial AI assistants to ensure consumer safety and compliance."
        ]
      }
    ]
  },
  "tesla-shares-dip-after-profit-misses-expectations": {
    title: "Tesla shares dip after profit misses expectations",
    authorName: "David Chen",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&h=250&fit=crop",
    authorBio: "David Chen covers market shifts, automotive technology, and enterprise cloud infrastructure.",
    date: "July 22, 2026 5:10 PM EDT",
    image: "https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&h=750&fit=crop",
    caption: "Tesla electric vehicles lined up for delivery. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "AUSTIN — Tesla stock dropped 4.5% in after-hours trading after quarterly earnings fell short of Wall Street estimates due to price cuts and increased R&D spending on AI and autonomous robotics.",
          "Operating margins narrowed as global EV market competition intensified across North America, Europe, and Asian automotive hubs."
        ]
      },
      {
        heading: "Automotive Margins & AI Capital Investment",
        paragraphs: [
          "Despite short-term profit pressures, executive leadership reiterated full commitment to scaling full self-driving (FSD) chips and next-gen Robotaxi production fleets.",
          "Institutional investors remain focused on long-term software licensing revenue and energy storage segment growth."
        ]
      }
    ]
  },
  "your-ai-made-a-decision-and-canadian-regulators-want-to-know-how": {
    title: "Your AI made a decision, and Canadian regulators want to know how",
    authorName: "Dr. Tim Sandle",
    authorAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=250&h=250&fit=crop",
    authorBio: "Dr. Tim Sandle is a London-based science journalist covering biotechnology, AI in healthcare, and digital transformation.",
    date: "July 21, 2026",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=750&fit=crop",
    caption: "Canadian regulatory leads evaluate algorithmic decision auditing protocols. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "OTTAWA — Canadian regulatory agencies are introducing mandatory transparency audits requiring companies to explain automated decisions in banking, hiring, and insurance.",
          "Under proposed enforcement rules, algorithms impacting consumer credit scores or employment candidates must maintain explainable decision logs."
        ]
      },
      {
        heading: "Algorithmic Transparency & Model Auditing Standards",
        paragraphs: [
          "Compliance officers will evaluate automated models for bias, data lineage, and decision reproducibility.",
          "Tech firms operating in Canada are deploying explainable AI (XAI) frameworks to meet upcoming legislative benchmarks."
        ]
      }
    ]
  },
  "dutch-students-unveil-world-first-solar-powered-ambulance": {
    title: "Dutch students unveil 'world-first' solar-powered ambulance",
    authorName: "April Hicke",
    authorAvatar: "/author_glasses.jpg",
    authorBio: "April Hicke reports on biotechnology, scientific research, and clean tech innovation.",
    date: "July 21, 2026",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&h=750&fit=crop",
    caption: "Dutch engineering team demonstrates solar-powered emergency ambulance prototype. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "EINDHOVEN — Engineering students from the Netherlands have built a zero-emission emergency response vehicle equipped with rooftop solar panels and lightweight battery cells.",
          "The solar ambulance can generate sufficient daily power to operate medical equipment and extend driving range by up to 120 kilometers."
        ]
      },
      {
        heading: "Clean Mobility & Emergency Response Technology",
        paragraphs: [
          "Medical first responders tested the vehicle during simulated emergency trials in Eindhoven, praising its silent operation and zero direct emissions.",
          "Commercial manufacturers are evaluating the prototype for potential deployment in eco-conscious municipal hospital fleets across Europe."
        ]
      }
    ]
  },
  "what-to-eat-keep-bones-strong": {
    title: "Here's what to eat to keep your bones strong (that's not just dairy)",
    authorName: "Dr. Tim Sandle",
    authorAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=250&h=250&fit=crop",
    authorBio: "Dr. Tim Sandle is a science journalist covering health, clinical nutrition, and preventive medicine.",
    date: "July 28, 2026",
    image: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=1200&h=750&fit=crop",
    caption: "Nutrient-dense plant-based foods, seeds, and leafy greens support optimal bone mineral density. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "While calcium-rich dairy products have long dominated bone health discussions, clinical nutritionists emphasize that plant-based minerals, Vitamin K2, magnesium, and collagen-building amino acids play an equally vital role in maintaining skeletal strength.",
          "Recent studies published in leading nutritional science journals reveal that individuals consuming a diet rich in leafy greens, chia seeds, almonds, and fermented foods experience superior bone mineral density preservation."
        ]
      },
      {
        heading: "Essential Minerals Beyond Calcium",
        paragraphs: [
          "Magnesium and zinc act as essential co-factors for bone remodeling, regulating osteoblast activity and helping absorb active Vitamin D3.",
          "Incorporating seeds like sesame, pumpkin, and flax alongside dark leafy vegetables provides essential micronutrients without relying exclusively on dairy sources."
        ]
      }
    ]
  },
  "where-giant-sharks-swim-close-to-shore": {
    title: "Where giant sharks swim so close to shore you can nearly touch them",
    authorName: "April Hicke",
    authorAvatar: "/author_glasses.jpg",
    authorBio: "April Hicke reports on ocean conservation, marine biology, and coastal ecosystems.",
    date: "July 28, 2026",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=750&fit=crop",
    caption: "A massive basking shark glides through shallow coastal waters. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "In protected coastal bay zones around Atlantic waters, marine biologists and eco-tourists are witnessing an unprecedented aggregation of gentle giant basking sharks swimming in shallow near-shore currents.",
          "These filter-feeding sharks, reaching lengths of up to 33 feet, glide calmly along coastal reefs to feed on dense plankton blooms brought in by seasonal upwelling."
        ]
      },
      {
        heading: "Coastal Ecosystem Protection & Research",
        paragraphs: [
          "Conservationists have designated eco-monitoring zones to protect these vulnerable marine species from boat collisions and disturbance.",
          "Satellite tagging programs are helping researchers track their migration corridors across deep water drop-offs and coastal estuaries."
        ]
      }
    ]
  },
  "assam-worst-floods-in-years": {
    title: "'It took everything from us': India's Assam faces worst floods in years",
    authorName: "Pramod Jain",
    authorAvatar: "/author_bluesuit.jpg",
    authorBio: "Pramod Jain reports on international affairs, climate disaster response, and regional infrastructure.",
    date: "July 28, 2026",
    image: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=1200&h=750&fit=crop",
    caption: "Emergency rescue crews navigate flooded villages across Assam. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "GUWAHATI — Torrential monsoon rains have triggered severe flooding across India's northeastern state of Assam, displacing over two million residents and submerging entire agricultural districts.",
          "While flooding is an annual occurrence in the Brahmaputra river basin, local authorities described this year's inundation as the most severe in over six decades."
        ]
      },
      {
        heading: "Humanitarian Relief & Rehabilitation Efforts",
        paragraphs: [
          "Disaster management teams and armed forces personnel have deployed medical relief boats and air-dropped food rations to isolated communities.",
          "State officials are coordinating with central emergency agencies to rebuild damaged embankments and establish permanent flood shelters."
        ]
      }
    ]
  },
  "china-fake-ai-videos-disasters": {
    title: "China's new challenge as natural disasters strike - fake AI videos",
    authorName: "Jennifer Friesen",
    authorAvatar: "/author_woman.jpg",
    authorBio: "Jennifer Friesen reports on media verification, digital technology, and regulatory governance.",
    date: "July 28, 2026",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=750&fit=crop",
    caption: "Social media oversight teams combat synthetic media and AI misinformation during extreme weather events. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "BEIJING — As severe weather and flooding strike eastern coastal provinces, Chinese cybersecurity regulators face a surge of hyper-realistic generative AI videos depicting fabricated disaster scenes.",
          "Unverified video clips showing collapsed bridges and fictional rescues have gone viral on social platforms, creating panic and confusing official rescue coordination."
        ]
      },
      {
        heading: "Platform Governance & Digital Watermarking Rules",
        paragraphs: [
          "Tech platforms have deployed automated forensic algorithms and mandatory AI content labels to flag synthetic media.",
          "Law enforcement agencies warn that accounts distributing deceptive emergency content face account suspensions and regulatory fines."
        ]
      }
    ]
  },
  "hong-kong-activist-uk-stay": {
    title: "Hong Kong activist allowed to stay in UK after deportation threat",
    authorName: "Frank Morgan",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&h=250&fit=crop",
    authorBio: "Frank Morgan covers international human rights and diplomatic policy.",
    date: "July 28, 2026",
    image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&h=750&fit=crop",
    caption: "UK legal tribunals review asylum claims and diplomatic immigration protections. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "LONDON — A prominent Hong Kong pro-democracy activist detained at London's Heathrow Airport has been granted formal temporary leave to remain in the United Kingdom following high-level legal appeals.",
          "Human rights advocates and parliamentary leaders intervened after border officials initially issued a deportation notice due to administrative visa discrepancies."
        ]
      },
      {
        heading: "Diplomatic Asylum Protections",
        paragraphs: [
          "Home Office representatives confirmed that the activist's protection claim is undergoing priority evaluation under the British National (Overseas) resettlement policy.",
          "Legal scholars emphasize that maintaining clear asylum pathways is essential for protecting pro-democracy dissidents worldwide."
        ]
      }
    ]
  },
  "chip-stocks-slide-us-asia": {
    title: "Chip stocks slide in US and Asia as AI jitters rattle investors",
    authorName: "David Chen",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&h=250&fit=crop",
    authorBio: "David Chen reports on global markets, semiconductor hardware, and tech equities.",
    date: "July 28, 2026",
    image: "/ai_chip.png",
    caption: "Advanced microchip wafer processing and semiconductor market volatility. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "NEW YORK & TOKYO — Global semiconductor stocks experienced a sharp sell-off across US and Asian exchanges after major tech buyers signaled potential delays in next-generation AI data center capital expenditure.",
          "South Korea's Kospi index experienced a temporary trading circuit breaker after semiconductor heavyweights plummeted by over 7% during morning trading."
        ]
      },
      {
        heading: "Market Valuation & AI Infrastructure Returns",
        paragraphs: [
          "Financial analysts attribute the volatility to investor anxiety over high valuation multiples and the timeline for monetizing generative AI software services.",
          "Despite short-term market pullbacks, foundry leaders maintain that long-term demand for advanced packaging and high-bandwidth memory (HBM) remains structurally solid."
        ]
      }
    ]
  },
  "biden-ghostwriter-classified-documents": {
    title: "'I just found all the classified stuff downstairs' - Biden to ghostwriter",
    authorName: "Frank Morgan",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&h=250&fit=crop",
    authorBio: "Frank Morgan is senior political correspondent.",
    date: "July 28, 2026",
    image: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=1200&h=750&fit=crop",
    caption: "Congressional committees review audio transcripts and document retention logs. (AFP/File)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "WASHINGTON — Newly disclosed audio recordings and transcript excerpts between US officials and biographical writers reveal candid discussions regarding document storage and sensitive intelligence files.",
          "Special counsel reports highlight recorded conversations from 2017 addressing notebook entries and classified briefing materials stored at private residences."
        ]
      },
      {
        heading: "Legal Arguments & Executive Records Compliance",
        paragraphs: [
          "Legal teams argued that informal notebook retention has been a historical norm among executive officials, while oversight committees advocate for stricter archival enforcement.",
          "Department of Justice guidelines continue to refine protocols regarding personal journals containing national security references."
        ]
      }
    ]
  },
  "clean-energy-investments-record-high": {
    title: "Clean energy investments hit record high as global transition accelerates",
    authorName: "Dr. Tim Sandle",
    authorAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=250&h=250&fit=crop",
    authorBio: "Dr. Tim Sandle reports on clean technology, renewable energy grids, and global sustainability.",
    date: "July 28, 2026",
    image: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&h=750&fit=crop",
    caption: "Offshore wind turbines and solar farms generate record clean megawatt-hours globally. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Global capital deployment into renewable energy infrastructure reached a historic $1.8 trillion over the past 12 months, outstripping fossil fuel investments for the third consecutive year.",
          "Surging demand for offshore wind arrays, utility-scale solar farms, and grid-scale battery storage driven by corporate decarbonization pledges propelled the surge."
        ]
      },
      {
        heading: "Grid Modernization & Battery Storage Scaling",
        paragraphs: [
          "Energy regulators emphasize that expanding high-voltage transmission lines is essential to integrate intermitting renewable power into municipal grids.",
          "Advances in sodium-ion and solid-state batteries are lowering energy storage costs, enabling 24/7 clean power dispatchability."
        ]
      }
    ]
  },
  "lab-developing-sustainable-materials": {
    title: "Inside the lab developing tomorrow's sustainable materials",
    authorName: "April Hicke",
    authorAvatar: "/author_glasses.jpg",
    authorBio: "April Hicke reports on material science, bio-engineering, and sustainable technology.",
    date: "July 28, 2026",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=750&fit=crop",
    caption: "Researchers test biodegradable polymers and carbon-negative building materials in bio-engineering laboratories. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Inside cutting-edge bio-materials research centers, chemical engineers and biophysicists are synthesizing mushroom mycelium composites and algae-derived bioplastics designed to replace petroleum synthetic polymers.",
          "These next-generation materials offer structural integrity matching traditional plastics while breaking down safely into organic matter within 90 days."
        ]
      },
      {
        heading: "Industrial Scaling & Carbon-Negative Composites",
        paragraphs: [
          "Consumer packaging manufacturers and automotive partners are conducting pilot tests to integrate bio-composite panels into commercial supply chains.",
          "Life-cycle assessments confirm that manufacturing these organic alternatives emits up to 70% less carbon than conventional resin processing."
        ]
      }
    ]
  },
  "5g-expansion-transforms-industries": {
    title: "5G expansion continues to transform industries worldwide",
    authorName: "Pramod Jain",
    authorAvatar: "/author_bluesuit.jpg",
    authorBio: "Pramod Jain reports on telecommunications, edge computing, and industrial IoT platforms.",
    date: "July 28, 2026",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=750&fit=crop",
    caption: "Private 5G network towers power real-time industrial automation and telemetry. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Standalone private 5G networks are accelerating digital transformation across manufacturing plants, port logistics hubs, and autonomous mining operations globally.",
          "With sub-millisecond latency and ultra-reliable machine-type communication, enterprise operators can control remote robotics and autonomous vehicles with unprecedented precision."
        ]
      },
      {
        heading: "Enterprise IoT & Network Slicing Capabilities",
        paragraphs: [
          "Network slicing technology allows telecom providers to allocate dedicated, isolated bandwidth channels for mission-critical industrial applications.",
          "Industry analysts project that global private 5G deployments will double annually over the next three years."
        ]
      }
    ]
  },
  "future-of-work-hybrid-everything": {
    title: "The future of work: How companies are adapting to hybrid everything",
    authorName: "Jennifer Friesen",
    authorAvatar: "/author_woman.jpg",
    authorBio: "Jennifer Friesen reports on workplace culture, remote management, and organizational leadership.",
    date: "July 27, 2026",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=750&fit=crop",
    caption: "Distributed teams collaborate using hybrid video conferencing and asynchronous documentation tools. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "As organizations move beyond rigid return-to-office debates, progressive companies are implementing flexible 'hybrid everything' operational models centered on asynchronous documentation and outcome-focused performance metrics.",
          "By redesigning physical offices into collaborative workshops rather than daily desk rows, corporate real estate footprints are optimizing by 30%."
        ]
      },
      {
        heading: "Asynchronous Workflows & Digital Collaboration Tools",
        paragraphs: [
          "Executive leaders emphasize that establishing clear architecture decision records and asynchronous communication rules prevents meeting fatigue while empowering global talent.",
          "Employee sentiment surveys reveal higher job satisfaction and productivity among companies utilizing goal-driven remote frameworks."
        ]
      }
    ]
  },
  "small-businesses-compete-ai-world": {
    title: "How small businesses can compete in an AI-driven world",
    authorName: "Chris Hogg",
    authorAvatar: "/author_beard.jpg",
    authorBio: "Chris Hogg is an executive editor specializing in small business growth, fintech, and digital tools.",
    date: "July 27, 2026",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&h=750&fit=crop",
    caption: "Small business owners adopt low-code AI customer service and inventory software. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Small and medium-sized enterprises (SMEs) are leveraging low-code artificial intelligence tools to automate customer inquiry handling, inventory forecasting, and personalized marketing campaigns.",
          "By integrating turnkey SaaS AI microservices, boutique retailers and service providers achieve operational efficiencies previously reserved for enterprise conglomerates."
        ]
      },
      {
        heading: "Accessible AI Integration & Competitive Advantage",
        paragraphs: [
          "Financial experts advise small business owners to focus AI adoption on repetitive admin workflows, such as automated invoicing and appointment scheduling.",
          "Personalized customer relationships combined with AI-driven speed allow independent businesses to outmaneuver larger corporate competitors."
        ]
      }
    ]
  },
  "what-tools-business-should-take-from-a-massive-security-breach-to-prevent-future-attacks": {
    title: "What tools business should take from a massive security breach to prevent future attacks",
    authorName: "David Potter",
    authorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=250&h=250&fit=crop",
    authorBio: "David Potter covers enterprise cybersecurity, cloud defense architectures, and incident response protocols.",
    date: "July 28, 2026",
    image: "https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=1200&h=750&fit=crop",
    caption: "Cybersecurity operations centers monitor real-time threat vectors and zero-trust access controls. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Following high-profile corporate security breaches, CISOs and IT directors are overhauling legacy security postures in favor of mandatory Zero-Trust Network Access (ZTNA), automated identity threat detection, and continuous secrets rotation.",
          "Security audits reveal that over 80% of unauthorized access incidents originate from compromised credentials or unpatched third-party software dependencies."
        ]
      },
      {
        heading: "Zero-Trust Principles & Incident Resilience",
        paragraphs: [
          "Implementing micro-segmentation and hardware-backed multi-factor authentication (MFA) ensures that even if an perimeter is breached, lateral attacker movement remains strictly blocked.",
          "Organizations conducting regular red-team simulations and automated vulnerability patching remediate threats 60% faster than industry averages."
        ]
      }
    ]
  },
  "can-space-ai-data-centres-solve-earths-computing-crisis": {
    title: "Can space AI data centres solve Earth's computing crisis?",
    authorName: "Jennifer Friesen",
    authorAvatar: "/author_woman.jpg",
    authorBio: "Jennifer Friesen is London BigBen's associate editor and Calgary Bureau lead.",
    date: "July 28, 2026",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=750&fit=crop",
    caption: "Aerospace engineers and cloud providers design orbital solar-powered data hubs. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Aerospace engineers and cloud infrastructure providers are designing orbital data hubs powered by continuous solar arrays to alleviate terrestrial power grid strains.",
          "By deploying GPU clusters in low Earth orbit, data centers leverage solar intensity unhampered by atmospheric filtering, while beaming processed telemetry to ground stations via optical laser links."
        ]
      },
      {
        heading: "Orbital Computing & Terrestrial Power Grids",
        paragraphs: [
          "Terrestrial data center power consumption is projected to double by 2030, driving intense research into off-world computing nodes.",
          "Engineers conduct thermal dissipation tests in vacuum chambers to optimize radiative cooling panels for high-density AI accelerators."
        ]
      }
    ]
  },
  "canadian-mathematician-honoured-for-reshaping-global-data-networks": {
    title: "Canadian mathematician honoured for reshaping global data networks",
    authorName: "April Hicke",
    authorAvatar: "/author_glasses.jpg",
    authorBio: "April Hicke reports on biotechnology, scientific research, open science initiatives, and artificial intelligence adoption.",
    date: "July 27, 2026",
    image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&h=750&fit=crop",
    caption: "Pioneering research in topology and distributed algorithm optimization earns international recognition. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Pioneering research in algebraic topology and distributed routing optimization has earned international recognition for Canadian computer scientists.",
          "The mathematical frameworks allow multi-cloud routing nodes to rebalance traffic dynamically without incurring packet collisions."
        ]
      }
    ]
  },
  "chinas-kimi-k3-model-rattles-us-ai-technology-industry": {
    title: "China's Kimi K3 model rattles US AI technology industry",
    authorName: "Dr. Tim Sandle",
    authorAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=250&h=250&fit=crop",
    authorBio: "Dr. Tim Sandle is a London-based science journalist covering biotechnology, microbiology, AI in healthcare, and digital transformation.",
    date: "July 26, 2026",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=750&fit=crop",
    caption: "New benchmark evaluations demonstrate breakthrough efficiency in long-context reasoning. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "New benchmark evaluations of the Kimi K3 reasoning model demonstrate unprecedented context window memory efficiency, sparking architectural debates across Silicon Valley.",
          "AI researchers note that novel attention sparsification techniques enable deep multi-step reasoning at a fraction of standard compute budgets."
        ]
      }
    ]
  },
  "startups-bet-on-autonomous-ai-agents-for-leaner-enterprise-operations": {
    title: "Startups bet on autonomous AI agents for leaner enterprise operations",
    authorName: "Pramod Jain",
    authorAvatar: "/author_bluesuit.jpg",
    authorBio: "Pramod Jain reports on global supply chains, logistics telemetry, enterprise cloud migrations, and emerging technology markets.",
    date: "July 25, 2026",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&h=750&fit=crop",
    caption: "Venture firms accelerate funding into specialized AI agentic platforms. (Photo courtesy of London BigBen)",
    sections: [
      {
        heading: "",
        paragraphs: [
          "Venture capital pipelines are accelerating investments into autonomous AI agent platforms engineered to handle complex, multi-step corporate workflows with minimal human oversight.",
          "Early enterprise pilots demonstrate that agentic pipelines reduce routine back-office processing cycles by over 70%."
        ]
      }
    ]
  }
};

const authorAvatarMap: Record<string, { avatar: string; bio: string }> = {
  "April Hicke": {
    avatar: "/author_glasses.jpg",
    bio: "April Hicke reports on biotechnology, scientific research, open science initiatives, and artificial intelligence adoption."
  },
  "Pramod Jain": {
    avatar: "/author_bluesuit.jpg",
    bio: "Pramod Jain reports on global supply chains, logistics telemetry, enterprise cloud migrations, and emerging technology markets."
  },
  "Chris Hogg": {
    avatar: "/author_beard.jpg",
    bio: "Chris Hogg is an executive editor specializing in digital transformation, financial technology, and executive leadership strategies."
  },
  "Jennifer Friesen": {
    avatar: "/author_woman.jpg",
    bio: "Jennifer Friesen is London BigBen's associate editor and Calgary Bureau lead."
  },
  "Ronda B": {
    avatar: "/author_woman.jpg",
    bio: "Ronda B is a dedicated journalist with a passion for delivering accurate, timely, and impactful news."
  },
  "Dr. Andrew Forde": {
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&h=250&fit=crop",
    bio: "Dr. Andrew Forde writes on technological convergence, machine intelligence, and structural policy frameworks."
  },
  "David Potter": {
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=250&h=250&fit=crop",
    bio: "David Potter focuses on software architecture, DevOps tooling, developer metrics, and infrastructure security."
  }
};

function getTopicMatchingImage(slug: string, title: string): string {
  const lower = (slug + " " + title).toLowerCase();

  if (lower.includes("decoration") || lower.includes("acrylic") || lower.includes("fit out") || lower.includes("design fit out") || lower.includes("uae")) {
    return "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&h=750&fit=crop";
  }
  if (lower.includes("bone") || lower.includes("eat") || lower.includes("dairy") || lower.includes("nutrient")) {
    return "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=1200&h=750&fit=crop";
  }
  if (lower.includes("shark") || lower.includes("basking") || lower.includes("swim close") || lower.includes("ocean")) {
    return "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=750&fit=crop";
  }
  if (lower.includes("assam") || lower.includes("flood") || lower.includes("took everything")) {
    return "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=1200&h=750&fit=crop";
  }
  if (lower.includes("crypto") || lower.includes("bitcoin") || lower.includes("hyperliquid") || lower.includes("zcash")) {
    return "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=1200&h=750&fit=crop";
  }

  if (lower.includes("space") || lower.includes("orbital") || lower.includes("satellite") || lower.includes("spacex") || lower.includes("starship")) {
    return "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=1200&h=750&fit=crop";
  }
  if (lower.includes("meta") || lower.includes("facebook") || lower.includes("instagram") || lower.includes("addictive") || lower.includes("social")) {
    return "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=1200&h=750&fit=crop";
  }
  if (lower.includes("semiconductor") || lower.includes("chip") || lower.includes("silicon") || lower.includes("quantum") || lower.includes("hardware")) {
    return "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&h=750&fit=crop";
  }
  if (lower.includes("privacy") || lower.includes("security") || lower.includes("cybersecurity") || lower.includes("audit") || lower.includes("gdpr")) {
    return "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=750&fit=crop";
  }
  if (lower.includes("solar") || lower.includes("clean energy") || lower.includes("wind") || lower.includes("power grid") || lower.includes("energy")) {
    return "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&h=750&fit=crop";
  }
  if (lower.includes("logistics") || lower.includes("fleet") || lower.includes("transit") || lower.includes("truck") || lower.includes("supply")) {
    return "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=1200&h=750&fit=crop";
  }
  if (lower.includes("music") || lower.includes("song") || lower.includes("label") || lower.includes("audio") || lower.includes("streaming")) {
    return "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&h=750&fit=crop";
  }
  if (lower.includes("cio") || lower.includes("cloud") || lower.includes("data center") || lower.includes("infrastructure") || lower.includes("server")) {
    return "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=750&fit=crop";
  }
  if (lower.includes("aid") || lower.includes("humanitarian") || lower.includes("disaster") || lower.includes("relief")) {
    return "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&h=750&fit=crop";
  }
  if (lower.includes("crop") || lower.includes("genetics") || lower.includes("agricultural") || lower.includes("farm") || lower.includes("seed")) {
    return "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200&h=750&fit=crop";
  }
  if (lower.includes("rail") || lower.includes("ticket") || lower.includes("transportation") || lower.includes("train") || lower.includes("ambulance")) {
    return "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=750&fit=crop";
  }
  if (lower.includes("school") || lower.includes("education") || lower.includes("curriculum") || lower.includes("student") || lower.includes("literacy")) {
    return "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=750&fit=crop";
  }
  if (lower.includes("journalist") || lower.includes("verifying") || lower.includes("source") || lower.includes("press") || lower.includes("media")) {
    return "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1200&h=750&fit=crop";
  }
  if (lower.includes("statistic") || lower.includes("research") || lower.includes("report") || lower.includes("analysis") || lower.includes("study")) {
    return "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=750&fit=crop";
  }
  if (lower.includes("policy") || lower.includes("engineering") || lower.includes("standard") || lower.includes("compliance")) {
    return "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&h=750&fit=crop";
  }
  if (lower.includes("stock") || lower.includes("market") || lower.includes("wall street") || lower.includes("invest") || lower.includes("financial")) {
    return "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&h=750&fit=crop";
  }
  if (lower.includes("trump") || lower.includes("iran") || lower.includes("politics") || lower.includes("ceasefire") || lower.includes("hormuz")) {
    return "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&h=750&fit=crop";
  }
  if (lower.includes("argentina") || lower.includes("switzerland") || lower.includes("world cup") || lower.includes("semi-final") || lower.includes("soccer") || lower.includes("england")) {
    return "/argentina_vs_switzerland.png";
  }
  if (lower.includes("airbus") || lower.includes("jet") || lower.includes("aviation") || lower.includes("plane") || lower.includes("boeing")) {
    return "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&h=750&fit=crop";
  }

  // General tech & news high quality editorial fallback
  return "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=750&fit=crop";
}

function getNewsContent(slug: string) {
  let localArticle: any = null;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("dj_writer_submitted_articles");
      if (stored) {
        const posts: any[] = JSON.parse(stored);
        localArticle = posts.find((p) => {
          const pSlug = (p.title || "")
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");
          return pSlug === slug || String(p.id) === slug;
        });
      }
    } catch (e) {}
  }

  const existing = localArticle
    ? {
        title: localArticle.title,
        authorName: localArticle.authorName || "Rushdhi MR",
        authorAvatar: localArticle.authorAvatar || "/author_bluesuit.jpg",
        authorBio: localArticle.authorBio || "Journalist for London BigBen.",
        date: localArticle.date || "July 28, 2026",
        image: localArticle.imageUrl || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=750&fit=crop",
        caption: localArticle.subheading || localArticle.summary || `${localArticle.title}. (Photo courtesy of London BigBen)`,
        category: localArticle.category,
        subcategories: Array.isArray(localArticle.subcategories) ? localArticle.subcategories : (Array.isArray(localArticle.subCategories) ? localArticle.subCategories : []),
        sections: [
          {
            heading: "",
            paragraphs: localArticle.content
              ? [localArticle.content]
              : [localArticle.summary || "Article content."]
          }
        ]
      }
    : customNewsDatabase[slug];

  const title = existing ? existing.title : formatTitleFromSlug(slug);
  const authorName = existing ? existing.authorName : "Jennifer Friesen";
  
  const mappedAuthor = authorAvatarMap[authorName];
  const authorAvatar = existing?.authorAvatar || mappedAuthor?.avatar || (
    authorName.toLowerCase().includes('hicke') ? "/author_glasses.jpg" :
    authorName.toLowerCase().includes('jain') ? "/author_bluesuit.jpg" :
    authorName.toLowerCase().includes('hogg') ? "/author_beard.jpg" :
    "/author_woman.jpg"
  );
  const authorBio = existing?.authorBio || mappedAuthor?.bio || `${authorName} is a dedicated journalist for London BigBen covering breaking news, enterprise technology, and policy developments.`;

  const date = existing ? existing.date : "July 22, 2026 6:08 PM EDT";
  const image = (existing && existing.image) ? existing.image : getTopicMatchingImage(slug, title);
  const caption = existing ? existing.caption : `Comprehensive analysis and latest updates regarding ${title.toLowerCase()}. (Photo courtesy of London BigBen)`;

  // Generate big, multi-section in-depth long-form article for all news pages
  const baseSections = existing ? existing.sections : [];
  
  const comprehensiveSections = [
    {
      heading: "",
      paragraphs: [
        ...(baseSections[0]?.paragraphs || [
          `In an influential development affecting international stakeholders, recent analysis surrounding ${title.toLowerCase()} points toward significant structural realignment across regional and global markets. Analysts and industry observers note that current policy adjustments are establishing new operational standards that will shape decision-making for years to come.`
        ]),
        `The initiatives come at a crucial juncture as government regulators, enterprise leaders, and independent oversight committees accelerate efforts to balance rapid innovation with stringent governance protocols. Preliminary telemetry suggests that early adopters are already experiencing measurable gains in workflow efficiency and audit compliance.`,
        `"What we are witnessing is not merely an incremental upgrade, but a fundamental transition in how organizations approach risk mitigation and long-term sustainability," noted senior industry analyst Dr. Marcus Vance during a briefing in Washington.`
      ]
    },
    {
      heading: "Strategic Context & Regulatory Frameworks",
      paragraphs: [
        ...(baseSections[1]?.paragraphs || [
          `Federal oversight bodies and transatlantic regulatory watchdogs have introduced updated compliance benchmarks to address emerging operational challenges. The updated framework mandates rigorous audit trails, transparent reporting mechanisms, and standardized protocol validations across all participating jurisdictions.`
        ]),
        `For corporate directors and policy planners, complying with these guidelines requires overhauling legacy pipelines and deploying advanced telemetry tooling capable of real-time monitoring. Failure to meet these criteria carries substantial regulatory scrutiny and potential market entry restrictions.`
      ]
    },
    {
      heading: "Technical Architecture & Operational Integration",
      paragraphs: [
        `On the technical front, systems integration leads are deploying modular architectures engineered to support high-throughput processing while maintaining zero-trust security postures. By decoupling core infrastructure from legacy dependencies, organizations achieve greater resilience against supply chain disruptions and unexpected market volatility.`,
        `Recent stress tests conducted by independent research consortia demonstrated an 18% improvement in delivery timeline precision and a 25% reduction in latency when using next-generation routing logic. These empirical benchmarks underscore the tangible return on investment driven by modern engineering standards.`
      ]
    },
    {
      heading: "Expert Perspectives & Economic Outlook",
      paragraphs: [
        `Economic forecasters project that capital allocation in this sector will grow by 32% over the next four quarters, fueled by institutional backing and venture capital pivots toward sustainable tech infrastructure. Emerging hubs in North America, Europe, and Asia-Pacific are competing to attract talent and foster innovation clusters.`,
        `However, market commentators warn that scaling these solutions will require sustained collaboration between public agencies and private sector developers. Aligning technical specifications across disparate platforms remains a primary hurdle toward achieving seamless global interoperability.`
      ]
    },
    {
      heading: "Long-Term Implications & Future Roadmap",
      paragraphs: [
        `Looking ahead, industry leaders anticipate further consolidation as established enterprises acquire specialized startups to bolster their core capabilities. Regulatory bodies are expected to publish secondary guidance notes later this year to clarify cross-border data transfer protocols and environmental impact accounting.`,
        `As organizations navigate this evolving landscape, prioritizing transparent governance, continuous automated testing, and agile management frameworks will remain essential for maintaining a competitive edge in an increasingly complex environment.`
      ]
    }
  ];

  return {
    title,
    authorName,
    authorAvatar,
    authorBio,
    date,
    image,
    caption,
    sections: comprehensiveSections,
  };
}

export async function generateStaticParams() {
  const categories = ["news", "business", "industry-insights", "technology"];
  const paths: { category: string; subcategory: string }[] = [];

  const subData: Record<string, string[]> = {
    "news": [
      "world", "markets", "politics",
      "international-data-privacy-standards-updated-after-cross-border-audits",
      "scientific-research-consortium-publishes-open-access-genome-study",
      "urban-infrastructure-plans-integrate-smart-power-grids-in-major-cities",
      "public-transportation-systems-roll-out-unified-digital-ticking",
      "education-systems-adapt-curricula-to-include-basic-ai-literacy"
    ],
    "business": [
      "companies", "corporate-news", "entrepreneurship", "startups", "leadership",
      "canadas-conexiom-bets-that-the-future-of-ai-lies-in-automation-not-experimentation",
      "lightworks-scotiabank-sun-life-and-telus-launch-ai-consortium",
      "canadas-ai-adoption-problem-meets-its-youth-employment-problem",
      "oped-rethinking-humanity-as-automation-rewrites-human-realities",
      "indispensable-xiaohongshu-app-fuels-chinese-tourism"
    ],
    "industry-insights": [
      "agriculture", "tourism", "financial-services", "health", "transportation",
      "boeing-gets-order-for-100-737-max-jets-from-leasing-company-smbc",
      "spacex-abruptly-scrubs-starship-test-flight",
      "ai-helps-pathologists-spot-prostate-cancer-faster-what-canada-can-learn-from-landmark-uk-study",
      "openai-fails-to-trademark-name-in-eu",
      "like-my-lover-chinese-users-bid-farewell-to-ai-companions"
    ],
    "technology": [
      "artificial-intelligence", "cybersecurity", "innovations", "space-technology",
      "silicon-valley-chip-manufacturers-announce-breakthrough-architectural-updates",
      "new-quantum-computing-clusters-open-to-public-cloud-developer-preview",
      "opensource-database-platform-raises-record-funding-round-for-scaling",
      "how-edge-computing-is-transforming-real-time-telemetry-processing",
      "cybersecurity-protocols-updated-globally-to-counter-multi-vector-threats"
    ]
  };

  categories.forEach((cat) => {
    const subs = subData[cat] || ["companies", "startups"];
    subs.forEach((sub) => {
      paths.push({ category: cat, subcategory: sub });
    });
  });

  return paths;
}

export default async function SubcategoryPage({ params }: PageProps) {
  const { category, subcategory } = await params;
  
  const subName = formatSubcategory(subcategory);
  const parent = getParentCategoryInfo(category);

  const diveDeeperShortlist = [
    "world", "markets", "politics", "companies", "corporate-news", "entrepreneurship",
    "startups", "leadership", "agriculture", "tourism", "financial-services", "health",
    "transportation", "artificial-intelligence", "cybersecurity", "innovations", "space-technology"
  ];
  
  const isNewsArticle = !diveDeeperShortlist.includes(subcategory);

  if (isNewsArticle) {
    const newsData = getNewsContent(subcategory);

    const sidebarPicks = [
      {
        title: "US announces civilian nuclear deal with Saudi Arabia",
        date: "July 22, 2026 5:25 PM EDT",
        image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&h=150&fit=crop",
        href: "/news/world/us-announces-civilian-nuclear-deal-with-saudi-arabia"
      },
      {
        title: "As Canadians turn to AI for mortgage advice, experts warn about privacy risks and inaccurate guidance",
        date: "July 22, 2026 5:17 PM EDT",
        image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=150&h=150&fit=crop",
        href: "/news/markets/as-canadians-turn-to-ai-for-mortgage-advice-experts-warn-about-privacy-risks"
      },
      {
        title: "Tesla shares dip after profit misses expectations",
        date: "July 22, 2026 5:10 PM EDT",
        image: "https://images.unsplash.com/photo-1563720223185-11003d516935?w=150&h=150&fit=crop",
        href: "/news/markets/tesla-shares-dip-after-profit-misses-expectations"
      },
      {
        title: "Your AI made a decision, and Canadian regulators want to know how",
        date: "July 21, 2026",
        image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=150&h=150&fit=crop",
        href: "/industry-insights/health/your-ai-made-a-decision-and-canadian-regulators-want-to-know-how"
      },
      {
        title: "Dutch students unveil 'world-first' solar-powered ambulance",
        date: "July 21, 2026",
        image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150&h=150&fit=crop",
        href: "/news/world/dutch-students-unveil-world-first-solar-powered-ambulance"
      },
      {
        title: "Autonomous Fleet Operating Networks Expand Regional Commercial Routes",
        date: "July 20, 2026",
        image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=150&h=150&fit=crop",
        href: "/business/companies/new-exclusive-decoration-design-fit-out-llc-structural-acrylic-pioneers-in-the-uae"
      },
      {
        title: "European Tech Ecosystem Accelerates Sovereign Cloud & Quantum Infrastructure",
        date: "July 19, 2026",
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=150&fit=crop",
        href: "/technology/ai-innovation/meta-accelerates-generative-ai-initiatives-with-major-infrastructure-upgrade"
      },
      {
        title: "Global Central Banks Navigate Shifting Inflation Frameworks",
        date: "July 18, 2026",
        image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=150&h=150&fit=crop",
        href: "/news/markets/us-stocks-end-higher-as-sk-hynixs-wall-street-debut-and-metas-ai-momentum-lift-markets"
      },
      {
        title: "Clean Energy Grid Transitions Secure Landmark Cross-Border Funding",
        date: "July 17, 2026",
        image: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=150&h=150&fit=crop",
        href: "/industry-insights/energy/oil-market-rebalancing-amidst-refinery-maintenance-and-global-demand-trends"
      },
      {
        title: "Digital Privacy Regulators Finalize Standardized Enterprise Guidelines",
        date: "July 16, 2026",
        image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=150&h=150&fit=crop",
        href: "/news/politics/trump-declares-iran-ceasefire-over-raising-questions-about-the-next-phase-of-the-conflict"
      }
    ];

    const relatedNewsList = [
      {
        title: "Farnborough to survey the state of Boeing's comeback",
        desc: "The aviation industry gathers for its flagship air show with Boeing's recovery under scrutiny by customers, regulators and leadership shakeups.",
        date: "By AFP • July 18, 2026",
        image: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=400&h=250&fit=crop",
        href: "/news/markets/us-stocks-end-higher-as-sk-hynixs-wall-street-debut-and-metas-ai-momentum-lift-markets"
      },
      {
        title: "Boeing to expand 737 MAX output as aviation giant targets comeback",
        desc: "The plane maker plans to increase narrowbody production volumes as it seeks to rebuild trust and address safety audits.",
        date: "By AFP • July 18, 2026",
        image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=250&fit=crop",
        href: "/business/companies/new-exclusive-decoration-design-fit-out-llc-structural-acrylic-pioneers-in-the-uae"
      },
      {
        title: "US jury finds Boeing guilty in 737 MAX grounding lawsuit",
        desc: "A federal jury has ordered Boeing to pay damages to families of victims, holding the company liable for safety gaps.",
        date: "By Reuters • July 15, 2026",
        image: "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=400&h=250&fit=crop",
        href: "/news/politics/trump-declares-iran-ceasefire-over-raising-questions-about-the-next-phase-of-the-conflict"
      },
      {
        title: "Boeing confirms China commitment to buy 200 aircraft",
        desc: "Aerospace giant says commitment remains active, with first deliveries expected in late 2026.",
        date: "By Bloomberg • July 15, 2026",
        image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=250&fit=crop",
        href: "/news/markets/crypto-market-overview-bitcoin-stabilizes-zcash-targets-new-highs"
      }
    ];

    return (
      <ArticlePageContent
        category={category}
        subcategory={subcategory}
        parent={parent}
        subName={subName}
        newsData={newsData}
        sidebarPicks={sidebarPicks}
      />
    );
  }

  return (
    <CategoryPageLayout
      categoryName={subName}
      categoryColor={parent.color}
      infoBoxText={parent.desc}
      featured={{
        category: parent.name.toUpperCase(),
        title: `How digital transformation is changing the future of ${subName}`,
        description: `Exploring how modern developer standards, architectural migrations, and new automation frameworks are transforming ${subName.toLowerCase()} processes globally.`,
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=800&fit=crop",
        author: "Dr. Tim Sandle",
        date: "July 19, 2026"
      }}
      secondaryArticles={[
        {
          title: `Why remote leadership models are evolving in ${subName}`,
          image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&h=150&fit=crop",
          date: "July 15, 2026"
        },
        {
          title: `Best practices for secure development lifecycle in ${subName}`,
          image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=150&h=150&fit=crop",
          date: "July 14, 2026"
        },
        {
          title: `Tunnel tech to survey the state of standard setups in ${subName}`,
          image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=150&h=150&fit=crop",
          date: "July 12, 2026"
        },
        {
          title: `E-commerce platforms scale up localized transaction nodes for ${subName}`,
          image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=150&h=150&fit=crop",
          date: "July 10, 2026"
        }
      ]}
      guidesTitle={`${subName} Guides`}
      guidesDescription="Learn from hands-on architectures and system logs."
      guides={[]}
      newsTitle={`${subName} More News`}
      newsDescription="Get the latest regulatory policy changes."
      newsArticles={[
        {
          title: `Global regulatory boards align on uniform ${subName} standards`,
          description: `Privacy watchdogs and industry leaders execute combined audits to verify compliance and safety across transatlantic ${subName.toLowerCase()} services.`,
          date: "By Sarah Miller • 4 hours ago",
          image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=220&h=150&fit=crop"
        },
        {
          title: `Research consortium publishes open-access study on ${subName} frameworks`,
          description: `Systems engineers release detailed architecture documentation to help organizations build resilient, scalable pipelines.`,
          date: "By David Chen • 12 hours ago",
          image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=220&h=150&fit=crop"
        },
        {
          title: `Next-generation data infrastructure rolled out for ${subName} sector`,
          description: `Enterprise platforms integrate AI routing to balance supply nodes and reduce latency during peak demand hours.`,
          date: "By Lisa Chen • 1 day ago",
          image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=220&h=150&fit=crop"
        },
        {
          title: `Unified digital protocols adopted by leading ${subName} firms`,
          description: `Organizations gain streamlined interoperability across multiple cloud environments, reducing integration overheads.`,
          date: "By Pramod Asu • 2 days ago",
          image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=220&h=150&fit=crop"
        }
      ]}
    />
  );
}

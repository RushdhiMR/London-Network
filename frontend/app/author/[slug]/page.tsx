import AuthorProfileContent from '@/components/AuthorProfileContent';
import { resolveUserAvatar } from '@/lib/userProfiles';

interface AuthorPageProps {
  params: Promise<{
    slug: string;
  }>;
}

const authorsDatabase: Record<string, {
  name: string;
  role: string;
  avatar: string;
  bio: string;
  location?: string;
  email?: string;
  articlesCount?: number;
  yearsOfExperience?: number;
  articleViews?: string;
  coverageAreas?: string[];
}> = {
  "sarah-mitchell": {
    name: "Sarah Mitchell",
    role: "POLITICAL CORRESPONDENT",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80&fit=crop",
    bio: "Sarah Mitchell is a political correspondent at London BigBen Network, covering UK government, Parliament, policy and international relations. She has more than a decade of experience reporting on political developments across the UK and Europe, with a focus on governance, policy reform and global diplomacy.",
    location: "London, United Kingdom",
    email: "sarah.mitchell@londonbigben.com",
    articlesCount: 526,
    yearsOfExperience: 12,
    articleViews: "18.4M",
    coverageAreas: [
      "UK Politics", "Parliament", "Government Policy",
      "International Relations", "EU-UK Relations", "Elections",
      "Defence and Security", "Trade", "Brexit", "Diplomacy"
    ]
  },
  "sarah": {
    name: "Sarah Mitchell",
    role: "POLITICAL CORRESPONDENT",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80&fit=crop",
    bio: "Sarah Mitchell is a political correspondent at London BigBen Network, covering UK government, Parliament, policy and international relations. She has more than a decade of experience reporting on political developments across the UK and Europe, with a focus on governance, policy reform and global diplomacy.",
    location: "London, United Kingdom",
    email: "sarah.mitchell@londonbigben.com",
    articlesCount: 526,
    yearsOfExperience: 12,
    articleViews: "18.4M",
    coverageAreas: [
      "UK Politics", "Parliament", "Government Policy",
      "International Relations", "EU-UK Relations", "Elections",
      "Defence and Security", "Trade", "Brexit", "Diplomacy"
    ]
  },
  "rushdhi": {
    name: "Rushdhi MR",
    role: "FOUNDER & EDITOR-IN-CHIEF",
    avatar: "https://f005.backblazeb2.com/file/LondonNetwork/avatars/author_bluesuit.jpg",
    bio: "Founder and Editor-in-Chief for London BigBen covering business strategy, software architecture, emerging technology, and digital transformation.",
    location: "London, United Kingdom",
    email: "rushdhiriyaj2005@gmail.com",
    articlesCount: 418,
    yearsOfExperience: 10,
    articleViews: "14.2M",
    coverageAreas: [
      "Enterprise Tech", "Cloud Architecture", "FinTech",
      "Global Markets", "Artificial Intelligence", "Cybersecurity",
      "Digital Media", "Telecom Systems"
    ]
  },
  "rushdhi-mr": {
    name: "Rushdhi MR",
    role: "FOUNDER & EDITOR-IN-CHIEF",
    avatar: "https://f005.backblazeb2.com/file/LondonNetwork/avatars/author_bluesuit.jpg",
    bio: "Founder and Editor-in-Chief for London BigBen covering business strategy, software architecture, emerging technology, and digital transformation.",
    location: "London, United Kingdom",
    email: "rushdhiriyaj2005@gmail.com",
    articlesCount: 418,
    yearsOfExperience: 10,
    articleViews: "14.2M",
    coverageAreas: [
      "Enterprise Tech", "Cloud Architecture", "FinTech",
      "Global Markets", "Artificial Intelligence", "Cybersecurity",
      "Digital Media", "Telecom Systems"
    ]
  },
  "muba": {
    name: "Muba_kity",
    role: "SENIOR TECH WRITER",
    avatar: "https://f005.backblazeb2.com/file/LondonNetwork/avatars/author_woman.jpg",
    bio: "Senior technology reporter specializing in enterprise cloud innovations, generative AI systems, and digital ecosystems.",
    location: "London, United Kingdom",
    email: "rura@gmail.com",
    articlesCount: 285,
    yearsOfExperience: 8,
    articleViews: "11.1M",
    coverageAreas: [
      "Artificial Intelligence", "Cloud Platforms", "Semiconductors",
      "Software Engineering", "Hardware", "Robotics", "Quantum Computing"
    ]
  },
  "muba-kity": {
    name: "Muba_kity",
    role: "SENIOR TECH WRITER",
    avatar: "https://f005.backblazeb2.com/file/LondonNetwork/avatars/author_woman.jpg",
    bio: "Senior technology reporter specializing in enterprise cloud innovations, generative AI systems, and digital ecosystems.",
    location: "London, United Kingdom",
    email: "rura@gmail.com",
    articlesCount: 285,
    yearsOfExperience: 8,
    articleViews: "11.1M",
    coverageAreas: [
      "Artificial Intelligence", "Cloud Platforms", "Semiconductors",
      "Software Engineering", "Hardware", "Robotics", "Quantum Computing"
    ]
  },
  "roomi": {
    name: "Roomi",
    role: "STAFF WRITER & MARKET REPORTER",
    avatar: "https://f005.backblazeb2.com/file/LondonNetwork/avatars/author_glasses.jpg",
    bio: "Financial markets and business columnist reporting on corporate developments, macroeconomic indicators, and supply chain telemetry.",
    location: "London, United Kingdom",
    email: "roomiwriter@gmail.com",
    articlesCount: 234,
    yearsOfExperience: 7,
    articleViews: "9.8M",
    coverageAreas: [
      "Financial Markets", "Macroeconomics", "Equities",
      "Commodities", "Inflation", "Banking", "Venture Capital", "Supply Chain"
    ]
  },
  "ruzni": {
    name: "Ruzni",
    role: "EDITORIAL DIRECTOR",
    avatar: "https://f005.backblazeb2.com/file/LondonNetwork/avatars/author_beard.jpg",
    bio: "Editorial director and investigative journalist focused on governance, regulatory compliance, and cross-border innovation.",
    location: "London, United Kingdom",
    email: "ruzni@londonbigben.com",
    articlesCount: 312,
    yearsOfExperience: 14,
    articleViews: "16.5M",
    coverageAreas: [
      "Investigative Reporting", "Journalistic Ethics", "Governance",
      "Cross-Border Policy", "Regulatory Compliance", "Global Bureau Operations"
    ]
  }
};

export async function generateStaticParams() {
  return [
    { slug: "sarah-mitchell" },
    { slug: "rushdhi-mr" },
    { slug: "muba-kity" },
    { slug: "roomi" },
    { slug: "ruzni" }
  ];
}

export default async function AuthorProfilePage({ params }: AuthorPageProps) {
  const { slug } = await params;
  
  const rawName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const defaultAvatar = resolveUserAvatar({ name: rawName });

  const author = authorsDatabase[slug] || {
    name: rawName,
    role: "STAFF WRITER",
    avatar: defaultAvatar,
    bio: `${rawName} is a dedicated journalist for London BigBen covering breaking news, enterprise technology, policy developments, and market trends.`,
    location: "London, United Kingdom",
    email: `${slug.replace(/-/g, '.')}@londonbigben.com`,
    articlesCount: 185,
    yearsOfExperience: 8,
    articleViews: "8.4M",
    coverageAreas: [
      "Breaking News", "UK Politics", "Global Affairs",
      "Enterprise Tech", "Economy", "Markets", "Policy Reform"
    ]
  };

  const isSarah = slug === "sarah-mitchell" || slug === "sarah";

  const authorArticles = isSarah ? [
    {
      category: "POLITICS",
      href: "/news/politics/uk-government-unveils-new-policy-to-strengthen-economic-growth-and-global-partnerships",
      title: "UK Government Unveils New Policy to Strengthen Economic Growth and Global Partnerships",
      desc: "Prime Minister and Chancellor announce comprehensive economic reforms aimed at boosting international trade, attracting foreign direct investment, and securing strategic bilateral alliances...",
      date: "October 30, 2026",
      image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&h=350&fit=crop"
    },
    {
      category: "POLITICS",
      href: "/news/politics/prime-minister-meets-global-leaders-ahead-of-g20-summit",
      title: "Prime Minister Meets Global Leaders Ahead of G20 Summit",
      desc: "High-level bilateral negotiations focus on multilateral trade pacts, energy transition frameworks, and macroeconomic coordination across leading G20 member economies...",
      date: "October 28, 2026",
      image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&h=350&fit=crop"
    },
    {
      category: "POLITICS",
      href: "/news/politics/uk-parliament-debates-next-phase-of-green-energy-plans",
      title: "UK Parliament Debates Next Phase of Green Energy Plans",
      desc: "Cross-party lawmakers convene in Westminster to debate aggressive clean energy subsidies, grid modernization infrastructure, and offshore wind power deployment targets...",
      date: "October 26, 2026",
      image: "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=600&h=350&fit=crop"
    },
    {
      category: "POLITICS",
      href: "/news/politics/new-immigration-measures-to-support-skilled-workers",
      title: "New Immigration Measures to Support Skilled Workers",
      desc: "Home Office introduces expedited visa pathways for senior researchers, technology specialists, and healthcare professionals to address persistent skilled labour shortages...",
      date: "October 24, 2026",
      image: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&h=350&fit=crop"
    },
    {
      category: "POLITICS",
      href: "/news/politics/uk-to-increase-defence-spending-in-2027",
      title: "UK to Increase Defence Spending in 2027",
      desc: "Ministry of Defence outlines multi-year budget elevation to reach 2.5% of GDP, strengthening cyber deterrence, naval procurement, and allied rapid deployment readiness...",
      date: "October 22, 2026",
      image: "https://images.unsplash.com/photo-1579975096649-e773152b04cb?w=600&h=350&fit=crop"
    },
    {
      category: "POLITICS",
      href: "/news/politics/eu-uk-relations-show-signs-of-progress",
      title: "EU-UK Relations Show Signs of Progress",
      desc: "Diplomatic talks in Brussels produce renewed momentum on sanitary and phytosanitary agreements, research collaboration, and structured security cooperation...",
      date: "October 20, 2026",
      image: "https://images.unsplash.com/photo-1520607164069-c5b03e077533?w=600&h=350&fit=crop"
    }
  ] : [
    {
      category: "POLITICS",
      href: "/news/politics/trump-declares-iran-ceasefire-over-raising-questions-about-the-next-phase-of-the-conflict",
      title: "Trump Declares Iran Ceasefire 'Over,' Raising Questions About the Next Phase of the Conflict",
      desc: "The fragile ceasefire between the United States and Iran appears to have entered a new and uncertain stage after President Donald Trump declared that the truce has effectively ended. While...",
      date: "October 30, 2026",
      image: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=600&h=350&fit=crop"
    },
    {
      category: "BUSINESS",
      href: "/news/markets/us-stocks-end-higher-as-sk-hynixs-wall-street-debut-and-metas-ai-momentum-lift-markets",
      title: "U.S. Stocks End Higher as SK Hynix's Wall Street Debut and Meta's AI Momentum Lift Markets",
      desc: "U.S. stock markets closed higher on Friday as investors responded positively to SK Hynix's debut on U.S. exchanges and continued optimism surrounding artificial intelligence investments. The S&P...",
      date: "October 28, 2026",
      image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=350&fit=crop"
    },
    {
      category: "BUSINESS",
      href: "/business/new-exclusive-decoration-design-fit-out-llc-structural-acrylic-pioneers-in-the-uae",
      title: "New Exclusive Decoration Design & Fit Out LLC – Structural Acrylic Pioneers in the UAE",
      desc: "Dubai, UAE – New Exclusive Decoration Design & Fit Out LLC, recognized as New Exclusive Structural Acrylic Pioneers, is redefining the future of luxury pool design and architectural transparency...",
      date: "October 26, 2026",
      image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&h=350&fit=crop"
    },
    {
      category: "SPORTS",
      href: "/news/world/argentina-edge-switzerland-in-extra-time-to-set-up-world-cup-semi-final-clash-with-england",
      title: "Argentina Edge Switzerland in Extra Time to Set Up World Cup Semi-Final Clash With England",
      desc: "After defeating Switzerland 3-1 following extra time in an intense quarter-final that featured controversy, drama, and a stunning winning goal from Julián Álvarez. The reigning world champions will...",
      date: "October 24, 2026",
      image: "/argentina_vs_switzerland.png"
    },
    {
      category: "POLITICS",
      href: "/news/politics/trumps-hormuz-retreat-highlights-struggles-to-end-iran-conflict",
      title: "Trump's Hormuz Retreat Highlights Struggles to End Iran Conflict",
      desc: "On Monday, Trump announced that all vessels using the strategically important waterway would be required to pay a 20% fee, arguing that the charge would help cover the costs of maintaining...",
      date: "October 22, 2026",
      image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&h=350&fit=crop"
    },
    {
      category: "BUSINESS",
      href: "/business/corporate-news/ice-suspends-most-vehicle-stops-after-fatal-shootings-in-texas-and-maine",
      title: "ICE Suspends Most Vehicle Stops After Fatal Shootings in Texas and Maine",
      desc: "According to US media reports citing law enforcement sources, the suspension takes effect immediately and applies to most routine vehicle stops. Exceptions will be made for cases involving serious...",
      date: "October 20, 2026",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=350&fit=crop"
    }
  ];

  return (
    <AuthorProfileContent
      slug={slug}
      author={author}
      initialArticles={authorArticles}
    />
  );
}

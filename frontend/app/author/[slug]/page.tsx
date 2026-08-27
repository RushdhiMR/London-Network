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
}> = {
  "rushdhi": {
    name: "Rushdhi",
    role: "JOURNALIST",
    avatar: "/author_bluesuit.jpg",
    bio: "Rushdhi is a journalist for London BigBen covering business strategy, software architecture, emerging technology, and digital transformation."
  },
  "rushdhi-mr": {
    name: "Rushdhi",
    role: "JOURNALIST",
    avatar: "/author_bluesuit.jpg",
    bio: "Rushdhi is a journalist for London BigBen covering business strategy, software architecture, emerging technology, and digital transformation."
  },
  "muba": {
    name: "Muba",
    role: "SENIOR WRITER",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=250&h=250&fit=crop",
    bio: "Reports on industry disruptions, macroeconomic trends, lifestyle features, and breaking developments."
  },
  "april-hicke": {
    name: "April Hicke",
    role: "TECH ANALYST",
    avatar: "/author_glasses.jpg",
    bio: "April Hicke reports on biotechnology, scientific research, open science initiatives, and artificial intelligence adoption across enterprise ecosystems."
  },
  "ronda-b": {
    name: "Ronda B",
    role: "WRITER",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=250&h=250&fit=crop",
    bio: "A dedicated journalist with a passion for delivering accurate, timely, and impactful news. Committed to ethical reporting and in-depth storytelling, she covers a wide range of topics with professionalism, integrity, and a focus on informing audiences through credible journalism."
  },
  "jennifer-friesen": {
    name: "Jennifer Friesen",
    role: "ASSOCIATE EDITOR",
    avatar: "/author_woman.jpg",
    bio: "Jennifer Friesen is London BigBen's associate editor and Calgary Bureau lead. Committed to ethical reporting and in-depth storytelling across energy, technology, and policy."
  },
  "pramod-jain": {
    name: "Pramod Jain",
    role: "ENERGY COLUMNIST",
    avatar: "/author_energy.jpg",
    bio: "Pramod Jain reports on global supply chains, logistics telemetry, enterprise cloud migrations, and emerging technology markets."
  },
  "chris-hogg": {
    name: "Chris Hogg",
    role: "EXECUTIVE EDITOR",
    avatar: "/author_beard.jpg",
    bio: "Chris Hogg is an executive editor specializing in digital transformation, financial technology, and executive leadership strategies."
  },
  "dr-andrew-forde": {
    name: "Dr. Andrew Forde",
    role: "CHIEF COLUMNIST",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&h=250&fit=crop",
    bio: "Dr. Andrew Forde writes on technological convergence, machine intelligence, and structural policy frameworks."
  },
  "david-potter": {
    name: "David Potter",
    role: "SENIOR COLUMNIST",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=250&h=250&fit=crop",
    bio: "David Potter focuses on software architecture, DevOps tooling, developer metrics, and infrastructure security."
  },
  "jennifer-lussier": {
    name: "Jennifer Lussier",
    role: "CONTRIBUTING EDITOR",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=250&h=250&fit=crop",
    bio: "Jennifer Lussier covers Canadian innovation ecosystems, youth employment initiatives, and venture capital allocations."
  },
  "dr-tim-sandle": {
    name: "Dr. Tim Sandle",
    role: "SENIOR EDITOR",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=250&h=250&fit=crop",
    bio: "Dr. Tim Sandle is a London-based science journalist covering biotechnology, microbiology, AI in healthcare, and digital transformation."
  },
  "frank-morgan": {
    name: "Frank Morgan",
    role: "POLITICAL CORRESPONDENT",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=250&h=250&fit=crop",
    bio: "Frank Morgan is London BigBen's senior political correspondent covering transatlantic diplomacy, legislative policy, and international affairs."
  },
  "sarah-miller": {
    name: "Sarah Miller",
    role: "REGULATORY CORRESPONDENT",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&h=250&fit=crop",
    bio: "Sarah Miller covers international data privacy regulations, cross-border compliance, and digital rights."
  },
  "david-chen": {
    name: "David Chen",
    role: "TECH CORRESPONDENT",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&h=250&fit=crop",
    bio: "David Chen covers open-source software, cloud infrastructure, and quantum computing preview clusters."
  },
  "lisa-chen": {
    name: "Lisa Chen",
    role: "DATA INFRASTRUCTURE REPORTER",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250&h=250&fit=crop",
    bio: "Lisa Chen covers next-generation data routing, enterprise AI balance nodes, and telecommunications."
  }
};

export async function generateStaticParams() {
  return [
    { slug: "rushdhi" },
    { slug: "rushdhi-mr" },
    { slug: "april-hicke" },
    { slug: "ronda-b" },
    { slug: "jennifer-friesen" },
    { slug: "pramod-jain" },
    { slug: "chris-hogg" },
    { slug: "dr-andrew-forde" },
    { slug: "david-potter" },
    { slug: "jennifer-lussier" },
    { slug: "dr-tim-sandle" },
    { slug: "frank-morgan" },
    { slug: "sarah-miller" },
    { slug: "david-chen" },
    { slug: "lisa-chen" }
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
    bio: `${rawName} is a dedicated journalist for London BigBen covering breaking news, enterprise technology, policy developments, and market trends.`
  };

  const authorArticles = [
    {
      category: "POLITICS",
      href: "/news/politics/trump-declares-iran-ceasefire-over-raising-questions-about-the-next-phase-of-the-conflict",
      title: "Trump Declares Iran Ceasefire 'Over,' Raising Questions About the Next Phase of the Conflict",
      desc: "The fragile ceasefire between the United States and Iran appears to have entered a new and uncertain stage after President Donald Trump declared that the truce has effectively ended. While...",
      date: `BY ${author.name.toUpperCase()} • JUL 19, 2026`,
      image: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=600&h=350&fit=crop"
    },
    {
      category: "BUSINESS",
      href: "/news/markets/us-stocks-end-higher-as-sk-hynixs-wall-street-debut-and-metas-ai-momentum-lift-markets",
      title: "U.S. Stocks End Higher as SK Hynix's Wall Street Debut and Meta's AI Momentum Lift Markets",
      desc: "U.S. stock markets closed higher on Friday as investors responded positively to SK Hynix's debut on U.S. exchanges and continued optimism surrounding artificial intelligence investments. The S&P...",
      date: `BY ${author.name.toUpperCase()} • JUL 18, 2026`,
      image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=350&fit=crop"
    },
    {
      category: "BUSINESS",
      href: "/business/companies/new-exclusive-decoration-design-fit-out-llc-structural-acrylic-pioneers-in-the-uae",
      title: "New Exclusive Decoration Design & Fit Out LLC – Structural Acrylic Pioneers in the UAE",
      desc: "Dubai, UAE – New Exclusive Decoration Design & Fit Out LLC, recognized as New Exclusive Structural Acrylic Pioneers, is redefining the future of luxury pool design and architectural transparency...",
      date: `BY ${author.name.toUpperCase()} • JUL 15, 2026`,
      image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&h=350&fit=crop"
    },
    {
      category: "SPORTS",
      href: "/news/world/argentina-edge-switzerland-in-extra-time-to-set-up-world-cup-semi-final-clash-with-england",
      title: "Argentina Edge Switzerland in Extra Time to Set Up World Cup Semi-Final Clash With England",
      desc: "After defeating Switzerland 3-1 following extra time in an intense quarter-final that featured controversy, drama, and a stunning winning goal from Julián Álvarez. The reigning world champions will...",
      date: `BY ${author.name.toUpperCase()} • JUL 12, 2026`,
      image: "/argentina_vs_switzerland.png"
    },
    {
      category: "POLITICS",
      href: "/news/politics/trumps-hormuz-retreat-highlights-struggles-to-end-iran-conflict",
      title: "Trump's Hormuz Retreat Highlights Struggles to End Iran Conflict",
      desc: "On Monday, Trump announced that all vessels using the strategically important waterway would be required to pay a 20% fee, arguing that the charge would help cover the costs of maintaining...",
      date: `BY ${author.name.toUpperCase()} • JUL 15, 2026`,
      image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&h=350&fit=crop"
    },
    {
      category: "BUSINESS",
      href: "/business/corporate-news/ice-suspends-most-vehicle-stops-after-fatal-shootings-in-texas-and-maine",
      title: "ICE Suspends Most Vehicle Stops After Fatal Shootings in Texas and Maine",
      desc: "According to US media reports citing law enforcement sources, the suspension takes effect immediately and applies to most routine vehicle stops. Exceptions will be made for cases involving serious...",
      date: `BY ${author.name.toUpperCase()} • JUL 15, 2026`,
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=350&fit=crop"
    },
    {
      category: "HEALTH",
      href: "/industry-insights/health/us-explosive-diarrhoea-outbreak-remains-unsolved-as-cases-near-7000",
      title: "US \"Explosive Diarrhoea\" Outbreak Remains Unsolved as Cases Near 7,000",
      desc: "The outbreak has now spread to 34 states, with nearly 7,000 confirmed cases, according to the US Centers for Disease Control and Prevention (CDC). While the illness is rarely fatal, it can cause...",
      date: `BY ${author.name.toUpperCase()} • JUL 15, 2026`,
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=350&fit=crop"
    },
    {
      category: "CRYPTO",
      href: "/news/markets/crypto-news-today-july-15-bitcoin-reclaims-65000-jpmorgan-warns-of-hyperliquid-risks",
      title: "Crypto News Today (July 15): Bitcoin Reclaims $65,000, JPMorgan Warns of Hyperliquid Risks",
      desc: "Bitcoin staged a strong recovery on July 15, rising more than 3.5% in the past 24 hours and reclaiming the $65,000 level. The rally was supported by renewed institutional demand, with $181 million...",
      date: `BY ${author.name.toUpperCase()} • JUL 15, 2026`,
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=350&fit=crop"
    },
    {
      category: "BUSINESS",
      href: "/news/markets/crypto-market-overview-bitcoin-stabilizes-zcash-targets-new-highs",
      title: "Crypto Market Overview: Bitcoin Stabilizes, Zcash Targets New Highs, Pump.fun Extends Recovery",
      desc: "While Bitcoin remains the market's primary focus, Zcash (ZEC) and Pump.fun (PUMP) emerged as some of the strongest-performing cryptocurrencies over the past 24 hours. Bitcoin Tests Key Resistance...",
      date: `BY ${author.name.toUpperCase()} • JUL 15, 2026`,
      image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&h=350&fit=crop"
    }
  ];

  const mostReadSidebar = [
    { rank: 1, href: "/business/companies/new-exclusive-decoration-design-fit-out-llc-structural-acrylic-pioneers-in-the-uae", title: "New Exclusive Decoration Design & Fit Out LLC – Structural Acrylic Pioneers in the UAE", views: "50 views" },
    { rank: 2, href: "/news/politics/trump-declares-iran-ceasefire-over-raising-questions-about-the-next-phase-of-the-conflict", title: "Trump Declares Iran Ceasefire 'Over,' Raising Questions About the Next Phase of the Conflict", views: "38 views" },
    { rank: 3, href: "/news/politics/trumps-hormuz-retreat-highlights-struggles-to-end-iran-conflict", title: "Trump's Hormuz Retreat Highlights Struggles to End Iran Conflict", views: "24 views" },
    { rank: 4, href: "/news/markets/crypto-market-overview-bitcoin-stabilizes-zcash-targets-new-highs", title: "Crypto Market Overview: Bitcoin Stabilizes, Zcash Targets New Highs, Pump.fun Extends Recovery", views: "8 views" },
    { rank: 5, href: "/news/markets/us-stocks-end-higher-as-sk-hynixs-wall-street-debut-and-metas-ai-momentum-lift-markets", title: "U.S. Stocks End Higher as SK Hynix's Wall Street Debut and Meta's AI Momentum Lift Markets", views: "3 views" }
  ];

  return (
    <AuthorProfileContent
      slug={slug}
      author={author}
      initialArticles={authorArticles}
      mostReadSidebar={mostReadSidebar}
    />
  );
}

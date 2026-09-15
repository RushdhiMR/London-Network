import { Metadata } from "next";
import { readArticlesStore, ArticleRecord } from "@/lib/serverArticlesStore";
import {
  customNewsDatabase,
  knownNewsArticles,
  formatTitleFromSlug,
  getTopicMatchingImage,
} from "@/lib/customNewsData";
import { getCategoryData } from "@/lib/categoryData";
import fs from "fs";
import path from "path";

const SITE_NAME = "London BigBen Network";
const DEFAULT_DESCRIPTION =
  "London BigBen Network - Smart News. Real Impact. Global news, financial analysis, technology insights, and editorial reporting.";

export function getSiteUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.FRONTEND_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (envUrl && envUrl.startsWith("http")) {
    return envUrl.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}

export interface MatchedArticleSEO {
  id?: string | number;
  title: string;
  description: string;
  imageUrl: string;
  category?: string;
  subcategory?: string;
  slug?: string;
  authorName?: string;
  publishedAt?: string;
}

function normalizeSlug(str: string): string {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function stripHtml(raw?: string): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const KNOWN_NON_ARTICLES = new Set([
  "news",
  "business",
  "technology",
  "innovation",
  "events",
  "industry-insights",
  "journal-of-record",
  "about",
  "contact",
  "contact-us",
  "advertise",
  "advertise-with-us",
  "subscribe",
  "newsletters",
  "reader",
  "writer",
  "search",
  "world",
  "politics",
  "economy",
  "markets",
  "lifestyle",
  "sports",
  "entertainment",
  "health",
  "research",
  "china",
  "europe",
  "united-states",
  "britain",
  "middle-east",
  "africa",
  "asia",
  "companies",
  "corporate-news",
  "startups",
  "entrepreneurship",
  "leadership",
  "artificial-intelligence",
  "cybersecurity",
  "innovations",
  "robotics",
  "agriculture",
  "tourism",
  "financial-services",
  "transportation",
]);

/**
 * Finds an article by slug or id from all available sources in priority order:
 * 1. Fast in-memory customNewsDatabase
 * 2. Fast in-memory knownNewsArticles
 * 3. Fast in-memory DEFAULT_SEARCHABLE_ARTICLES
 * 4. Fast JSON database fallback (digital_journal_db.json)
 * 5. Category data articles
 * 6. Active database / MySQL store (with fast timeout)
 * 7. Topic-matched editorial fallback
 */
export async function findArticleBySlugOrId(slugOrId: string): Promise<MatchedArticleSEO | null> {
  if (!slugOrId) return null;
  const rawKey = slugOrId.trim();
  const cleanKey = normalizeSlug(rawKey);

  // If this key is a known category or subcategory section, it's not an article
  if (KNOWN_NON_ARTICLES.has(cleanKey) || KNOWN_NON_ARTICLES.has(rawKey.toLowerCase())) {
    return null;
  }

  // 1. Fast in-memory customNewsDatabase (0ms)
  if (customNewsDatabase[rawKey] || customNewsDatabase[cleanKey]) {
    const entry = customNewsDatabase[rawKey] || customNewsDatabase[cleanKey];
    const desc =
      entry.caption ||
      (entry.sections && entry.sections[0]?.paragraphs[0]) ||
      DEFAULT_DESCRIPTION;

    return {
      title: entry.title,
      description: stripHtml(desc).slice(0, 200),
      imageUrl: entry.image,
      category: "news",
      slug: cleanKey,
      authorName: entry.authorName || "London BigBen Staff",
      publishedAt: entry.date,
    };
  }

  for (const [slug, entry] of Object.entries(customNewsDatabase)) {
    if (normalizeSlug(slug) === cleanKey || normalizeSlug(entry.title) === cleanKey) {
      const desc =
        entry.caption ||
        (entry.sections && entry.sections[0]?.paragraphs[0]) ||
        DEFAULT_DESCRIPTION;

      return {
        title: entry.title,
        description: stripHtml(desc).slice(0, 200),
        imageUrl: entry.image,
        category: "news",
        slug,
        authorName: entry.authorName || "London BigBen Staff",
        publishedAt: entry.date,
      };
    }
  }

  // 2. Fast in-memory knownNewsArticles (0ms)
  if (knownNewsArticles[rawKey] || knownNewsArticles[cleanKey]) {
    const title = knownNewsArticles[rawKey] || knownNewsArticles[cleanKey];
    const image = getTopicMatchingImage(cleanKey, title);
    const desc = `${title}. Authoritative journalism and real impact reporting from London BigBen Network.`;

    return {
      title,
      description: desc,
      imageUrl: image,
      category: "news",
      slug: cleanKey,
      authorName: "London BigBen Staff",
    };
  }

  // 3. Fast local JSON database file lookup (~1ms)
  try {
    const candidatePaths = [
      path.join(process.cwd(), "data", "digital_journal_db.json"),
      path.join(process.cwd(), "frontend", "data", "digital_journal_db.json"),
    ];

    for (const dbPath of candidatePaths) {
      if (fs.existsSync(dbPath)) {
        const raw = fs.readFileSync(dbPath, "utf-8");
        const db = JSON.parse(raw);
        if (Array.isArray(db.articles)) {
          const found = db.articles.find((a: any) => {
            const aSlug = normalizeSlug(a.slug || a.title || "");
            return (
              String(a.id) === rawKey ||
              (a.slug && a.slug.toLowerCase() === rawKey.toLowerCase()) ||
              aSlug === cleanKey
            );
          });

          if (found) {
            const rawDesc =
              found.subheading ||
              found.description ||
              found.summary ||
              stripHtml(found.content) ||
              DEFAULT_DESCRIPTION;
            const cleanDesc = stripHtml(rawDesc).slice(0, 200);
            const rawImg = found.imageUrl || found.image || found.image_url || found.ogImage || "";

            return {
              id: found.id,
              title: found.title || "Article",
              description: cleanDesc,
              imageUrl: rawImg,
              category: found.category || "news",
              slug: found.slug || cleanKey,
              authorName: found.authorName || found.author_name || "London BigBen Staff",
              publishedAt: found.published_at || found.publishedAt || found.date,
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn("[seoHelper] JSON db fallback read error:", err);
  }

  // 5. Category data articles (featured, secondary, and news)
  const categoryKeys = [
    "world",
    "politics",
    "economy",
    "markets",
    "lifestyle",
    "sports",
    "entertainment",
    "health",
    "research",
    "china",
    "europe",
    "united-states",
    "britain",
    "middle-east",
    "africa",
    "asia",
    "news",
    "business",
    "technology",
    "innovation",
  ];

  for (const catKey of categoryKeys) {
    try {
      const data = getCategoryData(catKey);
      if (data) {
        if (data.featured && normalizeSlug(data.featured.title) === cleanKey) {
          return {
            title: data.featured.title,
            description: stripHtml(data.featured.description).slice(0, 200),
            imageUrl: data.featured.image,
            category: catKey,
            slug: cleanKey,
            authorName: data.featured.author || "London BigBen Staff",
            publishedAt: data.featured.date,
          };
        }

        const secMatch = (data.secondaryArticles || []).find(
          (a) => normalizeSlug(a.title) === cleanKey
        );
        if (secMatch) {
          return {
            title: secMatch.title,
            description: stripHtml(secMatch.description || secMatch.title).slice(0, 200),
            imageUrl: secMatch.image,
            category: catKey,
            slug: cleanKey,
            authorName: secMatch.author || "London BigBen Staff",
            publishedAt: secMatch.date,
          };
        }

        const newsMatch = (data.newsArticles || []).find(
          (a) => normalizeSlug(a.title) === cleanKey
        );
        if (newsMatch) {
          return {
            title: newsMatch.title,
            description: stripHtml(newsMatch.description || newsMatch.title).slice(0, 200),
            imageUrl: newsMatch.image,
            category: catKey,
            slug: cleanKey,
            authorName: newsMatch.author || "London BigBen Staff",
            publishedAt: newsMatch.date,
          };
        }
      }
    } catch (e) {
      // continue
    }
  }

  // 6. Try active database / MySQL store with a fast 800ms timeout
  try {
    const timeoutPromise = new Promise<ArticleRecord[]>((_, reject) =>
      setTimeout(() => reject(new Error("readArticlesStore timeout")), 800)
    );
    const articles = await Promise.race([readArticlesStore(), timeoutPromise]);
    if (Array.isArray(articles)) {
      const found = articles.find((a) => {
        const aSlug = normalizeSlug(a.slug || a.title || "");
        return (
          String(a.id) === rawKey ||
          (a.slug && a.slug.toLowerCase() === rawKey.toLowerCase()) ||
          aSlug === cleanKey
        );
      });

      if (found) {
        const rawDesc =
          found.subheading ||
          found.description ||
          found.summary ||
          stripHtml(found.content) ||
          DEFAULT_DESCRIPTION;
        const cleanDesc = stripHtml(rawDesc).slice(0, 200);
        const rawImg = found.imageUrl || found.image || found.image_url || found.ogImage || "";

        return {
          id: found.id,
          title: found.title || "Article",
          description: cleanDesc,
          imageUrl: rawImg,
          category: found.category || found.category_slug || "news",
          subcategory: found.category_name,
          slug: found.slug || cleanKey,
          authorName: found.author_name || found.authorName || found.author || "London BigBen Staff",
          publishedAt: found.published_at || found.publishedAt || found.date,
        };
      }
    }
  } catch (err) {
    // Non-blocking
  }

  // 7. If the slug has words and looks like an article (e.g. contains dashes, >= 3 words),
  // format an article fallback rather than failing to generic category
  if (cleanKey.includes("-") && cleanKey.split("-").length >= 3) {
    const formattedTitle = formatTitleFromSlug(cleanKey);
    const matchingImg = getTopicMatchingImage(cleanKey, formattedTitle);
    return {
      title: formattedTitle,
      description: `${formattedTitle}. Comprehensive reporting and breaking news analysis from London BigBen Network.`,
      imageUrl: matchingImg,
      category: "news",
      slug: cleanKey,
      authorName: "London BigBen Staff",
    };
  }

  return null;
}

/**
 * Resolves a shareable public image URL for an article or site
 */
export function resolvePublicImageUrl(imageUrl?: string, slugOrId?: string): string {
  const siteUrl = getSiteUrl();

  if (!imageUrl || imageUrl === "N/A") {
    if (slugOrId) {
      return `${siteUrl}/api/articles/image?slug=${encodeURIComponent(slugOrId)}`;
    }
    return `${siteUrl}/og-image.png`;
  }

  const trimmed = imageUrl.trim();

  // 1. If it's already a full HTTP/HTTPS URL (e.g. Backblaze B2, CDN, Unsplash)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // 2. If it's a local public file (e.g. /uploads/articles/... or /ai_hero.png)
  if (trimmed.startsWith("/")) {
    return `${siteUrl}${trimmed}`;
  }

  // 3. If it's an inline Base64 data URL, route through the dynamic image API
  if (trimmed.startsWith("data:image/")) {
    if (slugOrId) {
      return `${siteUrl}/api/articles/image?slug=${encodeURIComponent(slugOrId)}&id=${encodeURIComponent(slugOrId)}`;
    }
    return `${siteUrl}/og-image.png`;
  }

  return `${siteUrl}/og-image.png`;
}

/**
 * Generates OpenGraph and Twitter metadata for an article or category page
 */
export async function generateSocialMetadata({
  category = "news",
  subcategory,
  articleSlug,
  articleId,
  rawPath,
}: {
  category?: string;
  subcategory?: string;
  articleSlug?: string;
  articleId?: string;
  rawPath?: string;
}): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const targetKey = articleSlug || articleId || subcategory || "";

  const article = await findArticleBySlugOrId(targetKey);

  if (article) {
    const title = article.title || "Article";
    const cleanDesc = article.description || DEFAULT_DESCRIPTION;
    const resolvedImg = resolvePublicImageUrl(
      article.imageUrl,
      article.slug || String(article.id || targetKey)
    );

    const fullUrl = rawPath
      ? `${siteUrl}${rawPath.startsWith("/") ? rawPath : "/" + rawPath}`
      : `${siteUrl}/${(article.category || category).toLowerCase()}/${article.slug || targetKey}`;

    const authorName = article.authorName || "London BigBen Staff";
    const imgType = resolvedImg.endsWith(".webp")
      ? "image/webp"
      : resolvedImg.endsWith(".png")
      ? "image/png"
      : "image/jpeg";

    return {
      title: `${title} | ${SITE_NAME}`,
      description: cleanDesc,
      openGraph: {
        title,
        description: cleanDesc,
        url: fullUrl,
        siteName: SITE_NAME,
        type: "article",
        publishedTime: article.publishedAt,
        authors: [authorName],
        images: [
          {
            url: resolvedImg,
            secureUrl: resolvedImg.startsWith("https://") ? resolvedImg : undefined,
            width: 1200,
            height: 630,
            alt: title,
            type: imgType,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: cleanDesc,
        images: [resolvedImg],
      },
    };
  }

  // Fallback for Category / Subcategory / Non-Article pages
  const catName = subcategory
    ? subcategory.charAt(0).toUpperCase() + subcategory.slice(1).replace(/-/g, " ")
    : category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, " ");

  const pageTitle = `${catName} | ${SITE_NAME}`;
  const pageDesc = `Latest ${catName} news, expert analysis, and updates on ${SITE_NAME}.`;
  const logoBannerUrl = `${siteUrl}/og-image.png`;
  const logoSquareUrl = `${siteUrl}/logo.png`;

  const pageUrl = rawPath
    ? `${siteUrl}${rawPath.startsWith("/") ? rawPath : "/" + rawPath}`
    : subcategory
    ? `${siteUrl}/${category}/${subcategory}`
    : `${siteUrl}/${category}`;

  return {
    title: pageTitle,
    description: pageDesc,
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      url: pageUrl,
      siteName: SITE_NAME,
      type: "website",
      images: [
        {
          url: logoBannerUrl,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} Logo`,
          type: "image/png",
        },
        {
          url: logoSquareUrl,
          width: 600,
          height: 600,
          alt: `${SITE_NAME}`,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDesc,
      images: [logoBannerUrl],
    },
  };
}

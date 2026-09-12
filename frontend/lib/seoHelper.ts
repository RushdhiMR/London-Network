import { Metadata } from "next";
import { readArticlesStore, ArticleRecord } from "@/lib/serverArticlesStore";
import fs from "fs";
import path from "path";

const SITE_NAME = "London BigBen Network";
const DEFAULT_DESCRIPTION = "London BigBen Network - Smart News. Real Impact. Global news, financial analysis, technology insights, and editorial reporting.";

export function getSiteUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || (typeof window !== "undefined" ? window.location.origin : "");
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}

/**
 * Finds an article by slug or id from server store or fallback JSON databases
 */
export async function findArticleBySlugOrId(slugOrId: string): Promise<ArticleRecord | null> {
  if (!slugOrId) return null;
  const cleanKey = slugOrId.toLowerCase().trim();

  // 1. Try server articles store (database or store)
  try {
    const articles = await readArticlesStore();
    const found = articles.find((a) => {
      const aSlug = (a.slug || a.title || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      return (
        String(a.id) === cleanKey ||
        (a.slug && a.slug.toLowerCase() === cleanKey) ||
        aSlug === cleanKey
      );
    });
    if (found) return found;
  } catch (err) {
    console.warn("[seoHelper] readArticlesStore error:", err);
  }

  // 2. Try JSON database fallback
  try {
    const dbPath = path.join(process.cwd(), "data", "digital_journal_db.json");
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, "utf-8");
      const db = JSON.parse(raw);
      if (Array.isArray(db.articles)) {
        const found = db.articles.find((a: any) => {
          const aSlug = (a.slug || a.title || "")
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");
          return (
            String(a.id) === cleanKey ||
            (a.slug && a.slug.toLowerCase() === cleanKey) ||
            aSlug === cleanKey
          );
        });
        if (found) return found;
      }
    }
  } catch (err) {
    console.warn("[seoHelper] JSON db fallback read error:", err);
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
    return `${siteUrl}/logo.png`;
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
      return `${siteUrl}/api/articles/image?slug=${encodeURIComponent(slugOrId)}`;
    }
    return `${siteUrl}/logo.png`;
  }

  return `${siteUrl}/logo.png`;
}

/**
 * Generates OpenGraph and Twitter metadata for an article or category page
 */
export async function generateSocialMetadata({
  category = "news",
  subcategory,
  articleSlug,
  articleId,
}: {
  category?: string;
  subcategory?: string;
  articleSlug?: string;
  articleId?: string;
}): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const targetKey = articleSlug || articleId || subcategory || "";

  const article = await findArticleBySlugOrId(targetKey);

  if (article) {
    const title = article.title || "Article";
    const rawDesc =
      article.subheading ||
      article.description ||
      article.summary ||
      (typeof article.content === "string" ? article.content.replace(/<[^>]*>?/gm, " ").slice(0, 160) : "") ||
      DEFAULT_DESCRIPTION;
    const cleanDesc = rawDesc.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim().slice(0, 200);

    const rawImg = article.imageUrl || article.image || article.image_url || article.ogImage || "";
    const resolvedImg = resolvePublicImageUrl(rawImg, article.slug || String(article.id));
    const articlePath = `/${(article.category || category).toLowerCase()}/${article.slug || targetKey}`;
    const fullUrl = `${siteUrl}${articlePath}`;
    const authorName = article.author_name || article.authorName || "London BigBen Staff";

    return {
      title: `${title} | ${SITE_NAME}`,
      description: cleanDesc,
      openGraph: {
        title,
        description: cleanDesc,
        url: fullUrl,
        siteName: SITE_NAME,
        type: "article",
        publishedTime: article.published_at || article.publishedAt,
        authors: [authorName],
        images: [
          {
            url: resolvedImg,
            width: 1200,
            height: 630,
            alt: title,
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
  const logoUrl = `${siteUrl}/logo.png`;
  const pageUrl = subcategory ? `${siteUrl}/${category}/${subcategory}` : `${siteUrl}/${category}`;

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
          url: logoUrl,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} Logo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDesc,
      images: [logoUrl],
    },
  };
}

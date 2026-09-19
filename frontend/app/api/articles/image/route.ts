import { NextRequest, NextResponse } from "next/server";
import { readArticlesStore } from "@/lib/serverArticlesStore";
import { customNewsDatabase, getTopicMatchingImage, knownNewsArticles } from "@/lib/customNewsData";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") || "";
    const id = searchParams.get("id") || "";

    if (!slug && !id) {
      return NextResponse.json({ error: "Missing article slug or id" }, { status: 400 });
    }

    let imgData = "";

    try {
      const articles = await readArticlesStore();
      const article = articles.find(
        (a) =>
          (slug && (a.slug === slug || String(a.id) === slug)) ||
          (id && (String(a.id) === id || a.slug === id))
      );
      if (article) {
        imgData = article.imageUrl || article.image || article.image_url || article.ogImage || "";
      }
    } catch (e) {
      console.warn("Error reading articles store for image route:", e);
    }

    // Check fallback database json across candidate paths
    if (!imgData) {
      const candidatePaths = [
        path.join(process.cwd(), "data", "digital_journal_db.json"),
        path.join(process.cwd(), "frontend", "data", "digital_journal_db.json"),
      ];
      for (const dbPath of candidatePaths) {
        if (fs.existsSync(dbPath)) {
          try {
            const raw = fs.readFileSync(dbPath, "utf-8");
            const db = JSON.parse(raw);
            const fallbackArt = (db.articles || []).find(
              (a: any) =>
                (slug && (a.slug === slug || String(a.id) === slug)) ||
                (id && (String(a.id) === id || a.slug === id))
            );
            if (fallbackArt) {
              imgData = fallbackArt.imageUrl || fallbackArt.image || fallbackArt.image_url || "";
              break;
            }
          } catch (e) {}
        }
      }
    }

    // Check customNewsDatabase
    if (!imgData && (slug || id)) {
      const key = slug || id;
      const customArt = customNewsDatabase[key];
      if (customArt && customArt.image) {
        imgData = customArt.image;
      }
    }

    // Check knownNewsArticles topic matching
    if (!imgData && (slug || id)) {
      const key = slug || id;
      const title = knownNewsArticles[key] || key.replace(/-/g, " ");
      imgData = getTopicMatchingImage(key, title);
    }

    // Default fallback image if nothing found
    if (!imgData) {
      imgData = "/og-image.png";
    }

    if (imgData.includes("f005.backblazeb2.com/file/LondonNetwork/")) {
      imgData = imgData.replace(/https?:\/\/f005\.backblazeb2\.com\/file\/LondonNetwork\//g, "https://LondonNetwork.s3.us-east-005.backblazeb2.com/");
    }

    // 1. If it's a remote URL (e.g. Backblaze B2, Unsplash, Cloudinary), redirect to it
    if (imgData.startsWith("http://") || imgData.startsWith("https://")) {
      return NextResponse.redirect(imgData);
    }

    // 2. If it's an inline Base64 data URL, decode and serve as raw binary image
    if (imgData.startsWith("data:image/")) {
      const matches = imgData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1] || "image/webp";
        const buffer = Buffer.from(matches[2], "base64");
        return new Response(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": String(buffer.length),
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    // 3. If it's a local public file (e.g., /uploads/... or /ai_hero.png), serve directly from disk
    if (imgData.startsWith("/")) {
      const localFilePath = path.join(process.cwd(), "public", imgData.replace(/^\/+/, ""));
      if (fs.existsSync(localFilePath)) {
        const fileBuffer = fs.readFileSync(localFilePath);
        const ext = path.extname(localFilePath).toLowerCase().replace(".", "");
        const mimeMap: Record<string, string> = {
          webp: "image/webp",
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          gif: "image/gif",
          svg: "image/svg+xml",
        };
        const mimeType = mimeMap[ext] || "image/webp";
        return new Response(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": String(fileBuffer.length),
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  } catch (error: any) {
    console.error("API /api/articles/image error:", error);
    return NextResponse.json({ error: error.message || "Failed to serve image" }, { status: 500 });
  }
}

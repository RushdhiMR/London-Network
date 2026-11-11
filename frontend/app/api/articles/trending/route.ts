import { requireRole } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const candidatePaths = [
  path.join("/tmp", "digital_journal_db.json"),
  path.join(process.cwd(), "data", "digital_journal_db.json"),
  path.join(process.cwd(), "frontend", "data", "digital_journal_db.json"),
];
const DB_JSON_PATH = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[1];

const DEFAULT_ARTICLE_TRENDING_TOPICS: string[] = [
  "UK Economy",
  "Prime Minister",
  "EU-UK Relations",
  "Defence Policy",
  "Immigration",
  "Parliament"
];

function getTrendingTopicsFromJson(): string[] {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const raw = fs.readFileSync(DB_JSON_PATH, "utf-8");
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.articleTrendingTopics) && parsed.articleTrendingTopics.length > 0) {
          const list = parsed.articleTrendingTopics
            .filter((t: any) => typeof t === "string" && t.trim() !== "")
            .slice(0, 6);
          if (list.length > 0) return list;
        }
      }
    }
  } catch (err) {
    console.warn("[/api/articles/trending] Error reading trending topics from JSON:", err);
  }
  return [...DEFAULT_ARTICLE_TRENDING_TOPICS];
}

function saveTrendingTopicsToJson(topics: string[]): boolean {
  try {
    let dbData: any = {};
    if (fs.existsSync(DB_JSON_PATH)) {
      const raw = fs.readFileSync(DB_JSON_PATH, "utf-8");
      if (raw && raw.trim()) {
        try {
          dbData = JSON.parse(raw);
        } catch {}
      }
    }
    const cleanList = topics
      .filter((t: any) => typeof t === "string" && t.trim() !== "")
      .slice(0, 6);
    dbData.articleTrendingTopics = cleanList;
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(dbData, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[/api/articles/trending] Error saving trending topics to JSON:", err);
    return false;
  }
}

// GET /api/articles/trending - returns the configured trending topics (max 6)
export async function GET() {
  try {
    const topics = getTrendingTopicsFromJson();
    return NextResponse.json({ success: true, topics });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load trending topics" },
      { status: 500 }
    );
  }
}

// POST /api/articles/trending - update the 6 slots (admin option)
export async function POST(req: NextRequest) {
  try {
    const rbac = await requireRole(req, "admin");
    if (!rbac.authorized) return rbac.response;
    const body = await req.json().catch(() => ({}));
    const rawTopics = body.topics || body.trendingTopics;

    if (!Array.isArray(rawTopics)) {
      return NextResponse.json(
        { success: false, error: "Invalid payload. Expected array of topics." },
        { status: 400 }
      );
    }

    const clamped = rawTopics
      .map((t: any) => (typeof t === "string" ? t.trim() : ""))
      .filter((t: string) => t !== "")
      .slice(0, 6);

    const saved = saveTrendingTopicsToJson(clamped);
    if (!saved) {
      return NextResponse.json(
        { success: false, error: "Failed to persist trending topics to database." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, topics: clamped });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error saving trending topics" },
      { status: 500 }
    );
  }
}


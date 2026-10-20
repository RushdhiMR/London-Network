import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEFAULT_REELS_VIDEOS, ReelVideo } from "@/lib/reelsSync";

const DB_JSON_PATH = path.join(process.cwd(), "data", "digital_journal_db.json");

function getReelsFromJson(): ReelVideo[] {
  try {
    if (fs.existsSync(DB_JSON_PATH)) {
      const raw = fs.readFileSync(DB_JSON_PATH, "utf-8");
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.reels) && parsed.reels.length > 0) {
          return parsed.reels;
        }
      }
    }
  } catch (err) {
    console.warn("[/api/reels] Error reading reels from JSON:", err);
  }
  return DEFAULT_REELS_VIDEOS;
}

function saveReelsToJson(reels: ReelVideo[]): boolean {
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
    dbData.reels = reels;
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(dbData, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[/api/reels] Error saving reels to JSON:", err);
    return false;
  }
}

export async function GET() {
  try {
    const reels = getReelsFromJson();
    return NextResponse.json({ success: true, reels });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load reels" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const videos = body.videos || body.reels;

    if (!Array.isArray(videos)) {
      return NextResponse.json(
        { success: false, error: "Invalid reels payload. Expected array of videos." },
        { status: 400 }
      );
    }

    const clamped = videos
      .filter((v: any) => typeof v.slot !== "number" || (v.slot >= 1 && v.slot <= 5))
      .slice(0, 5);

    const saved = saveReelsToJson(clamped);
    if (!saved) {
      return NextResponse.json(
        { success: false, error: "Failed to persist reels to database." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, reels: clamped });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error saving reels" },
      { status: 500 }
    );
  }
}

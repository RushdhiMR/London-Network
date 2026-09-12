import { NextResponse } from "next/server";
import { recordArticleViewStore } from "@/lib/serverArticlesStore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { articleId, slug, title, userIdentifier } = body || {};

    const target = articleId || slug || title;
    if (!target) {
      return NextResponse.json({ error: "Article identifier is required" }, { status: 400 });
    }

    const result = await recordArticleViewStore(target, userIdentifier || null, { articleId, slug, title });

    return NextResponse.json({
      success: result.success,
      reads: result.reads,
      views: result.reads,
      incremented: result.incremented,
    });
  } catch (error: any) {
    console.error("[/api/articles/views] Error recording view:", error);
    return NextResponse.json({ error: error.message || "Failed to record view" }, { status: 500 });
  }
}

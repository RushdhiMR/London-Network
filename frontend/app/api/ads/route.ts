import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET() {
  try {
    const db = getDbPool();
    const [rows]: any = await db.query("SELECT * FROM ad_slots ORDER BY id ASC");
    if (Array.isArray(rows) && rows.length > 0) {
      const formatted = rows.map((r: any) => ({
        id: r.id,
        dimensions: r.dimensions,
        title: r.title,
        description: r.description || "",
        categoryGroup: r.category_group || "HOMEPAGE",
        imageUrl: r.image_url,
        actionType: r.action_type || "External Link (URL)",
        targetUrl: r.target_url,
        isActive: Boolean(r.is_active)
      }));
      return NextResponse.json({ success: true, adSlots: formatted });
    }
    return NextResponse.json({ success: true, adSlots: [] });
  } catch (error: any) {
    console.error("[/api/ads] Error reading ad_slots from MySQL:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = getDbPool();

    if (Array.isArray(body.adSlots)) {
      for (const slot of body.adSlots) {
        await db.query(
          `INSERT INTO ad_slots (id, dimensions, title, description, category_group, image_url, action_type, target_url, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             dimensions = VALUES(dimensions),
             title = VALUES(title),
             description = VALUES(description),
             category_group = VALUES(category_group),
             image_url = VALUES(image_url),
             action_type = VALUES(action_type),
             target_url = VALUES(target_url),
             is_active = VALUES(is_active)`,
          [
            slot.id,
            slot.dimensions,
            slot.title,
            slot.description || "",
            slot.categoryGroup || "HOMEPAGE",
            slot.imageUrl,
            slot.actionType || "External Link (URL)",
            slot.targetUrl,
            slot.isActive ? 1 : 0
          ]
        );
      }
      return NextResponse.json({ success: true, message: "Ad slots updated in database" });
    }

    if (body.id) {
      await db.query(
        `INSERT INTO ad_slots (id, dimensions, title, description, category_group, image_url, action_type, target_url, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           dimensions = VALUES(dimensions),
           title = VALUES(title),
           description = VALUES(description),
           category_group = VALUES(category_group),
           image_url = VALUES(image_url),
           action_type = VALUES(action_type),
           target_url = VALUES(target_url),
           is_active = VALUES(is_active)`,
        [
          body.id,
          body.dimensions,
          body.title,
          body.description || "",
          body.categoryGroup || "HOMEPAGE",
          body.imageUrl,
          body.actionType || "External Link (URL)",
          body.targetUrl,
          body.isActive ? 1 : 0
        ]
      );
      return NextResponse.json({ success: true, message: "Ad slot updated in database" });
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (error: any) {
    console.error("[/api/ads] Error writing ad_slots to MySQL:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

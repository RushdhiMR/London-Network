import { NextRequest, NextResponse } from "next/server";
import { isB2Configured, uploadToB2, listB2Backups, deleteB2Object } from "@/lib/backblaze";
import { DB } from "@/lib/db";

export async function GET() {
  try {
    if (!isB2Configured()) {
      return NextResponse.json({
        success: true,
        storage: "local",
        backups: []
      });
    }

    const b2Backups = await listB2Backups();
    return NextResponse.json({
      success: true,
      storage: "backblaze",
      backups: b2Backups
    });
  } catch (error: any) {
    console.error("GET /api/admin/backups error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to list Backblaze backups" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Gather all active datasets directly from database if available or request body
    const users = await DB.getAllSubscribers().catch(() => []);
    const contactSubmissions = await DB.getAllContactSubmissions().catch(() => []);

    const now = new Date();
    const timestampStr = now.toISOString().replace(/[:-]/g, "_").split(".")[0];
    const filename = body.fileName || `db_backup_manual_${timestampStr}.json`;

    const snapshotData = {
      backupType: "Backblaze B2 Full Database & Media Snapshot",
      timestamp: now.toISOString(),
      exportedAt: now.toLocaleString(),
      datasets: {
        publishedPosts: {
          count: Array.isArray(body.articles) ? body.articles.length : 0,
          items: body.articles || []
        },
        newsletterSubscribers: {
          count: Array.isArray(body.newsletterSubscribers) ? body.newsletterSubscribers.length : users.length,
          items: body.newsletterSubscribers || users
        },
        userDetails: {
          count: Array.isArray(body.workspaceUsers) ? body.workspaceUsers.length : 0,
          items: body.workspaceUsers || []
        },
        contactUsSubmissions: {
          count: Array.isArray(body.contactSubmissions) ? body.contactSubmissions.length : contactSubmissions.length,
          items: body.contactSubmissions || contactSubmissions
        },
        advertiseLeads: {
          count: Array.isArray(body.advertiseLeads) ? body.advertiseLeads.length : 0,
          items: body.advertiseLeads || []
        },
        adSlots: {
          count: Array.isArray(body.adSlots) ? body.adSlots.length : 0,
          items: body.adSlots || []
        }
      }
    };

    const jsonString = JSON.stringify(snapshotData, null, 2);
    const buffer = Buffer.from(jsonString, "utf-8");
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);

    let b2UploadRes = null;
    if (isB2Configured()) {
      b2UploadRes = await uploadToB2(buffer, filename, "application/json", "database-backups", true);
    }

    const backupItem = {
      id: `bk-${Date.now()}`,
      filename: filename,
      date: `${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
      fileSize: `${sizeMb === "0.00" ? "< 0.1" : sizeMb} MB`,
      url: b2UploadRes?.url || "",
      storage: b2UploadRes?.success ? "backblaze" : "local"
    };

    return NextResponse.json({
      success: true,
      backup: backupItem,
      storage: backupItem.storage,
      url: backupItem.url,
      snapshotData
    });
  } catch (error: any) {
    console.error("POST /api/admin/backups error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create Backblaze backup" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename") || searchParams.get("key");

    if (!filename) {
      return NextResponse.json(
        { success: false, error: "Filename is required" },
        { status: 400 }
      );
    }

    if (isB2Configured()) {
      await deleteB2Object(filename);
    }

    return NextResponse.json({
      success: true,
      message: `Backup ${filename} deleted from Backblaze B2.`
    });
  } catch (error: any) {
    console.error("DELETE /api/admin/backups error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete backup from Backblaze B2" },
      { status: 500 }
    );
  }
}

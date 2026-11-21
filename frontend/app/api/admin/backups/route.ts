import { NextRequest, NextResponse } from "next/server";
import { isB2Configured, uploadToB2, deleteB2Object } from "@/lib/backblaze";
import { DB } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import {
  getBackupsOverview,
  createArticleBackup,
  readManifest,
  writeManifest
} from "@/lib/articleBackupService";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rbac = await requireRole(request, "admin");
  if (!rbac.authorized) {
    return rbac.response;
  }

  try {
    const overview = await getBackupsOverview();

    return NextResponse.json({
      success: true,
      storage: isB2Configured() ? "backblaze" : "local",
      backups: overview.backups,
      lastBackupDate: overview.lastBackupDate,
      lastSuccessfulBackup: overview.lastSuccessfulBackup,
      nextScheduledBackup: overview.nextScheduledBackup,
      retention: "Rolling 5-Day Retention",
      totalBackups: overview.totalBackups
    });
  } catch (error: any) {
    console.error("GET /api/admin/backups error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to list backups" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const rbac = await requireRole(request, "admin");
  if (!rbac.authorized) {
    return rbac.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "articles_zip";

    // 1. Primary Action: Article ZIP Backup (with 5-day rolling retention)
    if (action === "articles_zip" || action === "manual_zip" || !body.datasets) {
      const origin = request.nextUrl.origin || process.env.FRONTEND_URL || "https://londonbigben.com";
      const result = await createArticleBackup({
        isManual: true,
        force: true,
        siteOrigin: origin
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || result.message },
          { status: 500 }
        );
      }

      const overview = await getBackupsOverview();

      return NextResponse.json({
        success: true,
        message: result.message,
        backup: result.backup,
        backups: overview.backups,
        lastBackupDate: overview.lastBackupDate,
        nextScheduledBackup: overview.nextScheduledBackup,
        storage: result.backup?.storage || "local"
      });
    }

    // 2. Legacy / Secondary Action: Full Database JSON Snapshot
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
        },
        reelsVideos: {
          count: Array.isArray(body.reelsVideos) ? body.reelsVideos.length : 0,
          items: body.reelsVideos || []
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
      storage: b2UploadRes?.success ? "backblaze" : "local",
      status: "Successful" as const,
      sizeBytes: buffer.length,
      articlesCount: Array.isArray(body.articles) ? body.articles.length : 0,
      timestamp: now.getTime(),
      type: "manual" as const
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
      { success: false, error: error?.message || "Failed to create backup" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const rbac = await requireRole(request, "admin");
  if (!rbac.authorized) {
    return rbac.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename") || searchParams.get("key");

    if (!filename) {
      return NextResponse.json(
        { success: false, error: "Filename is required" },
        { status: 400 }
      );
    }

    // 1. Delete from B2 if configured
    if (isB2Configured()) {
      await deleteB2Object(filename.endsWith(".zip") ? `article-backups/${filename}` : filename);
    }

    // 2. Delete from local backups directory
    const candidateDirs = [
      path.join(process.cwd(), "data", "backups"),
      path.join(process.cwd(), "frontend", "data", "backups")
    ];
    for (const d of candidateDirs) {
      const fPath = path.join(d, filename);
      if (fs.existsSync(fPath)) {
        try {
          fs.unlinkSync(fPath);
        } catch {}
      }
    }

    // 3. Update manifest
    const manifest = readManifest();
    manifest.backups = manifest.backups.filter((b) => b.filename !== filename);
    writeManifest(manifest);

    const overview = await getBackupsOverview();

    return NextResponse.json({
      success: true,
      message: `Backup ${filename} deleted successfully.`,
      backups: overview.backups
    });
  } catch (error: any) {
    console.error("DELETE /api/admin/backups error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete backup" },
      { status: 500 }
    );
  }
}

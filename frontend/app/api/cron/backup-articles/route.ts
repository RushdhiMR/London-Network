import { NextRequest, NextResponse } from "next/server";
import { createArticleBackup, calculateNextScheduledBackup, getBackupsOverview } from "@/lib/articleBackupService";
import { requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorizedCronRequest(request: NextRequest, isAdminUser: boolean): boolean {
  // 1. If user is logged-in admin, authorized
  if (isAdminUser) return true;

  const cronSecret = process.env.CRON_SECRET?.trim();
  const adminKey = process.env.ADMIN_PORTAL_KEY?.trim();

  // 2. Check CRON_SECRET if configured (Standard Vercel Cron authentication)
  if (cronSecret) {
    const authHeader = request.headers.get("authorization") || "";
    if (authHeader === `Bearer ${cronSecret}`) {
      return true;
    }
  }

  // 3. Check query token if passed: ?key=ADMIN_PORTAL_KEY or ?key=CRON_SECRET
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("key") || searchParams.get("token") || searchParams.get("secret");
  if (token) {
    if (cronSecret && token === cronSecret) return true;
    if (adminKey && token === adminKey) return true;
  }

  // 4. Fallback for Vercel Cron when CRON_SECRET is not configured
  if (!cronSecret && process.env.VERCEL === "1") {
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";
    if (isVercelCron) return true;
  }

  // 5. Localhost loopback in dev mode
  const host = request.headers.get("host") || "";
  if (process.env.NODE_ENV !== "production" && (host.includes("localhost") || host.includes("127.0.0.1"))) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  try {
    const rbac = await requireRole(request, "admin").catch(() => ({ authorized: false, response: null }));
    const authorized = isAuthorizedCronRequest(request, Boolean(rbac.authorized));

    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Cron secret or Admin authentication required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    const origin = typeof window !== "undefined"
      ? window.location.origin
      : process.env.FRONTEND_URL || "https://londonbigben.com";

    const result = await createArticleBackup({
      isManual: false,
      force,
      siteOrigin: origin
    });

    const overview = await getBackupsOverview();

    return NextResponse.json({
      success: result.success,
      message: result.message,
      backup: result.backup,
      lastSuccessfulBackup: overview.lastSuccessfulBackup,
      nextScheduledBackup: calculateNextScheduledBackup(),
      retainedBackupsCount: overview.backups.length,
      retentionPolicy: "Rolling 5-Day Retention"
    });
  } catch (error: any) {
    console.error("[Cron/BackupArticles] Execution error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to execute automatic daily backup."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

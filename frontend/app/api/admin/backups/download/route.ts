import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { getBackupBuffer } from "@/lib/articleBackupService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rbac = await requireRole(request, "admin");
  if (!rbac.authorized) {
    return rbac.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename") || searchParams.get("file");

    if (!filename) {
      return NextResponse.json(
        { success: false, error: "Filename parameter is required." },
        { status: 400 }
      );
    }

    const fileResult = await getBackupBuffer(filename);
    if (!fileResult) {
      return NextResponse.json(
        { success: false, error: `Backup file "${filename}" not found.` },
        { status: 404 }
      );
    }

    return new NextResponse(fileResult.buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileResult.filename}"`,
        "Content-Length": String(fileResult.buffer.length),
        "Cache-Control": "private, no-cache, no-store, must-revalidate"
      }
    });
  } catch (error: any) {
    console.error("[BackupDownload] Error serving backup file:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to download backup file." },
      { status: 500 }
    );
  }
}

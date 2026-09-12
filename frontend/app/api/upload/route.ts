import { NextRequest, NextResponse } from "next/server";
import { isB2Configured, uploadToB2 } from "@/lib/backblaze";

export async function GET() {
  const configured = isB2Configured();
  return NextResponse.json({
    status: "ok",
    connected: configured,
    storage: configured ? "Backblaze B2 Cloud Storage" : "Local / DataURL Fallback",
    bucket: configured ? process.env.B2_BUCKET_NAME : null,
    endpoint: process.env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com",
    region: process.env.B2_REGION || "us-east-005",
    instructions: configured
      ? "Backblaze B2 is fully active and ready to receive media uploads and backups."
      : "To activate Backblaze B2, please set B2_KEY_ID, B2_APPLICATION_KEY, and B2_BUCKET_NAME in your environment variables.",
  });
}

import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const contentTypeHeader = request.headers.get("content-type") || "";

    let buffer: Buffer | null = null;
    let fileName = "file.webp";
    let mimeType = "image/webp";
    let folder = "uploads";
    let rawFallbackUrl = "";

    if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      folder = (formData.get("folder") as string) || "uploads";

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file was provided in form data" },
          { status: 400 }
        );
      }

      fileName = file.name || "upload.webp";
      mimeType = file.type || "image/webp";
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // JSON body (supports base64 data URL or raw string)
      const body = await request.json();
      const dataUrl = body.dataUrl || body.image || body.file;
      folder = body.folder || "uploads";
      fileName = body.fileName || "upload.webp";
      mimeType = body.mimeType || "image/webp";

      if (!dataUrl) {
        return NextResponse.json(
          { success: false, error: "No dataUrl or image payload provided" },
          { status: 400 }
        );
      }

      rawFallbackUrl = dataUrl;

      // Extract base64 payload from data URL
      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1] || mimeType;
        buffer = Buffer.from(matches[2], "base64");
      } else if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://") || dataUrl.startsWith("/uploads/")) {
        // Already a valid URL, return directly
        return NextResponse.json({
          success: true,
          url: dataUrl,
          storage: "remote",
        });
      } else {
        buffer = Buffer.from(dataUrl, "utf-8");
      }
    }

    // 1. Try uploading to Backblaze B2 Cloud Storage
    if (buffer && isB2Configured()) {
      try {
        const b2Res = await uploadToB2(buffer, fileName, mimeType, folder);
        if (b2Res.success && b2Res.url) {
          return NextResponse.json({
            success: true,
            url: b2Res.url,
            key: b2Res.key,
            bucket: b2Res.bucket,
            storage: "backblaze",
          });
        }
      } catch (b2Err) {
        console.warn("Backblaze B2 upload attempt notice:", b2Err);
      }
    }

    // 2. Save locally to public/uploads as fallback
    let localUrl = "";
    if (buffer) {
      try {
        const sanitizedFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "") || "uploads";
        const uploadsDir = path.join(process.cwd(), "public", "uploads", sanitizedFolder);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const cleanExtMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
        const ext = cleanExtMatch ? `.${cleanExtMatch[1].toLowerCase()}` : ".webp";
        const rawBase = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-").substring(0, 40) || "upload";
        const cleanFileName = `${Date.now()}-${rawBase}-${Math.random().toString(36).substring(2, 7)}${ext}`;
        const filePath = path.join(uploadsDir, cleanFileName);
        fs.writeFileSync(filePath, buffer);
        localUrl = `/uploads/${sanitizedFolder}/${cleanFileName}`;
      } catch (fsErr) {
        console.warn("Could not save local copy in public/uploads:", fsErr);
      }
    }

    if (localUrl) {
      return NextResponse.json({
        success: true,
        url: localUrl,
        storage: "local",
      });
    }

    // Return safe data URL fallback if local write failed
    return NextResponse.json({
      success: true,
      url: rawFallbackUrl || (buffer ? `data:${mimeType};base64,${buffer.toString("base64")}` : ""),
      storage: "fallback",
    });
  } catch (error: any) {
    console.error("API /api/upload error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error during upload" },
      { status: 500 }
    );
  }
}

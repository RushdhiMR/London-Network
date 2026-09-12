import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Checks if Backblaze B2 environment variables are populated.
 */
export function isB2Configured(): boolean {
  const keyId = (process.env.B2_KEY_ID || "").trim();
  const appKey = (process.env.B2_APPLICATION_KEY || "").trim();
  const bucket = (process.env.B2_BUCKET_NAME || "").trim();
  return Boolean(keyId && appKey && bucket);
}

/**
 * Returns a cached or new S3Client configured for Backblaze B2's S3-compatible API.
 */
let b2ClientInstance: S3Client | null = null;

export function getB2Client(): S3Client | null {
  if (!isB2Configured()) {
    return null;
  }

  if (b2ClientInstance) {
    return b2ClientInstance;
  }

  const endpoint = (process.env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com").trim();
  const region = (process.env.B2_REGION || "us-east-005").trim();
  const accessKeyId = (process.env.B2_KEY_ID || "").trim();
  const secretAccessKey = (process.env.B2_APPLICATION_KEY || "").trim();

  b2ClientInstance = new S3Client({
    endpoint: endpoint.startsWith("http") ? endpoint : `https://${endpoint}`,
    region: region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });

  return b2ClientInstance;
}

export interface B2UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  bucket?: string;
  error?: string;
}

export interface B2BackupItem {
  id: string;
  filename: string;
  date: string;
  fileSize: string;
  url: string;
  lastModified?: Date;
}

/**
 * Uploads a binary buffer or string to the configured Backblaze B2 bucket.
 */
export async function uploadToB2(
  buffer: Buffer,
  originalName: string,
  contentType: string = "image/webp",
  folder: string = "uploads",
  preserveExactName: boolean = false
): Promise<B2UploadResult> {
  const client = getB2Client();
  const bucketName = (process.env.B2_BUCKET_NAME || "").trim();

  if (!client || !bucketName) {
    return {
      success: false,
      error: "Backblaze B2 is not configured. Please provide B2_KEY_ID, B2_APPLICATION_KEY, and B2_BUCKET_NAME.",
    };
  }

  try {
    const extMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ".webp";
    const rawBaseName = originalName.replace(/\.[^/.]+$/, "");
    const cleanBaseName = rawBaseName
      .toLowerCase()
      .replace(/[^a-z0-9_.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 70) || "file";

    const sanitizedFolder = folder.replace(/^\/+|\/+$/g, "");
    
    let key: string;
    if (preserveExactName || folder === "database-backups") {
      const cleanFileName = originalName.replace(/[^a-zA-Z0-9_.-]/g, "_");
      key = sanitizedFolder ? `${sanitizedFolder}/${cleanFileName}` : cleanFileName;
    } else {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      key = sanitizedFolder
        ? `${sanitizedFolder}/${timestamp}-${cleanBaseName}-${randomSuffix}${ext}`
        : `${timestamp}-${cleanBaseName}-${randomSuffix}${ext}`;
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);

    // Formulate public URL
    let publicUrl = "";
    if (process.env.B2_PUBLIC_URL && process.env.B2_PUBLIC_URL.trim()) {
      const basePublic = process.env.B2_PUBLIC_URL.trim().replace(/\/$/, "");
      publicUrl = `${basePublic}/${key}`;
    } else {
      const endpoint = (process.env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com")
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "");
      publicUrl = `https://${bucketName}.${endpoint}/${key}`;
    }

    return {
      success: true,
      url: publicUrl,
      key,
      bucket: bucketName,
    };
  } catch (err: any) {
    console.error("Backblaze B2 upload error:", err);
    return {
      success: false,
      error: err?.message || "Failed to upload to Backblaze B2",
    };
  }
}

/**
 * Lists all database backup snapshots stored in Backblaze B2 under folder database-backups/
 */
export async function listB2Backups(): Promise<B2BackupItem[]> {
  const client = getB2Client();
  const bucketName = (process.env.B2_BUCKET_NAME || "").trim();

  if (!client || !bucketName) {
    return [];
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: "database-backups/",
    });

    const response = await client.send(command);
    if (!response.Contents || response.Contents.length === 0) {
      return [];
    }

    const basePublic = (process.env.B2_PUBLIC_URL || "").trim().replace(/\/$/, "");
    const endpoint = (process.env.B2_ENDPOINT || "https://s3.us-east-005.backblazeb2.com")
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    return response.Contents
      .filter(item => item.Key && item.Key !== "database-backups/" && item.Key.endsWith(".json"))
      .map((item, idx) => {
        const key = item.Key!;
        const rawFilename = key.replace(/^database-backups\//, "");
        const sizeBytes = item.Size || 0;
        const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
        const modDate = item.LastModified || new Date();
        const dateFormatted = `${modDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${modDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
        const publicUrl = basePublic ? `${basePublic}/${key}` : `https://${bucketName}.${endpoint}/${key}`;

        return {
          id: `bk-b2-${idx}-${item.ETag?.replace(/"/g, "") || Date.now()}`,
          filename: rawFilename,
          date: dateFormatted,
          fileSize: `${sizeMb === "0.00" ? "< 0.1" : sizeMb} MB`,
          url: publicUrl,
          lastModified: modDate
        };
      })
      .sort((a, b) => (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0));
  } catch (err) {
    console.error("List Backblaze backups error:", err);
    return [];
  }
}

/**
 * Deletes a file from Backblaze B2 by key or filename in database-backups/
 */
export async function deleteB2Object(keyOrFilename: string): Promise<boolean> {
  const client = getB2Client();
  const bucketName = (process.env.B2_BUCKET_NAME || "").trim();

  if (!client || !bucketName) {
    return false;
  }

  try {
    const key = keyOrFilename.startsWith("database-backups/")
      ? keyOrFilename
      : `database-backups/${keyOrFilename}`;

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (err) {
    console.error("Delete Backblaze object error:", err);
    return false;
  }
}


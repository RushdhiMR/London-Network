"use client";

/**
 * Converts any Image File, Blob, or base64 data URL into modern WebP format
 * using HTML5 Canvas client-side rendering.
 *
 * @param input Image File, Blob, or image data URL string
 * @param quality Compression quality between 0.1 and 1.0 (default: 0.85)
 * @returns Promise<string> containing the data:image/webp;base64,... string
 */
export async function convertToWebP(
  input: File | Blob | string,
  quality: number = 0.85
): Promise<string> {
  if (!input) return "";

  // Helper to read File/Blob as Data URL
  const readBlobAsDataUrl = (b: Blob | File): Promise<string> => {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(typeof fr.result === "string" ? fr.result : "");
      fr.onerror = rej;
      fr.readAsDataURL(b);
    });
  };

  let baseDataUrl = "";
  if (typeof input !== "string") {
    try {
      baseDataUrl = await readBlobAsDataUrl(input);
    } catch (e) {
      console.warn("FileReader error on input blob:", e);
      return "";
    }
  } else {
    baseDataUrl = input;
  }

  if (!baseDataUrl) return "";

  // If already a webp data URL or an external .webp URL, return as-is
  if (baseDataUrl.startsWith("data:image/webp") || (baseDataUrl.endsWith(".webp") && !baseDataUrl.startsWith("data:"))) {
    return baseDataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    if (!baseDataUrl.startsWith("data:") && !baseDataUrl.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width || 800;
        canvas.height = img.naturalHeight || img.height || 600;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(baseDataUrl);
          return;
        }

        // Draw image smoothly onto canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to WebP format
        const webpDataUrl = canvas.toDataURL("image/webp", quality);

        if (webpDataUrl && webpDataUrl.startsWith("data:image/webp")) {
          resolve(webpDataUrl);
        } else {
          resolve(baseDataUrl);
        }
      } catch (err) {
        console.warn("Canvas WebP conversion error, keeping original data URL:", err);
        resolve(baseDataUrl);
      }
    };

    img.onerror = () => {
      console.warn("Image load failed during WebP conversion, keeping original data URL");
      resolve(baseDataUrl);
    };

    img.src = baseDataUrl;
  });
}

/**
 * Parses all <img> tags within an HTML content string and converts any embedded
 * image sources (PNG, JPEG, GIF, BMP, etc.) into WebP data URLs before publishing.
 *
 * @param html The raw article HTML body string
 * @param quality Compression quality for WebP
 * @returns Promise<string> The processed HTML string with WebP images
 */
export async function convertHtmlImagesToWebP(
  html: string,
  quality: number = 0.85
): Promise<string> {
  if (!html || typeof window === "undefined") return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const images = Array.from(doc.querySelectorAll("img"));

    if (images.length === 0) return html;

    for (const img of images) {
      const src = img.getAttribute("src");
      if (src && !src.startsWith("data:image/webp") && !src.endsWith(".webp")) {
        // Convert base64 data URLs or loadable image sources to WebP
        if (src.startsWith("data:image/") || src.startsWith("blob:")) {
          try {
            const webpSrc = await convertToWebP(src, quality);
            if (webpSrc && webpSrc.startsWith("data:image/webp")) {
              img.setAttribute("src", webpSrc);
            }
          } catch (e) {
            console.warn("Failed to convert inner image to WebP:", e);
          }
        }
      }
    }

    return doc.body.innerHTML;
  } catch (err) {
    console.warn("Error processing HTML images for WebP conversion:", err);
    return html;
  }
}

/**
 * Uploads an image File, Blob, or DataURL to Backblaze B2 Cloud Storage via /api/upload.
 * If Backblaze B2 is not configured or upload fails, seamlessly returns the WebP data URL fallback.
 *
 * @param input Image File, Blob, or base64 data URL string
 * @param fileName Preferred file name
 * @param folder Destination folder prefix in Backblaze B2 ("articles", "avatars", "ads", "backups")
 * @returns Promise<string> Public Backblaze B2 URL or data URL fallback
 */
export async function uploadImageToBackblaze(
  input: File | Blob | string,
  fileName: string = "image.webp",
  folder: string = "articles"
): Promise<string> {
  if (!input) return "";

  try {
    const webpDataUrl = await convertToWebP(input);
    if (!webpDataUrl) return "";

    if (webpDataUrl.startsWith("http://") || webpDataUrl.startsWith("https://")) {
      return webpDataUrl;
    }

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataUrl: webpDataUrl,
        fileName,
        folder,
        mimeType: "image/webp",
      }),
    });

    if (!res.ok) {
      return webpDataUrl;
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      return webpDataUrl;
    }

    if (data && data.success && data.url) {
      return data.url;
    }

    return webpDataUrl;
  } catch (err) {
    console.warn("Backblaze upload helper error, using fallback:", err);
    if (typeof input === "string") return input;
    return await convertToWebP(input);
  }
}
